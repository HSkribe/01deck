from __future__ import annotations

from app.core.persistence.repository import Repository
from app.core.schemas.models import LifecycleEventRead, LifecycleEventType, LifecycleState


class LifecycleService:
    def __init__(self, repository: Repository):
        self.repository = repository

    def record(
        self,
        agent_id: str,
        event_type: LifecycleEventType,
        state: LifecycleState,
        summary: str,
        payload: dict | None = None,
    ) -> LifecycleEventRead:
        event = LifecycleEventRead(
            agent_id=agent_id,
            event_type=event_type,
            state=state,
            summary=summary,
            payload=payload or {},
        )
        return self.repository.save_lifecycle_event(event)

    def show(self, agent_id: str) -> list[LifecycleEventRead]:
        return self.repository.list_lifecycle(agent_id)
