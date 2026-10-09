from sqlalchemy import text
from sqlalchemy.orm import Session


def begin_write(session: Session) -> None:
    """Serialize SQLite writes before reading mutable revisions/publication state.

    BEGIN IMMEDIATE avoids deferred read-to-write lock upgrades and lets a waiting
    request see the previous writer's commit. Reuse an outer write transaction when
    seed/business services call one another.
    """
    connection = session.connection()
    if not connection.connection.driver_connection.in_transaction:
        session.execute(text("BEGIN IMMEDIATE"))
