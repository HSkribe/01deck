from __future__ import annotations

import os
import secrets
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

SESSION_COOKIE_NAME = "deck_beta_session"
ACCOUNT_SESSION_COOKIE_NAME = "deck_account_session"
DEFAULT_ALLOWED_ORIGINS = (
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
)

# In-memory session store: maps session token -> expiry timestamp
_sessions: dict[str, float] = {}
_sessions_lock = threading.Lock()
SESSION_TTL_SECONDS = 60 * 60 * 24  # 24 hours

# In-memory per-user account session store: maps session token -> (account_id, expiry).
# Separate from the beta-gate session above — that one answers "is this visitor
# allowed past the beta wall at all", this one answers "which signed-in account,
# if any, is making this request". A process restart invalidates all of these
# (same tradeoff as the beta sessions above); once accounts live behind a real
# multi-instance deployment this store needs to move to the database/Redis so
# login survives a restart and works across instances.
_account_sessions: dict[str, tuple[str, float]] = {}
_account_sessions_lock = threading.Lock()
ACCOUNT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days


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
    # Only trust X-Forwarded-For when explicitly running behind a proxy.
    if os.getenv("TRUST_PROXY", "").strip().lower() in {"1", "true", "yes"}:
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            return forwarded
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def request_is_authenticated(request: Request) -> bool:
    expected = get_beta_access_token()
    if not expected:
        # Auth is explicitly disabled — only allow in local dev, not production.
        env = os.getenv("01DECK_ENV", "dev").strip().lower()
        if env == "production":
            return False
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


def enforce_global_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    """Like enforce_rate_limit, but keyed only by `key` — no client IP folded in.
    Use for limits that must hold regardless of which address the request comes
    from, e.g. locking out login attempts against one username even when they
    are spread across many IPs (the credential-stuffing case the client-side
    per-browser throttle in AuthContext.tsx could never actually stop)."""
    rate_limiter.enforce(key, limit=limit, window_seconds=window_seconds)


def secure_cookie_settings() -> dict[str, object]:
    secure = os.getenv("01DECK_SECURE_COOKIE", "false").strip().lower() in {"1", "true", "yes", "on"}
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": secure,
        "path": "/",
        "max_age": SESSION_TTL_SECONDS,
    }


def create_session_cookie() -> str:
    """Generate a unique random session token and register it in the session store."""
    token = secrets.token_hex(32)
    expiry = time.monotonic() + SESSION_TTL_SECONDS
    with _sessions_lock:
        _evict_expired_sessions()
        _sessions[token] = expiry
    return token


def session_cookie_is_valid(value: str) -> bool:
    if not value:
        return False
    with _sessions_lock:
        expiry = _sessions.get(value)
        if expiry is None:
            return False
        if time.monotonic() > expiry:
            del _sessions[value]
            return False
        return True


def revoke_session_cookie(value: str) -> None:
    with _sessions_lock:
        _sessions.pop(value, None)


def _evict_expired_sessions() -> None:
    """Remove expired sessions. Must be called with _sessions_lock held."""
    now = time.monotonic()
    expired = [k for k, exp in _sessions.items() if now > exp]
    for k in expired:
        del _sessions[k]


def account_session_cookie_settings() -> dict[str, object]:
    secure = os.getenv("01DECK_SECURE_COOKIE", "false").strip().lower() in {"1", "true", "yes", "on"}
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": secure,
        "path": "/",
        "max_age": ACCOUNT_SESSION_TTL_SECONDS,
    }


def create_account_session(account_id: str) -> str:
    """Generate a unique random session token bound to account_id."""
    token = secrets.token_hex(32)
    expiry = time.monotonic() + ACCOUNT_SESSION_TTL_SECONDS
    with _account_sessions_lock:
        _evict_expired_account_sessions()
        _account_sessions[token] = (account_id, expiry)
    return token


def account_id_from_session(token: str) -> str | None:
    if not token:
        return None
    with _account_sessions_lock:
        entry = _account_sessions.get(token)
        if entry is None:
            return None
        account_id, expiry = entry
        if time.monotonic() > expiry:
            del _account_sessions[token]
            return None
        return account_id


def revoke_account_session(token: str) -> None:
    with _account_sessions_lock:
        _account_sessions.pop(token, None)


def _evict_expired_account_sessions() -> None:
    """Remove expired account sessions. Must be called with _account_sessions_lock held."""
    now = time.monotonic()
    expired = [k for k, (_, exp) in _account_sessions.items() if now > exp]
    for k in expired:
        del _account_sessions[k]
