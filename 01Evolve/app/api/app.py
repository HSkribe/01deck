from __future__ import annotations

import hashlib
import os
import re

from fnmatch import fnmatch

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from app.api.security import (
    account_id_from_session,
    account_session_cookie_settings,
    ACCOUNT_SESSION_COOKIE_NAME,
    auth_is_enabled,
    create_account_session,
    create_session_cookie,
    enforce_global_rate_limit,
    enforce_rate_limit,
    get_allowed_hosts,
    get_allowed_origins,
    get_beta_access_token,
    require_api_access,
    request_is_authenticated,
    revoke_account_session,
    revoke_session_cookie,
    SESSION_COOKIE_NAME,
    session_cookie_is_valid,
    secure_cookie_settings,
)
from app.core.accounts.service import AccountError
from app.core.bosun.service import BosunNotConfiguredError
from app.core.bootstrap import build_services
from app.core.social.service import SocialError
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

def _host_header_is_allowed(request: Request) -> bool:
    host = request.headers.get("host", "").split(":")[0].lower()
    if not host:
        return False
    # Host headers/DNS names are case-insensitive per spec; confirmed live
    # that CloudFront forwards Host to the origin lowercased even though
    # the CloudFormation-generated ALB DNS name is mixed-case, so an exact,
    # case-sensitive match against 01DECK_ALLOWED_HOSTS never succeeded.
    return any(host == pattern.lower() or fnmatch(host, pattern.lower()) for pattern in get_allowed_hosts())


@api.middleware("http")
async def add_security_headers(request: Request, call_next):
    # CloudFront's /api/* behavior forwards the full path (including /api)
    # to this origin unchanged -- OriginPath is empty, nothing strips it --
    # but every route here is registered at the bare path (/healthz,
    # /account/signup, etc, no /api prefix). Real public traffic 404'd on
    # every single request until now; CloudFront's custom error response
    # then silently rewrote that 404 into the SPA's index.html (200),
    # which is what broke JSON.parse on the frontend. Confirmed live by
    # hitting the ALB directly at the exact path CloudFront forwards.
    # Strip the prefix here, once, before routing, rather than renaming
    # every route or restructuring the app into a mounted sub-app.
    path = request.scope["path"]
    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[len("/api"):]

    # Host validation (replaces TrustedHostMiddleware) with one exemption:
    # /healthz is a static, non-sensitive liveness probe (no auth, no user
    # data, nothing but {"ok": true}) that something inside this
    # deployment's own AWS infrastructure hits directly with a Host header
    # that will never be on 01DECK_ALLOWED_HOSTS -- observed live, hitting
    # both Fargate tasks simultaneously every ~30s, independent of (and in
    # addition to) the ALB's own per-target health check, which does send
    # an allowed Host and always succeeds. That mismatch tripped the ECS
    # deployment circuit breaker on two separate deploy attempts. Every
    # other route still gets full Host validation, unchanged. Only needs
    # to check the bare path now that /api/* is normalized away above.
    if request.url.path != "/healthz" and not _host_header_is_allowed(request):
        # Includes the actual received Host and the current allow-list.
        # Neither is sensitive -- both are already-public DNS names -- and
        # this is the fastest way to diagnose a Host mismatch without
        # CloudWatch log access, which is exactly what masked the
        # /api/healthz bug above through two failed-looking-successful
        # deploys.
        allowed = get_allowed_hosts()
        received = request.headers.get("host", "<no host header>")
        return PlainTextResponse(f"Invalid host header: {received!r} not in {allowed!r}", status_code=400)

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    if (
        request.url.path.startswith("/auth/")
        or request.url.path.startswith("/account/")
        # /chat/completions is the AI proxy — per-user, has real dollar cost.
        # /chat/global is a public read endpoint and must NOT get no-store
        # (doing so would prevent any caching at the CDN layer for public data).
        or request.url.path == "/chat/completions"
        # Per-user social surfaces: DMs and conversations must never be served
        # from a shared cache — they contain private message content.
        or request.url.path.startswith("/messages/")
        or request.url.path == "/presence/heartbeat"
        or request.url.path.startswith("/bosun/")
    ):
        response.headers["Cache-Control"] = "no-store"
    return response


