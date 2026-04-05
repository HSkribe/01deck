from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from app.core.compiler.service import AgentCompiler
from app.core.evaluation.latent_traits import map_latent_traits
from app.core.fitness.service import FitnessService
from app.core.scoring import methods
from app.core.schemas.models import (
    AgentRead,
    BaselineProfile,
    DeltaProfile,
    EvaluationRunRead,
    PhenotypeProfile,
    RunStatus,
    TemperamentProfile,
    TestCaseConfig,
    TestRunRead,
    VarianceProfile,
)
from app.core.utils.common import clamp, mean, stdev


class EvaluationRunner:
    def __init__(self, adapter, compiler: AgentCompiler | None = None, fitness_service: FitnessService | None = None):
        self.adapter = adapter
        self.compiler = compiler or AgentCompiler()
        self.fitness_service = fitness_service or FitnessService()

    def _score_output(
        self,
        test: TestCaseConfig,
        outputs_so_far: list[str],
        actual: str,
        total_tokens: int | None,
        latency_ms: int | None,
    ) -> tuple[float, str]:
        method = test.scoring_method.value
        if method == "exact_text_match":
            score = methods.exact_text_match(actual, (test.expected_outputs or [""])[0])
        elif method == "normalized_text_match":
            score = methods.normalized_text_match(actual, (test.expected_outputs or [""])[0])
        elif method == "regex_match":
            score = methods.regex_match(actual, test.regex_pattern or "")
        elif method == "json_validity":
            score = methods.json_validity(actual)
        elif method == "numeric_correctness":
            score = methods.numeric_correctness(actual, float(test.numeric_answer or 0))
        elif method == "semantic_distinctness_basic":
            score = methods.semantic_distinctness_basic(outputs_so_far + [actual])
        elif method == "unique_output_ratio":
            score = methods.unique_output_ratio(outputs_so_far + [actual])
        elif method == "consistency_ratio":
            score = methods.consistency_ratio(outputs_so_far + [actual])
        elif method == "correction_improvement_ratio":
            score = methods.correction_improvement_ratio(
                outputs_so_far[-1] if outputs_so_far else "",
                actual,
                (test.expected_outputs or [""])[0],
            )
        elif method == "peer_integration_basic":
            score = methods.peer_integration_basic(actual)
        elif method == "efficiency_normalized":
            success = methods.normalized_text_match(actual, (test.expected_outputs or [actual])[0])
            score = methods.efficiency_normalized(success, total_tokens, latency_ms)
        else:
            score = 0.0
        return clamp(score), f"{test.scoring_method.value}={score:.3f}"

    async def _run_case(self, system_prompt: str, runtime: dict[str, Any], test: TestCaseConfig) -> tuple[list[TestRunRead], float]:
        traces: list[TestRunRead] = []
        outputs: list[str] = []
        scores: list[float] = []
        for repeat in range(test.repeats):
            prompt = test.prompts[repeat % len(test.prompts)]
            response = await self.adapter.generate(
                system_prompt=system_prompt,
                user_prompt=prompt,
                temperature=runtime["temperature"],
                max_tokens=runtime["max_tokens"],
            )
            score, explanation = self._score_output(
                test,
                outputs,
                response.text,
                response.total_tokens,
                response.latency_ms,
            )
            outputs.append(response.text)
            scores.append(score)
            traces.append(
                TestRunRead(
                    test_id=test.id,
                    category=test.category,
                    prompt_text=prompt,
                    expected_json={
                        "expected_outputs": test.expected_outputs,
                        "regex_pattern": test.regex_pattern,
                        "numeric_answer": test.numeric_answer,
                    },
                    actual_output=response.text,
                    score=score,
                    score_explanation=explanation,
                    prompt_tokens=response.prompt_tokens,
                    completion_tokens=response.completion_tokens,
                    total_tokens=response.total_tokens,
                    latency_ms=response.latency_ms,
                    raw_trace_json=response.raw or {},
                )
            )
        return traces, mean(scores)

    async def evaluate(
        self,
        agent: AgentRead,
        phenotype_suite,
        temperament_suite,
        baseline: BaselineProfile | None = None,
    ) -> EvaluationRunRead:
        compiled = self.compiler.compile(agent)
        runtime = compiled.derived_runtime_parameters
        phenotype_scores: dict[str, list[float]] = defaultdict(list)
        temperament_scores: dict[str, list[float]] = defaultdict(list)
        variances: dict[str, float] = {}
        traces: list[TestRunRead] = []
        for suite, collector in ((phenotype_suite, phenotype_scores), (temperament_suite, temperament_scores)):
            for test in suite.tests:
                case_traces, case_score = await self._run_case(compiled.rendered_system_prompt, runtime, test)
                traces.extend(case_traces)
                collector[test.category].append(case_score)
                variances[test.id] = stdev([item.score for item in case_traces])
        phenotype = PhenotypeProfile(**{key: mean(value) for key, value in phenotype_scores.items()})
        temperament = TemperamentProfile(**{key: mean(value) for key, value in temperament_scores.items()})
        delta_data = {}
        if baseline:
            for key, value in phenotype.model_dump().items():
                delta_data[key] = value - getattr(baseline.phenotype, key)
            for key, value in temperament.model_dump().items():
                delta_data[f"temperament_{key}"] = value - getattr(baseline.temperament, key)
        delta = DeltaProfile(**delta_data)
        latent = map_latent_traits(phenotype, temperament)
        fitness = self.fitness_service.score(
            phenotype,
            temperament,
            weights=phenotype_suite.scoring_weights,
            thresholds=phenotype_suite.thresholds,
        )
        return EvaluationRunRead(
            agent_id=agent.agent_id,
            suite_id=phenotype_suite.suite_id,
            temperament_suite_id=temperament_suite.suite_id,
            status=RunStatus.COMPLETED,
            phenotype=phenotype,
            temperament=temperament,
            variance=VarianceProfile(**variances),
            delta=delta,
            latent_traits=latent,
            fitness=fitness,
            eligible_to_breed=fitness.eligible_to_breed,
            completed_at=datetime.now(timezone.utc),
            test_runs=traces,
        )


def run_async(coro):
    return asyncio.run(coro)
