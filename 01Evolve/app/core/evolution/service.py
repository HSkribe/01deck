from __future__ import annotations

from pathlib import Path

from app.core.evaluation.service import EvaluationService
from app.core.evolution.pairing import select_pairs
from app.core.evolution.recombination import breed_agents
from app.core.lifecycle.service import LifecycleService
from app.core.persistence.repository import Repository
from app.core.plugins.service import PluginService
from app.core.schemas.models import (
    LifecycleEventType,
    LifecycleState,
    MatingEventCreate,
    PairingMode,
    PairSelectionConfig,
    PairingCandidate,
    PluginHook,
)


class EvolutionService:
    def __init__(
        self,
        repository: Repository,
        lifecycle_service: LifecycleService,
        plugin_service: PluginService,
        evaluation_service: EvaluationService,
    ):
        self.repository = repository
        self.lifecycle_service = lifecycle_service
        self.plugin_service = plugin_service
        self.evaluation_service = evaluation_service

    def _candidates(self, species_tag: str | None = None) -> list[PairingCandidate]:
        return [
            PairingCandidate(
                agent_id=item.agent_id,
                phenotype=item.phenotype,
                temperament=item.temperament,
                latent_traits=item.latent_traits,
                fitness=item.fitness.fitness,
                eligible_to_breed=item.eligible_to_breed,
            )
            for item in self.repository.get_latest_evaluations(species_tag)
        ]

    def select_pairs(self, species_tag: str | None = None, top_k: int = 10):
        results = select_pairs(self._candidates(species_tag), PairSelectionConfig(top_k=top_k))
        for pair in results:
            self.lifecycle_service.record(
                agent_id=pair.parent_a_id,
                event_type=LifecycleEventType.PAIR_SELECTED,
                state=LifecycleState.SELECTED,
                summary=f"Selected with {pair.parent_b_id} using {pair.pairing_mode.value}.",
                payload=pair.model_dump(mode="json"),
            )
            self.lifecycle_service.record(
                agent_id=pair.parent_b_id,
                event_type=LifecycleEventType.PAIR_SELECTED,
                state=LifecycleState.SELECTED,
                summary=f"Selected with {pair.parent_a_id} using {pair.pairing_mode.value}.",
                payload=pair.model_dump(mode="json"),
            )
        return results

    def breed(
        self,
        parent_a_id: str,
        parent_b_id: str,
        pairing_mode: PairingMode = PairingMode.SIMILARITY,
    ):
        parent_a = self.repository.get_agent(parent_a_id)
        parent_b = self.repository.get_agent(parent_b_id)
        if not parent_a or not parent_b:
            raise ValueError("parent not found")
        latest = {item.agent_id: item for item in self.repository.get_latest_evaluations()}
        child, event = breed_agents(
            parent_a,
            parent_b,
            latest[parent_a_id].fitness.fitness,
            latest[parent_b_id].fitness.fitness,
            MatingEventCreate(parent_a_id=parent_a_id, parent_b_id=parent_b_id, pairing_mode=pairing_mode),
        )
        self.repository.save_agent(child)
        self.repository.save_mating_event(event)
        lifecycle_event = self.lifecycle_service.record(
            agent_id=child.agent_id,
            event_type=LifecycleEventType.OFFSPRING_CREATED,
            state=LifecycleState.BRED,
            summary=f"Bred from {parent_a_id} and {parent_b_id}.",
            payload={"mating_event_id": event.event_id},
        )
        plugin_reports = self.plugin_service.run_hook(
            PluginHook.OFFSPRING_CREATED,
            target_id=event.event_id,
            agent=child,
            lifecycle_event=lifecycle_event,
        )
        return child, event, plugin_reports

    def run_generation(
        self,
        species_tag: str,
        phenotype_suite_path: str | Path,
        temperament_suite_path: str | Path,
        baseline_agent_id: str | None = None,
    ):
        pairs = self.select_pairs(species_tag=species_tag, top_k=1)
        if not pairs:
            raise ValueError("no eligible pair found")
        pair = pairs[0]
        child, event, plugin_reports = self.breed(
            pair.parent_a_id,
            pair.parent_b_id,
            pairing_mode=pair.pairing_mode,
        )
        evaluation = self.evaluation_service.evaluate_agent(
            child.agent_id,
            phenotype_suite_path=phenotype_suite_path,
            temperament_suite_path=temperament_suite_path,
            baseline_agent_id=baseline_agent_id,
        )
        evaluation.plugin_reports = plugin_reports + evaluation.plugin_reports
        return pair, child, event, evaluation
