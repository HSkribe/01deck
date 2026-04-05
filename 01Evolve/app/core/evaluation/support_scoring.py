from __future__ import annotations

import json
from typing import Any

from app.core.schemas.models import SupportCaseConfig, SupportPolicyRule, SupportScorecard
from app.core.utils.common import clamp, mean

REQUIRED_FORMAT_KEYS = {
    "issue_type",
    "recommended_action",
    "escalate",
    "customer_response",
}


def _safe_json_loads(payload: str) -> dict[str, Any] | None:
    try:
        value = json.loads(payload)
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def score_intent_classification(response_json: dict[str, Any] | None, case: SupportCaseConfig) -> float:
    if not response_json:
        return 0.0
    issue_type = str(response_json.get("issue_type", "")).strip().lower()
    return 1.0 if issue_type == case.issue_type.value else 0.0


def score_policy_correct_response(
    response_json: dict[str, Any] | None,
    case: SupportCaseConfig,
    policy_rules: list[SupportPolicyRule],
) -> float:
    if not response_json:
        return 0.0
    action = str(response_json.get("recommended_action", "")).strip().lower()
    matching_rules = [rule for rule in policy_rules if rule.category == case.issue_type]
    if action == case.expected_action.lower():
        return 1.0
    if any(action in [allowed.lower() for allowed in rule.allowed_actions] for rule in matching_rules):
        return 0.65
    if action and any(token in action for token in case.expected_action.lower().split("_")):
        return 0.4
    return 0.0


def score_format_compliance(response_text: str, response_json: dict[str, Any] | None) -> float:
    if response_json is None:
        return 0.0
    score = 0.4
    keys_present = REQUIRED_FORMAT_KEYS.intersection(response_json.keys())
    score += 0.4 * (len(keys_present) / len(REQUIRED_FORMAT_KEYS))
    customer_response = str(response_json.get("customer_response", ""))
    if customer_response and len(customer_response) <= 280:
        score += 0.1
    if "internal" not in response_text.lower() and "policy only" not in response_text.lower():
        score += 0.1
    return clamp(score)


def score_escalation_judgment(response_json: dict[str, Any] | None, case: SupportCaseConfig) -> float:
    if not response_json:
        return 0.0
    escalate = bool(response_json.get("escalate"))
    if escalate != case.expected_escalate:
        return 0.0
    if not escalate:
        return 1.0
    target = str(response_json.get("escalation_target", "")).strip().lower()
    if target == (case.expected_escalation_target or "").lower():
        return 1.0
    return 0.6


def score_correction_after_feedback(
    first_json: dict[str, Any] | None,
    revised_json: dict[str, Any] | None,
    case: SupportCaseConfig,
    policy_rules: list[SupportPolicyRule],
) -> float:
    baseline = score_policy_correct_response(first_json, case, policy_rules)
    revised = score_policy_correct_response(revised_json, case, policy_rules)
    if baseline <= 0.1 and revised >= 0.9:
        return 0.6
    if baseline >= 0.9 and revised >= baseline:
        return 0.75
    improvement = revised - baseline
    if revised <= baseline:
        return 0.0 if revised < 0.5 else 0.25
    return clamp(0.5 + improvement)


def score_efficiency(total_tokens: int | None, feedback_total_tokens: int | None, weighted_correctness: float) -> float:
    token_budget = float((total_tokens or 0) + (feedback_total_tokens or 0))
    if token_budget <= 0:
        return clamp(weighted_correctness)
    normalized_cost = min(token_budget / 180.0, 1.5)
    return clamp(weighted_correctness * (1.1 - min(normalized_cost, 1.0)))


def build_support_scorecard(
    case_metric_rows: list[dict[str, float]],
    weights: dict[str, float],
    eligibility_gates: dict[str, float],
    baseline_scorecard: SupportScorecard | None = None,
) -> SupportScorecard:
    dimensions = [
        "intent_classification",
        "policy_correct_response",
        "format_compliance",
        "escalation_judgment",
        "correction_after_feedback",
        "efficiency",
    ]
    aggregates = {dimension: mean([row[dimension] for row in case_metric_rows]) for dimension in dimensions}
    weighted = sum(aggregates[dimension] * weights[dimension] for dimension in dimensions)
    deltas = {}
    if baseline_scorecard:
        for dimension in dimensions + ["weighted_overall_fitness"]:
            baseline_value = getattr(baseline_scorecard, dimension)
            current_value = weighted if dimension == "weighted_overall_fitness" else aggregates[dimension]
            deltas[dimension] = current_value - baseline_value
    failures = [
        f"{dimension}<{threshold:.2f}"
        for dimension, threshold in eligibility_gates.items()
        if aggregates.get(dimension, 0.0) < threshold
    ]
    return SupportScorecard(
        **aggregates,
        weighted_overall_fitness=clamp(weighted),
        delta_vs_baseline=deltas,
        parent_eligible=not failures,
        failed_threshold_reasons=failures,
    )