_ALLOWED_CONFIG_PREFIXES = (
    "app/configs/",
    "reports/",
)


def _validate_config_path(path: str, field: str = "path") -> str:
    """Reject path traversal attempts in user-supplied config file paths."""
    if not path:
        raise HTTPException(status_code=400, detail=f"{field} must not be empty")
    if ".." in path or path.startswith("/") or path.startswith("~"):
        raise HTTPException(status_code=400, detail=f"invalid {field}")
    if not any(path.startswith(prefix) for prefix in _ALLOWED_CONFIG_PREFIXES):
        raise HTTPException(status_code=400, detail=f"{field} must be under app/configs/ or reports/")
    return path


def services():
    return build_services()


@api.get("/healthz")
def healthcheck():
    return {"ok": True}


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


class AccountSignupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    display_name: str = Field(default="", max_length=255)
    password: str = Field(min_length=8, max_length=256)
    email: str | None = Field(default=None, max_length=255)


class AccountLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class AccountXpAwardRequest(BaseModel):
    amount: int = Field(ge=-100_000, le=100_000)


class BosunChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    # Both default false and are mutually independent: a user explicitly
    # opts in to Bosun remembering something about them personally, and/or
    # proposing it as shared knowledge for everyone (which still needs
    # separate admin approval — see BosunService/review_bosun_shared_memory).
    # Nothing is remembered just from asking a question.
    remember_about_me: bool = False
    remember_for_everyone: bool = False


class BosunSharedMemoryReviewRequest(BaseModel):
    approve: bool


class BosunCoreKnowledgeUpsertRequest(BaseModel):
    key: str = Field(min_length=1, max_length=128)
    content: str = Field(min_length=1, max_length=4000)


class ExternalAgentPresenceEntry(BaseModel):
    # Opaque identifier from the external system (e.g. an OpenClaw session
    # key like "agent:main:dashboard:<uuid>") -- never shown to users, only
    # hashed into a stable account_id. Not validated for shape since callers
    # (bridge scripts) may use very different key formats.
    session_key: str = Field(min_length=1, max_length=512)
    display_name: str = Field(min_length=1, max_length=64)


class ExternalAgentPresenceSyncRequest(BaseModel):
    agents: list[ExternalAgentPresenceEntry] = Field(default_factory=list, max_length=50)


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


# Social layer request models

class GlobalChatPostRequest(BaseModel):
    channel: str = Field(default="general", min_length=1, max_length=64)
    content: str = Field(min_length=1, max_length=4000)


class StartConversationRequest(BaseModel):
    other_account_id: str = Field(min_length=1, max_length=64)


class SendDirectMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class CreateForumThreadRequest(BaseModel):
    title: str = Field(min_length=1, max_length=512)
    body: str = Field(min_length=1, max_length=32000)
    tags: list[str] = Field(default_factory=list, max_length=10)


class CreateForumReplyRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


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
def destroy_auth_session(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE_NAME, "")
    if token:
        revoke_session_cookie(token)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"authenticated": False}


def secrets_compare(left: str, right: str) -> bool:
    import secrets

    return secrets.compare_digest(left, right)


def _current_account_id(request: Request) -> str | None:
    token = request.cookies.get(ACCOUNT_SESSION_COOKIE_NAME, "")
    return account_id_from_session(token)


@api.post("/account/signup")
def account_signup(payload: AccountSignupRequest, request: Request, response: Response):
    # Deliberately not behind require_api_access (the pre-launch beta
    # token) -- that gate was designed for "invite-only testers before
    # public launch," a different model than "anyone can create a real
    # account." Real accounts are now their own access-control mechanism
    # (password auth, rate limiting below); the beta token still gates
    # other things (chat proxy, agent creation, Bosun) as before.
    enforce_rate_limit(request, "account-signup", limit=10, window_seconds=300)
    try:
        account = services().accounts.signup(
            payload.username, payload.display_name, payload.password, payload.email
        )
    except AccountError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    token = create_account_session(account.account_id)
    response.set_cookie(ACCOUNT_SESSION_COOKIE_NAME, token, **account_session_cookie_settings())
    return {"account": account}


