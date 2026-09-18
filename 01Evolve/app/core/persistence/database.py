from __future__ import annotations

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.persistence.models import Base
from app.core.runtime.paths import get_default_db_path

DEFAULT_DB_PATH = get_default_db_path()


def get_engine(db_url: str | None = None):
    return create_engine(db_url or f"sqlite:///{DEFAULT_DB_PATH}", future=True)


def _add_missing_columns(engine) -> None:
    """`Base.metadata.create_all` only creates missing *tables* -- it never
    alters an existing table to add a column a newer model gained (like
    user_accounts.age_range/avatar_data_url). Without this, a fresh SQLite
    test DB would silently work while the real, already-populated Postgres
    prod table would 500 on every query touching the new column. Portable
    across SQLite (tests) and Postgres (prod): only ever ADDs nullable
    columns, never drops/alters existing ones, so it's safe to run on every
    boot against a table that already has real rows.
    """
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue  # brand new table -- create_all already handled it
            existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue
                ddl_type = column.type.compile(dialect=engine.dialect)
                conn.execute(text(f"ALTER TABLE {table.name} ADD COLUMN {column.name} {ddl_type}"))


def init_db(db_url: str | None = None) -> sessionmaker[Session]:
    engine = get_engine(db_url)
    Base.metadata.create_all(engine)
    _add_missing_columns(engine)
    return sessionmaker(bind=engine, expire_on_commit=False, future=True)
