from __future__ import annotations

from pathlib import Path

from app.core.lifecycle.service import LifecycleService
from app.core.persistence.repository import Repository
from app.core.plugins.service import PluginService
from app.core.schemas.models import AgentCreate, AgentRead, LifecycleEventType, LifecycleState, PluginHook
from app.core.utils.common import read_data_file


class AgentService:
    def __init__(
        self,
        repository: Repository,
        lifecycle_service: LifecycleService | None = None,
        plugin_service: PluginService | None = None,
    ):
        self.repository = repository
        self.lifecycle_service = lifecycle_service
        self.plugin_service = plugin_service

    def create_agent(self, config: AgentCreate) -> AgentRead:
        agent = self.repository.save_agent(AgentRead(**config.model_dump()))
        lifecycle_event = None
        if self.lifecycle_service:
            lifecycle_event = self.lifecycle_service.record(
                agent_id=agent.agent_id,
                event_type=LifecycleEventType.AGENT_CREATED,
                state=LifecycleState.REGISTERED,
                summary="Agent registered in the core evolution catalog.",
                payload={"species_tag": agent.species_tag, "base_model": agent.base_model},
            )
        if self.plugin_service:
            self.plugin_service.run_hook(
                PluginHook.AGENT_CREATED,
                target_id=agent.agent_id,
                agent=agent,
                lifecycle_event=lifecycle_event,
            )
        return agent

    def create_agent_from_path(self, path: str | Path) -> AgentRead:
        return self.create_agent(AgentCreate.model_validate(read_data_file(Path(path))))

    def get(self, agent_id: str) -> AgentRead | None:
        return self.repository.get_agent(agent_id)

    def list(self, species_tag: str | None = None) -> list[AgentRead]:
        return self.repository.list_agents(species_tag)