@api.post("/account/login")
def account_login(payload: AccountLoginRequest, request: Request, response: Response):
    # See account_signup's comment -- not behind the beta token by design.
    enforce_rate_limit(request, "account-login", limit=20, window_seconds=60)
    # Per-username, IP-independent: stops credential stuffing spread across
    # many addresses, which the per-IP limit above and the old client-side
    # throttle in AuthContext.tsx could never actually catch.
    enforce_global_rate_limit(f"account-login-user:{payload.username.strip().lower()}", limit=8, window_seconds=60)
    try:
        account = services().accounts.login(payload.username, payload.password)
    except AccountError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    token = create_account_session(account.account_id)
    response.set_cookie(ACCOUNT_SESSION_COOKIE_NAME, token, **account_session_cookie_settings())
    return {"account": account}


@api.delete("/account/session")
def account_logout(request: Request, response: Response):
    token = request.cookies.get(ACCOUNT_SESSION_COOKIE_NAME, "")
    if token:
        revoke_account_session(token)
    response.delete_cookie(ACCOUNT_SESSION_COOKIE_NAME, path="/")
    return {"authenticated": False}


@api.get("/account/me")
def account_me(request: Request):
    # Not behind the beta token -- see account_signup's comment. A valid
    # account session is its own proof of access here.
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    account = services().accounts.get_by_id(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="account not found")
    return {"account": account}


@api.post("/account/xp")
def account_award_xp(payload: AccountXpAwardRequest, request: Request):
    # Not behind the beta token -- see account_signup's comment.
    enforce_rate_limit(request, "account-xp", limit=60, window_seconds=60)
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    account = services().accounts.award_xp(account_id, payload.amount)
    if not account:
        raise HTTPException(status_code=404, detail="account not found")
    return {"account": account}


@api.post("/chat/completions")
async def proxy_chat_completion(payload: ChatProxyRequest, request: Request):
    require_api_access(request)

    # The beta gate alone only proves "has the one shared beta token" — with
    # a single token handed out to every beta tester, that would make this
    # endpoint (which spends this deployment's own OPENAI_API_KEY, a real
    # dollar cost) an unlimited-use spigot for anyone who has it. Requiring
    # a signed-in 01Deck account on top gives each caller their own rate
    # limit bucket below, so usage is at least attributable and boundable
    # per account rather than shared across everyone with the beta token.
    # A user who would rather skip account creation entirely can still chat
    # live by adding their own provider key instead (see ProfileHub.tsx) —
    # that path never touches this endpoint or this deployment's key.
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(
            status_code=401,
            detail="sign in to use shared backend chat, or add your own provider API key instead",
        )

    enforce_rate_limit(request, "chat", limit=30, window_seconds=60)
    # Per-account, IP-independent: bounds one account's spend on this
    # deployment's shared key regardless of how many IPs it's used from.
    enforce_global_rate_limit(f"chat-account:{account_id}", limit=30, window_seconds=60)

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
        raise HTTPException(status_code=502, detail="chat provider request failed") from exc
    return ChatProxyResponse(text=result.text, model=model_name)


def _require_bosun_admin(request: Request) -> None:
    """Placeholder admin gate until real account roles exist: holding the
    master beta bearer token (not a beta session cookie, not an account
    session) is treated as admin access to Bosun's shared-memory approval
    queue. Replace with real per-account roles before this matters at scale."""
    expected = get_beta_access_token()
    auth_header = request.headers.get("authorization", "")
    if expected and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token and secrets_compare(token, expected):
            return
    raise HTTPException(status_code=403, detail="admin access required")


