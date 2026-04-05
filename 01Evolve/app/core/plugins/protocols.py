from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, Sequence, runtime_checkable

from app.core.schemas.models import (
    AgentRead,
    EvaluationRunRead,
    LifecycleEventRead,
    PluginDescriptor,
    PluginHook,
    PluginReportRead,
)


@dataclass(slots=True)
class PluginContext:
    hook: PluginHook
    target_id: str
    agent: AgentRead | None = None
    evaluation: EvaluationRunRead | None = None
    lifecycle_event: LifecycleEventRead | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    related_evaluations: Sequence[EvaluationRunRead] = ()


@runtime_checkable
class EvolvePlugin(Protocol):
    descriptor: PluginDescriptor

    def handle(self, context: PluginContext) -> PluginReportRead | None:
        ...
