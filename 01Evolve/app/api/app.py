from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, Field

from app.api.security import (
    auth_is_enabled,
    create_session_cookie,
    enforce_rate_limit,
    get_allowed_hosts,
    get_allowed_origins,
    get_beta_access_token,
    require_api_access,
    request_is_authenticated,
    SESSION_COOKIE_NAME,
    session_cookie_is_valid,
    secure_cookie_settings,
)
from app.core.bootstrap import build_services
from app.core.llm.adapters import OpenAICompatibleAdapter
from app.core.lineage.service import LineageService
from app.core.schemas.models import AgentCreate, SupportAdapterMode, SupportSelectionStrategy

api = FastAPI(title="01Evolve API")
api.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
api.add_middleware(TrustedHostMiddleware, allowed_hosts=get_allowed_hosts())


@api.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    if request.url.path.startswith("/auth/") or request.url.path.startswith("/chat/"):
        response.headers["Cache-Control"] = "no-store"
    return response


def services():
    return build_services()


class SupportAgentCreateRequest(BaseModel):
    config: AgentCreate


class SupportBaselineCreateRequest(BaseModel):
    config: AgentCreate
    suite_path: str = "app/configs/suites/support_tier1_v1.yaml"


class SupportEvaluationRequest(BaseModel):
    agent_id: str
    suite_path: str = "app/configs/suites/support_tier1_v1.yaml"
    baseline_agent_id: str | None = None
    adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK
    benchmark_run_id: str | None = None
    generation_number: int = 0
    tags: list[str] = Field(default_factory=list)


class SupportGenerationRequest(BaseModel):
    suite_path: str = "app/configs/suites/support_tier1_v1.yaml"
    baseline_agent_id: str
    benchmark_run_id: str | None = None
    generation_number: int = Field(default=1, ge=1, le=10)
    top_k: int = Field(default=5, ge=1, le=20)


class SupportBenchmarkRequest(BaseModel):
    suite_path: str = "app/configs/suites/support_tier1_v1.yaml"
    baseline_config_path: str = "app/configs/baselines/support-baseline.yaml"
    parent_config_paths: list[str] = Field(
        default_factory=lambda: [
            "app/configs/genomes/support-parent-a.yaml",
            "app/configs/genomes/support-parent-b.yaml",
        ]
    )
    population_size: int = Field(default=20, ge=2, le=50)
    generations: int = Field(default=3, ge=1, le=10)
    mutation_rate: float = Field(default=0.08, ge=0.0, le=0.5)
    selection_strategy: SupportSelectionStrategy = SupportSelectionStrategy.BALANCED
    adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK
    benchmark_output_path: str | None = "reports/support-benchmark-report.json"


class BetaSessionRequest(BaseModel):
    token: str = Field(min_length=8, max_length=256)


class ChatMessagePayload(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=8000)


class ChatProxyRequest(BaseModel):
    model: str = Field(default="gpt-4.1-mini", min_length=1, max_length=128)
    temperature: float = Field(default=0.8, ge=0.0, le=2.0)
    max_tokens: int = Field(default=512, ge=1, le=2048)
    messages: list[ChatMessagePayload] = Field(default_factory=list, min_length=1, max_length=32)


class ChatProxyResponse(BaseModel):
    text: str
    model: str


@api.get("/auth/session")
def auth_session_status(request: Request):
    return {"enabled": auth_is_enabled(), "authenticated": request_is_authenticated(request)}


@api.post("/auth/session")
def create_auth_session(payload: BetaSessionRequest, response: Response):
    expected = get_beta_access_token()
    if not expected:
        return {"enabled": False, "authenticated": True}
    if not payload.token or not secrets_compare(payload.token, expected):
        raise HTTPException(status_code=401, detail="invalid access token")
    response.set_cookie(SESSION_COOKIE_NAME, create_session_cookie(), **secure_cookie_settings())
    return {"enabled": True, "authenticated": True}


@api.delete("/auth/session")
def destroy_auth_session(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"authenticated": False}


def secrets_compare(left: str, right: str) -> bool:
    import secrets

    return secrets.compare_digest(left, right)


@api.post("/chat/completions")
async def proxy_chat_completion(payload: ChatProxyRequest, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "chat", limit=30, window_seconds=60)

    provider_api_key = os.getenv("OPENAI_API_KEY")
    if not provider_api_key:
        raise HTTPException(status_code=503, detail="server-side chat provider is not configured")

    provider_base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model_name = payload.model or os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    system_message = next((item.content for item in payload.messages if item.role == "system"), "")
    conversation = "\n".join(f"{item.role}: {item.content}" for item in payload.messages if item.role != "system")
    adapter = OpenAICompatibleAdapter(base_url=provider_base_url, api_key=provider_api_key, model=model_name)
    try:
        result = await adapter.generate(
            system_prompt=system_message,
            user_prompt=conversation,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
        )
    except Exception as exc:  # pragma: no cover - network/provider dependent
        raise HTTPException(status_code=502, detail=f"chat provider request failed: {exc}") from exc
    return ChatProxyResponse(text=result.text, model=model_name)


@api.post("/agents")
def create_agent(payload: AgentCreate, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "agents", limit=20, window_seconds=60)
    svc = services()
    return svc.agents.create_agent(payload)


