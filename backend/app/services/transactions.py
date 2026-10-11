from sqlalchemy import text
from sqlalchemy.orm import Session


def begin_write(session: Session) -> None:
    """Serialize writes before reading mutable revisions/publication state.

    BEGIN IMMEDIATE avoids deferred read-to-write lock upgrades and lets a waiting
    request see the previous writer's commit. Reuse an outer write transaction when
    seed/business services call one another. PostgreSQL uses a transaction-scoped
    advisory lock to preserve the same ordering across connections and workers.
    Unlike session locks, this works with Neon's transaction-mode connection pool.
    This deliberately favors simple correctness over parallel write throughput.
    """
    connection = session.connection()
    if connection.dialect.name == "postgresql":
        session.execute(text("SELECT pg_advisory_xact_lock(2708, 1)"))
    elif not connection.connection.driver_connection.in_transaction:
        session.execute(text("BEGIN IMMEDIATE"))
