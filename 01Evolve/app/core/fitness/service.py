from __future__ import annotations

from app.core.evolution.fitness import score_fitness
from app.core.schemas.models import FitnessProfile, PhenotypeProfile, TemperamentProfile


class FitnessService:
    def score(
        self,
        phenotype: PhenotypeProfile,
        temperament: TemperamentProfile,
        weights: dict[str, float] | None = None,
        thresholds: dict[str, float] | None = None,
    ) -> FitnessProfile:
        return score_fitness(phenotype, temperament, weights=weights, thresholds=thresholds)