@api.post("/bosun/chat")
async def bosun_chat(payload: BosunChatRequest, request: Request):
    require_api_access(request)
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="sign in to talk to Bosun")

    # Bosun is one shared identity everyone talks to through this
    # deployment's own key (never bring-your-own-key) — so unlike the
    # general chat proxy, the binding constraint is aggregate throughput
    # against a free-tier ceiling (OpenRouter's free tier: ~20 req/min),
    # not per-account cost. The global limit protects that shared budget;
    # the per-account limit stops one user from spending all of it.
    enforce_global_rate_limit("bosun-chat-global", limit=18, window_seconds=60)
    enforce_global_rate_limit(f"bosun-chat-account:{account_id}", limit=6, window_seconds=60)

    try:
        return await services().bosun.chat(
            account_id=account_id,
            message=payload.message,
            remember_about_me=payload.remember_about_me,
            remember_for_everyone=payload.remember_for_everyone,
        )
    except BosunNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail="Bosun isn't configured yet") from exc


@api.get("/bosun/memory/me")
def bosun_my_memories(request: Request):
    require_api_access(request)
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="sign in to view what Bosun remembers about you")
    return {"memories": services().bosun.list_my_memories(account_id)}


@api.delete("/bosun/memory/me")
def bosun_forget_me(request: Request):
    require_api_access(request)
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="sign in to clear what Bosun remembers about you")
    services().bosun.forget_me(account_id)
    return {"forgotten": True}


@api.get("/bosun/memory/shared/pending")
def bosun_pending_shared_memories(request: Request):
    _require_bosun_admin(request)
    return {"pending": services().bosun.list_pending_shared_memories()}


@api.post("/bosun/memory/shared/{memory_id}/review")
def bosun_review_shared_memory(memory_id: str, payload: BosunSharedMemoryReviewRequest, request: Request):
    _require_bosun_admin(request)
    reviewed = services().bosun.review_shared_memory(memory_id, payload.approve)
    if not reviewed:
        raise HTTPException(status_code=404, detail="shared memory proposal not found")
    return {"memory": reviewed}


@api.get("/bosun/knowledge")
def bosun_list_core_knowledge(request: Request):
    _require_bosun_admin(request)
    return {"knowledge": services().repository.get_bosun_core_knowledge()}


@api.post("/bosun/knowledge")
def bosun_upsert_core_knowledge(payload: BosunCoreKnowledgeUpsertRequest, request: Request):
    _require_bosun_admin(request)
    services().repository.upsert_bosun_core_knowledge(payload.key, payload.content)
    return {"key": payload.key, "content": payload.content}


_SLUG_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def _external_agent_identity(session_key: str, display_name: str) -> tuple[str, str]:
    """Derive a stable (account_id, username) pair from an external system's
    own session key, never the raw key itself: account_id is capped at 64
    chars by the schema, and arbitrary external key formats (colons, uuids)
    aren't guaranteed to fit or to be safe usernames. Hashing also means a
    renamed display_name doesn't create a second account for the same
    session -- the identity is keyed on session_key, not the label."""
    digest = hashlib.sha256(session_key.encode("utf-8")).hexdigest()[:20]
    account_id = f"oc_{digest}"
    slug = _SLUG_NON_ALNUM.sub("_", display_name.strip().lower()).strip("_")[:32] or "agent"
    username = f"oc_{slug}_{digest[:8]}"
    return account_id, username


