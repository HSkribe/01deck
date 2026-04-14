from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.persistence.models import Base
from app.core.runtime.paths import get_default_db_path

DEFAULT_DB_PATH = get_default_db_path()


def get_engine(db_url: str | None = None):
    return create_engine(db_url or f"sqlite:///{DEFAULT_DB_PATH}", future=True)


def init_db(db_url: str | None = None) -> sessionmaker[Session]:
    engine = get_engine(db_url)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False, future=True)
