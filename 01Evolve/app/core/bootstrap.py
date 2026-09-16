from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.core.accounts.service import AccountService
from app.core.agents.service import AgentService
from app.core.bosun.service import BosunService
from app.core.evaluation.service import EvaluationService
from app.core.evolution.service import EvolutionService
from app.core.evolution.support_service import SupportOptimizationService
from app.core.lifecycle.service import LifecycleService
from app.core.persistence.database import init_db
from app.core.persistence.repository import Repository
from app.core.plugins.service import PluginService


@dataclass(slots=True)
class ServiceContainer:
    repository: Repository
    lifecycle: LifecycleService
    plugins: PluginService
    agents: AgentService
    evaluations: EvaluationService
    evolution: EvolutionService
    support: SupportOptimizationService
    accounts: AccountService
    bosun: BosunService


def build_services(db_url: str | None = None, plugin_config_path: str | Path | None = None) -> ServiceContainer:
    repository = Repository(init_db(db_url)())
    lifecycle = LifecycleService(repository)
    plugins = PluginService.from_path(repository, plugin_config_path)
    agents = AgentService(repository, lifecycle_service=lifecycle, plugin_service=plugins)
    evaluations = EvaluationService(repository, lifecycle_service=lifecycle, plugin_service=plugins)
    evolution = EvolutionService(
        repository,
        lifecycle_service=lifecycle,
        plugin_service=plugins,
        evaluation_service=evaluations,
    )
    support = SupportOptimizationService(repository, agent_service=agents)
    accounts = AccountService(repository)
    bosun = BosunService(repository)
    return ServiceContainer(
        repository=repository,
        lifecycle=lifecycle,
        plugins=plugins,
        agents=agents,
        evaluations=evaluations,
        evolution=evolution,
        support=support,
        accounts=accounts,
        bosun=bosun,
    )
