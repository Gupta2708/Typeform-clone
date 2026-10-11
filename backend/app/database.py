from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(database_url: str) -> Engine:
    url = make_url(database_url)
    # Neon provides standard PostgreSQL URLs. Select the installed psycopg 3 driver
    # without rewriting credentials or dropping TLS/channel-binding parameters.
    if url.drivername in {"postgres", "postgresql", "postgresql+psycopg"}:
        url = url.set(drivername="postgresql+psycopg")
        return create_engine(
            url,
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=2,
            connect_args={"connect_timeout": 15},
        )
    if url.get_backend_name() != "sqlite":
        raise ValueError("DATABASE_URL must use SQLite or PostgreSQL with psycopg.")
    if url.database and url.database != ":memory:":
        Path(url.database).parent.mkdir(parents=True, exist_ok=True)
    db_engine = create_engine(
        database_url, connect_args={"check_same_thread": False, "timeout": 15}
    )

    @event.listens_for(db_engine, "connect")
    def configure_sqlite(connection, _record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=15000")
        cursor.close()

    return db_engine


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
