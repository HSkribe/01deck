from __future__ import annotations

import pytest

import app.api.app as app_module
from app.core.bosun.service import BosunService
from app.core.llm.adapters import LLMResponse


class FakeAdapter:
    model = "test-model"

    def __init__(self, reply: str = "Deck's clear, Captain."):
        self.reply = reply
        self.calls: list[tuple[str, str]] = []

    async def generate(self, system_prompt, user_prompt, temperature=0.2, max_tokens=512, tools=None):
        self.calls.append((system_prompt, user_prompt))
        return LLMResponse(text=self.reply, prompt_tokens=1, completion_tokens=1, total_tokens=2)


def _signed_up_client(client, username: str = "bosunuser"):
    resp = client.post(
        "/account/signup",
        json={"username": username, "display_name": "Bosun User", "password": "Passw0rd!"},
    )
    assert resp.status_code == 200, resp.text
    return client


def _with_fake_bosun(client, reply: str = "Deck's clear, Captain.") -> FakeAdapter:
    """Swap the test container's BosunService for one with a fake adapter,
    so chat tests don't depend on BOSUN_API_KEY being set."""
    container = app_module.services()
    fake = FakeAdapter(reply)
    container.bosun = BosunService(container.repository, adapter=fake)
    return fake


def test_bosun_chat_requires_account_session(client):
    resp = client.post("/bosun/chat", json={"message": "status report"})
    assert resp.status_code == 401


def test_bosun_chat_503_when_not_configured(client, monkeypatch):
    monkeypatch.delenv("BOSUN_API_KEY", raising=False)
    _signed_up_client(client)
    resp = client.post("/bosun/chat", json={"message": "status report"})
    assert resp.status_code == 503


