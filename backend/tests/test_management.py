from uuid import uuid4

from sqlalchemy import func, select

from app.models import Answer, FormVersion, Question, Submission


def test_duplicate_renames_keys_and_delete_cascades_only_owned_records(client, session):
    form = client.post("/api/v1/forms", json={"title": "Original"}).json()
    qid, oid = str(uuid4()), str(uuid4())
    definition = {
        "title": "Original",
        "expected_revision": 0,
        "questions": [
            {
                "id": qid,
                "type": "multiple_choice",
                "title": "Pick one",
                "description": "Context",
                "required": True,
                "settings": {},
                "options": [{"id": oid, "label": "One"}, {"id": str(uuid4()), "label": "Two"}],
            }
        ],
        "thank_you": {"title": "Lovely", "description": "Thank you"},
    }
    url = f"/api/v1/forms/{form['id']}"
    saved = client.put(f"{url}/draft", json=definition).json()
    live = client.post(f"{url}/publish", json={"expected_revision": saved["draft_revision"]}).json()
    receipt = client.post(
        f"/api/v1/public/forms/{form['slug']}/responses",
        json={
            "form_version_id": live["published_version_id"],
            "idempotency_key": str(uuid4()),
            "answers": [{"question_id": qid, "value": oid}],
        },
    )
    assert receipt.status_code == 201
    copy_response = client.post(f"{url}/duplicate")
    assert copy_response.status_code == 201
    copy = copy_response.json()
    assert copy["status"] == "draft" and copy["response_count"] == 0 and copy["versions"] == []
    assert copy["slug"] != form["slug"] and copy["id"] != form["id"]
    assert copy["questions"][0]["id"] != qid
    assert copy["questions"][0]["options"][0]["id"] != oid
    assert copy["thank_you"] == definition["thank_you"]
    renamed = client.patch(
        f"/api/v1/forms/{copy['id']}", json={"title": "Renamed", "expected_revision": 0}
    )
    assert renamed.status_code == 200 and renamed.json()["draft_revision"] == 1
    assert (
        client.patch(
            f"/api/v1/forms/{copy['id']}", json={"title": "Stale", "expected_revision": 0}
        ).status_code
        == 409
    )
    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404
    assert client.get(f"/api/v1/forms/{copy['id']}").json()["title"] == "Renamed"
    assert session.scalar(select(func.count()).select_from(Submission)) == 0
    assert session.scalar(select(func.count()).select_from(Answer)) == 0
    assert session.scalar(select(func.count()).select_from(FormVersion)) == 0
    assert session.scalar(select(func.count()).select_from(Question)) == 1
