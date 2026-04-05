from __future__ import annotations

from app.core.plugins.protocols import EvolvePlugin, PluginContext
from app.core.schemas.models import PluginDescriptor, PluginHook, PluginLayer, PluginReportRead, PluginTargetType


class AuditNarrativePlugin(EvolvePlugin):
    descriptor = PluginDescriptor(
        plugin_id="audit_narrative",
        name="Audit Narrative",
        description="Produces concise operator-facing audit summaries for serious runs.",
        layer=PluginLayer.SERIOUS,
        hooks=[
            PluginHook.AGENT_CREATED,
            PluginHook.BASELINE_CREATED,
            PluginHook.EVALUATION_COMPLETED,
            PluginHook.EXPORT_WRITTEN,
        ],
    )

    def handle(self, context: PluginContext) -> PluginReportRead | None:
        if context.hook == PluginHook.AGENT_CREATED and context.agent:
            return PluginReportRead(
                plugin_id=self.descriptor.plugin_id,
                layer=self.descriptor.layer,
                hook=context.hook,
                target_type=PluginTargetType.AGENT,
                target_id=context.target_id,
                summary=f"Registered {context.agent.name} for species {context.agent.species_tag}.",
                payload={
                    "base_model": context.agent.base_model,
                    "provider": context.agent.model_provider,
                    "trace_capture_enabled": context.agent.runtime_config.trace_capture_enabled,
                },
            )
        if context.hook == PluginHook.BASELINE_CREATED and context.evaluation:
            return PluginReportRead(
                plugin_id=self.descriptor.plugin_id,
                layer=self.descriptor.layer,
                hook=context.hook,
                target_type=PluginTargetType.BASELINE,
                target_id=context.target_id,
                summary="Captured baseline snapshot for comparison workflows.",
                payload={
                    "suite_id": context.evaluation.suite_id,
                    "fitness": context.evaluation.fitness.fitness,
                },
            )
        if context.hook == PluginHook.EVALUATION_COMPLETED and context.evaluation:
            return PluginReportRead(
                plugin_id=self.descriptor.plugin_id,
                layer=self.descriptor.layer,
                hook=context.hook,
                target_type=PluginTargetType.EVALUATION,
                target_id=context.target_id,
                summary=(
                    f"Fitness {context.evaluation.fitness.fitness:.3f} with "
                    f"{len(context.evaluation.fitness.threshold_failures)} threshold failures."
                ),
                payload={
                    "eligible_to_breed": context.evaluation.eligible_to_breed,
                    "threshold_failures": context.evaluation.fitness.threshold_failures,
                    "phenotype": context.evaluation.phenotype.model_dump(mode="json"),
                },
            )
        if context.hook == PluginHook.EXPORT_WRITTEN:
            export_path = context.metadata.get("path", "")
            return PluginReportRead(
                plugin_id=self.descriptor.plugin_id,
                layer=self.descriptor.layer,
                hook=context.hook,
                target_type=PluginTargetType.EXPORT,
                target_id=context.target_id,
                summary=f"Export written to {export_path}.",
                payload={"path": export_path},
            )
        return None


