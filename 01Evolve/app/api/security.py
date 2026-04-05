from __future__ import annotations

import os
import secrets
import hmac
import hashlib
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

SESSION_COOKIE_NAME = "deck_beta_session"
DEFAULT_ALLOWED_ORIGINS = (
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
)


def get_beta_access_token() -> str | None:
    return os.getenv("BETA_ACCESS_TOKEN") or os.getenv("01DECK_BETA_ACCESS_TOKEN") or os.getenv("01EVOLVE_API_TOKEN")


def auth_is_enabled() -> bool:
    return bool(get_beta_access_token())


def get_allowed_origins() -> list[str]:
    configured = os.getenv("01DECK_ALLOWED_ORIGINS", "").strip()
    if not configured:
        return list(DEFAULT_ALLOWED_ORIGINS)
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


def get_allowed_hosts() -> list[str]:
    configured = os.getenv("01DECK_ALLOWED_HOSTS", "").strip()
    if not configured:
        return ["127.0.0.1", "localhost"]
    return [host.strip() for host in configured.split(",") if host.strip()]


def get_client_id(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def request_is_authenticated(request: Request) -> bool:
    expected = get_beta_access_token()
    if not expected:
        return True

    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token and secrets.compare_digest(token, expected):
            return True

    cookie_token = request.cookies.get(SESSION_COOKIE_NAME, "")
    return session_cookie_is_valid(cookie_token)


def require_api_access(request: Request) -> None:
    if request_is_authenticated(request):
        return
    raise HTTPException(status_code=401, detail="authentication required")


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._events: dict[str, deque[float]] = defaultdict(deque)

    def enforce(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            bucket = self._events[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                raise HTTPException(status_code=429, detail="rate limit exceeded")
            bucket.append(now)


rate_limiter = InMemoryRateLimiter()


def enforce_rate_limit(request: Request, action: str, limit: int, window_seconds: int) -> None:
    client_id = get_client_id(request)
    rate_limiter.enforce(f"{action}:{client_id}", limit=limit, window_seconds=window_seconds)


def secure_cookie_settings() -> dict[str, object]:
    secure = os.getenv("01DECK_SECURE_COOKIE", "false").strip().lower() in {"1", "true", "yes", "on"}
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": secure,
        "path": "/",
    }


def get_session_secret() -> str:
    return os.getenv("01DECK_SESSION_SECRET") or get_beta_access_token() or "local-dev-session-secret"


def create_session_cookie() -> str:
    digest = hmac.new(get_session_secret().encode("utf-8"), b"deck-beta-session", hashlib.sha256).hexdigest()
    return digest


def session_cookie_is_valid(value: str) -> bool:
    expected = create_session_cookie()
    return bool(value) and secrets.compare_digest(value, expected)