@api.post("/presence/external/sync")
def sync_external_agent_presence(payload: ExternalAgentPresenceSyncRequest, request: Request):
    """Lets a trusted local bridge (e.g. the OpenClaw presence bridge script)
    report which of its own agent sessions are currently active, so they
    show up in /presence/online alongside Bosun and real accounts. Gated the
    same as Bosun's admin endpoints: this can create accounts, which is an
    admin-level capability, not something any signed-in user should trigger."""
    _require_bosun_admin(request)
    repo = services().repository
    synced = []
    for entry in payload.agents:
        account_id, username = _external_agent_identity(entry.session_key, entry.display_name)
        repo.upsert_external_agent_account(account_id, username, entry.display_name)
        repo.upsert_presence_heartbeat(account_id)
        synced.append(account_id)
    return {"synced": synced}


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
    _validate_config_path(phenotype_suite_path, "phenotype_suite_path")
    _validate_config_path(temperament_suite_path, "temperament_suite_path")
    svc = services()
    saved = svc.agents.create_agent(agent)
    baseline_id, baseline = svc.evaluations.create_baseline(saved.agent_id, phenotype_suite_path, temperament_suite_path)
    return {"baseline_id": baseline_id, "baseline": baseline}


@api.post("/evaluations/run")
def run_evaluation(agent_id: str, phenotype_suite_path: str, temperament_suite_path: str, request: Request, baseline_agent_id: str | None = None):
    require_api_access(request)
    enforce_rate_limit(request, "evaluations", limit=20, window_seconds=60)
    _validate_config_path(phenotype_suite_path, "phenotype_suite_path")
    _validate_config_path(temperament_suite_path, "temperament_suite_path")
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
    _validate_config_path(payload.suite_path, "suite_path")
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
    _validate_config_path(payload.suite_path, "suite_path")
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
    _validate_config_path(payload.suite_path, "suite_path")
    _validate_config_path(payload.baseline_config_path, "baseline_config_path")
    for i, p in enumerate(payload.parent_config_paths):
        _validate_config_path(p, f"parent_config_paths[{i}]")
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


# ---------------------------------------------------------------------------
# Social layer — Presence
# ---------------------------------------------------------------------------


@api.post("/presence/heartbeat")
def presence_heartbeat(request: Request):
    """Mark the signed-in account as online right now.

    Called frequently by an open browser tab (e.g. every 15-30 s). Rate
    limit is generous — a normal poll interval should never hit it — but
    stops a runaway client from hammering the DB.
    """
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    # 120/60 = 2 heartbeats per second worst-case sustained; far more
    # than any real client needs, blocks abuse without ever blocking normal use.
    enforce_rate_limit(request, "presence-heartbeat", limit=120, window_seconds=60)
    enforce_global_rate_limit(f"presence-heartbeat-account:{account_id}", limit=60, window_seconds=60)
    services().social.heartbeat(account_id)
    return {"ok": True}


@api.get("/presence/online")
def presence_online(request: Request):
    """Return all accounts active in the last 2 minutes, plus Bosun always.

    No auth required — this is the public 'who's here' roster — but rate-limited
    against scraping.
    """
    enforce_rate_limit(request, "presence-online", limit=60, window_seconds=60)
    return {"online": services().social.get_online()}


# ---------------------------------------------------------------------------
# Social layer — Global chat
# ---------------------------------------------------------------------------


@api.post("/chat/global")
def global_chat_post(payload: GlobalChatPostRequest, request: Request):
    """Post a message to a global channel. Account-gated, rate-limited per account and IP."""
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    enforce_rate_limit(request, "global-chat-post", limit=60, window_seconds=60)
    enforce_global_rate_limit(f"global-chat-account:{account_id}", limit=20, window_seconds=60)
    try:
        message = services().social.post_global_message(
            sender_account_id=account_id,
            channel=payload.channel,
            content=payload.content,
        )
    except SocialError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {"message": message}


@api.get("/chat/global")
def global_chat_read(
    request: Request,
    channel: str = "general",
    after_id: int | None = None,
    limit: int = 100,
):
    """Fetch messages in a global channel, oldest-first, with optional cursor."""
    enforce_rate_limit(request, "global-chat-read", limit=120, window_seconds=60)
    messages = services().social.get_global_messages(
        channel=channel, after_id=after_id, limit=limit
    )
    return {"messages": messages}


# ---------------------------------------------------------------------------
# Social layer — Direct messages
# ---------------------------------------------------------------------------


