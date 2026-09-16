from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app.api.app as app_module
import app.api.security as security
from app.core.bootstrap import build_services


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Isolated per-test database instead of the real user's default sqlite path.
    services_container = build_services(db_url=f"sqlite:///{tmp_path / 'test.sqlite3'}")
    monkeypatch.setattr(app_module, "services", lambda: services_container)

    # Module-level in-memory session/rate-limit state must not leak between tests.
    security._sessions.clear()
    security._account_sessions.clear()
    security.rate_limiter._events.clear()

    # base_url must be an allowed host (see security.get_allowed_hosts) — the
    # TestClient's default host of "testclient" gets rejected by
    # TrustedHostMiddleware otherwise.
    return TestClient(app_module.api, base_url="http://localhost")
