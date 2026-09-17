from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


class DecompositionStyle(str, Enum):
    TOP_DOWN = "top_down"
    BOTTOM_UP = "bottom_up"
    DIRECT = "direct"
    BRANCH_AND_PRUNE = "branch_and_prune"


class VerificationStyle(str, Enum):
    NONE = "none"
    SINGLE_CHECK = "single_check"
    DOUBLE_CHECK_BEFORE_COMMIT = "double_check_before_commit"


class ResponseStyle(str, Enum):
    CONCISE_STRUCTURED = "concise_structured"
    VERBOSE_STRUCTURED = "verbose_structured"
    MINIMAL = "minimal"
    REFLECTIVE = "reflective"


class PeerIntegrationStyle(str, Enum):
    SKEPTICAL = "skeptical"
    BALANCED = "balanced"
    DEFERENTIAL = "deferential"


class ErrorRecoveryStyle(str, Enum):
    RETRY_SAME = "retry_same"
    RETRY_ALTERNATE = "retry_alternate"
    ASK_REFRAME = "ask_reframe"


class MemoryMode(str, Enum):
    NONE = "none"
    EPHEMERAL = "ephemeral"
    SESSION_SUMMARY = "session_summary"


class InheritanceMode(str, Enum):
    NONE = "none"
    SUMMARY_ONLY = "summary_only"


class ToolChoiceMode(str, Enum):
    DISABLED = "disabled"
    OPTIONAL = "optional"
    PREFER_WHEN_RELEVANT = "prefer_when_relevant"


class ScoringMethod(str, Enum):
    EXACT_TEXT_MATCH = "exact_text_match"
    NORMALIZED_TEXT_MATCH = "normalized_text_match"
    REGEX_MATCH = "regex_match"
    JSON_VALIDITY = "json_validity"
    NUMERIC_CORRECTNESS = "numeric_correctness"
    SEMANTIC_DISTINCTNESS_BASIC = "semantic_distinctness_basic"
    UNIQUE_OUTPUT_RATIO = "unique_output_ratio"
    CONSISTENCY_RATIO = "consistency_ratio"
    CORRECTION_IMPROVEMENT_RATIO = "correction_improvement_ratio"
    PEER_INTEGRATION_BASIC = "peer_integration_basic"
    EFFICIENCY_NORMALIZED = "efficiency_normalized"


class PairingMode(str, Enum):
    SIMILARITY = "similarity"
    COMPLEMENTARITY = "complementarity"
    DIVERSITY = "diversity"


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class LifecycleState(str, Enum):
    REGISTERED = "registered"
    BASELINED = "baselined"
    EVALUATED = "evaluated"
    SELECTED = "selected"
    BRED = "bred"
    EXPORTED = "exported"
    ARCHIVED = "archived"


class LifecycleEventType(str, Enum):
    AGENT_CREATED = "agent_created"
    BASELINE_CREATED = "baseline_created"
    EVALUATION_COMPLETED = "evaluation_completed"
    PAIR_SELECTED = "pair_selected"
    OFFSPRING_CREATED = "offspring_created"
    EXPORT_WRITTEN = "export_written"


class PluginLayer(str, Enum):
    SERIOUS = "serious"
    FUN = "fun"


class PluginHook(str, Enum):
    AGENT_CREATED = "agent_created"
    BASELINE_CREATED = "baseline_created"
    EVALUATION_COMPLETED = "evaluation_completed"
    OFFSPRING_CREATED = "offspring_created"
    EXPORT_WRITTEN = "export_written"


class PluginTargetType(str, Enum):
    AGENT = "agent"
    BASELINE = "baseline"
    EVALUATION = "evaluation"
    MATING_EVENT = "mating_event"
    EXPORT = "export"


class GenomeTraits(BaseModel):
    discipline: float = Field(ge=0.0, le=1.0)
    adaptability: float = Field(ge=0.0, le=1.0)
    exploration: float = Field(ge=0.0, le=1.0)
    persistence: float = Field(ge=0.0, le=1.0)
    social_receptivity: float = Field(ge=0.0, le=1.0)
    economy: float = Field(ge=0.0, le=1.0)
    planning_depth: float = Field(default=0.5, ge=0.0, le=1.0)
    verification_bias: float = Field(default=0.5, ge=0.0, le=1.0)
    tool_use_bias: float = Field(default=0.5, ge=0.0, le=1.0)
    ambiguity_tolerance: float = Field(default=0.5, ge=0.0, le=1.0)
    retry_bias: float = Field(default=0.5, ge=0.0, le=1.0)


