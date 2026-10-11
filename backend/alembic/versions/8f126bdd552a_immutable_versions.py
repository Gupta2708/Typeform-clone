"""Reject updates to published version snapshots at the database boundary.

Revision ID: 8f126bdd552a
Revises: 6a0e1ab23641
"""

from alembic import op

revision = "8f126bdd552a"
down_revision = "6a0e1ab23641"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_context().dialect.name == "postgresql":
        op.execute(
            "CREATE FUNCTION reject_form_version_update() RETURNS trigger "
            "LANGUAGE plpgsql AS $$ BEGIN "
            "RAISE EXCEPTION 'Published versions are immutable' USING ERRCODE = '23514'; "
            "END; $$"
        )
        op.execute(
            "CREATE TRIGGER form_versions_immutable BEFORE UPDATE ON form_versions "
            "FOR EACH ROW EXECUTE FUNCTION reject_form_version_update()"
        )
        return
    op.execute(
        "CREATE TRIGGER form_versions_immutable BEFORE UPDATE ON form_versions "
        "BEGIN SELECT RAISE(ABORT, 'Published versions are immutable'); END"
    )


def downgrade():
    if op.get_context().dialect.name == "postgresql":
        op.execute("DROP TRIGGER form_versions_immutable ON form_versions")
        op.execute("DROP FUNCTION reject_form_version_update()")
        return
    op.execute("DROP TRIGGER form_versions_immutable")
