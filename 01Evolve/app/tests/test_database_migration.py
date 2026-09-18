"""Tests for the idempotent add-missing-columns migration in database.py.

This is the one piece of persistence code that runs against a real,
already-populated production table (user_accounts) rather than a table
create_all() is free to create fresh. The other test files never exercise
the "column is missing" branch, since every fresh SQLite test DB is created
with the model's *current* full schema already baked in -- there's never an
existing table to migrate. These tests simulate that real scenario directly:
an existing table built from an older schema, with real rows already in it.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from sqlalchemy import create_engine, text

from app.core.persistence.database import init_db
from app.core.persistence.models import UserAccountRecord
from sqlalchemy import select


def _make_pre_migration_db(db_path: Path) -> None:
    """Build a user_accounts table matching the schema *before*
    age_range/avatar_data_url existed, with one real row in it -- standing
    in for production's already-populated table."""
    engine = create_engine(f"sqlite:///{db_path}", future=True)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE user_accounts (
                    id INTEGER PRIMARY KEY,
                    account_id VARCHAR(64) UNIQUE,
                    username VARCHAR(64) UNIQUE,
                    display_name VARCHAR(255),
                    email VARCHAR(255) UNIQUE,
                    password_hash VARCHAR(128),
                    password_salt VARCHAR(64),
                    password_iterations INTEGER,
                    xp INTEGER,
                    level INTEGER,
                    is_system_account BOOLEAN,
                    created_at DATETIME,
                    last_login_at DATETIME
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO user_accounts
                    (account_id, username, display_name, password_hash, password_salt,
                     password_iterations, xp, level, is_system_account, created_at)
                VALUES
                    ('preexisting-1', 'olduser', 'Old User', 'hash', 'salt', 600000, 0, 1, 0, CURRENT_TIMESTAMP)
                """
            )
        )
    engine.dispose()


def test_add_missing_columns_migrates_existing_table_with_real_rows(tmp_path):
    db_path = tmp_path / "premigration.sqlite3"
    _make_pre_migration_db(db_path)

    # init_db() is exactly what build_services() calls on every real boot --
    # this must not raise, and must not touch the pre-existing row's data.
    session_factory = init_db(f"sqlite:///{db_path}")
    session = session_factory()
    try:
        record = session.scalar(select(UserAccountRecord).where(UserAccountRecord.account_id == "preexisting-1"))
        assert record is not None
        assert record.username == "olduser"  # pre-existing data survived
        assert record.age_range is None  # new column, backfilled NULL
        assert record.avatar_data_url is None

        # The migrated column must be genuinely writable afterward, not just
        # present-but-inert.
        record.age_range = "25_34"
        session.commit()
        reloaded = session.scalar(select(UserAccountRecord).where(UserAccountRecord.account_id == "preexisting-1"))
        assert reloaded.age_range == "25_34"
    finally:
        session.close()


def test_add_missing_columns_is_idempotent(tmp_path):
    """Running init_db() twice against an already-migrated table (the normal
    case on every subsequent deploy/restart) must not error."""
    db_path = tmp_path / "idempotent.sqlite3"
    _make_pre_migration_db(db_path)

    init_db(f"sqlite:///{db_path}")
    init_db(f"sqlite:///{db_path}")  # second call: columns already exist


def test_add_missing_columns_on_fresh_db_matches_full_current_schema(tmp_path):
    """Sanity check that a brand-new DB (create_all's normal path) already
    has the new columns without needing the migration step at all."""
    db_path = tmp_path / "fresh.sqlite3"
    session_factory = init_db(f"sqlite:///{db_path}")
    session = session_factory()
    try:
        session.add(
            UserAccountRecord(
                account_id="fresh-1",
                username="freshuser",
                display_name="Fresh User",
                password_hash="h",
                password_salt="s",
                password_iterations=1,
                age_range="18_24",
            )
        )
        session.commit()
        record = session.scalar(select(UserAccountRecord).where(UserAccountRecord.account_id == "fresh-1"))
        assert record.age_range == "18_24"
    finally:
        session.close()
