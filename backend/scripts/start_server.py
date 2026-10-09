"""Explicit container entrypoint: migrate, then serve one API instance."""

import os
import sys

from alembic.config import Config

from alembic import command


def prepare_database() -> None:
    command.upgrade(Config("alembic.ini"), "head")


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
