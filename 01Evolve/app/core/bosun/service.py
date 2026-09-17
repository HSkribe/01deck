from __future__ import annotations

import os
import re
import secrets
from dataclasses import dataclass

from app.core.llm.adapters import LLMAdapter, OpenAICompatibleAdapter
from app.core.persistence.repository import Repository
from app.core.schemas.models import BosunChatReply

# Bounds keep storage proportional to user *count*, not message volume — see
# BosunUserMemoryRecord/BosunConversationTurnRecord docstrings.
MAX_USER_MEMORIES = 30
RECENT_TURN_CANDIDATE_POOL = 40
RELEVANT_TURNS_INCLUDED = 6
RELEVANT_SHARED_MEMORIES_INCLUDED = 4

DEFAULT_PERSONA = (
    "You are Bosun, 01Deck's own agent — the one steady presence every user finds "
    "here, the same one, every time. You keep the deck shipshape: helpful, direct, "
    "a little dry, never fawning. You know this platform well because you live in "
    "it. When you don't know something, say so plainly rather than guessing."
)

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "for", "with", "from", "into", "onto",
    "about", "that", "this", "there", "here", "have", "has", "had", "been",
    "being", "just", "really", "very", "some", "more", "should", "could",
    "would", "can", "you", "me", "my", "i", "is", "are", "was", "were", "to",
    "of", "in", "on", "it", "be", "do", "does", "did", "what", "how", "why",
}


class BosunNotConfiguredError(RuntimeError):
    """Raised when BOSUN_API_KEY isn't set — mirrors the general chat proxy's
    "server-side chat provider is not configured" case."""


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9']+", text.lower())
    return {w for w in words if w not in _STOPWORDS and len(w) > 1}


def _score(query_words: set[str], candidate: str) -> int:
    if not query_words:
        return 0
    return len(query_words & _tokenize(candidate))


@dataclass
class BosunConfig:
    api_key: str | None
    base_url: str
    model: str


def _load_config() -> BosunConfig:
    return BosunConfig(
        api_key=os.getenv("BOSUN_API_KEY"),
        base_url=os.getenv("BOSUN_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/"),
        # openrouter/free (OpenRouter's own router across whatever's currently
        # free) rather than a pinned model: works zero-config today. Trade-off
        # flagged deliberately — the free roster rotates, so Bosun's voice can
        # drift as the underlying model changes. Pin BOSUN_MODEL to a specific
        # model once his personality is dialed in and consistency matters more
        # than staying on the free tier's moving target.
        model=os.getenv("BOSUN_MODEL", "openrouter/free"),
    )


class BosunService:
    def __init__(self, repository: Repository, adapter: LLMAdapter | None = None):
        self.repository = repository
        self._adapter_override = adapter

    def _adapter(self) -> LLMAdapter:
        if self._adapter_override is not None:
            return self._adapter_override
        config = _load_config()
        if not config.api_key:
            raise BosunNotConfiguredError("BOSUN_API_KEY is not configured")
        return OpenAICompatibleAdapter(base_url=config.base_url, api_key=config.api_key, model=config.model)

    def _model_name(self) -> str:
        if self._adapter_override is not None:
            return getattr(self._adapter_override, "model", "mock")
        return _load_config().model

    def _assemble_context(self, account_id: str, message: str) -> str:
        query_words = _tokenize(message)
        sections: list[str] = [DEFAULT_PERSONA]

        core = self.repository.get_bosun_core_knowledge()
        if core:
            sections.append("Platform knowledge:\n" + "\n".join(f"- {item}" for item in core))

        shared = self.repository.get_approved_bosun_shared_memories()
        ranked_shared = sorted(shared, key=lambda m: _score(query_words, m.content), reverse=True)
        relevant_shared = [m for m in ranked_shared[:RELEVANT_SHARED_MEMORIES_INCLUDED] if _score(query_words, m.content) > 0]
        if relevant_shared:
            sections.append("Relevant things you know (shared across everyone):\n" + "\n".join(f"- {m.content}" for m in relevant_shared))

        user_memories = self.repository.get_bosun_user_memories(account_id)
        if user_memories:
            sections.append("What you remember about this specific user:\n" + "\n".join(f"- {m.content}" for m in user_memories))

        candidate_turns = self.repository.get_recent_bosun_turns(account_id, RECENT_TURN_CANDIDATE_POOL)
        ranked_turns = sorted(candidate_turns, key=lambda t: _score(query_words, t[1]), reverse=True)
        relevant_turns = [t for t in ranked_turns[:RELEVANT_TURNS_INCLUDED] if _score(query_words, t[1]) > 0]
        # Restore chronological order for readability once the relevant subset is picked.
        relevant_turns_chrono = [t for t in candidate_turns if t in relevant_turns]
        if relevant_turns_chrono:
            sections.append(
                "Relevant earlier moments in this conversation:\n"
                + "\n".join(f"- {role}: {content}" for role, content in relevant_turns_chrono)
            )

        return "\n\n".join(sections)

    async def chat(
        self,
        account_id: str,
        message: str,
        remember_about_me: bool = False,
        remember_for_everyone: bool = False,
    ) -> BosunChatReply:
        system_prompt = self._assemble_context(account_id, message)
        adapter = self._adapter()
        result = await adapter.generate(system_prompt=system_prompt, user_prompt=message, temperature=0.6, max_tokens=512)

        self.repository.record_bosun_turn(account_id, "user", message)
        self.repository.record_bosun_turn(account_id, "bosun", result.text)

        if remember_about_me:
            self.repository.add_bosun_user_memory(account_id, message, max_per_account=MAX_USER_MEMORIES)

        if remember_for_everyone:
            self.repository.create_bosun_shared_memory_proposal(
                memory_id=secrets.token_hex(12),
                content=message,
                source_account_id=account_id,
            )

        return BosunChatReply(
            text=result.text,
            model=self._model_name(),
            remembered_about_me=remember_about_me,
            proposed_for_everyone=remember_for_everyone,
        )

    def list_my_memories(self, account_id: str):
        return self.repository.get_bosun_user_memories(account_id)

    def forget_me(self, account_id: str) -> None:
        self.repository.delete_bosun_user_memories(account_id)

    def list_pending_shared_memories(self):
        return self.repository.list_pending_bosun_shared_memories()

    def review_shared_memory(self, memory_id: str, approve: bool):
        return self.repository.review_bosun_shared_memory(memory_id, approve)
