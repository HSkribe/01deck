from __future__ import annotations

import ast
import json
import re
import time
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from app.core.utils.common import clamp, seeded_random


@dataclass
class LLMResponse:
    text: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    latency_ms: int | None = None
    raw: dict[str, Any] | None = None


class LLMAdapter(Protocol):
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 512,
        tools: list | None = None,
    ) -> LLMResponse: ...


class MockLLMAdapter:
    def _extract_spec(self, system_prompt: str) -> dict[str, Any]:
        marker = "[[EVOLVE_SPEC]]"
        if marker not in system_prompt:
            return {}
        return json.loads(system_prompt.split(marker, 1)[1].strip())

    def _behavior(self, spec: dict[str, Any]) -> dict[str, float]:
        derived = spec.get("derived", {})
        temperament = spec.get("temperament", {}).get("traits", {})
        genome = spec.get("genome", {}).get("traits", {})
        policy = spec.get("policy_config", {})
        return {
            "discipline": float(genome.get("discipline", 0.5)),
            "adaptability": float(genome.get("adaptability", 0.5)),
            "social": float(genome.get("social_receptivity", 0.5)),
            "novelty": float(temperament.get("novelty_seeking", 0.5)),
            "stubbornness": float(temperament.get("stubbornness", 0.5)),
            "caution": float(temperament.get("caution", 0.5)),
            "assertiveness": float(temperament.get("assertiveness", 0.5)),
            "deference": float(temperament.get("deference", 0.5)),
            "patience": float(temperament.get("patience", 0.5)),
            "verbosity": float(temperament.get("verbosity", 0.5)),
            "format_enforcement": float(derived.get("format_enforcement", 0.5)),
            "adapt_after_feedback": float(derived.get("adapt_after_feedback", 0.5)),
            "seed": int(spec.get("runtime_config", {}).get("random_seed", 7)),
            "branch_factor": float(policy.get("branch_factor", 2)),
        }

    def _creative_idea(self, rng, novelty: float, idx: int) -> str:
        pool = [
            "map civic air quality with bike couriers",
            "build a receipt-to-budget translator",
            "turn outage logs into reliability flashcards",
            "summarize team standups into risk signals",
            "pair recipe scraps with pantry inventory",
        ]
        if novelty > 0.6:
            return pool[(idx + rng.randint(0, len(pool) - 1)) % len(pool)]
        return pool[idx % 2]

    def _extract_support_case(self, user_prompt: str) -> dict[str, Any] | None:
        marker = "[[SUPPORT_CASE]]"
        if marker not in user_prompt:
            return None
        payload = user_prompt.split(marker, 1)[1].strip().splitlines()[0].strip()
        try:
            value = ast.literal_eval(payload)
        except Exception:
            return None
        return value if isinstance(value, dict) else None

    def _support_response(self, behavior: dict[str, float], case: dict[str, Any], feedback_mode: bool) -> str:
        issue_type = str(case.get("issue_type", "product_info"))
        expected_action = str(case.get("expected_action", "reply_with_standard_answer"))
        expected_escalate = bool(case.get("expected_escalate", False))
        expected_target = case.get("expected_escalation_target")
        expected_customer_response = str(case.get("expected_customer_response", "We are reviewing the request."))
        classification_quality = clamp((behavior["discipline"] + behavior["caution"] + behavior["format_enforcement"]) / 3)
        policy_quality = clamp((behavior["discipline"] + behavior["adaptability"] + behavior["social"]) / 3)
        correction_quality = clamp((behavior["adapt_after_feedback"] + behavior["adaptability"] - behavior["stubbornness"] * 0.5) / 1.5)
        format_quality = clamp(behavior["format_enforcement"] - behavior["stubbornness"] * 0.15)
        if feedback_mode:
            classification_quality = clamp(classification_quality + correction_quality * 0.2)
            policy_quality = clamp(policy_quality + correction_quality * 0.25)
            format_quality = clamp(format_quality + correction_quality * 0.1)

        predicted_issue = issue_type if classification_quality >= 0.62 else ("technical_issue" if issue_type != "technical_issue" else "product_info")
        action_threshold = 0.78 if feedback_mode else 0.74
        recommended_action = expected_action if policy_quality >= action_threshold else "offer_generic_troubleshooting"
        escalate = expected_escalate if policy_quality >= 0.76 else (expected_escalate and behavior["caution"] > 0.68)
        escalation_target = expected_target if escalate and policy_quality >= 0.82 else ("risk_and_trust" if escalate else None)
        customer_response = (
            "Billing review opened. We will update you after invoice verification."
            if "billing" in issue_type
            else "I can help restore access after identity verification."
            if "access/login" in issue_type
            else "Here is the correct plan and next step."
        )
        if policy_quality < 0.66:
            customer_response = "Thanks for the report. I am reviewing the request."
        if behavior["verbosity"] > 0.55:
            customer_response = f"{customer_response} Current status noted."
        payload = {
            "issue_type": predicted_issue,
            "recommended_action": recommended_action,
            "escalate": escalate,
            "customer_response": customer_response,
        }
        if escalate and escalation_target:
            payload["escalation_target"] = escalation_target
        if format_quality < 0.58:
            return f"issue_type={predicted_issue}; recommended_action={recommended_action}; escalate={str(escalate).lower()}"
        return json.dumps(payload)

    def _answer(self, behavior: dict[str, float], user_prompt: str) -> str:
        prompt = user_prompt.lower()
        rng = seeded_random(behavior["seed"] + sum(ord(ch) for ch in user_prompt))
        obey = behavior["discipline"] * 0.6 + behavior["format_enforcement"] * 0.4
        concise = 1 - behavior["verbosity"]
        support_case = self._extract_support_case(user_prompt)
        if support_case:
            return self._support_response(behavior, support_case, "reviewer feedback:" in prompt)
        if "reply with the word ready" in prompt:
            return "ready" if obey > 0.45 else "ready to help"
        if "what is 2 + 2" in prompt:
            return "4"
        if "state your role in one sentence" in prompt:
            return "I evaluate inspectable agents against reproducible test batteries."
        if "capital of france" in prompt:
            return "Paris"
        if "capital of japan" in prompt:
            return "Tokyo"
        if "capital of brazil" in prompt:
            return "Brasilia"
        if "exactly 3 words" in prompt:
            return "calm systems adapt" if obey > 0.55 else "calm systems adapt well"
        if "strict json" in prompt or "json only" in prompt:
            return '{"status":"ok","value":4}' if obey > 0.45 else "status=ok,value=4"
        if "yes/no only" in prompt:
            return "yes" if behavior["assertiveness"] > 0.3 else "maybe yes"
        if "sort" in prompt:
            numbers = [int(item) for item in re.findall(r"-?\d+", user_prompt)]
            return ", ".join(str(item) for item in sorted(numbers))
        if "peer answer" in prompt or "improve this plan" in prompt:
            if behavior["social"] + behavior["deference"] > 0.8:
                return "Keep the useful parts, add verification, and tighten the final format."
            return "The peer answer is incomplete; add verification and fix the missing step."
        if "that is incorrect" in prompt:
            return "4" if behavior["stubbornness"] < 0.5 else "I still think it is 5."
        if "three-step plan" in prompt or "3-step plan" in prompt:
            steps = ["1. Inspect inputs", "2. Execute checks", "3. Return bounded output"]
            return "\n".join(steps[: 2 + round(behavior["patience"])])
        if "generate one short idea" in prompt:
            return self._creative_idea(rng, behavior["novelty"], rng.randint(0, 4))
        if "choose one option" in prompt:
            return "Option A" if behavior["assertiveness"] > 0.5 else "Option A, though more context would help."
        if "briefly explain uncertainty" in prompt:
            return "Evidence is limited, so I would verify before committing." if behavior["caution"] > 0.5 else "Best answer: proceed."
        return "ready" if concise > 0.55 else "I can help with that task."

    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 512, tools: list | None = None) -> LLMResponse:
        started = time.perf_counter()
        spec = self._extract_spec(system_prompt)
        behavior = self._behavior(spec)
        text = self._answer(behavior, user_prompt)[:max_tokens]
        latency = int((time.perf_counter() - started) * 1000)
        prompt_tokens = max(1, len(user_prompt.split()))
        completion_tokens = max(1, len(text.split()))
        return LLMResponse(
            text=text,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            latency_ms=latency,
            raw={"mock": True, "behavior": behavior, "tools": tools or []},
        )


class OpenAICompatibleAdapter:
    def __init__(self, base_url: str, api_key: str, model: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model

    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 512, tools: list | None = None) -> LLMResponse:
        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    **({"tools": tools} if tools else {}),
                },
            )
            response.raise_for_status()
            data = response.json()
        usage = data.get("usage", {})
        return LLMResponse(
            text=data["choices"][0]["message"]["content"],
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
            latency_ms=int((time.perf_counter() - started) * 1000),
            raw=data,
        )
