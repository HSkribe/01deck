from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class AgentRecord(Base):
    __tablename__ = "agents"
    id: Mapped[int] = mapped_column(primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    species_tag: Mapped[str] = mapped_column(String(128), index=True)
    base_model: Mapped[str] = mapped_column(String(128))
    model_provider: Mapped[str] = mapped_column(String(128))
    system_prompt_template: Mapped[str] = mapped_column(Text())
    metadata_json: Mapped[str] = mapped_column(Text(), default="{}")
    identity_record: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bundle_record: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class GenomeRecord(Base):
    __tablename__ = "genomes"
    id: Mapped[int] = mapped_column(primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64), index=True)
    genome_version: Mapped[str] = mapped_column(String(32))
    traits_json: Mapped[str] = mapped_column(Text())
    strategy_genes_json: Mapped[str] = mapped_column(Text())
    mutation_json: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TemperamentRecord(Base):
    __tablename__ = "temperaments"
    id: Mapped[int] = mapped_column(primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64), index=True)
    temperament_version: Mapped[str] = mapped_column(String(32))
    traits_json: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ConfigRecord(Base):
    __tablename__ = "configs"
    id: Mapped[int] = mapped_column(primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64), index=True)
    config_type: Mapped[str] = mapped_column(String(32), index=True)
    config_json: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class EvaluationSuiteRecord(Base):
    __tablename__ = "evaluation_suites"
    id: Mapped[int] = mapped_column(primary_key=True)
    suite_id: Mapped[str] = mapped_column(String(128), index=True)
    version: Mapped[str] = mapped_column(String(32))
    description: Mapped[str] = mapped_column(Text())
    suite_json: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class BaselineProfileRecord(Base):
    __tablename__ = "baseline_profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    baseline_agent_id: Mapped[str] = mapped_column(String(64), index=True)
    suite_id: Mapped[str] = mapped_column(String(128), index=True)
    phenotype_json: Mapped[str] = mapped_column(Text())
    temperament_json: Mapped[str] = mapped_column(Text())
    variance_json: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class EvaluationRunRecord(Base):
    __tablename__ = "evaluation_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    agent_id: Mapped[str] = mapped_column(String(64), index=True)
    baseline_profile_id: Mapped[int | None] = mapped_column(ForeignKey("baseline_profiles.id"), nullable=True)
    suite_id: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32))
    phenotype_json: Mapped[str] = mapped_column(Text())
    temperament_json: Mapped[str] = mapped_column(Text())
    variance_json: Mapped[str] = mapped_column(Text())
    delta_json: Mapped[str] = mapped_column(Text())
    latent_traits_json: Mapped[str] = mapped_column(Text())
    fitness_json: Mapped[str] = mapped_column(Text())
    eligible_to_breed: Mapped[bool] = mapped_column(Boolean(), default=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TestRunRecord(Base):
    __tablename__ = "test_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    evaluation_run_id: Mapped[int] = mapped_column(ForeignKey("evaluation_runs.id"))
    test_id: Mapped[str] = mapped_column(String(128), index=True)
    category: Mapped[str] = mapped_column(String(128), index=True)
    prompt_text: Mapped[str] = mapped_column(Text())
    expected_json: Mapped[str] = mapped_column(Text())
    actual_output: Mapped[str] = mapped_column(Text())
    score: Mapped[float] = mapped_column(Float())
    score_explanation: Mapped[str] = mapped_column(Text())
    prompt_tokens: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    raw_trace_json: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MatingEventRecord(Base):
    __tablename__ = "mating_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    parent_a_id: Mapped[str] = mapped_column(String(64), index=True)
    parent_b_id: Mapped[str] = mapped_column(String(64), index=True)
    child_agent_id: Mapped[str] = mapped_column(String(64), index=True)
    pairing_mode: Mapped[str] = mapped_column(String(32))
    recombination_json: Mapped[str] = mapped_column(Text())
    mutation_json: Mapped[str] = mapped_column(Text())
    parent_snapshot_json: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class LineageLinkRecord(Base):
    __tablename__ = "lineage_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[str] = mapped_column(String(64), index=True)
    child_id: Mapped[str] = mapped_column(String(64), index=True)
    relation_type: Mapped[str] = mapped_column(String(64), default="genetic_parent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class LifecycleEventRecord(Base):
    __tablename__ = "lifecycle_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    agent_id: Mapped[str] = mapped_column(String(64), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    lifecycle_state: Mapped[str] = mapped_column(String(32), index=True)
    summary: Mapped[str] = mapped_column(Text())
    payload_json: Mapped[str] = mapped_column(Text(), default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PluginReportRecord(Base):
    __tablename__ = "plugin_reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    plugin_id: Mapped[str] = mapped_column(String(128), index=True)
    layer: Mapped[str] = mapped_column(String(16), index=True)
    hook: Mapped[str] = mapped_column(String(64), index=True)
    target_type: Mapped[str] = mapped_column(String(32), index=True)
    target_id: Mapped[str] = mapped_column(String(64), index=True)
    summary: Mapped[str] = mapped_column(Text())
    payload_json: Mapped[str] = mapped_column(Text(), default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class SupportBaselineRecordModel(Base):
    __tablename__ = "support_baselines"
    id: Mapped[int] = mapped_column(primary_key=True)
    baseline_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    agent_id: Mapped[str] = mapped_column(String(64), index=True)
    suite_id: Mapped[str] = mapped_column(String(128), index=True)
    scorecard_json: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class SupportEvaluationRunRecord(Base):
    __tablename__ = "support_evaluation_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    agent_id: Mapped[str] = mapped_column(String(64), index=True)
    suite_id: Mapped[str] = mapped_column(String(128), index=True)
    adapter_mode: Mapped[str] = mapped_column(String(16), default="mock")
    status: Mapped[str] = mapped_column(String(32))
    baseline_agent_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    benchmark_run_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    generation_number: Mapped[int] = mapped_column(Integer(), default=0)
    intent_classification_score: Mapped[float] = mapped_column(Float(), default=0.0)
    policy_correct_response_score: Mapped[float] = mapped_column(Float(), default=0.0)
    format_compliance_score: Mapped[float] = mapped_column(Float(), default=0.0)
    escalation_judgment_score: Mapped[float] = mapped_column(Float(), default=0.0)
    correction_after_feedback_score: Mapped[float] = mapped_column(Float(), default=0.0)
    efficiency_score: Mapped[float] = mapped_column(Float(), default=0.0)
    weighted_overall_score: Mapped[float] = mapped_column(Float(), default=0.0)
    delta_vs_baseline_json: Mapped[str] = mapped_column(Text(), default="{}")
    parent_eligible: Mapped[bool] = mapped_column(Boolean(), default=False)
    failed_threshold_reasons_json: Mapped[str] = mapped_column(Text(), default="[]")
    tags_json: Mapped[str] = mapped_column(Text(), default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SupportCaseResultRecord(Base):
    __tablename__ = "support_case_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    support_evaluation_run_id: Mapped[int] = mapped_column(ForeignKey("support_evaluation_runs.id"), index=True)
    case_id: Mapped[str] = mapped_column(String(128), index=True)
    issue_type: Mapped[str] = mapped_column(String(64), index=True)
    first_response: Mapped[str] = mapped_column(Text())
    revised_response: Mapped[str] = mapped_column(Text())
    metrics_json: Mapped[str] = mapped_column(Text(), default="{}")
    notes_json: Mapped[str] = mapped_column(Text(), default="[]")
    prompt_tokens: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    feedback_total_tokens: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    feedback_latency_ms: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UserAccountRecord(Base):
    __tablename__ = "user_accounts"
    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    password_salt: Mapped[str] = mapped_column(String(64))
    password_iterations: Mapped[int] = mapped_column(Integer())
    xp: Mapped[int] = mapped_column(Integer(), default=0)
    level: Mapped[int] = mapped_column(Integer(), default=1)
    # Flags this row as a platform-controlled service account (e.g. Bosun the AI
    # co-host) so the frontend can render it differently from human accounts.
    # Default False — every real user signup gets a human account.
    is_system_account: Mapped[bool] = mapped_column(Boolean(), default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Human profile step (collected once, right after signup, before agent
    # creation) -- both optional by design. age_range is a bucket label
    # ("18-24" etc, see AGE_RANGE_OPTIONS in accounts/service.py), never a
    # raw birthdate. avatar_data_url is a data: URI (uploaded photo, resized
    # client-side) -- same storage pattern already used for agent portraits
    # elsewhere in this app; capped size enforced at the API layer.
    age_range: Mapped[str | None] = mapped_column(String(16), nullable=True)
    avatar_data_url: Mapped[str | None] = mapped_column(Text(), nullable=True)


class BosunCoreKnowledgeRecord(Base):
    """Tier 1: shared, hand-curated, always injected in full — Bosun's
    personality and standing platform facts. Small by design; never grows
    from user interaction."""

    __tablename__ = "bosun_core_knowledge"
    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    content: Mapped[str] = mapped_column(Text())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class BosunSharedMemoryRecord(Base):
    """Tier 2: shared, retrieved by relevance rather than injected in full.
    Never populated directly from a user's conversation — status starts
    'pending' and only becomes visible to retrieval once explicitly
    approved (see BosunService.approve_shared_memory), so one user's
    private conversation can't silently become everyone's knowledge."""

    __tablename__ = "bosun_shared_memories"
    id: Mapped[int] = mapped_column(primary_key=True)
    memory_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    content: Mapped[str] = mapped_column(Text())
    source_account_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)  # pending | approved | rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class BosunUserMemoryRecord(Base):
    """Tier 3: private per-account facts, always loaded in full for that
    account's own requests only. Bounded per account (pruned oldest-first
    by BosunService) so aggregate storage scales with user count, not
    message volume."""

    __tablename__ = "bosun_user_memories"
    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[str] = mapped_column(String(64), index=True)
    content: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class BosunConversationTurnRecord(Base):
    """Tier 4: raw per-account chat history. Grows with interaction volume
    by design — retrieval pulls only the top-K relevant turns per request
    (see BosunService._retrieve_relevant_turns), never the full history."""

    __tablename__ = "bosun_conversation_turns"
    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[str] = mapped_column(String(64), index=True)
    role: Mapped[str] = mapped_column(String(16))  # user | bosun
    content: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class SupportBenchmarkRunRecord(Base):
    __tablename__ = "support_benchmark_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    benchmark_run_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    suite_id: Mapped[str] = mapped_column(String(128), index=True)
    baseline_agent_id: Mapped[str] = mapped_column(String(64), index=True)
    population_size: Mapped[int] = mapped_column(Integer())
    generations_requested: Mapped[int] = mapped_column(Integer())
    mutation_rate: Mapped[float] = mapped_column(Float(), default=0.05)
    selection_strategy: Mapped[str] = mapped_column(String(32), default="balanced")
    adapter_mode: Mapped[str] = mapped_column(String(16), default="mock")
    report_json: Mapped[str] = mapped_column(Text(), default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# ---------------------------------------------------------------------------
# Social layer — presence, global chat, direct messages, forum
# ---------------------------------------------------------------------------


class PresenceHeartbeatRecord(Base):
    """Tracks when each account last signalled it was online.

    Updated on every POST /presence/heartbeat; queried by GET /presence/online
    to return accounts active in the last 2 minutes. Bosun's row is excluded
    from the recency filter so he always appears online without needing a
    heartbeat daemon.
    """

    __tablename__ = "presence_heartbeats"
    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class GlobalChatMessageRecord(Base):
    """A single message posted to a named global chat channel (e.g. 'general').

    Channels are soft-namespaced strings; 'general' is the default and the
    only one the initial frontend uses, but the schema supports adding more
    (e.g. 'announcements', 'trading') without a migration.

    The auto-increment `id` is exposed directly as `message_id` to clients
    for cursor-based polling (the after_id param on GET /chat/global).
    Using the PK directly keeps inserts single-phase and integer comparisons
    for cursor filtering are as cheap as possible.
    """

    __tablename__ = "global_chat_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    channel: Mapped[str] = mapped_column(String(64), index=True, default="general")
    sender_account_id: Mapped[str] = mapped_column(String(64), index=True)
    content: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DirectConversationRecord(Base):
    """The persistent envelope for a 1:1 conversation between two accounts.

    account_a_id and account_b_id are stored in lexicographic order so that
    looking up "the conversation between A and B" is a single deterministic
    SELECT regardless of who initiated it. Enforced in the repository
    create/find method — callers never need to think about ordering.
    """

    __tablename__ = "direct_conversations"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    account_a_id: Mapped[str] = mapped_column(String(64), index=True)
    account_b_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    # Denormalised for fast "conversations ordered by recent activity" queries
    # on GET /messages/conversations without a subquery over all messages.
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DirectMessageRecord(Base):
    """A single message inside a DirectConversationRecord."""

    __tablename__ = "direct_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(64), index=True)
    sender_account_id: Mapped[str] = mapped_column(String(64), index=True)
    content: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ForumThreadRecord(Base):
    """A top-level discussion thread in the Forum."""

    __tablename__ = "forum_threads"
    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    author_account_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(512))
    body: Mapped[str] = mapped_column(Text())
    # JSON-serialised list[str]; stored as text to avoid a join table for
    # what is essentially display metadata, not a relational key.
    tags_json: Mapped[str] = mapped_column(Text(), default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ForumReplyRecord(Base):
    """A reply to a ForumThreadRecord."""

    __tablename__ = "forum_replies"
    id: Mapped[int] = mapped_column(primary_key=True)
    reply_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    thread_id: Mapped[str] = mapped_column(String(64), index=True)
    author_account_id: Mapped[str] = mapped_column(String(64), index=True)
    content: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
