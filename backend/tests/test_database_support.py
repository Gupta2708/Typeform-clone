from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.database import make_engine
from app.errors import AppError
from app.models import Form, FormVersion, Submission
from app.schemas.forms import CreateForm, DraftWrite
from app.services import drafts, publication
from app.services.forms import create_form
from scripts.start_server import prepare_database


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+psycopg"])
def test_postgres_url_preserves_credentials_and_tls_parameters(scheme):
    url = URL.create(
        scheme,
        username="user",
        password="p@ss:/?#%",
        host="example.neon.tech",
        database="neondb",
        query={"sslmode": "require", "channel_binding": "require"},
    )
    engine = make_engine(url.render_as_string(hide_password=False))
    assert engine.url.drivername == "postgresql+psycopg"
    assert engine.url.password == url.password
    assert engine.url.query == url.query
    engine.dispose()


def test_unsupported_database_is_rejected_without_exposing_credentials():
    with pytest.raises(ValueError, match="SQLite or PostgreSQL"):
        make_engine("mysql://user:secret@example/db")


def test_explicit_sqlite_driver_keeps_foreign_key_enforcement():
    engine = make_engine("sqlite+pysqlite:///:memory:")
    with engine.connect() as connection:
        assert connection.scalar(text("PRAGMA foreign_keys")) == 1
    engine.dispose()


def test_startup_demo_seed_opt_in_preserves_user_edits(client, engine, monkeypatch):
    import app.database

    monkeypatch.setattr(app.database, "SessionLocal", sessionmaker(engine, expire_on_commit=False))
    monkeypatch.setenv("SEED_DEMO", "false")
    get_settings.cache_clear()
    prepare_database()
    assert client.get("/api/v1/forms").json()["total"] == 0
    monkeypatch.setenv("SEED_DEMO", "true")
    get_settings.cache_clear()
    prepare_database()
    forms = client.get("/api/v1/forms").json()["items"]
    assert len(forms) == 3 and sum(form["response_count"] for form in forms) == 20
    chosen = forms[0]
    assert (
        client.patch(
            f"/api/v1/forms/{chosen['id']}",
            json={"title": "Keep my edits", "expected_revision": chosen["draft_revision"]},
        ).status_code
        == 200
    )
    prepare_database()
    assert client.get(f"/api/v1/forms/{chosen['id']}").json()["title"] == "Keep my edits"
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Submission)) == 20


def test_concurrent_drafts_have_one_winner_and_one_revision_conflict(engine):
    with Session(engine, expire_on_commit=False) as session:
        form = create_form(session, CreateForm(title="Race"))
    barrier = Barrier(2)

    def attempt(title):
        with Session(engine, expire_on_commit=False) as session:
            barrier.wait(timeout=10)
            try:
                result = drafts.save_draft(
                    session,
                    str(form.id),
                    DraftWrite(title=title, expected_revision=0, questions=[]),
                )
                return result.title
            except AppError as error:
                assert error.status == 409
                assert error.code == "revision_conflict"
                return "conflict"

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, ["First writer", "Second writer"]))
    assert results.count("conflict") == 1
    with Session(engine) as session:
        saved = session.get(Form, str(form.id))
        assert saved.draft_revision == 1 and saved.title in results


def test_concurrent_publish_reuses_one_immutable_version(engine):
    with Session(engine, expire_on_commit=False) as session:
        form = create_form(session, CreateForm(title="Publish race"))
        saved = drafts.save_draft(
            session,
            str(form.id),
            DraftWrite(
                title="Publish race",
                expected_revision=0,
                questions=[{"id": str(uuid4()), "type": "short_text", "title": "Name?"}],
            ),
        )
    barrier = Barrier(2)

    def attempt(_):
        with Session(engine, expire_on_commit=False) as session:
            barrier.wait(timeout=10)
            return publication.publish(
                session, str(form.id), saved.draft_revision
            ).published_version_id

    with ThreadPoolExecutor(max_workers=2) as pool:
        versions = list(pool.map(attempt, range(2)))
    assert versions[0] == versions[1]
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(FormVersion)) == 1
