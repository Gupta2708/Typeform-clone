"""Create a consistent SQLite backup, including committed journal/WAL content."""

import argparse
import sqlite3
from pathlib import Path

from sqlalchemy.engine import make_url

from app.config import get_settings


def backup_database(database_url: str, destination: Path) -> Path:
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite" or not url.database or url.database == ":memory:":
        raise ValueError("Backups require a file-backed SQLite database.")
    source = Path(url.database).resolve(strict=True)
    destination = destination.resolve()
    if destination == source:
        raise ValueError("Choose a backup path different from the live database.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation refuses to overwrite either a prior backup or another file.
    with destination.open("xb"):
        pass
    try:
        with sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True) as live:
            with sqlite3.connect(destination) as archived:
                live.backup(archived)
                if archived.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    raise RuntimeError("The backup failed its SQLite integrity check.")
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return destination


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(backup_database(get_settings().database_url, args.destination))
