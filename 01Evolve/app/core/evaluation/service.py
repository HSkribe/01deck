from __future__ import annotations

from pathlib import Path

from app.core.compiler.service import AgentCompiler
from app.core.evaluation.runner import EvaluationRunner, run_async
from app.core.evaluation.suite_loader import load_suite
from app.core.fitness.service import FitnessService
from app.core.lifecycle.service import LifecycleService
from app.core.llm.adapters import LLMAdapter, MockLLMAdapter
from app.core.persistence.repository import Repository
from app.core.plugins.service import PluginService
from app.core.schemas.models import BaselineProfile, LifecycleEventType, LifecycleState, PluginHook


class EvaluationService:
    def __init__(
        self,
        repository: Repository,
        lifecycle_service: LifecycleService,
        plugin_service: PluginService,
        adapter: LLMAdapter | None = None,
        compiler: AgentCompiler | None = None,
        fitness_service: FitnessService | None = None,
    ):
        self.repository = repository
        self.lifecycle_service = lifecycle_service
        self.plugin_service = plugin_service
        self.runner = EvaluationRunner(
            adapter or MockLLMAdapter(),
            compiler=compiler or AgentCompiler(),
            fitness_service=fitness_service or FitnessService(),
        )

    def create_baseline(
        self,
        agent_id: str,
        phenotype_suite_path: str | Path,
        temperament_suite_path: str | Path,
    ) -> tuple[int, BaselineProfile]:
        agent = self.repository.get_agent(agent_id)
        if not agent:
            raise ValueError(f"unknown agent_id {agent_id}")
        evaluation = self.evaluate_agent(agent_id, phenotype_suite_path, temperament_suite_path)
        baseline = BaselineProfile(
            baseline_agent_id=agent_id,
            suite_id=evaluation.suite_id,
            phenotype=evaluation.phenotype,
            temperament=evaluation.temperament,
            variance=evaluation.variance,
        )
        baseline_id = self.repository.save_baseline(baseline)
        lifecycle_event = self.lifecycle_service.record(
            agent_id=agent_id,
            event_type=LifecycleEventType.BASELINE_CREATED,
            state=LifecycleState.BASELINED,
            summary="Baseline profile captured for future delta comparisons.",
            payload={"baseline_id": baseline_id, "suite_id": baseline.suite_id},
        )
        baseline_reports = self.plugin_service.run_hook(
            PluginHook.BASELINE_CREATED,
            target_id=str(baseline_id),
            agent=agent,
            evaluation=evaluation,
            lifecycle_event=lifecycle_event,
        )
        evaluation.plugin_reports.extend(baseline_reports)
        return baseline_id, baseline

    def evaluate_agent(
        self,
        agent_id: str,
        phenotype_suite_path: str | Path,
        temperament_suite_path: str | Path,
        baseline_agent_id: str | None = None,
    ):
        agent = self.repository.get_agent(agent_id)
        if not agent:
            raise ValueError(f"unknown agent_id {agent_id}")
        phenotype_suite = load_suite(phenotype_suite_path)
        temperament_suite = load_suite(temperament_suite_path)
        baseline_id: int | None = None
        baseline = None
        if baseline_agent_id:
            baseline_pair = self.repository.get_latest_baseline(baseline_agent_id, phenotype_suite.suite_id)
            if baseline_pair:
                baseline_id, baseline = baseline_pair
        evaluation = run_async(self.runner.evaluate(agent, phenotype_suite, temperament_suite, baseline=baseline))
        if baseline_id:
            evaluation.baseline_profile_id = str(baseline_id)
        self.repository.save_evaluation_run(evaluation)
        lifecycle_event = self.lifecycle_service.record(
            agent_id=agent_id,
            event_type=LifecycleEventType.EVALUATION_COMPLETED,
            state=LifecycleState.EVALUATED,
            summary="Evaluation completed and persisted.",
            payload={
                "run_id": evaluation.run_id,
                "fitness": evaluation.fitness.fitness,
                "eligible_to_breed": evaluation.eligible_to_breed,
            },
        )
        evaluation.plugin_reports = self.plugin_service.run_hook(
            PluginHook.EVALUATION_COMPLETED,
            target_id=evaluation.run_id,
            agent=agent,
            evaluation=evaluation,
            lifecycle_event=lifecycle_event,
        )
        return evaluation

    def evaluate_population(
        self,
        species_tag: str,
        phenotype_suite_path: str | Path,
        temperament_suite_path: str | Path,
        baseline_agent_id: str | None = None,
    ) -> list:
        outputs = []
        for agent in self.repository.list_agents(species_tag):
            outputs.append(
                self.evaluate_agent(
                    agent.agent_id,
                    phenotype_suite_path=phenotype_suite_path,
                    temperament_suite_path=temperament_suite_path,
                    baseline_agent_id=baseline_agent_id,
                )
            )
        return outputs
