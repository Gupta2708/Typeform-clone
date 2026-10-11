import os
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from alembic import command
from app.database import get_session, make_engine
from app.main import app


@pytest.fixture
def engine(tmp_path: Path, monkeypatch):
    postgres_url = os.environ.get("TEST_DATABASE_URL")
    admin = None
    schema = f"test_{uuid4().hex}"
    if postgres_url:
        admin = make_engine(postgres_url)
        with admin.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        # Tests never clear a shared public schema. All ORM, Alembic and raw SQL
        # run in a unique disposable schema through a direct PostgreSQL URL.
        url = make_url(postgres_url).update_query_dict({"options": f"-csearch_path={schema}"})
        url = url.render_as_string(hide_password=False)
    else:
        url = f"sqlite:///{(tmp_path / 'test.db').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", url)
    from app.config import get_settings

    get_settings.cache_clear()
    db_engine = make_engine(url)
    try:
        command.upgrade(Config("alembic.ini"), "head")
        yield db_engine
    finally:
        db_engine.dispose()
        get_settings.cache_clear()
        if admin:
            with admin.begin() as connection:
                connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
            admin.dispose()


@pytest.fixture
def session(engine):
    with Session(engine, expire_on_commit=False) as db:
        yield db


@pytest.fixture
def client(engine):
    def override():
        with Session(engine, expire_on_commit=False) as db:
            yield db

    app.dependency_overrides[get_session] = override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
