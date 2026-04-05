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
