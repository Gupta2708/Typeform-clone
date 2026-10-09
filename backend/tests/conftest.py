from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from alembic import command
from app.database import get_session, make_engine
from app.main import app


@pytest.fixture
def engine(tmp_path: Path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'test.db').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", url)
    from app.config import get_settings

    get_settings.cache_clear()
    config = Config("alembic.ini")
    command.upgrade(config, "head")
    db_engine = make_engine(url)
    yield db_engine
    db_engine.dispose()
    get_settings.cache_clear()


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
