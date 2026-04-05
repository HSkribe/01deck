from __future__ import annotations

from pathlib import Path

from app.core.plugins.builtin import AuditNarrativePlugin, CareGuidePlugin, CelebrationPlugin, RiskEnvelopePlugin
from app.core.plugins.protocols import EvolvePlugin, PluginContext
from app.core.persistence.repository import Repository
from app.core.schemas.models import (
    AgentRead,
    EvaluationRunRead,
    LifecycleEventRead,
    PluginDescriptor,
    PluginHook,
    PluginReportRead,
    PluginStackConfig,
    PluginTargetType,
)
from app.core.utils.common import read_data_file


class PluginService:
    def __init__(
        self,
        repository: Repository,
        config: PluginStackConfig | None = None,
        registry: dict[str, EvolvePlugin] | None = None,
    ):
        self.repository = repository
        self.registry = registry or {
            plugin.descriptor.plugin_id: plugin
            for plugin in (
                AuditNarrativePlugin(),
                RiskEnvelopePlugin(),
                CareGuidePlugin(),
                CelebrationPlugin(),
            )
        }
        self.config = config or PluginStackConfig(
            stack_name="builtin-serious-default",
            description="Default stack keeps serious plugins on and fun plugins off.",
            plugins=[
                {"plugin_id": "audit_narrative", "enabled": True},
                {"plugin_id": "risk_envelope", "enabled": True},
                {"plugin_id": "care_guide", "enabled": False},
                {"plugin_id": "milestone_celebration", "enabled": False},
            ],
        )

    @classmethod
    def from_path(cls, repository: Repository, path: str | Path | None) -> "PluginService":
        if not path:
            return cls(repository)
        config = PluginStackConfig.model_validate(read_data_file(Path(path)))
        return cls(repository, config=config)

    def list_plugins(self) -> list[PluginDescriptor]:
        toggles = {item.plugin_id: item for item in self.config.plugins}
        output: list[PluginDescriptor] = []
        for plugin_id, plugin in self.registry.items():
            descriptor = plugin.descriptor.model_copy(deep=True)
            if plugin_id in toggles:
                descriptor.enabled = toggles[plugin_id].enabled
            output.append(descriptor)
        return sorted(output, key=lambda item: (item.layer.value, item.plugin_id))

    def _enabled_plugins(self, hook: PluginHook) -> list[EvolvePlugin]:
        toggles = {item.plugin_id: item for item in self.config.plugins}
        enabled: list[EvolvePlugin] = []
        for plugin_id, plugin in self.registry.items():
            toggle = toggles.get(plugin_id)
            if toggle is not None and not toggle.enabled:
                continue
            if hook not in plugin.descriptor.hooks:
                continue
            enabled.append(plugin)
        return enabled

    def run_hook(
        self,
        hook: PluginHook,
        target_id: str,
        agent: AgentRead | None = None,
        evaluation: EvaluationRunRead | None = None,
        lifecycle_event: LifecycleEventRead | None = None,
        metadata: dict | None = None,
        related_evaluations: list[EvaluationRunRead] | None = None,
    ) -> list[PluginReportRead]:
        context = PluginContext(
            hook=hook,
            target_id=target_id,
            agent=agent,
            evaluation=evaluation,
            lifecycle_event=lifecycle_event,
            metadata=metadata or {},
            related_evaluations=related_evaluations or (),
        )
        reports = []
        for plugin in self._enabled_plugins(hook):
            try:
                report = plugin.handle(context)
            except Exception as exc:  # pragma: no cover - defensive path
                if evaluation:
                    target_type = PluginTargetType.EVALUATION
                elif agent:
                    target_type = PluginTargetType.AGENT
                else:
                    target_type = PluginTargetType.EXPORT
                report = PluginReportRead(
                    plugin_id=plugin.descriptor.plugin_id,
                    layer=plugin.descriptor.layer,
                    hook=hook,
                    target_type=target_type,
                    target_id=target_id,
                    summary=f"Plugin failed: {exc}",
                    payload={"error": str(exc)},
                )
            if report:
                reports.append(self.repository.save_plugin_report(report))
        return reports
