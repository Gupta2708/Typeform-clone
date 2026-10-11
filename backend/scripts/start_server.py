"""Explicit container entrypoint: migrate, then serve one API instance."""

import os
import sys

from alembic.config import Config

from alembic import command
from app.config import get_settings


def prepare_database() -> None:
    command.upgrade(Config("alembic.ini"), "head")
    # Render Free has no runtime shell. This explicit opt-in seeds only missing
    # fixtures and preserves existing user edits/responses on every restart.
    if get_settings().seed_demo:
        from app.database import SessionLocal
        from scripts.seed_demo import seed_demo

        with SessionLocal() as session:
            created = seed_demo(session)
            session.commit()
        print(f"Demo seed: {created} forms added.", flush=True)


if __name__ == "__main__":
    prepare_database()
    os.execv(
        sys.executable,
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            os.environ.get("PORT", "8000"),
            "--workers",
            "1",
        ],
    )
