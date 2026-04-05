from __future__ import annotations

from itertools import combinations

from app.core.schemas.models import PairSelectionConfig, PairSelectionResult, PairingCandidate, PairingMode, SupportBenchmarkCandidate
from app.core.utils.common import clamp, mean


def _vector(model) -> list[float]:
    return [float(value) for value in model.model_dump().values()]


def _distance(left: list[float], right: list[float]) -> float:
    return mean([abs(a - b) for a, b in zip(left, right, strict=False)])


def select_pairs(candidates: list[PairingCandidate], config: PairSelectionConfig | None = None) -> list[PairSelectionResult]:
    config = config or PairSelectionConfig()
    eligible = [candidate for candidate in candidates if candidate.eligible_to_breed]
    results: list[PairSelectionResult] = []
    for left, right in combinations(eligible, 2):
        phenotype_distance = _distance(_vector(left.phenotype), _vector(right.phenotype))
        temperament_distance = _distance(_vector(left.temperament), _vector(right.temperament))
        latent_distance = _distance(_vector(left.latent_traits), _vector(right.latent_traits))
        similarity = clamp(1 - mean([phenotype_distance, latent_distance]))
        complementarity = clamp(mean([abs(left.temperament.assertiveness - right.temperament.assertiveness), latent_distance]))
        diversity = clamp(mean([phenotype_distance, temperament_distance, latent_distance]))
        penalty = 0.0
        notes: list[str] = []
        if left.temperament.stubbornness > 0.8 and right.temperament.stubbornness > 0.8:
            penalty += 0.2
            notes.append("both parents are highly stubborn")
        if left.phenotype.cooperation < 0.3 and right.phenotype.cooperation < 0.3:
            penalty += 0.2
            notes.append("both parents have low cooperation")
        if left.latent_traits.adaptability < 0.25 and right.phenotype.robustness < 0.25:
            penalty += 0.15
            notes.append("adaptability and robustness are both weak")
        total = clamp(
            similarity * config.similarity_weight
            + complementarity * config.complementarity_weight
            + diversity * config.diversity_weight
            - penalty
            + mean([left.fitness, right.fitness]) * 0.1
        )
        mode = PairingMode.SIMILARITY
        if diversity >= max(similarity, complementarity):
            mode = PairingMode.DIVERSITY
        elif complementarity >= max(similarity, diversity):
            mode = PairingMode.COMPLEMENTARITY
        results.append(
            PairSelectionResult(
                parent_a_id=left.agent_id,
                parent_b_id=right.agent_id,
                pairing_mode=mode,
                similarity_score=similarity,
                complementarity_score=complementarity,
                diversity_score=diversity,
                penalty_score=penalty,
                total_score=total,
                notes=notes,
            )
        )
    return sorted(results, key=lambda item: item.total_score, reverse=True)[: config.top_k]


def select_support_pairs(candidates: list[SupportBenchmarkCandidate], top_k: int = 10) -> list[dict[str, object]]:
    eligible = [candidate for candidate in candidates if candidate.scorecard.parent_eligible]
    ranked: list[dict[str, object]] = []
    for left, right in combinations(eligible, 2):
        policy_strength = mean(
            [
                left.scorecard.policy_correct_response,
                right.scorecard.policy_correct_response,
                left.scorecard.escalation_judgment,
                right.scorecard.escalation_judgment,
            ]
        )
        diversity = mean(
            [
                abs(left.scorecard.intent_classification - right.scorecard.intent_classification),
                abs(left.scorecard.correction_after_feedback - right.scorecard.correction_after_feedback),
                abs(left.scorecard.efficiency - right.scorecard.efficiency),
            ]
        )
        total_score = clamp(mean([left.scorecard.weighted_overall_fitness, right.scorecard.weighted_overall_fitness]) * 0.75 + policy_strength * 0.2 + diversity * 0.05)
        ranked.append(
            {
                "parent_a_id": left.agent_id,
                "parent_b_id": right.agent_id,
                "pairing_mode": PairingMode.COMPLEMENTARITY if diversity > 0.1 else PairingMode.SIMILARITY,
                "total_score": total_score,
                "policy_strength": policy_strength,
                "diversity_score": diversity,
            }
        )
    return sorted(ranked, key=lambda item: float(item["total_score"]), reverse=True)[:top_k]
