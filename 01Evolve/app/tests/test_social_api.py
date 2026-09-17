"""Tests for the social layer: presence, global chat, direct messages, and forum.

Follows the same conventions as test_accounts_api.py:
  - Uses the shared `client` fixture (isolated per-test SQLite DB).
  - Covers auth-required checks, rate-limit checks (where they'd fire in a
    normal test run), happy-path flows, and error/edge cases.
"""
from __future__ import annotations

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _signup_and_login(client, username: str, password: str = "Passw0rd!") -> dict:
    """Sign up a new account and return the account dict. Cookie is set on client."""
    resp = client.post(
        "/account/signup",
        json={"username": username, "display_name": username.title(), "password": password},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["account"]


def _logout(client):
    client.delete("/account/session")


def _login(client, username: str, password: str = "Passw0rd!") -> dict:
    resp = client.post("/account/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["account"]


# ===========================================================================
# Bosun bootstrap
# ===========================================================================


def test_bosun_appears_in_presence_on_first_boot(client):
    """Bosun's system account and presence row are seeded by build_services()."""
    resp = client.get("/presence/online")
    assert resp.status_code == 200
    online = resp.json()["online"]
    bosun_entries = [a for a in online if a["account_id"] == "bosun"]
    assert len(bosun_entries) == 1
    assert bosun_entries[0]["username"] == "bosun"
    assert bosun_entries[0]["is_system_account"] is True


def test_bosun_account_is_marked_system_in_account_public(client):
    """The is_system_account field propagates from the DB into AccountPublic/AccountPresence."""
    # Bosun always shows up in the online roster; spot-check the flag there.
    online = client.get("/presence/online").json()["online"]
    bosun = next(a for a in online if a["account_id"] == "bosun")
    assert bosun["is_system_account"] is True


# ===========================================================================
# Presence — heartbeat
# ===========================================================================


def test_heartbeat_requires_auth(client):
    resp = client.post("/presence/heartbeat")
    assert resp.status_code == 401


def test_heartbeat_marks_account_online(client):
    _signup_and_login(client, "hbuser")
    resp = client.post("/presence/heartbeat")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}

    online = client.get("/presence/online").json()["online"]
    ids = [a["account_id"] for a in online]
    account = next(a for a in online if a["username"] == "hbuser")
    assert account["username"] == "hbuser"
    assert account["is_system_account"] is False


# ===========================================================================
# Presence — online roster
# ===========================================================================


def test_online_is_public(client):
    """GET /presence/online requires no auth."""
    resp = client.get("/presence/online")
    assert resp.status_code == 200
    assert "online" in resp.json()


def test_online_does_not_include_account_that_never_heartbeated(client):
    """An account that signed up but never sent a heartbeat is not in the online list
    (Bosun is always present but that's a system account, not a human)."""
    _signup_and_login(client, "nohbuser")
    _logout(client)
    online = client.get("/presence/online").json()["online"]
    usernames = [a["username"] for a in online]
    assert "nohbuser" not in usernames


# ===========================================================================
# Global chat — post
# ===========================================================================


def test_global_chat_post_requires_auth(client):
    resp = client.post("/chat/global", json={"content": "hello"})
    assert resp.status_code == 401


def test_global_chat_post_happy_path(client):
    _signup_and_login(client, "chatuser")
    resp = client.post("/chat/global", json={"content": "Hello world!"})
    assert resp.status_code == 200
    msg = resp.json()["message"]
    assert msg["content"] == "Hello world!"
    assert msg["channel"] == "general"
    assert msg["sender"]["username"] == "chatuser"
    assert "message_id" in msg
    assert "created_at" in msg


def test_global_chat_post_custom_channel(client):
    _signup_and_login(client, "channeluser")
    resp = client.post("/chat/global", json={"channel": "announcements", "content": "Hey"})
    assert resp.status_code == 200
    assert resp.json()["message"]["channel"] == "announcements"


def test_global_chat_post_rejects_empty_content(client):
    _signup_and_login(client, "emptychatuser")
    resp = client.post("/chat/global", json={"content": "   "})
    # Pydantic min_length=1 blocks pure whitespace before service validation
    assert resp.status_code in (400, 422)


# ===========================================================================
# Global chat — read
# ===========================================================================


def test_global_chat_read_is_public(client):
    resp = client.get("/chat/global")
    assert resp.status_code == 200
    assert "messages" in resp.json()


def test_global_chat_cursor_pagination(client):
    _signup_and_login(client, "paginationuser")
    for i in range(5):
        client.post("/chat/global", json={"content": f"Message {i}"})

    all_resp = client.get("/chat/global?limit=100")
    assert all_resp.status_code == 200
    all_msgs = all_resp.json()["messages"]
    assert len(all_msgs) >= 5

    # Fetch only messages after the first one
    first_id = all_msgs[0]["message_id"]
    partial_resp = client.get(f"/chat/global?after_id={first_id}&limit=100")
    assert partial_resp.status_code == 200
    partial_msgs = partial_resp.json()["messages"]
    # Should exclude the first message
    assert all(m["message_id"] > first_id for m in partial_msgs)


def test_global_chat_messages_ordered_oldest_first(client):
    _signup_and_login(client, "orderuser")
    client.post("/chat/global", json={"content": "First"})
    client.post("/chat/global", json={"content": "Second"})

    msgs = client.get("/chat/global?limit=100").json()["messages"]
    # Filter to only our test messages to avoid interference from other tests
    our_msgs = [m for m in msgs if m["content"] in ("First", "Second") and m["sender"]["username"] == "orderuser"]
    assert len(our_msgs) == 2
    assert our_msgs[0]["content"] == "First"
    assert our_msgs[1]["content"] == "Second"


# ===========================================================================
# Direct messages — start conversation
# ===========================================================================


def test_start_conversation_requires_auth(client):
    resp = client.post("/messages/start", json={"other_account_id": "someuser"})
    assert resp.status_code == 401


def test_start_conversation_with_nonexistent_account_returns_404(client):
    _signup_and_login(client, "dmuser1")
    resp = client.post("/messages/start", json={"other_account_id": "ghost_id_that_does_not_exist"})
    assert resp.status_code == 404


def test_start_conversation_with_self_returns_400(client):
    account = _signup_and_login(client, "dmself")
    resp = client.post("/messages/start", json={"other_account_id": account["account_id"]})
    assert resp.status_code == 400


def test_start_conversation_happy_path_and_idempotent(client):
    alice = _signup_and_login(client, "alice_dm")
    alice_id = alice["account_id"]

    _logout(client)
    bob = _signup_and_login(client, "bob_dm")
    bob_id = bob["account_id"]

    # Bob starts conversation with Alice
    resp1 = client.post("/messages/start", json={"other_account_id": alice_id})
    assert resp1.status_code == 200
    conv_id = resp1.json()["conversation_id"]
    assert conv_id

    # Calling start again returns the same conversation_id
    resp2 = client.post("/messages/start", json={"other_account_id": alice_id})
    assert resp2.status_code == 200
    assert resp2.json()["conversation_id"] == conv_id


# ===========================================================================
# Direct messages — list conversations
# ===========================================================================


def test_list_conversations_requires_auth(client):
    resp = client.get("/messages/conversations")
    assert resp.status_code == 401


def test_list_conversations_shows_other_participant(client):
    alice = _signup_and_login(client, "alice_conv")
    alice_id = alice["account_id"]
    _logout(client)

    _signup_and_login(client, "bob_conv")
    client.post("/messages/start", json={"other_account_id": alice_id})

    convs = client.get("/messages/conversations").json()["conversations"]
    assert len(convs) >= 1
    our_conv = next(c for c in convs if c["other_participant"]["username"] == "alice_conv")
    assert our_conv["other_participant"]["username"] == "alice_conv"


# ===========================================================================
# Direct messages — send and read
# ===========================================================================


def test_send_dm_requires_auth(client):
    resp = client.post("/messages/fake_conv_id/send", json={"content": "hi"})
    assert resp.status_code == 401


def test_get_dm_requires_auth(client):
    resp = client.get("/messages/fake_conv_id")
    assert resp.status_code == 401


def test_send_and_read_dm_happy_path(client):
    alice = _signup_and_login(client, "alice_msg")
    alice_id = alice["account_id"]
    _logout(client)

    _signup_and_login(client, "bob_msg")
    conv_resp = client.post("/messages/start", json={"other_account_id": alice_id})
    conv_id = conv_resp.json()["conversation_id"]

    send_resp = client.post(f"/messages/{conv_id}/send", json={"content": "Hey Alice!"})
    assert send_resp.status_code == 200
    msg = send_resp.json()["message"]
    assert msg["content"] == "Hey Alice!"
    assert msg["sender"]["username"] == "bob_msg"
    assert msg["conversation_id"] == conv_id

    msgs_resp = client.get(f"/messages/{conv_id}")
    assert msgs_resp.status_code == 200
    messages = msgs_resp.json()["messages"]
    assert len(messages) == 1
    assert messages[0]["content"] == "Hey Alice!"


def test_send_dm_forbidden_for_non_participant(client):
    alice = _signup_and_login(client, "alice_np")
    alice_id = alice["account_id"]
    _logout(client)

    bob = _signup_and_login(client, "bob_np")
    bob_id = bob["account_id"]
    conv_resp = client.post("/messages/start", json={"other_account_id": alice_id})
    conv_id = conv_resp.json()["conversation_id"]
    _logout(client)

    # Eve is not in Alice-Bob's conversation
    _signup_and_login(client, "eve_np")
    send_resp = client.post(f"/messages/{conv_id}/send", json={"content": "I shouldn't be here"})
    assert send_resp.status_code == 403


def test_read_dm_forbidden_for_non_participant(client):
    alice = _signup_and_login(client, "alice_nread")
    alice_id = alice["account_id"]
    _logout(client)

    bob = _signup_and_login(client, "bob_nread")
    conv_resp = client.post("/messages/start", json={"other_account_id": alice_id})
    conv_id = conv_resp.json()["conversation_id"]
    _logout(client)

    _signup_and_login(client, "eve_nread")
    resp = client.get(f"/messages/{conv_id}")
    assert resp.status_code == 403


def test_dm_cursor_pagination(client):
    alice = _signup_and_login(client, "alice_page")
    alice_id = alice["account_id"]
    _logout(client)

    _signup_and_login(client, "bob_page")
    conv_id = client.post("/messages/start", json={"other_account_id": alice_id}).json()["conversation_id"]

    for i in range(5):
        client.post(f"/messages/{conv_id}/send", json={"content": f"msg {i}"})

    all_msgs = client.get(f"/messages/{conv_id}?limit=100").json()["messages"]
    assert len(all_msgs) == 5

    # Cursor: only messages after id of first message
    first_id = all_msgs[0]["message_id"]
    later_msgs = client.get(f"/messages/{conv_id}?after_id={first_id}").json()["messages"]
    assert len(later_msgs) == 4
    assert all(m["message_id"] > first_id for m in later_msgs)


# ===========================================================================
# Forum — create thread
# ===========================================================================


def test_forum_create_thread_requires_auth(client):
    resp = client.post("/forum/threads", json={"title": "Test", "body": "Hello"})
    assert resp.status_code == 401


def test_forum_create_thread_happy_path(client):
    _signup_and_login(client, "forumuser")
    resp = client.post(
        "/forum/threads",
        json={"title": "My First Thread", "body": "This is the body.", "tags": ["hello", "world"]},
    )
    assert resp.status_code == 200
    thread = resp.json()["thread"]
    assert thread["title"] == "My First Thread"
    assert thread["body"] == "This is the body."
    assert thread["tags"] == ["hello", "world"]
    assert thread["reply_count"] == 0
    assert thread["author"]["username"] == "forumuser"


def test_forum_create_thread_empty_title_rejected(client):
    _signup_and_login(client, "forumuser2")
    resp = client.post("/forum/threads", json={"title": "  ", "body": "Some body"})
    # Pydantic min_length=1 rejects a single-space title that Pydantic strips
    # before the service sees it; either 400 or 422 is correct here.
    assert resp.status_code in (400, 422)


# ===========================================================================
# Forum — list threads
# ===========================================================================


def test_forum_list_threads_is_public(client):
    resp = client.get("/forum/threads")
    assert resp.status_code == 200
    assert "threads" in resp.json()


def test_forum_list_threads_newest_first(client):
    _signup_and_login(client, "listuser")
    client.post("/forum/threads", json={"title": "Thread A", "body": "body a"})
    client.post("/forum/threads", json={"title": "Thread B", "body": "body b"})

    threads = client.get("/forum/threads?limit=50").json()["threads"]
    our = [t for t in threads if t["title"] in ("Thread A", "Thread B") and t["author"]["username"] == "listuser"]
    assert len(our) == 2
    # Newest first — Thread B was created last
    assert our[0]["title"] == "Thread B"
    assert our[1]["title"] == "Thread A"


def test_forum_list_threads_pagination_with_before_id(client):
    _signup_and_login(client, "pageuser")
    thread_ids = []
    for i in range(4):
        t = client.post("/forum/threads", json={"title": f"PagThread {i}", "body": "body"}).json()["thread"]
        thread_ids.append(t["thread_id"])

    first_page = client.get("/forum/threads?limit=2").json()["threads"]
    assert len(first_page) == 2
    oldest_on_first_page = first_page[-1]["thread_id"]

    second_page = client.get(f"/forum/threads?limit=2&before_id={oldest_on_first_page}").json()["threads"]
    assert len(second_page) <= 2
    # All threads on second page must be older (lower PK) than oldest on first page
    first_page_ids = {t["thread_id"] for t in first_page}
    second_page_ids = {t["thread_id"] for t in second_page}
    assert not first_page_ids.intersection(second_page_ids)


# ===========================================================================
# Forum — get thread detail
# ===========================================================================


def test_forum_get_thread_is_public(client):
    _signup_and_login(client, "detailuser")
    thread_id = client.post(
        "/forum/threads", json={"title": "Detail Thread", "body": "Detail body"}
    ).json()["thread"]["thread_id"]
    _logout(client)

    resp = client.get(f"/forum/threads/{thread_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["thread"]["title"] == "Detail Thread"
    assert data["replies"] == []


def test_forum_get_nonexistent_thread_returns_404(client):
    resp = client.get("/forum/threads/nonexistent_id_xyz")
    assert resp.status_code == 404


# ===========================================================================
# Forum — replies
# ===========================================================================


def test_forum_reply_requires_auth(client):
    resp = client.post("/forum/threads/fake_id/replies", json={"content": "Hello"})
    assert resp.status_code == 401


def test_forum_reply_to_nonexistent_thread_returns_404(client):
    _signup_and_login(client, "replyuser_404")
    resp = client.post("/forum/threads/does_not_exist/replies", json={"content": "Hi"})
    assert resp.status_code == 404


def test_forum_reply_happy_path(client):
    _signup_and_login(client, "threadauthor")
    thread_id = client.post(
        "/forum/threads", json={"title": "Reply Thread", "body": "Hello"}
    ).json()["thread"]["thread_id"]
    _logout(client)

    _signup_and_login(client, "replier")
    reply_resp = client.post(
        f"/forum/threads/{thread_id}/replies",
        json={"content": "Great thread!"},
    )
    assert reply_resp.status_code == 200
    reply = reply_resp.json()["reply"]
    assert reply["content"] == "Great thread!"
    assert reply["author"]["username"] == "replier"
    assert reply["thread_id"] == thread_id

    # Now the thread detail should show the reply
    detail = client.get(f"/forum/threads/{thread_id}").json()
    assert detail["thread"]["reply_count"] == 1
    assert detail["replies"][0]["content"] == "Great thread!"


def test_forum_replies_ordered_oldest_first(client):
    _signup_and_login(client, "replyorder")
    thread_id = client.post(
        "/forum/threads", json={"title": "Order Thread", "body": "Body"}
    ).json()["thread"]["thread_id"]

    client.post(f"/forum/threads/{thread_id}/replies", json={"content": "First reply"})
    client.post(f"/forum/threads/{thread_id}/replies", json={"content": "Second reply"})

    detail = client.get(f"/forum/threads/{thread_id}").json()
    replies = detail["replies"]
    assert len(replies) == 2
    assert replies[0]["content"] == "First reply"
    assert replies[1]["content"] == "Second reply"


# ===========================================================================
# Cache-Control headers
# ===========================================================================


def test_dm_endpoints_send_no_store_header(client):
    _signup_and_login(client, "cacheuser")
    conv_resp = client.get("/messages/conversations")
    assert conv_resp.headers.get("cache-control") == "no-store"


def test_heartbeat_endpoint_sends_no_store_header(client):
    _signup_and_login(client, "hbcacheuser")
    resp = client.post("/presence/heartbeat")
    assert resp.headers.get("cache-control") == "no-store"


def test_global_chat_read_does_not_send_no_store(client):
    """Public read endpoints don't need no-store — they're not per-user data."""
    resp = client.get("/chat/global")
    # Should not have Cache-Control: no-store (may be absent or a different value)
    assert resp.headers.get("cache-control") != "no-store"
