import sqlite3

import pytest

from scripts.backup_db import backup_database


def test_backup_retains_committed_data_after_live_deletion_and_refuses_overwrite(
    client, engine, tmp_path
):
    form = client.post("/api/v1/forms", json={"title": "Restore verification"}).json()
    archive = backup_database(str(engine.url), tmp_path / "backup.db")
    assert client.delete(f"/api/v1/forms/{form['id']}").status_code == 204
    assert client.get(f"/api/v1/forms/{form['id']}").status_code == 404
    with sqlite3.connect(archive) as restored:
        assert restored.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert restored.execute("SELECT title FROM forms WHERE id=?", (form["id"],)).fetchone() == (
            "Restore verification",
        )
        assert restored.execute("PRAGMA foreign_key_check").fetchall() == []
    with pytest.raises(FileExistsError):
        backup_database(str(engine.url), archive)
    with pytest.raises(ValueError):
        backup_database(str(engine.url), tmp_path / "test.db")
    with pytest.raises(ValueError):
        backup_database("sqlite:///:memory:", tmp_path / "memory.db")
