from __future__ import annotations


def _signed_up_client(client, username: str = "chatuser"):
    resp = client.post(
        "/account/signup",
        json={"username": username, "display_name": "Chat User", "password": "Passw0rd!"},
    )
    assert resp.status_code == 200, resp.text
    return client


def test_chat_completions_requires_account_session(client):
    resp = client.post(
        "/chat/completions",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 401
    assert "sign in" in resp.json()["detail"].lower()


def test_chat_completions_passes_account_gate_once_signed_in(client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    _signed_up_client(client)

    # No OPENAI_API_KEY configured in this test environment — the account
    # gate should be satisfied (no more 401) and the request should fail
    # later, at "provider not configured" (503), proving the boundary that
    # moved is the auth check, not the whole endpoint.
    resp = client.post(
        "/chat/completions",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 503


def test_chat_completions_rate_limited_per_account(client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    _signed_up_client(client)

    for _ in range(30):
        resp = client.post(
            "/chat/completions",
            json={"messages": [{"role": "user", "content": "hi"}]},
        )
        assert resp.status_code == 503

    limited = client.post(
        "/chat/completions",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert limited.status_code == 429