class StrategyGenes(BaseModel):
    decomposition_style: DecompositionStyle = DecompositionStyle.TOP_DOWN
    verification_style: VerificationStyle = VerificationStyle.SINGLE_CHECK
    response_style: ResponseStyle = ResponseStyle.CONCISE_STRUCTURED
    peer_integration_style: PeerIntegrationStyle = PeerIntegrationStyle.BALANCED
    error_recovery_style: ErrorRecoveryStyle = ErrorRecoveryStyle.RETRY_ALTERNATE


class MutationConfig(BaseModel):
    base_mutation_rate: float = Field(default=0.05, ge=0.0, le=1.0)
    trait_mutation_std: float = Field(default=0.03, ge=0.0, le=1.0)
    categorical_mutation_rate: float = Field(default=0.01, ge=0.0, le=1.0)


class GenomeConfig(BaseModel):
    genome_version: str = "1.0"
    traits: GenomeTraits
    strategy_genes: StrategyGenes = Field(default_factory=StrategyGenes)
    mutation: MutationConfig = Field(default_factory=MutationConfig)

    @classmethod
    def neutral(cls) -> "GenomeConfig":
        return cls(
            traits=GenomeTraits(
                discipline=0.5,
                adaptability=0.5,
                exploration=0.5,
                persistence=0.5,
                social_receptivity=0.5,
                economy=0.5,
            )
        )


class TemperamentTraits(BaseModel):
    caution: float = Field(ge=0.0, le=1.0)
    assertiveness: float = Field(ge=0.0, le=1.0)
    deference: float = Field(ge=0.0, le=1.0)
    stubbornness: float = Field(ge=0.0, le=1.0)
    novelty_seeking: float = Field(ge=0.0, le=1.0)
    patience: float = Field(ge=0.0, le=1.0)
    verbosity: float = Field(ge=0.0, le=1.0)


class TemperamentConfig(BaseModel):
    temperament_version: str = "1.0"
    traits: TemperamentTraits

    @classmethod
    def neutral(cls) -> "TemperamentConfig":
        return cls(
            traits=TemperamentTraits(
                caution=0.5,
                assertiveness=0.5,
                deference=0.5,
                stubbornness=0.5,
                novelty_seeking=0.5,
                patience=0.5,
                verbosity=0.5,
            )
        )


class PolicyConfig(BaseModel):
    candidate_count: int = Field(default=2, ge=1, le=8)
    self_check_enabled: bool = True
    self_check_passes: int = Field(default=1, ge=0, le=5)
    max_plan_steps: int = Field(default=4, ge=1, le=20)
    peer_review_weight: float = Field(default=0.45, ge=0.0, le=1.0)
    correction_sensitivity: float = Field(default=0.7, ge=0.0, le=1.0)
    hedge_threshold: float = Field(default=0.62, ge=0.0, le=1.0)
    verbosity_budget: float = Field(default=0.35, ge=0.0, le=1.0)
    retry_limit: int = Field(default=2, ge=0, le=10)
    branch_factor: int = Field(default=2, ge=1, le=8)
    enforce_format_strictness: float = Field(default=0.81, ge=0.0, le=1.0)

    @classmethod
    def baseline(cls) -> "PolicyConfig":
        return cls(
            candidate_count=1,
            self_check_passes=0,
            peer_review_weight=0.2,
            verbosity_budget=0.2,
            retry_limit=1,
        )


class MemoryConfig(BaseModel):
    memory_mode: MemoryMode = MemoryMode.NONE
    allow_long_term_write: bool = False
    summary_length_budget: int = Field(default=128, ge=0, le=4096)
    inheritance_mode: InheritanceMode = InheritanceMode.NONE


class ToolConfig(BaseModel):
    tools_enabled: bool = False
    allowed_tools: list[str] = Field(default_factory=list)
    tool_choice_mode: ToolChoiceMode = ToolChoiceMode.DISABLED
    max_tool_calls_per_task: int = Field(default=0, ge=0, le=20)


class RuntimeConfig(BaseModel):
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens: int = Field(default=512, ge=1, le=8192)
    timeout_seconds: int = Field(default=30, ge=1, le=300)
    deterministic_mode: bool = True
    random_seed: int = 7
    parallel_trials: int = Field(default=1, ge=1, le=16)
    trace_capture_enabled: bool = True