def test_bosun_chat_replies_and_records_turns(client):
    _signed_up_client(client)
    fake = _with_fake_bosun(client, "All hands accounted for.")

    resp = client.post("/bosun/chat", json={"message": "how's the deck looking"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["text"] == "All hands accounted for."
    assert body["model"] == "test-model"
    assert body["remembered_about_me"] is False
    assert body["proposed_for_everyone"] is False
    assert len(fake.calls) == 1


def test_bosun_remember_about_me_then_recall_via_memory_endpoint(client):
    _signed_up_client(client)
    _with_fake_bosun(client)

    resp = client.post(
        "/bosun/chat",
        json={"message": "I prefer terse answers", "remember_about_me": True},
    )
    assert resp.status_code == 200
    assert resp.json()["remembered_about_me"] is True

    mem_resp = client.get("/bosun/memory/me")
    assert mem_resp.status_code == 200
    contents = [m["content"] for m in mem_resp.json()["memories"]]
    assert "I prefer terse answers" in contents

    forget_resp = client.delete("/bosun/memory/me")
    assert forget_resp.status_code == 200
    assert client.get("/bosun/memory/me").json()["memories"] == []


def test_bosun_shared_memory_proposal_needs_admin_approval(client, monkeypatch):
    _signed_up_client(client)
    _with_fake_bosun(client)

    # Enable the beta gate and pass it (via a beta session, not the bearer
    # token itself) only after signup — otherwise signup's own
    # require_api_access call would 401 with no beta credential yet.
    monkeypatch.setenv("BETA_ACCESS_TOKEN", "test-admin-token")
    beta_login = client.post("/auth/session", json={"token": "test-admin-token"})
    assert beta_login.status_code == 200

    resp = client.post(
        "/bosun/chat",
        json={"message": "the deploy pipeline needs a real domain", "remember_for_everyone": True},
    )
    assert resp.status_code == 200
    assert resp.json()["proposed_for_everyone"] is True

    # No admin credential -> forbidden, regardless of being signed in as a normal account.
    no_admin = client.get("/bosun/memory/shared/pending")
    assert no_admin.status_code == 403

    pending = client.get("/bosun/memory/shared/pending", headers={"Authorization": "Bearer test-admin-token"})
    assert pending.status_code == 200
    proposals = pending.json()["pending"]
    assert len(proposals) == 1
    memory_id = proposals[0]["memory_id"]
    assert proposals[0]["status"] == "pending"

    approve = client.post(
        f"/bosun/memory/shared/{memory_id}/review",
        json={"approve": True},
        headers={"Authorization": "Bearer test-admin-token"},
    )
    assert approve.status_code == 200
    assert approve.json()["memory"]["status"] == "approved"

    # Reviewed proposals drop out of the pending queue.
    pending_after = client.get("/bosun/memory/shared/pending", headers={"Authorization": "Bearer test-admin-token"})
    assert pending_after.json()["pending"] == []


def test_bosun_core_knowledge_admin_only_and_feeds_context(client, monkeypatch):
    _signed_up_client(client)
    fake = _with_fake_bosun(client)

    no_admin = client.post("/bosun/knowledge", json={"key": "voice", "content": "Speak like a ship's bosun."})
    assert no_admin.status_code == 403

    monkeypatch.setenv("BETA_ACCESS_TOKEN", "test-admin-token")
    client.post("/auth/session", json={"token": "test-admin-token"})
    admin_headers = {"Authorization": "Bearer test-admin-token"}

    upsert = client.post(
        "/bosun/knowledge",
        json={"key": "voice", "content": "Speak like a ship's bosun."},
        headers=admin_headers,
    )
    assert upsert.status_code == 200

    listed = client.get("/bosun/knowledge", headers=admin_headers)
    assert listed.status_code == 200
    assert "Speak like a ship's bosun." in listed.json()["knowledge"]

    client.post("/bosun/chat", json={"message": "hello"})
    system_prompt_seen = fake.calls[0][0]
    assert "Speak like a ship's bosun." in system_prompt_seen


def test_bosun_chat_rate_limited_per_account(client):
    _signed_up_client(client)
    _with_fake_bosun(client)

    for _ in range(6):
        resp = client.post("/bosun/chat", json={"message": "ping"})
        assert resp.status_code == 200

    limited = client.post("/bosun/chat", json={"message": "ping"})
    assert limited.status_code == 429


def test_external_presence_sync_requires_admin(client):
    resp = client.post(
        "/presence/external/sync",
        json={"agents": [{"session_key": "agent:main:dashboard:abc", "display_name": "Moss"}]},
    )
    assert resp.status_code == 403


def test_external_presence_sync_creates_account_and_shows_online(client, monkeypatch):
    monkeypatch.setenv("BETA_ACCESS_TOKEN", "test-admin-token")
    client.post("/auth/session", json={"token": "test-admin-token"})
    admin_headers = {"Authorization": "Bearer test-admin-token"}

    resp = client.post(
        "/presence/external/sync",
        json={"agents": [{"session_key": "agent:main:dashboard:abc", "display_name": "Moss"}]},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    account_id = resp.json()["synced"][0]["account_id"]
    assert account_id.startswith("oc_")

    online = client.get("/presence/online").json()["online"]
    matching = [a for a in online if a["account_id"] == account_id]
    assert len(matching) == 1
    assert matching[0]["display_name"] == "Moss"
    assert matching[0]["is_system_account"] is True


def test_external_presence_sync_is_idempotent_per_session_key(client, monkeypatch):
    monkeypatch.setenv("BETA_ACCESS_TOKEN", "test-admin-token")
    client.post("/auth/session", json={"token": "test-admin-token"})
    admin_headers = {"Authorization": "Bearer test-admin-token"}

    first = client.post(
        "/presence/external/sync",
        json={"agents": [{"session_key": "agent:main:dashboard:abc", "display_name": "Moss"}]},
        headers=admin_headers,
    )
    # Renamed on a later sync -- same session_key must resolve to the same
    # account_id and just update the display name, not create a duplicate.
    second = client.post(
        "/presence/external/sync",
        json={"agents": [{"session_key": "agent:main:dashboard:abc", "display_name": "Moss Renamed"}]},
        headers=admin_headers,
    )
    assert first.json()["synced"] == second.json()["synced"]

    online = client.get("/presence/online").json()["online"]
    matching = [a for a in online if a["account_id"] == first.json()["synced"][0]["account_id"]]
    assert len(matching) == 1
    assert matching[0]["display_name"] == "Moss Renamed"
