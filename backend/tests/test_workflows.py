from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Answer, FormVersion, Submission
from app.schemas.forms import SubmissionRequest
from app.services.submissions import submit


def new_question(kind="short_text", title="Your name?", required=True, **extra):
    return {
        "id": str(uuid4()),
        "type": kind,
        "title": title,
        "description": "",
        "required": required,
        "settings": {},
        "options": [],
        **extra,
    }


def save(client, form, questions):
    response = client.put(
        f"/api/v1/forms/{form['id']}/draft",
        json={
            "expected_revision": form["draft_revision"],
            "title": form["title"],
            "questions": questions,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def publish(client, form):
    response = client.post(
        f"/api/v1/forms/{form['id']}/publish", json={"expected_revision": form["draft_revision"]}
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture
def published(client):
    form = client.post("/api/v1/forms", json={"title": "Feedback"}).json()
    return publish(client, save(client, form, [new_question()]))


def payload(form, value="Ada", key=None):
    return {
        "form_version_id": form["published_version_id"],
        "idempotency_key": key or str(uuid4()),
        "answers": [{"question_id": form["questions"][0]["id"], "value": value}],
    }


def test_vertical_slice_and_public_sanitization(client, published, session):
    url = f"/api/v1/public/forms/{published['slug']}"
    public = client.get(url)
    assert public.status_code == 200
    assert public.headers["cache-control"] == "no-store"
    assert set(public.json()) == {"title", "theme", "thank_you", "questions", "form_version_id"}
    assert public.json()["questions"][0]["title"] == "Your name?"
    receipt = client.post(f"{url}/responses", json=payload(published))
    assert receipt.status_code == 201
    with Session(session.bind) as fresh:
        assert fresh.scalar(select(func.count()).select_from(Submission)) == 1
        assert fresh.scalar(select(Answer)).value_json == "Ada"
    responses = client.get(f"/api/v1/forms/{published['id']}/responses").json()
    assert responses["total"] == 1
    assert responses["items"][0]["answers"][0]["display_value"] == "Ada"
    assert client.get(f"/api/v1/forms/{published['id']}").json()["response_count"] == 1


def test_draft_publish_validation_revision_and_atomic_reorder(client):
    form = client.post("/api/v1/forms", json={"title": "Draft"}).json()
    url = f"/api/v1/forms/{form['id']}"
    assert client.post(f"{url}/publish", json={"expected_revision": 0}).status_code == 422
    questions = [new_question(title=""), new_question(title="Second")]
    form = save(client, form, questions)
    assert client.post(f"{url}/publish", json={"expected_revision": 1}).status_code == 422
    questions[0]["title"] = "First"
    form = save(client, form, list(reversed(questions)))
    assert [item["id"] for item in form["questions"]] == [
        item["id"] for item in reversed(questions)
    ]
    conflict = client.patch(url, json={"expected_revision": 1, "title": "Stale"})
    assert conflict.status_code == 409
    assert client.get(url).json()["title"] == "Draft"
    assert client.post(f"{url}/publish", json={"expected_revision": 1}).status_code == 409


def test_foreign_question_and_option_rejection_rolls_back_revision(client, published):
    other = client.post("/api/v1/forms", json={"title": "Other"}).json()
    url = f"/api/v1/forms/{other['id']}/draft"
    response = client.put(
        url, json={"title": "Other", "expected_revision": 0, "questions": published["questions"]}
    )
    assert response.status_code == 422
    assert client.get(f"/api/v1/forms/{other['id']}").json()["draft_revision"] == 0


def test_draft_isolation_old_loaded_version_and_historical_labels(client, published):
    old = deepcopy(published)
    questions = deepcopy(published["questions"])
    questions[0]["title"] = "New name label"
    edited = save(client, published, questions)
    public_url = f"/api/v1/public/forms/{published['slug']}"
    assert client.get(public_url).json()["questions"][0]["title"] == "Your name?"
    new = publish(client, edited)
    assert new["published_version_id"] != old["published_version_id"]
    assert new["slug"] == old["slug"]
    response = client.post(f"{public_url}/responses", json=payload(old))
    assert response.status_code == 201
    save(client, new, [])
    detail = client.get(f"/api/v1/forms/{old['id']}/responses/{response.json()['id']}").json()
    assert detail["answers"][0]["title"] == "Your name?"
    assert detail["answers"][0]["display_value"] == "Ada"


def test_idempotent_retry_conflict_and_closed_receipt(client, published):
    url = f"/api/v1/public/forms/{published['slug']}/responses"
    body = payload(published)
    first = client.post(url, json=body)
    retry = client.post(url, json={**body, "answers": [{**body["answers"][0], "value": " Ada "}]})
    assert first.status_code == 201 and retry.status_code == 200
    assert first.json() == retry.json()
    changed = deepcopy(body)
    changed["answers"][0]["value"] = "Grace"
    assert client.post(url, json=changed).status_code == 409
    client.post(f"/api/v1/forms/{published['id']}/unpublish")
    assert client.get(f"/api/v1/public/forms/{published['slug']}").status_code == 410
    assert client.post(url, json=body).json() == first.json()
    assert client.post(url, json=payload(published)).status_code == 410


def test_concurrent_duplicate_requests_create_one_complete_response(published, engine):
    body = SubmissionRequest.model_validate(payload(published))

    def attempt():
        with Session(engine, expire_on_commit=False) as session:
            result, created = submit(session, published["slug"], body)
            return str(result.id), created

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _i: attempt(), range(2)))
    assert results[0][0] == results[1][0]
    assert sum(result[1] for result in results) == 1
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Submission)) == 1
        assert session.scalar(select(func.count()).select_from(Answer)) == 1