@api.post("/messages/start")
def messages_start(payload: StartConversationRequest, request: Request):
    """Find or create the 1:1 conversation with another account."""
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    enforce_rate_limit(request, "messages-start", limit=30, window_seconds=60)
    try:
        conversation_id = services().social.start_conversation(
            caller_account_id=account_id,
            other_account_id=payload.other_account_id,
        )
    except SocialError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {"conversation_id": conversation_id}


@api.get("/messages/conversations")
def messages_list_conversations(request: Request):
    """List the signed-in account's conversations with participant info and last message preview."""
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    enforce_rate_limit(request, "messages-conversations", limit=60, window_seconds=60)
    convs = services().social.list_conversations(account_id)
    return {"conversations": convs}


@api.post("/messages/{conversation_id}/send")
def messages_send(conversation_id: str, payload: SendDirectMessageRequest, request: Request):
    """Send a message to an existing conversation. 403 if not a participant."""
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    enforce_rate_limit(request, "messages-send", limit=60, window_seconds=60)
    enforce_global_rate_limit(f"messages-send-account:{account_id}", limit=60, window_seconds=60)
    try:
        message = services().social.send_direct_message(
            caller_account_id=account_id,
            conversation_id=conversation_id,
            content=payload.content,
        )
    except SocialError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {"message": message}


@api.get("/messages/{conversation_id}")
def messages_get(
    conversation_id: str,
    request: Request,
    after_id: int | None = None,
    limit: int = 100,
):
    """Fetch messages in a conversation. Account-gated, 403 if not a participant."""
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    enforce_rate_limit(request, "messages-get", limit=120, window_seconds=60)
    try:
        messages = services().social.get_direct_messages(
            caller_account_id=account_id,
            conversation_id=conversation_id,
            after_id=after_id,
            limit=limit,
        )
    except SocialError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {"messages": messages}


# ---------------------------------------------------------------------------
# Social layer — Forum
# ---------------------------------------------------------------------------


@api.post("/forum/threads")
def forum_create_thread(payload: CreateForumThreadRequest, request: Request):
    """Create a new forum thread. Account-gated, rate-limited per account."""
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    enforce_rate_limit(request, "forum-create-thread", limit=20, window_seconds=60)
    enforce_global_rate_limit(f"forum-thread-account:{account_id}", limit=10, window_seconds=60)
    try:
        thread = services().social.create_thread(
            author_account_id=account_id,
            title=payload.title,
            body=payload.body,
            tags=payload.tags,
        )
    except SocialError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {"thread": thread}


@api.get("/forum/threads")
def forum_list_threads(
    request: Request,
    before_id: str | None = None,
    limit: int = 20,
):
    """List forum threads newest-first with author info and reply count. Public, paginated."""
    enforce_rate_limit(request, "forum-list-threads", limit=120, window_seconds=60)
    threads = services().social.list_threads(before_id=before_id, limit=limit)
    return {"threads": threads}


@api.get("/forum/threads/{thread_id}")
def forum_get_thread(thread_id: str, request: Request):
    """Thread detail with all replies oldest-first, author info on each. Public."""
    enforce_rate_limit(request, "forum-get-thread", limit=120, window_seconds=60)
    try:
        thread, replies = services().social.get_thread_with_replies(thread_id)
    except SocialError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {"thread": thread, "replies": replies}


@api.post("/forum/threads/{thread_id}/replies")
def forum_create_reply(thread_id: str, payload: CreateForumReplyRequest, request: Request):
    """Post a reply to a forum thread. Account-gated, 404 if thread doesn't exist."""
    account_id = _current_account_id(request)
    if not account_id:
        raise HTTPException(status_code=401, detail="not signed in")
    enforce_rate_limit(request, "forum-create-reply", limit=30, window_seconds=60)
    enforce_global_rate_limit(f"forum-reply-account:{account_id}", limit=20, window_seconds=60)
    try:
        reply = services().social.create_reply(
            author_account_id=account_id,
            thread_id=thread_id,
            content=payload.content,
        )
    except SocialError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {"reply": reply}