@api.post("/baselines")
def create_baseline(agent: AgentCreate, phenotype_suite_path: str, temperament_suite_path: str, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "baselines", limit=10, window_seconds=60)
    svc = services()
    saved = svc.agents.create_agent(agent)
    baseline_id, baseline = svc.evaluations.create_baseline(saved.agent_id, phenotype_suite_path, temperament_suite_path)
    return {"baseline_id": baseline_id, "baseline": baseline}


@api.post("/evaluations/run")
def run_evaluation(agent_id: str, phenotype_suite_path: str, temperament_suite_path: str, request: Request, baseline_agent_id: str | None = None):
    require_api_access(request)
    enforce_rate_limit(request, "evaluations", limit=20, window_seconds=60)
    svc = services()
    try:
        return svc.evaluations.evaluate_agent(agent_id, phenotype_suite_path, temperament_suite_path, baseline_agent_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@api.get("/agents/{agent_id}/profile")
def get_profile(agent_id: str, request: Request):
    require_api_access(request)
    evaluation = services().repository.get_latest_evaluation(agent_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="profile not found")
    return evaluation


@api.post("/pairs/select")
def select_pairs_route(request: Request, species_tag: str | None = None, top_k: int = 10):
    require_api_access(request)
    enforce_rate_limit(request, "pairs", limit=20, window_seconds=60)
    return services().evolution.select_pairs(species_tag=species_tag, top_k=top_k)


@api.post("/breed")
def breed_route(parent_a_id: str, parent_b_id: str, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "breed", limit=10, window_seconds=60)
    svc = services()
    try:
        child, event, plugin_reports = svc.evolution.breed(parent_a_id, parent_b_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"child": child, "mating_event": event, "plugin_reports": plugin_reports}


@api.get("/lineage/{agent_id}")
def lineage(agent_id: str, request: Request):
    require_api_access(request)
    svc = services()
    return LineageService(svc.repository).show(agent_id)


@api.post("/support-agents")
def create_support_agent(payload: SupportAgentCreateRequest, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "support-agents", limit=20, window_seconds=60)
    return services().support.create_support_agent(payload.config)


@api.post("/support-baselines")
def create_support_baseline(payload: SupportBaselineCreateRequest, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "support-baselines", limit=10, window_seconds=60)
    svc = services()
    agent = svc.support.create_support_agent(payload.config)
    baseline_eval = svc.support.evaluate_support_agent(agent.agent_id, payload.suite_path)
    from app.core.schemas.models import SupportBaselineRecord

    baseline = SupportBaselineRecord(
        agent_id=agent.agent_id,
        suite_id=baseline_eval.suite_id,
        scorecard=baseline_eval.scorecard,
    )
    svc.repository.save_support_baseline(baseline)
    return {"agent": agent, "evaluation": baseline_eval, "baseline": baseline}


@api.post("/support-evaluations/run")
def run_support_evaluation(payload: SupportEvaluationRequest, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "support-evaluations", limit=30, window_seconds=60)
    try:
        return services().support.evaluate_support_agent(
            payload.agent_id,
            suite_path=payload.suite_path,
            baseline_agent_id=payload.baseline_agent_id,
            adapter_mode=payload.adapter_mode,
            benchmark_run_id=payload.benchmark_run_id,
            generation_number=payload.generation_number,
            tags=payload.tags,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@api.post("/support-populations/evaluate")
def run_support_population(payload: dict, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "support-populations", limit=10, window_seconds=60)
    return services().support.evaluate_support_population(
        payload["agent_ids"],
        suite_path=payload.get("suite_path", "app/configs/suites/support_tier1_v1.yaml"),
        baseline_agent_id=payload.get("baseline_agent_id"),
        adapter_mode=payload.get("adapter_mode", SupportAdapterMode.MOCK),
        benchmark_run_id=payload.get("benchmark_run_id"),
        generation_number=payload.get("generation_number", 0),
    )


@api.post("/support-generations/run")
def run_support_generation(payload: SupportGenerationRequest, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "support-generations", limit=10, window_seconds=60)
    return services().support.run_support_generation(
        suite_path=payload.suite_path,
        baseline_agent_id=payload.baseline_agent_id,
        benchmark_run_id=payload.benchmark_run_id,
        generation_number=payload.generation_number,
        top_k=payload.top_k,
    )


@api.post("/support-benchmark/run")
def run_support_benchmark(payload: SupportBenchmarkRequest, request: Request):
    require_api_access(request)
    enforce_rate_limit(request, "support-benchmark", limit=4, window_seconds=300)
    return services().support.run_support_benchmark(
        suite_path=payload.suite_path,
        baseline_config_path=payload.baseline_config_path,
        parent_config_paths=payload.parent_config_paths,
        population_size=payload.population_size,
        generations=payload.generations,
        mutation_rate=payload.mutation_rate,
        selection_strategy=payload.selection_strategy,
        adapter_mode=payload.adapter_mode,
        benchmark_output_path=payload.benchmark_output_path,
    )


@api.get("/support-agents/{agent_id}/profile")
def get_support_profile(agent_id: str, request: Request):
    require_api_access(request)
    evaluation = services().repository.get_latest_support_evaluation(agent_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="support profile not found")
    return evaluation


@api.get("/support-agents/{agent_id}/lineage")
def get_support_lineage(agent_id: str, request: Request):
    require_api_access(request)
    return services().support.get_support_lineage(agent_id)


@api.get("/support-benchmark/{run_id}/report")
def get_support_benchmark_report(run_id: str, request: Request):
    require_api_access(request)
    report = services().support.get_benchmark_report(run_id)
    if not report:
        raise HTTPException(status_code=404, detail="support benchmark report not found")
    return report