@pytest.mark.parametrize("value", ["", "  ", False, 0, 5.2])
def test_invalid_required_text_creates_no_partial_submission(client, published, session, value):
    response = client.post(
        f"/api/v1/public/forms/{published['slug']}/responses", json=payload(published, value)
    )
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["question_id"] == published["questions"][0]["id"]
    assert session.scalar(select(func.count()).select_from(Submission)) == 0
    assert session.scalar(select(func.count()).select_from(Answer)) == 0


def test_all_answer_types_false_zero_and_skipped_optional(client):
    questions = [
        new_question(),
        new_question("long_text"),
        new_question("email"),
        new_question("number"),
        new_question("yes_no"),
        new_question("rating", settings={"scale": 5}),
        new_question(
            "multiple_choice",
            options=[{"id": str(uuid4()), "label": "A"}, {"id": str(uuid4()), "label": "B"}],
        ),
        new_question(
            "dropdown",
            options=[{"id": str(uuid4()), "label": "C"}, {"id": str(uuid4()), "label": "D"}],
        ),
        new_question(required=False),
    ]
    form = client.post("/api/v1/forms", json={"title": "All types"}).json()
    form = publish(client, save(client, form, questions))
    values = [
        "Ada",
        "Line one\nLine two",
        "ada@example.com",
        0,
        False,
        5,
        questions[6]["options"][0]["id"],
        questions[7]["options"][0]["id"],
    ]
    body = {
        "form_version_id": form["published_version_id"],
        "idempotency_key": str(uuid4()),
        "answers": [
            {"question_id": question["id"], "value": value}
            for question, value in zip(questions, values, strict=False)
        ],
    }
    response = client.post(f"/api/v1/public/forms/{form['slug']}/responses", json=body)
    assert response.status_code == 201, response.text
    detail = client.get(f"/api/v1/forms/{form['id']}/responses/{response.json()['id']}").json()
    assert detail["answers"][3]["value"] == 0
    assert detail["answers"][4]["value"] is False
    assert detail["answers"][4]["display_value"] == "No"
    assert detail["answers"][6]["display_value"] == "A"
    assert detail["answers"][8]["value"] is None


def test_unknown_duplicate_question_and_foreign_version(client, published):
    url = f"/api/v1/public/forms/{published['slug']}/responses"
    body = payload(published)
    assert client.post(url, json={**body, "answers": body["answers"] * 2}).status_code == 422
    assert (
        client.post(
            url, json={**body, "answers": [{"question_id": str(uuid4()), "value": "X"}]}
        ).status_code
        == 422
    )
    assert client.post(url, json={**body, "form_version_id": str(uuid4())}).status_code == 422


def test_version_snapshot_updates_are_rejected_by_sqlite(session, published):
    with pytest.raises(IntegrityError):
        session.execute(
            text("UPDATE form_versions SET definition_json = '{}' WHERE id = :id"),
            {"id": published["published_version_id"]},
        )
    session.rollback()
    assert (
        session.get(FormVersion, published["published_version_id"]).definition_json["title"]
        == "Feedback"
    )
