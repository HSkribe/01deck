from __future__ import annotations

import hashlib
import hmac
import re
import secrets

from app.core.persistence.repository import Repository
from app.core.schemas.models import AccountPublic

# OWASP-recommended floor for PBKDF2-SHA256 as of 2023. Chosen over the
# client-side derivePbkdf2Hash's 150_000 (see src/app/context/AuthContext.tsx)
# because this hash now runs once per login on a server we control the CPU
# budget for, rather than on every visitor's browser.
PBKDF2_ITERATIONS = 600_000
SALT_BYTES = 16

USERNAME_PATTERN = re.compile(r"^[a-z0-9_]+$")


class AccountError(ValueError):
    """Raised for validation and credential failures; callers map this to an HTTP 400/401."""


def hash_password(password: str, salt: bytes | None = None, iterations: int = PBKDF2_ITERATIONS) -> tuple[str, str, int]:
    salt = salt or secrets.token_bytes(SALT_BYTES)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations, dklen=32)
    return derived.hex(), salt.hex(), iterations


def verify_password(password: str, password_hash: str, password_salt: str, password_iterations: int) -> bool:
    salt = bytes.fromhex(password_salt)
    candidate, _, _ = hash_password(password, salt=salt, iterations=password_iterations)
    return hmac.compare_digest(candidate, password_hash)


def _is_password_complex_enough(password: str) -> bool:
    classes = [r"[a-z]", r"[A-Z]", r"[0-9]", r"[^a-zA-Z0-9]"]
    matched = sum(1 for pattern in classes if re.search(pattern, password))
    return matched >= 2


def normalize_username(username: str) -> str:
    return username.strip().lower()


def validate_signup_fields(username: str, password: str) -> None:
    if len(username) < 3:
        raise AccountError("Username must be at least 3 characters")
    if len(username) > 64:
        raise AccountError("Username must be 64 characters or fewer")
    if not USERNAME_PATTERN.match(username):
        raise AccountError("Username may only contain letters, numbers, and underscores")
    if len(password) < 8:
        raise AccountError("Password must be at least 8 characters")
    if len(password) > 256:
        raise AccountError("Password must be 256 characters or fewer")
    if not _is_password_complex_enough(password):
        raise AccountError("Password must include at least two of: lowercase, uppercase, numbers, symbols")


class AccountService:
    def __init__(self, repository: Repository):
        self.repository = repository

    def signup(self, username: str, display_name: str, password: str, email: str | None = None) -> AccountPublic:
        clean_username = normalize_username(username)
        validate_signup_fields(clean_username, password)

        if self.repository.get_account_record_by_username(clean_username):
            raise AccountError("Username already taken")

        password_hash, password_salt, iterations = hash_password(password)
        account_id = secrets.token_hex(16)
        try:
            return self.repository.create_account(
                account_id=account_id,
                username=clean_username,
                display_name=display_name.strip() or clean_username,
                password_hash=password_hash,
                password_salt=password_salt,
                password_iterations=iterations,
                email=email.strip().lower() if email else None,
            )
        except Exception as exc:  # sqlalchemy.exc.IntegrityError on a concurrent duplicate signup
            raise AccountError("Username already taken") from exc

    def login(self, username: str, password: str) -> AccountPublic:
        clean_username = normalize_username(username)
        record = self.repository.get_account_record_by_username(clean_username)
        if not record:
            raise AccountError("Invalid username or password")

        if not verify_password(password, record.password_hash, record.password_salt, record.password_iterations):
            raise AccountError("Invalid username or password")

        if record.password_iterations < PBKDF2_ITERATIONS:
            new_hash, new_salt, new_iterations = hash_password(password)
            self.repository.update_account_password(clean_username, new_hash, new_salt, new_iterations)

        updated = self.repository.mark_account_login(clean_username)
        return updated or self.repository.get_account_by_id(record.account_id)  # type: ignore[return-value]

    def get_by_id(self, account_id: str) -> AccountPublic | None:
        return self.repository.get_account_by_id(account_id)

    def award_xp(self, account_id: str, amount: int) -> AccountPublic | None:
        return self.repository.award_account_xp(account_id, amount)
