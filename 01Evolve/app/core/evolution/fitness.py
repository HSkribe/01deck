from __future__ import annotations

from app.core.schemas.models import FitnessProfile, PhenotypeProfile, TemperamentProfile
from app.core.utils.common import clamp

DEFAULT_WEIGHTS = {
    "viability": 0.10,
    "context_sensitivity": 0.14,
    "instruction_following": 0.10,
    "entropy": 0.08,
    "consistency": 0.12,
    "goal_pursuit": 0.15,
    "correction": 0.10,
    "robustness": 0.08,
    "cooperation": 0.08,
    "efficiency": 0.05,
}

DEFAULT_THRESHOLDS = {
    "viability": 0.80,
    "context_sensitivity": 0.50,
    "instruction_following": 0.50,
    "goal_pursuit": 0.45,
    "correction": 0.30,
    "cooperation": 0.30,
    "max_stubbornness": 0.85,
    "minimum_fitness": 0.50,
}


def score_fitness(
    phenotype: PhenotypeProfile,
    temperament: TemperamentProfile,
    weights: dict[str, float] | None = None,
    thresholds: dict[str, float] | None = None,
) -> FitnessProfile:
    effective_weights = DEFAULT_WEIGHTS | (weights or {})
    components = {
        name: getattr(phenotype, name, 0.0) * weight for name, weight in effective_weights.items()
    }
    fitness = clamp(sum(components.values()))
    effective_thresholds = DEFAULT_THRESHOLDS | (thresholds or {})
    failures: list[str] = []
    for key, threshold in effective_thresholds.items():
        if key == "max_stubbornness":
            if temperament.stubbornness > threshold:
                failures.append(f"stubbornness>{threshold}")
        elif key == "minimum_fitness":
            if fitness < threshold:
                failures.append(f"fitness<{threshold}")
        elif getattr(phenotype, key, 0.0) < threshold:
            failures.append(f"{key}<{threshold}")
    return FitnessProfile(
        fitness=fitness,
        component_scores=components,
        eligible_to_breed=not failures,
        threshold_failures=failures,
    )