class AgentCreate(BaseModel):
    name: str
    description: str | None = None
    species_tag: str = "default"
    base_model: str
    model_provider: str
    system_prompt_template: str
    genome: GenomeConfig
    temperament: TemperamentConfig
    policy_config: PolicyConfig
    memory_config: MemoryConfig
    tool_config: ToolConfig
    runtime_config: RuntimeConfig
    metadata: dict[str, Any] = Field(default_factory=dict)
    active: bool = True
    # 01Protocol identity — signed identity record and optional bundle record from the frontend SDK
    identity_record: str | None = None
    bundle_record: str | None = None

    @model_validator(mode="after")
    def validate_prompt(self) -> "AgentCreate":
        if "{agent_name}" not in self.system_prompt_template:
            raise ValueError("system_prompt_template must include {agent_name}")
        return self


class AgentRead(AgentCreate):
    agent_id: str = Field(default_factory=lambda: new_id("agent"))
    created_at: datetime = Field(default_factory=utc_now)


class TestCaseConfig(BaseModel):
    id: str
    label: str
    category: str
    repeats: int = Field(default=1, ge=1, le=20)
    prompts: list[str]
    scoring_method: ScoringMethod
    expected_outputs: list[str] | None = None
    regex_pattern: str | None = None
    numeric_answer: float | None = None
    evaluation_notes: str = ""


class EvaluationSuiteConfig(BaseModel):
    suite_id: str
    version: str
    description: str
    tests: list[TestCaseConfig]
    thresholds: dict[str, float] = Field(default_factory=dict)
    scoring_weights: dict[str, float] = Field(default_factory=dict)


class TestRunRead(BaseModel):
    test_id: str
    category: str
    prompt_text: str
    expected_json: dict[str, Any] = Field(default_factory=dict)
    actual_output: str
    score: float
    score_explanation: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    latency_ms: int | None = None
    raw_trace_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class PhenotypeProfile(BaseModel):
    viability: float = 0.0
    context_sensitivity: float = 0.0
    instruction_following: float = 0.0
    entropy: float = 0.0
    consistency: float = 0.0
    goal_pursuit: float = 0.0
    correction: float = 0.0
    robustness: float = 0.0
    cooperation: float = 0.0
    efficiency: float = 0.0


class TemperamentProfile(BaseModel):
    caution: float = 0.0
    assertiveness: float = 0.0
    deference: float = 0.0
    stubbornness: float = 0.0
    novelty_seeking: float = 0.0
    patience: float = 0.0
    verbosity: float = 0.0


class VarianceProfile(BaseModel):
    model_config = ConfigDict(extra="allow")


class DeltaProfile(BaseModel):
    model_config = ConfigDict(extra="allow")


class LatentTraitProfile(BaseModel):
    discipline: float = 0.0
    adaptability: float = 0.0
    exploration: float = 0.0
    persistence: float = 0.0
    social_receptivity: float = 0.0
    economy: float = 0.0


class FitnessProfile(BaseModel):
    fitness: float = 0.0
    component_scores: dict[str, float] = Field(default_factory=dict)
    eligible_to_breed: bool = False
    threshold_failures: list[str] = Field(default_factory=list)


class BaselineProfile(BaseModel):
    baseline_agent_id: str
    suite_id: str
    phenotype: PhenotypeProfile
    temperament: TemperamentProfile
    variance: VarianceProfile = Field(default_factory=VarianceProfile)
    created_at: datetime = Field(default_factory=utc_now)


class PluginReportRead(BaseModel):
    report_id: str = Field(default_factory=lambda: new_id("plug"))
    plugin_id: str
    layer: PluginLayer
    hook: PluginHook
    target_type: PluginTargetType
    target_id: str
    summary: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class EvaluationRunRead(BaseModel):
    run_id: str = Field(default_factory=lambda: new_id("eval"))
    agent_id: str
    baseline_profile_id: str | None = None
    suite_id: str
    temperament_suite_id: str | None = None
    status: RunStatus = RunStatus.PENDING
    phenotype: PhenotypeProfile = Field(default_factory=PhenotypeProfile)
    temperament: TemperamentProfile = Field(default_factory=TemperamentProfile)
    variance: VarianceProfile = Field(default_factory=VarianceProfile)
    delta: DeltaProfile = Field(default_factory=DeltaProfile)
    latent_traits: LatentTraitProfile = Field(default_factory=LatentTraitProfile)
    fitness: FitnessProfile = Field(default_factory=FitnessProfile)
    eligible_to_breed: bool = False
    started_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None
    test_runs: list[TestRunRead] = Field(default_factory=list)
    plugin_reports: list[PluginReportRead] = Field(default_factory=list)


