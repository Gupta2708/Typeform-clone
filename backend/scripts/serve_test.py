"""Start a separately configured browser-test API without touching the development DB."""

import os
import subprocess
import sys

from alembic.config import Config

from alembic import command
from app.config import get_settings
from app.database import SessionLocal
from scripts.seed import seed_foundation

if __name__ == "__main__":
    if not os.environ.get("DATABASE_URL") or "e2e" not in get_settings().database_url:
        raise RuntimeError("Browser-test server requires an explicit e2e DATABASE_URL")
    command.upgrade(Config("alembic.ini"), "head")
    with SessionLocal.begin() as session:
        seed_foundation(session)
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
        check=True,
    )
