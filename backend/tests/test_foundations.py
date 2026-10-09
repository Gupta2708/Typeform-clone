from uuid import uuid4

import pytest
from alembic.config import Config
from pydantic import ValidationError
from sqlalchemy import func, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from alembic import command
from app.models import Answer, Form, FormVersion, Question, Submission
from app.schemas.forms import AnswerInput, CreateForm, FormDefinition, NumberSettings
from app.services.forms import create_form
from scripts.seed import seed_foundation


def test_health_list_create_and_persistence(client, engine):
    assert client.get("/health").json() == {"status": "ok", "database": "ready"}
    assert client.get("/api/v1/forms").json()["items"] == []
    response = client.post("/api/v1/forms", json={"title": "  My first form  "})
    assert response.status_code == 201
    form = response.json()
    assert form["title"] == "My first form"
    assert form["status"] == "draft"
    assert form["response_count"] == 0
    assert form["questions"] == []
    assert form["created_at"].endswith("Z")
    with Session(engine) as fresh_session:
        assert fresh_session.get(Form, form["id"]).title == "My first form"
    assert client.get(f"/api/v1/forms/{form['id']}").json()["slug"] == form["slug"]
    assert client.get("/api/v1/forms").json()["total"] == 1


def test_errors_are_structured_and_empty_titles_are_rejected(client):
    invalid = client.post("/api/v1/forms", json={"title": "   "})
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "validation_error"
    unknown = client.get(f"/api/v1/forms/{uuid4()}")
    assert unknown.status_code == 404
    assert unknown.json()["error"]["code"] == "form_not_found"
    assert client.get("/api/v1/forms?limit=0").status_code == 422


def test_request_limit_is_enforced_before_a_write(client):
    response = client.post(
        "/api/v1/forms", content=b"x" * 1_048_577, headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "payload_too_large"
    assert client.get("/api/v1/forms").json()["total"] == 0


def test_foreign_keys_are_enabled_on_each_connection(engine):
    with engine.connect() as first, engine.connect() as second:
        assert first.scalar(text("PRAGMA foreign_keys")) == 1
        assert second.scalar(text("PRAGMA foreign_keys")) == 1


@pytest.mark.parametrize("boundary", ["published_pointer", "submission"])
def test_database_rejects_cross_form_versions(session, boundary):
    first = create_form(session, CreateForm(title="First"))
    second = create_form(session, CreateForm(title="Second"))
    version = FormVersion(
        form_id=str(first.id),
        version_number=1,
        source_draft_revision=0,
        definition_json={"title": "First", "questions": []},
    )
    session.add(version)
    session.commit()
    if boundary == "published_pointer":
        form = session.get(Form, str(second.id))
        form.published_version_id = version.id
        form.status = "published"
    else:
        session.add(
            Submission(
                form_id=str(second.id),
                form_version_id=version.id,
                idempotency_key=str(uuid4()),
                request_hash="a" * 64,
            )
        )
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_answer_history_has_no_foreign_key_to_mutable_questions(engine):
    keys = inspect(engine).get_foreign_keys("answers")
    assert {key["referred_table"] for key in keys} == {"submissions"}


def test_foundation_seed_is_idempotent_and_preserves_user_data(session):
    user = create_form(session, CreateForm(title="Keep me"))
    assert seed_foundation(session) == 3
    session.commit()
    assert seed_foundation(session) == 0
    session.commit()
    assert session.scalar(select(func.count()).select_from(Form)) == 4
    assert session.get(Form, str(user.id)).title == "Keep me"
    assert {item.type for item in session.scalars(select(Question))} == {
        "short_text",
        "long_text",
        "multiple_choice",
        "dropdown",
        "email",
        "number",
        "yes_no",
        "rating",
    }
    assert session.scalar(select(func.count()).select_from(Submission)) == 0


def test_draft_schema_permits_incomplete_content_but_rejects_duplicate_keys():
    key = str(uuid4())
    question = {"id": key, "type": "short_text", "title": ""}
    assert FormDefinition(title="", questions=[question]).questions[0].title == ""
    with pytest.raises(ValidationError):
        FormDefinition(title="Draft", questions=[question, question])
    with pytest.raises(ValidationError):
        FormDefinition(title="Draft", questions=[{**question, "type": "unsupported"}])


def test_answer_contract_preserves_false_and_zero_and_rejects_nonfinite_values():
    key = str(uuid4())
    assert AnswerInput(question_id=key, value=False).value is False
    zero = AnswerInput(question_id=key, value=0).value
    assert type(zero) is int and zero == 0
    with pytest.raises(ValidationError):
        AnswerInput(question_id=key, value=float("inf"))
    with pytest.raises(ValidationError):
        NumberSettings(min=True)
    with pytest.raises(ValidationError):
        NumberSettings(min=10, max=1)


def test_migration_downgrade_upgrade_cycle(engine, session):
    seed_foundation(session)
    session.commit()
    form = session.scalar(select(Form))
    version = FormVersion(
        form_id=form.id,
        version_number=1,
        source_draft_revision=0,
        definition_json={"title": form.title, "questions": []},
    )
    session.add(version)
    session.flush()
    form.published_version_id = version.id
    form.status = "published"
    session.commit()
    session.close()
    config = Config("alembic.ini")
    command.downgrade(config, "base")
    assert inspect(engine).get_table_names() == ["alembic_version"]
    command.upgrade(config, "head")
    assert {
        "creators",
        "forms",
        "questions",
        "question_options",
        "form_versions",
        "submissions",
        "answers",
    } <= set(inspect(engine).get_table_names())


def test_answer_unique_question_and_attempt_constraints(session):
    form = create_form(session, CreateForm(title="Constraints"))
    version = FormVersion(
        form_id=str(form.id),
        version_number=1,
        source_draft_revision=0,
        definition_json={"title": "Constraints", "questions": []},
    )
    session.add(version)
    session.flush()
    key = str(uuid4())
    first = Submission(
        form_id=str(form.id), form_version_id=version.id, idempotency_key=key, request_hash="b" * 64
    )
    session.add(first)
    session.commit()
    session.add(
        Submission(
            form_id=str(form.id),
            form_version_id=version.id,
            idempotency_key=key,
            request_hash="b" * 64,
        )
    )
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()
    question_key = str(uuid4())
    session.add_all(
        [
            Answer(submission_id=first.id, question_key=question_key, value_json="A"),
            Answer(submission_id=first.id, question_key=question_key, value_json="B"),
        ]
    )
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()
