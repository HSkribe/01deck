from __future__ import annotations

from app.core.persistence.repository import Repository
from app.core.schemas.models import (
    DirectConversation,
    DirectMessage,
    ForumReply,
    ForumThread,
    GlobalChatMessage,
)


class SocialError(ValueError):
    """Raised for social-layer validation/access failures. Carries the intended
    HTTP status code explicitly, set at the point each error is actually known
    (400 validation, 403 not-a-participant, 404 not-found) rather than making
    the API layer pattern-match on the message text to guess it -- that would
    silently break the moment anyone rewords a message."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


class SocialService:
    """Business logic for presence, global chat, direct messages, and forum.

    Thin wrapper around Repository: validates preconditions (account existence,
    participant membership, self-messaging guard) and delegates all persistence
    to the Repository. Services never touch SQLAlchemy directly.
    """

    def __init__(self, repository: Repository) -> None:
        self.repository = repository

    # ------------------------------------------------------------------
    # Presence
    # ------------------------------------------------------------------

    def heartbeat(self, account_id: str) -> None:
        self.repository.upsert_presence_heartbeat(account_id)

    def get_online(self) -> list[dict]:
        accounts = self.repository.get_online_accounts(window_seconds=120)
        return [a.model_dump() for a in accounts]

    # ------------------------------------------------------------------
    # Global chat
    # ------------------------------------------------------------------

    def post_global_message(
        self, sender_account_id: str, channel: str, content: str
    ) -> GlobalChatMessage:
        if not content.strip():
            raise SocialError("Message content must not be empty")
        if len(content) > 4000:
            raise SocialError("Message content must be 4000 characters or fewer")
        return self.repository.post_global_message(
            channel=channel, sender_account_id=sender_account_id, content=content
        )

    def get_global_messages(
        self, channel: str, after_id: int | None, limit: int
    ) -> list[GlobalChatMessage]:
        limit = max(1, min(limit, 100))
        return self.repository.get_global_messages(
            channel=channel, after_id=after_id, limit=limit
        )

    # ------------------------------------------------------------------
    # Direct messages
    # ------------------------------------------------------------------

    def start_conversation(
        self, caller_account_id: str, other_account_id: str
    ) -> str:
        """Find or create the 1:1 conversation; return conversation_id.

        Raises SocialError (400) if the caller tries to message themselves.
        Raises SocialError (404) if the other account does not exist.
        """
        if caller_account_id == other_account_id:
            raise SocialError("Cannot start a conversation with yourself", status_code=400)
        other = self.repository.get_account_by_id(other_account_id)
        if not other:
            raise SocialError(f"Account {other_account_id!r} not found", status_code=404)
        conv = self.repository.find_or_create_direct_conversation(
            caller_account_id, other_account_id
        )
        return conv.conversation_id

    def list_conversations(self, account_id: str) -> list[DirectConversation]:
        return self.repository.list_direct_conversations(account_id)

    def send_direct_message(
        self, caller_account_id: str, conversation_id: str, content: str
    ) -> DirectMessage:
        """Send a DM; raises SocialError (403) if caller isn't a participant."""
        if not content.strip():
            raise SocialError("Message content must not be empty")
        if len(content) > 4000:
            raise SocialError("Message content must be 4000 characters or fewer")
        conv = self.repository.get_direct_conversation(conversation_id)
        if not conv:
            raise SocialError(f"Conversation {conversation_id!r} not found", status_code=404)
        if caller_account_id not in (conv.account_a_id, conv.account_b_id):
            raise SocialError("Not a participant in this conversation", status_code=403)
        return self.repository.send_direct_message(
            conversation_id=conversation_id,
            sender_account_id=caller_account_id,
            content=content,
        )

    def get_direct_messages(
        self, caller_account_id: str, conversation_id: str, after_id: int | None, limit: int
    ) -> list[DirectMessage]:
        """Fetch DMs; raises SocialError (403) if caller isn't a participant."""
        conv = self.repository.get_direct_conversation(conversation_id)
        if not conv:
            raise SocialError(f"Conversation {conversation_id!r} not found", status_code=404)
        if caller_account_id not in (conv.account_a_id, conv.account_b_id):
            raise SocialError("Not a participant in this conversation", status_code=403)
        limit = max(1, min(limit, 100))
        return self.repository.get_direct_messages(
            conversation_id=conversation_id, after_id=after_id, limit=limit
        )

    # ------------------------------------------------------------------
    # Forum
    # ------------------------------------------------------------------

    def create_thread(
        self, author_account_id: str, title: str, body: str, tags: list[str]
    ) -> ForumThread:
        title = title.strip()
        if not title:
            raise SocialError("Thread title must not be empty")
        if len(title) > 512:
            raise SocialError("Thread title must be 512 characters or fewer")
        if not body.strip():
            raise SocialError("Thread body must not be empty")
        tags = [t.strip() for t in tags if t.strip()][:10]  # cap at 10 tags
        return self.repository.create_forum_thread(
            author_account_id=author_account_id,
            title=title,
            body=body,
            tags=tags,
        )

    def list_threads(
        self, before_id: str | None, limit: int
    ) -> list[ForumThread]:
        limit = max(1, min(limit, 50))
        return self.repository.list_forum_threads(before_id=before_id, limit=limit)

    def get_thread_with_replies(
        self, thread_id: str
    ) -> tuple[ForumThread, list[ForumReply]]:
        """Returns (thread, replies) or raises SocialError (404)."""
        result = self.repository.get_forum_thread_with_replies(thread_id)
        if not result:
            raise SocialError(f"Thread {thread_id!r} not found", status_code=404)
        return result

    def create_reply(
        self, author_account_id: str, thread_id: str, content: str
    ) -> ForumReply:
        if not content.strip():
            raise SocialError("Reply content must not be empty")
        if len(content) > 4000:
            raise SocialError("Reply content must be 4000 characters or fewer")
        # 404 if the thread doesn't exist
        if not self.repository.get_forum_thread(thread_id):
            raise SocialError(f"Thread {thread_id!r} not found", status_code=404)
        return self.repository.create_forum_reply(
            thread_id=thread_id,
            author_account_id=author_account_id,
            content=content,
        )