class PairingCandidate(BaseModel):
    agent_id: str
    phenotype: PhenotypeProfile
    temperament: TemperamentProfile
    latent_traits: LatentTraitProfile
    fitness: float
    eligible_to_breed: bool


class PairSelectionConfig(BaseModel):
    similarity_weight: float = 0.5
    complementarity_weight: float = 0.35
    diversity_weight: float = 0.15
    top_k: int = 10


class PairSelectionResult(BaseModel):
    parent_a_id: str
    parent_b_id: str
    pairing_mode: PairingMode
    similarity_score: float
    complementarity_score: float
    diversity_score: float
    penalty_score: float
    total_score: float
    notes: list[str] = Field(default_factory=list)


class RecombinationConfig(BaseModel):
    scalar_mode: Literal["parent_a", "parent_b", "average", "weighted_blend"] = "weighted_blend"
    bounded_mutation: bool = True
    use_parent_fitness_weighting: bool = True


class MutationRecord(BaseModel):
    field: str
    before: Any
    after: Any
    delta: float | None = None


class MatingEventCreate(BaseModel):
    parent_a_id: str
    parent_b_id: str
    pairing_mode: PairingMode
    recombination: RecombinationConfig = Field(default_factory=RecombinationConfig)


class MatingEventRead(MatingEventCreate):
    event_id: str = Field(default_factory=lambda: new_id("mate"))
    child_agent_id: str
    mutation_records: list[MutationRecord] = Field(default_factory=list)
    parent_snapshot: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class LifecycleEventRead(BaseModel):
    event_id: str = Field(default_factory=lambda: new_id("life"))
    agent_id: str
    event_type: LifecycleEventType
    state: LifecycleState
    summary: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class CompiledAgentSpec(BaseModel):
    agent_id: str
    rendered_system_prompt: str
    execution_flags: dict[str, Any]
    scoring_hints: dict[str, Any]
    derived_runtime_parameters: dict[str, Any]
    compiler_trace: dict[str, Any]


class PluginDescriptor(BaseModel):
    plugin_id: str
    name: str
    description: str
    layer: PluginLayer
    hooks: list[PluginHook]
    enabled: bool = True


class PluginToggleConfig(BaseModel):
    plugin_id: str
    enabled: bool = True
    settings: dict[str, Any] = Field(default_factory=dict)


class PluginStackConfig(BaseModel):
    stack_name: str
    description: str = ""
    plugins: list[PluginToggleConfig] = Field(default_factory=list)


class ExportRecord(BaseModel):
    path: str
    agent_id: str
    evaluation_run_id: str
    created_at: datetime = Field(default_factory=utc_now)


class SupportCategory(str, Enum):
    BILLING = "billing"
    ACCESS_LOGIN = "access/login"
    PRODUCT_INFO = "product_info"
    REFUND = "refund"
    TECHNICAL_ISSUE = "technical_issue"
    ESCALATION_REQUIRED = "escalation_required"


class SupportAdapterMode(str, Enum):
    MOCK = "mock"
    REAL = "real"


class SupportSelectionStrategy(str, Enum):
    BALANCED = "balanced"
    POLICY_FIRST = "policy_first"
    ESCALATION_FIRST = "escalation_first"


class SupportPolicyRule(BaseModel):
    rule_id: str
    category: SupportCategory
    summary: str
    allowed_actions: list[str] = Field(default_factory=list)
    escalation_target: str | None = None
    notes: list[str] = Field(default_factory=list)


class SupportCaseConfig(BaseModel):
    case_id: str
    issue_type: SupportCategory
    customer_message: str
    context: dict[str, Any] = Field(default_factory=dict)
    expected_action: str
    expected_escalate: bool
    expected_escalation_target: str | None = None
    expected_customer_response: str
    feedback_message: str


class SupportEvaluationSuiteConfig(BaseModel):
    suite_id: str
    version: str
    description: str
    dimensions: list[str]
    scoring_weights: dict[str, float]
    eligibility_gates: dict[str, float]
    success_criteria: dict[str, float] = Field(default_factory=dict)