class RiskEnvelopePlugin(EvolvePlugin):
    descriptor = PluginDescriptor(
        plugin_id="risk_envelope",
        name="Risk Envelope",
        description="Flags operational risk from low robustness or threshold breaches.",
        layer=PluginLayer.SERIOUS,
        hooks=[PluginHook.EVALUATION_COMPLETED, PluginHook.OFFSPRING_CREATED],
    )

    def handle(self, context: PluginContext) -> PluginReportRead | None:
        if context.hook == PluginHook.EVALUATION_COMPLETED and context.evaluation:
            failures = context.evaluation.fitness.threshold_failures
            risk_level = "low"
            if failures or context.evaluation.phenotype.robustness < 0.45:
                risk_level = "medium"
            if len(failures) >= 2 or context.evaluation.phenotype.viability < 0.65:
                risk_level = "high"
            return PluginReportRead(
                plugin_id=self.descriptor.plugin_id,
                layer=self.descriptor.layer,
                hook=context.hook,
                target_type=PluginTargetType.EVALUATION,
                target_id=context.target_id,
                summary=f"Operational risk classified as {risk_level}.",
                payload={
                    "risk_level": risk_level,
                    "robustness": context.evaluation.phenotype.robustness,
                    "threshold_failures": failures,
                },
            )
        if context.hook == PluginHook.OFFSPRING_CREATED and context.agent:
            return PluginReportRead(
                plugin_id=self.descriptor.plugin_id,
                layer=self.descriptor.layer,
                hook=context.hook,
                target_type=PluginTargetType.MATING_EVENT,
                target_id=context.target_id,
                summary=f"Offspring {context.agent.agent_id} created and queued for follow-up evaluation.",
                payload={"child_agent_id": context.agent.agent_id, "species_tag": context.agent.species_tag},
            )
        return None


class CareGuidePlugin(EvolvePlugin):
    descriptor = PluginDescriptor(
        plugin_id="care_guide",
        name="Care Guide",
        description="Provides optional care notes so operators can support an agent after evaluation.",
        layer=PluginLayer.FUN,
        hooks=[PluginHook.EVALUATION_COMPLETED],
    )

    def handle(self, context: PluginContext) -> PluginReportRead | None:
        if not context.evaluation:
            return None
        temperament = context.evaluation.temperament
        care_tips: list[str] = []
        if temperament.caution > 0.65:
            care_tips.append("Provide crisp constraints before ambiguous tasks.")
        if temperament.stubbornness > 0.5:
            care_tips.append("Use explicit correction loops instead of gentle hints.")
        if temperament.novelty_seeking > 0.65:
            care_tips.append("Offer variation-rich prompts to keep exploration productive.")
        if not care_tips:
            care_tips.append("This agent looks steady; routine check-ins are enough.")
        return PluginReportRead(
            plugin_id=self.descriptor.plugin_id,
            layer=self.descriptor.layer,
            hook=context.hook,
            target_type=PluginTargetType.EVALUATION,
            target_id=context.target_id,
            summary="Optional care notes generated for the evaluated agent.",
            payload={"care_tips": care_tips},
        )


class CelebrationPlugin(EvolvePlugin):
    descriptor = PluginDescriptor(
        plugin_id="milestone_celebration",
        name="Milestone Celebration",
        description="Adds optional playful badges for strong evaluations and offspring milestones.",
        layer=PluginLayer.FUN,
        hooks=[PluginHook.EVALUATION_COMPLETED, PluginHook.OFFSPRING_CREATED],
    )

    def handle(self, context: PluginContext) -> PluginReportRead | None:
        if context.hook == PluginHook.EVALUATION_COMPLETED and context.evaluation:
            fitness = context.evaluation.fitness.fitness
            if fitness >= 0.8:
                badge = "steady-hands"
            elif fitness >= 0.65:
                badge = "promising-spark"
            else:
                badge = "still-growing"
            return PluginReportRead(
                plugin_id=self.descriptor.plugin_id,
                layer=self.descriptor.layer,
                hook=context.hook,
                target_type=PluginTargetType.EVALUATION,
                target_id=context.target_id,
                summary=f"Assigned optional badge {badge}.",
                payload={"badge": badge, "fitness": fitness},
            )
        if context.hook == PluginHook.OFFSPRING_CREATED and context.agent:
            return PluginReportRead(
                plugin_id=self.descriptor.plugin_id,
                layer=self.descriptor.layer,
                hook=context.hook,
                target_type=PluginTargetType.MATING_EVENT,
                target_id=context.target_id,
                summary=f"Welcomed new offspring {context.agent.name}.",
                payload={"title": "fresh branch", "child_agent_id": context.agent.agent_id},
            )
        return None
