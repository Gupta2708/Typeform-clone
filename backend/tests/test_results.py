from uuid import uuid4

from sqlalchemy import func, select

from app.models import Answer, Form, Submission
from scripts.seed_demo import seed_demo


def q(kind, **extra):
    return {
        "id": str(uuid4()),
        "type": kind,
        "title": f"Original {kind}",
        "required": False,
        "description": "",
        "settings": {"scale": 5} if kind == "rating" else {},
        "options": [],
        **extra,
    }


def setup_form(client, questions):
    form = client.post("/api/v1/forms", json={"title": "Summary"}).json()
    saved = client.put(
        f"/api/v1/forms/{form['id']}/draft",
        json={"title": "Summary", "expected_revision": 0, "questions": questions},
    ).json()
    return client.post(
        f"/api/v1/forms/{form['id']}/publish", json={"expected_revision": saved["draft_revision"]}
    ).json()


def submit(client, form, answers):
    result = client.post(
        f"/api/v1/public/forms/{form['slug']}/responses",
        json={
            "form_version_id": form["published_version_id"],
            "idempotency_key": str(uuid4()),
            "answers": [{"question_id": key, "value": value} for key, value in answers.items()],
        },
    )
    assert result.status_code == 201, result.text
    return result.json()


def test_version_scoped_summaries_denominators_zero_false_and_history(client):
    options = [{"id": str(uuid4()), "label": label} for label in ["Original A", "Original B"]]
    questions = [
        q("yes_no"),
        q("number"),
        q("rating"),
        q("multiple_choice", options=options),
        q("long_text"),
    ]
    form = setup_form(client, questions)
    keys = [item["id"] for item in questions]
    submit(
        client, form, dict(zip(keys, [False, 0, 1, options[0]["id"], "Original text"], strict=True))
    )
    submit(client, form, dict(zip(keys[:4], [False, 10, 5, options[1]["id"]], strict=True)))
    submit(client, form, {keys[0]: True, keys[1]: 20})
    submit(client, form, {})
    url = f"/api/v1/forms/{form['id']}"
    summary = client.get(f"{url}/summary").json()
    assert summary["total_responses"] == 4 and summary["version_number"] == 1
    boolean, number, rating, choice, text = summary["questions"]
    assert boolean["answered_count"] == 3 and boolean["skipped_count"] == 1
    assert boolean["distribution"][1]["value"] is False
    assert boolean["distribution"][1]["percentage"] == 66.67
    assert number["statistics"] == {"min": 0, "max": 20, "mean": 10}
    assert rating["statistics"]["mean"] == 3 and rating["skipped_count"] == 2
    assert [bucket["percentage"] for bucket in choice["distribution"]] == [50, 50]
    assert text["answered_count"] == 1 and text["text_samples"] == ["Original text"]
    edited = client.put(
        f"{url}/draft",
        json={
            "title": "Changed",
            "expected_revision": form["draft_revision"],
            "questions": [q("short_text", title="New question")],
        },
    ).json()
    live = client.post(
        f"{url}/publish", json={"expected_revision": edited["draft_revision"]}
    ).json()
    current = client.get(f"{url}/summary").json()
    assert current["total_responses"] == 0 and current["version_number"] == 2
    assert current["questions"][0]["statistics"] is None
    assert (
        client.get(f"{url}/summary?form_version_id={form['published_version_id']}").json()
        == summary
    )
    detail = client.get(f"{url}/responses").json()["items"][-1]
    assert detail["answers"][3]["display_value"] == "Original A"
    assert live["slug"] == form["slug"]
    foreign = setup_form(client, [q("short_text")])
    assert (
        client.get(f"{url}/summary?form_version_id={foreign['published_version_id']}").status_code
        == 404
    )


def test_response_pagination_and_large_finite_mean(client):
    question = q("number")
    form = setup_form(client, [question])
    for _ in range(31):
        submit(client, form, {question["id"]: 1e308})
    first = client.get(f"/api/v1/forms/{form['id']}/responses?limit=25").json()
    second = client.get(f"/api/v1/forms/{form['id']}/responses?limit=25&offset=25").json()
    assert first["total"] == second["total"] == 31
    assert len(first["items"]) == 25 and len(second["items"]) == 6
    assert not set(item["id"] for item in first["items"]) & set(
        item["id"] for item in second["items"]
    )
    summary = client.get(f"/api/v1/forms/{form['id']}/summary").json()
    assert summary["questions"][0]["statistics"]["mean"] == 1e308


def test_final_seed_is_valid_idempotent_and_preserves_edits(session, client):
    assert seed_demo(session) == 3
    assert session.scalar(select(func.count()).select_from(Submission)) == 20
    forms = session.scalars(select(Form)).all()
    assert sum(form.status == "published" for form in forms) == 2
    assert sum(form.status == "draft" for form in forms) == 1
    types = set()
    skipped = 0
    for form in forms:
        draft = client.get(f"/api/v1/forms/{form.id}").json()
        types |= {item["type"] for item in draft["questions"]}
        if form.status == "published":
            assert draft["response_count"] == 10
            data = client.get(f"/api/v1/forms/{form.id}/responses").json()
            skipped += sum(
                answer["value"] is None for item in data["items"] for answer in item["answers"]
            )
    assert len(types) == 8 and skipped > 0
    draft = next(form for form in forms if form.status == "draft")
    draft.title = "My edited fixture"
    session.commit()
    answer_count = session.scalar(select(func.count()).select_from(Answer))
    assert seed_demo(session) == 0
    assert session.get(Form, draft.id).title == "My edited fixture"
    assert session.scalar(select(func.count()).select_from(Answer)) == answer_count
    assert session.scalar(select(func.count()).select_from(Submission)) == 20