class SupportScorecard(BaseModel):
    intent_classification: float = 0.0
    policy_correct_response: float = 0.0
    format_compliance: float = 0.0
    escalation_judgment: float = 0.0
    correction_after_feedback: float = 0.0
    efficiency: float = 0.0
    weighted_overall_fitness: float = 0.0
    delta_vs_baseline: dict[str, float] = Field(default_factory=dict)
    parent_eligible: bool = False
    failed_threshold_reasons: list[str] = Field(default_factory=list)


class SupportCaseResult(BaseModel):
    case_id: str
    issue_type: SupportCategory
    first_response: str
    revised_response: str
    metrics: dict[str, float]
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    feedback_total_tokens: int | None = None
    latency_ms: int | None = None
    feedback_latency_ms: int | None = None
    notes: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class SupportEvaluationRun(BaseModel):
    run_id: str = Field(default_factory=lambda: new_id("supp"))
    agent_id: str
    suite_id: str
    adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK
    status: RunStatus = RunStatus.PENDING
    baseline_agent_id: str | None = None
    benchmark_run_id: str | None = None
    generation_number: int = 0
    scorecard: SupportScorecard = Field(default_factory=SupportScorecard)
    case_results: list[SupportCaseResult] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None


class SupportBaselineRecord(BaseModel):
    baseline_id: str = Field(default_factory=lambda: new_id("base"))
    agent_id: str
    suite_id: str
    scorecard: SupportScorecard
    created_at: datetime = Field(default_factory=utc_now)


class SupportBenchmarkCandidate(BaseModel):
    agent_id: str
    latest_run_id: str
    generation_number: int
    scorecard: SupportScorecard
    tags: list[str] = Field(default_factory=list)


class SupportGenerationResult(BaseModel):
    generation_number: int
    selected_parent_ids: list[str]
    created_agent_ids: list[str]
    top_candidates: list[SupportBenchmarkCandidate]
    best_agent_id: str
    best_score: float


class SupportBenchmarkReport(BaseModel):
    benchmark_run_id: str
    suite_id: str
    baseline_agent_id: str
    best_agent_id: str
    generations_completed: int
    population_size: int
    baseline_scorecard: SupportScorecard
    best_scorecard: SupportScorecard
    percent_improvements: dict[str, float] = Field(default_factory=dict)
    success_criteria_results: dict[str, bool] = Field(default_factory=dict)
    score_trend: list[float] = Field(default_factory=list)
    top_candidates: list[SupportBenchmarkCandidate] = Field(default_factory=list)
    output_path: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class SupportBenchmarkRun(BaseModel):
    benchmark_run_id: str = Field(default_factory=lambda: new_id("bench"))
    suite_id: str
    baseline_agent_id: str
    population_size: int
    generations_requested: int
    mutation_rate: float = Field(ge=0.0, le=1.0)
    selection_strategy: SupportSelectionStrategy = SupportSelectionStrategy.BALANCED
    adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK
    report: SupportBenchmarkReport | None = None
    created_at: datetime = Field(default_factory=utc_now)


class AccountPublic(BaseModel):
    """User account fields safe to hand back to the client — never the password hash/salt."""

    account_id: str
    username: str
    display_name: str
    xp: int
    level: int
    is_system_account: bool = False
    created_at: datetime
    last_login_at: datetime | None = None


# ---------------------------------------------------------------------------
# Social layer response models
# ---------------------------------------------------------------------------


class AccountPresence(BaseModel):
    """Minimal public identity used in the online roster and message/forum author fields."""

    account_id: str
    username: str
    display_name: str
    is_system_account: bool = False


class GlobalChatMessage(BaseModel):
    """A single message in a global chat channel, with sender info already resolved."""

    message_id: int
    channel: str
    sender: AccountPresence
    content: str
    created_at: datetime


class DirectConversation(BaseModel):
    """An account's view of one of its 1:1 conversations."""

    conversation_id: str
    other_participant: AccountPresence
    last_message_at: datetime
    last_message_preview: str | None = None


class DirectMessage(BaseModel):
    """A single message inside a direct conversation."""

    message_id: int
    conversation_id: str
    sender: AccountPresence
    content: str
    created_at: datetime


class ForumThread(BaseModel):
    """A forum thread with author info and reply count resolved."""

    thread_id: str
    author: AccountPresence
    title: str
    body: str
    tags: list[str]
    reply_count: int
    created_at: datetime


class ForumReply(BaseModel):
    """A reply to a forum thread, with author info resolved."""

    reply_id: str
    thread_id: str
    author: AccountPresence
    content: str
    created_at: datetime
