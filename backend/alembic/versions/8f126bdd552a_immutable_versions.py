"""Reject updates to published version snapshots at the SQLite boundary.

Revision ID: 8f126bdd552a
Revises: 6a0e1ab23641
"""

from alembic import op

revision = "8f126bdd552a"
down_revision = "6a0e1ab23641"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "CREATE TRIGGER form_versions_immutable BEFORE UPDATE ON form_versions "
        "BEGIN SELECT RAISE(ABORT, 'Published versions are immutable'); END"
    )


def downgrade():
    op.execute("DROP TRIGGER form_versions_immutable")
