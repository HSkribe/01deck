from __future__ import annotations

import json
import re
from collections import Counter
from difflib import SequenceMatcher

from app.core.utils.common import clamp, mean


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def exact_text_match(actual: str, expected: str) -> float:
    return 1.0 if actual == expected else 0.0


def normalized_text_match(actual: str, expected: str) -> float:
    left = normalize(actual)
    right = normalize(expected)
    return 1.0 if left == right else SequenceMatcher(a=left, b=right).ratio()


def regex_match(actual: str, pattern: str) -> float:
    return 1.0 if re.search(pattern, actual) else 0.0


def json_validity(actual: str) -> float:
    try:
        json.loads(actual)
        return 1.0
    except Exception:
        return 0.0


def numeric_correctness(actual: str, expected: float) -> float:
    numbers = re.findall(r"-?\d+(?:\.\d+)?", actual)
    return 1.0 if numbers and abs(float(numbers[0]) - expected) < 1e-9 else 0.0


def semantic_distinctness_basic(outputs: list[str]) -> float:
    normalized = [set(normalize(item).split()) for item in outputs if item.strip()]
    if len(normalized) < 2:
        return 0.0
    scores: list[float] = []
    for index in range(len(normalized) - 1):
        left = normalized[index]
        right = normalized[index + 1]
        union = len(left | right) or 1
        scores.append(1 - (len(left & right) / union))
    return clamp(mean(scores))


def unique_output_ratio(outputs: list[str]) -> float:
    normalized = [normalize(item) for item in outputs]
    return len(set(normalized)) / len(normalized) if normalized else 0.0


def consistency_ratio(outputs: list[str]) -> float:
    normalized = [normalize(item) for item in outputs]
    if not normalized:
        return 0.0
    return Counter(normalized).most_common(1)[0][1] / len(normalized)


def correction_improvement_ratio(before: str, after: str, expected: str) -> float:
    return clamp(normalized_text_match(after, expected) - normalized_text_match(before, expected) + 0.5)


def peer_integration_basic(output: str) -> float:
    lowered = normalize(output)
    signals = ["peer", "improve", "add", "fix", "useful", "verification"]
    return clamp(sum(1 for signal in signals if signal in lowered) / 4)


def efficiency_normalized(success: float, total_tokens: int | None, latency_ms: int | None) -> float:
    token_penalty = min((total_tokens or 1) / 200, 1.0)
    latency_penalty = min((latency_ms or 1) / 2000, 1.0)
    return clamp(success * (1 - 0.5 * token_penalty) * (1 - 0.3 * latency_penalty))
