from __future__ import annotations


def test_signup_login_me_work_without_beta_token_even_when_one_is_configured(client, monkeypatch):
    # Regression test for the real production incident this guards against:
    # accounts are meant to be their own access-control mechanism, not
    # gated behind the separate pre-launch beta secret. A visitor with no
    # beta credential at all must still be able to sign up, log in, and
    # view their own account -- even when a real BETA_ACCESS_TOKEN is
    # configured server-side (which makes require_api_access reject
    # everything by default, since dev-mode-open no longer applies once a
    # token exists).
    monkeypatch.setenv("BETA_ACCESS_TOKEN", "some-real-beta-secret-the-client-never-sends")

    signup_resp = client.post(
        "/account/signup",
        json={"username": "nobetauser", "display_name": "No Beta", "password": "Passw0rd!"},
    )
    assert signup_resp.status_code == 200, signup_resp.text

    me_resp = client.get("/account/me")
    assert me_resp.status_code == 200

    xp_resp = client.post("/account/xp", json={"amount": 10})
    assert xp_resp.status_code == 200

    logout_resp = client.delete("/account/session")
    assert logout_resp.status_code == 200

    login_resp = client.post("/account/login", json={"username": "nobetauser", "password": "Passw0rd!"})
    assert login_resp.status_code == 200

    # The beta gate must still apply to endpoints other than /account/* --
    # this isn't a blanket removal of access control, just a scoped one.
    chat_resp = client.post("/chat/completions", json={"messages": [{"role": "user", "content": "hi"}]})
    assert chat_resp.status_code == 401
    assert chat_resp.json()["detail"] == "authentication required"


def test_signup_login_me_logout_flow(client):
    signup_resp = client.post(
        "/account/signup",
        json={"username": "NewUser", "display_name": "New User", "password": "Passw0rd!"},
    )
    assert signup_resp.status_code == 200, signup_resp.text
    account = signup_resp.json()["account"]
    assert account["username"] == "newuser"
    assert "deck_account_session" in signup_resp.cookies

    me_resp = client.get("/account/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["account"]["username"] == "newuser"

    logout_resp = client.delete("/account/session")
    assert logout_resp.status_code == 200
    assert logout_resp.json() == {"authenticated": False}

    me_after_logout = client.get("/account/me")
    assert me_after_logout.status_code == 401


def test_signup_duplicate_username_rejected(client):
    payload = {"username": "dupeuser", "display_name": "Dupe", "password": "Passw0rd!"}
    first = client.post("/account/signup", json=payload)
    assert first.status_code == 200

    second = client.post("/account/signup", json=payload)
    assert second.status_code == 400


def test_signup_rejects_weak_password(client):
    resp = client.post(
        "/account/signup",
        json={"username": "weakpassuser", "display_name": "Weak", "password": "alllowercase"},
    )
    assert resp.status_code == 400


def test_login_wrong_password_rejected(client):
    client.post(
        "/account/signup",
        json={"username": "loginuser", "display_name": "Login User", "password": "Passw0rd!"},
    )
    bad = client.post("/account/login", json={"username": "loginuser", "password": "wrongpass"})
    assert bad.status_code == 401

    good = client.post("/account/login", json={"username": "loginuser", "password": "Passw0rd!"})
    assert good.status_code == 200
    assert good.json()["account"]["last_login_at"] is not None


def test_login_rate_limited_per_username_regardless_of_source(client):
    client.post(
        "/account/signup",
        json={"username": "throttleduser", "display_name": "Throttled", "password": "Passw0rd!"},
    )

    for _ in range(8):
        resp = client.post("/account/login", json={"username": "throttleduser", "password": "wrongpass"})
        assert resp.status_code == 401

    # The 9th attempt is blocked by the per-username limiter even with the
    # correct password — this is what makes it distributed-brute-force-proof,
    # unlike the old client-side-only throttle in AuthContext.tsx.
    limited = client.post("/account/login", json={"username": "throttleduser", "password": "Passw0rd!"})
    assert limited.status_code == 429


def test_xp_award_requires_session_and_updates_level(client):
    resp = client.post("/account/xp", json={"amount": 100})
    assert resp.status_code == 401

    client.post(
        "/account/signup",
        json={"username": "xpuser", "display_name": "XP User", "password": "Passw0rd!"},
    )
    awarded = client.post("/account/xp", json={"amount": 750})
    assert awarded.status_code == 200
    assert awarded.json()["account"]["xp"] == 750
    assert awarded.json()["account"]["level"] == 2
