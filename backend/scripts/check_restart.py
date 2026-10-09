"""Manual real-process restart check: create before restart, assert after restart."""

import json
import sys
from pathlib import Path
from uuid import uuid4

import httpx

record = Path(__file__).resolve().parents[2] / ".cache" / "restart-check.json"
client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=10)


def request(method, route, payload=None):
    response = client.request(method, route, json=payload)
    response.raise_for_status()
    return response.json()


if sys.argv[1] == "create":
    form = request("POST", "/api/v1/forms", {"title": "Restart persistence verification"})
    question_id = str(uuid4())
    draft = {key: form[key] for key in ("title", "theme", "thank_you")}
    draft.update(
        expected_revision=form["draft_revision"],
        questions=[
            {
                "id": question_id,
                "type": "short_text",
                "title": "A durable answer?",
                "description": "",
                "required": True,
                "settings": {},
                "options": [],
            }
        ],
    )
    saved = request("PUT", f"/api/v1/forms/{form['id']}/draft", draft)
    published = request(
        "POST",
        f"/api/v1/forms/{form['id']}/publish",
        {"expected_revision": saved["draft_revision"]},
    )
    payload = {
        "form_version_id": published["published_version_id"],
        "idempotency_key": str(uuid4()),
        "answers": [{"question_id": question_id, "value": "Survives a real process restart"}],
    }
    receipt = request("POST", f"/api/v1/public/forms/{form['slug']}/responses", payload)
    record.parent.mkdir(exist_ok=True)
    record.write_text(
        json.dumps(
            {"id": form["id"], "slug": form["slug"], "payload": payload, "receipt": receipt}
        ),
        encoding="utf-8",
    )
    print("Created and published form; saved one complete response. Restart API, then run verify.")
elif sys.argv[1] == "verify":
    data = json.loads(record.read_text(encoding="utf-8"))
    form = request("GET", f"/api/v1/forms/{data['id']}")
    assert form["status"] == "published" and form["response_count"] == 1
    assert form["questions"][0]["title"] == "A durable answer?"
    responses = request("GET", f"/api/v1/forms/{data['id']}/responses")
    assert responses["items"][0]["answers"][0]["value"] == "Survives a real process restart"
    retry = request("POST", f"/api/v1/public/forms/{data['slug']}/responses", data["payload"])
    assert retry == data["receipt"]
    assert request("GET", f"/api/v1/forms/{data['id']}")["response_count"] == 1
    print(
        "PASS: draft, publication, historical answer and idempotency receipt survived API restart."
    )
else:
    raise SystemExit("Use create or verify")
