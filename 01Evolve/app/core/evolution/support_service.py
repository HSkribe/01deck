from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

from app.core.agents.service import AgentService
from app.core.compiler.service import AgentCompiler
from app.core.evaluation.support_scoring import (
    build_support_scorecard,
    score_correction_after_feedback,
    score_efficiency,
    score_escalation_judgment,
    score_format_compliance,
    score_intent_classification,
    score_policy_correct_response,
)
from app.core.evaluation.support_suite import load_support_dataset, load_support_policy, load_support_suite
from app.core.evolution.pairing import select_support_pairs
from app.core.evolution.recombination import breed_agents
from app.core.llm.adapters import LLMAdapter, MockLLMAdapter
from app.core.persistence.repository import Repository
from app.core.schemas.models import (
    AgentCreate,
    AgentRead,
    MatingEventCreate,
    PairingMode,
    RunStatus,
    SupportAdapterMode,
    SupportBaselineRecord,
    SupportBenchmarkCandidate,
    SupportBenchmarkReport,
    SupportBenchmarkRun,
    SupportCaseConfig,
    SupportCaseResult,
    SupportEvaluationRun,
    SupportScorecard,
    SupportSelectionStrategy,
)
from app.core.utils.common import clamp, read_data_file


class SupportOptimizationService:
    def __init__(
        self,
        repository: Repository,
        agent_service: AgentService,
        adapter: LLMAdapter | None = None,
    ):
        self.repository = repository
        self.agent_service = agent_service
        self.adapter = adapter or MockLLMAdapter()
        self.compiler = AgentCompiler()

    async def _run_case(self, agent: AgentRead, case: SupportCaseConfig, policy_rules):
        compiled = self.compiler.compile(agent)
        case_payload = {
            "issue_type": case.issue_type.value,
            "customer_message": case.customer_message,
            "context": case.context,
            "expected_action": case.expected_action,
            "expected_escalate": case.expected_escalate,
            "expected_escalation_target": case.expected_escalation_target,
            "expected_customer_response": case.expected_customer_response,
        }
        user_prompt = f"Resolve this tier-1 support case using JSON only.\n[[SUPPORT_CASE]]\n{case_payload}"
        first = await self.adapter.generate(
            system_prompt=compiled.rendered_system_prompt,
            user_prompt=user_prompt,
            temperature=agent.runtime_config.temperature,
            max_tokens=agent.runtime_config.max_tokens,
        )
        feedback_prompt = (
            f"{user_prompt}\n"
            f"Reviewer feedback: {case.feedback_message}\n"
            "Return a corrected JSON answer only."
        )
        revised = await self.adapter.generate(
            system_prompt=compiled.rendered_system_prompt,
            user_prompt=feedback_prompt,
            temperature=agent.runtime_config.temperature,
            max_tokens=agent.runtime_config.max_tokens,
        )
        return first, revised

    def create_support_agent(self, config: AgentCreate) -> AgentRead:
        return self.agent_service.create_agent(config)

    def create_support_agent_from_path(self, config_path: str | Path) -> AgentRead:
        return self.agent_service.create_agent_from_path(config_path)

    def create_baseline_support_agent(self, config_path: str | Path, suite_path: str | Path) -> tuple[AgentRead, SupportBaselineRecord]:
        agent = self.create_support_agent_from_path(config_path)
        evaluation = self.evaluate_support_agent(agent.agent_id, suite_path=suite_path)
        baseline = SupportBaselineRecord(
            agent_id=agent.agent_id,
            suite_id=evaluation.suite_id,
            scorecard=evaluation.scorecard,
        )
        self.repository.save_support_baseline(baseline)
        return agent, baseline

    def _materialize_scorecard(
        self,
        agent: AgentRead,
        suite_path: str | Path,
        baseline_agent_id: str | None = None,
        adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK,
        benchmark_run_id: str | None = None,
        generation_number: int = 0,
        tags: list[str] | None = None,
    ) -> SupportEvaluationRun:
        from app.core.evaluation.runner import run_async

        suite = load_support_suite(suite_path)
        dataset_path = Path(suite_path).resolve().parents[1] / "support_dataset.yaml"
        policy_path = Path(suite_path).resolve().parents[1] / "support_policy.yaml"
        policy_rules = load_support_policy(policy_path)
        dataset = load_support_dataset(dataset_path)
        baseline = self.repository.get_latest_support_baseline(baseline_agent_id, suite.suite_id) if baseline_agent_id else None
        case_results: list[SupportCaseResult] = []
        metric_rows: list[dict[str, float]] = []
        for case in dataset:
            first, revised = run_async(self._run_case(agent, case, policy_rules))
            from app.core.evaluation.support_scoring import _safe_json_loads  # local import to avoid export surface

            first_json = _safe_json_loads(first.text)
            revised_json = _safe_json_loads(revised.text)
            metrics = {
                "intent_classification": score_intent_classification(first_json, case),
                "policy_correct_response": score_policy_correct_response(first_json, case, policy_rules),
                "format_compliance": score_format_compliance(first.text, first_json),
                "escalation_judgment": score_escalation_judgment(first_json, case),
                "correction_after_feedback": score_correction_after_feedback(first_json, revised_json, case, policy_rules),
            }
            weighted_correctness = (
                metrics["intent_classification"] * suite.scoring_weights["intent_classification"]
                + metrics["policy_correct_response"] * suite.scoring_weights["policy_correct_response"]
                + metrics["format_compliance"] * suite.scoring_weights["format_compliance"]
                + metrics["escalation_judgment"] * suite.scoring_weights["escalation_judgment"]
                + metrics["correction_after_feedback"] * suite.scoring_weights["correction_after_feedback"]
            ) / 0.95
            metrics["efficiency"] = score_efficiency(first.total_tokens, revised.total_tokens, weighted_correctness)
            metric_rows.append(metrics)
            case_results.append(
                SupportCaseResult(
                    case_id=case.case_id,
                    issue_type=case.issue_type,
                    first_response=first.text,
                    revised_response=revised.text,
                    metrics=metrics,
                    prompt_tokens=first.prompt_tokens,
                    completion_tokens=first.completion_tokens,
                    total_tokens=first.total_tokens,
                    feedback_total_tokens=revised.total_tokens,
                    latency_ms=first.latency_ms,
                    feedback_latency_ms=revised.latency_ms,
                )
            )
        scorecard = build_support_scorecard(
            metric_rows,
            weights=suite.scoring_weights,
            eligibility_gates=suite.eligibility_gates,
            baseline_scorecard=baseline.scorecard if baseline else None,
        )
        evaluation = SupportEvaluationRun(
            agent_id=agent.agent_id,
            suite_id=suite.suite_id,
            adapter_mode=adapter_mode,
            status=RunStatus.COMPLETED,
            baseline_agent_id=baseline_agent_id,
            benchmark_run_id=benchmark_run_id,
            generation_number=generation_number,
            scorecard=scorecard,
            case_results=case_results,
            tags=tags or [],
            completed_at=datetime.now(timezone.utc),
        )
        self.repository.save_support_evaluation_run(evaluation)
        return evaluation

    def evaluate_support_agent(
        self,
        agent_id: str,
        suite_path: str | Path,
        baseline_agent_id: str | None = None,
        adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK,
        benchmark_run_id: str | None = None,
        generation_number: int = 0,
        tags: list[str] | None = None,
    ) -> SupportEvaluationRun:
        agent = self.repository.get_agent(agent_id)
        if not agent:
            raise ValueError(f"unknown agent_id {agent_id}")
        return self._materialize_scorecard(
            agent,
            suite_path=suite_path,
            baseline_agent_id=baseline_agent_id,
            adapter_mode=adapter_mode,
            benchmark_run_id=benchmark_run_id,
            generation_number=generation_number,
            tags=tags,
        )

    def evaluate_support_population(
        self,
        agent_ids: list[str],
        suite_path: str | Path,
        baseline_agent_id: str | None = None,
        adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK,
        benchmark_run_id: str | None = None,
        generation_number: int = 0,
    ) -> list[SupportEvaluationRun]:
        return [
            self.evaluate_support_agent(
                agent_id,
                suite_path=suite_path,
                baseline_agent_id=baseline_agent_id,
                adapter_mode=adapter_mode,
                benchmark_run_id=benchmark_run_id,
                generation_number=generation_number,
            )
            for agent_id in agent_ids
        ]

    def select_support_parents(self, benchmark_run_id: str | None = None, top_k: int = 10) -> list[dict[str, object]]:
        return select_support_pairs(self.repository.list_support_candidates(benchmark_run_id), top_k=top_k)

    def breed_support_variant(self, parent_a_id: str, parent_b_id: str) -> AgentRead:
        parent_a = self.repository.get_agent(parent_a_id)
        parent_b = self.repository.get_agent(parent_b_id)
        eval_a = self.repository.get_latest_support_evaluation(parent_a_id)
        eval_b = self.repository.get_latest_support_evaluation(parent_b_id)
        if not parent_a or not parent_b or not eval_a or not eval_b:
            raise ValueError("support parents require existing agents and support evaluations")
        child, event = breed_agents(
            parent_a,
            parent_b,
            eval_a.scorecard.weighted_overall_fitness,
            eval_b.scorecard.weighted_overall_fitness,
            MatingEventCreate(parent_a_id=parent_a_id, parent_b_id=parent_b_id, pairing_mode=PairingMode.COMPLEMENTARITY),
        )
        child.name = f"{parent_a.name} x {parent_b.name}"
        child.species_tag = "support-tier1"
        child.description = "Synthetic support-optimization variant"
        self.repository.save_agent(child)
        self.repository.save_mating_event(event)
        return child

    def run_support_generation(
        self,
        suite_path: str | Path,
        baseline_agent_id: str,
        benchmark_run_id: str | None = None,
        generation_number: int = 1,
        top_k: int = 5,
    ):
        ranked_pairs = self.select_support_parents(benchmark_run_id=benchmark_run_id, top_k=top_k)
        if not ranked_pairs:
            raise ValueError("no support parents are eligible")
        top_pair = ranked_pairs[0]
        child = self.breed_support_variant(str(top_pair["parent_a_id"]), str(top_pair["parent_b_id"]))
        evaluation = self.evaluate_support_agent(
            child.agent_id,
            suite_path=suite_path,
            baseline_agent_id=baseline_agent_id,
            benchmark_run_id=benchmark_run_id,
            generation_number=generation_number,
            tags=["generated"],
        )
        candidates = sorted(
            self.repository.list_support_candidates(benchmark_run_id),
            key=lambda item: item.scorecard.weighted_overall_fitness,
            reverse=True,
        )[:top_k]
        return {
            "generation_number": generation_number,
            "pair": top_pair,
            "child_agent_id": child.agent_id,
            "evaluation_run_id": evaluation.run_id,
            "top_candidates": candidates,
        }

    def get_support_lineage(self, agent_id: str) -> dict[str, object]:
        lineage = self.repository.get_lineage(agent_id)
        latest = self.repository.get_latest_support_evaluation(agent_id)
        return {
            **lineage,
            "latest_support_evaluation": latest.model_dump(mode="json") if latest else None,
        }

    def _load_agent_create(self, path: str | Path) -> AgentCreate:
        return AgentCreate.model_validate(read_data_file(Path(path)))

    def _variant_payloads(self, baseline_path: str | Path, parent_paths: list[str | Path], count: int) -> list[AgentCreate]:
        baseline = self._load_agent_create(baseline_path)
        parents = [self._load_agent_create(path) for path in parent_paths]
        payloads: list[AgentCreate] = []
        for index in range(count):
            source = deepcopy(parents[index % len(parents)].model_dump(mode="python"))
            alternate = parents[(index + 1) % len(parents)]
            source["name"] = f"Support Variant {index + 1:02d}"
            source["description"] = "Synthetic tier-1 support candidate"
            source["species_tag"] = "support-tier1"
            source["metadata"] = {
                "role": "support_variant",
                "variant_index": index + 1,
            }
            for field in ["discipline", "adaptability", "persistence", "social_receptivity", "economy"]:
                baseline_value = baseline.genome.traits.model_dump()[field]
                source["genome"]["traits"][field] = clamp(
                    (source["genome"]["traits"][field] + alternate.genome.traits.model_dump()[field] + baseline_value) / 3
                    + ((index % 5) - 2) * 0.02,
                )
            source["temperament"]["traits"]["stubbornness"] = clamp(
                min(
                    source["temperament"]["traits"]["stubbornness"],
                    alternate.temperament.traits.stubbornness,
                )
                + (index % 3) * 0.01
            )
            source["runtime_config"]["random_seed"] = 101 + index
            payloads.append(AgentCreate.model_validate(source))
        return payloads

    def get_benchmark_report(self, benchmark_run_id: str) -> SupportBenchmarkReport | None:
        return self.repository.get_support_benchmark_report(benchmark_run_id)

    def run_support_benchmark(
        self,
        suite_path: str | Path,
        baseline_config_path: str | Path,
        parent_config_paths: list[str | Path],
        population_size: int = 20,
        generations: int = 3,
        mutation_rate: float = 0.08,
        selection_strategy: SupportSelectionStrategy = SupportSelectionStrategy.BALANCED,
        adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK,
        benchmark_output_path: str | None = None,
    ) -> SupportBenchmarkReport:
        baseline_agent, baseline = self.create_baseline_support_agent(baseline_config_path, suite_path)
        benchmark = SupportBenchmarkRun(
            suite_id=baseline.suite_id,
            baseline_agent_id=baseline_agent.agent_id,
            population_size=population_size,
            generations_requested=generations,
            mutation_rate=mutation_rate,
            selection_strategy=selection_strategy,
            adapter_mode=adapter_mode,
        )
        self.repository.save_support_benchmark_run(benchmark)
        variant_payloads = self._variant_payloads(baseline_config_path, parent_config_paths, population_size)
        created_agent_ids = [self.create_support_agent(payload).agent_id for payload in variant_payloads]
        self.evaluate_support_population(
            created_agent_ids,
            suite_path=suite_path,
            baseline_agent_id=baseline_agent.agent_id,
            adapter_mode=adapter_mode,
            benchmark_run_id=benchmark.benchmark_run_id,
            generation_number=0,
        )
        score_trend = [
            max(candidate.scorecard.weighted_overall_fitness for candidate in self.repository.list_support_candidates(benchmark.benchmark_run_id))
        ]
        for generation_number in range(1, generations + 1):
            result = self.run_support_generation(
                suite_path=suite_path,
                baseline_agent_id=baseline_agent.agent_id,
                benchmark_run_id=benchmark.benchmark_run_id,
                generation_number=generation_number,
            )
            score_trend.append(float(result["top_candidates"][0].scorecard.weighted_overall_fitness))
        candidates = sorted(
            self.repository.list_support_candidates(benchmark.benchmark_run_id),
            key=lambda item: item.scorecard.weighted_overall_fitness,
            reverse=True,
        )
        best = candidates[0]
        baseline_scorecard = baseline.scorecard
        best_scorecard = best.scorecard
        percent_improvements = {
            "weighted_overall_fitness": ((best_scorecard.weighted_overall_fitness - baseline_scorecard.weighted_overall_fitness) / max(baseline_scorecard.weighted_overall_fitness, 0.001)) * 100,
            "escalation_judgment": ((best_scorecard.escalation_judgment - baseline_scorecard.escalation_judgment) / max(baseline_scorecard.escalation_judgment, 0.001)) * 100,
            "correction_after_feedback": ((best_scorecard.correction_after_feedback - baseline_scorecard.correction_after_feedback) / max(baseline_scorecard.correction_after_feedback, 0.001)) * 100,
            "token_cost": ((best_scorecard.efficiency - baseline_scorecard.efficiency) / max(baseline_scorecard.efficiency, 0.001)) * 100,
        }
        success_criteria_results = {
            "weighted_overall_fitness": percent_improvements["weighted_overall_fitness"] >= 10,
            "escalation_judgment": percent_improvements["escalation_judgment"] >= 15,
            "correction_after_feedback": percent_improvements["correction_after_feedback"] >= 10,
            "token_cost": percent_improvements["token_cost"] >= -5,
        }
        report = SupportBenchmarkReport(
            benchmark_run_id=benchmark.benchmark_run_id,
            suite_id=baseline.suite_id,
            baseline_agent_id=baseline_agent.agent_id,
            best_agent_id=best.agent_id,
            generations_completed=generations,
            population_size=population_size,
            baseline_scorecard=baseline_scorecard,
            best_scorecard=best_scorecard,
            percent_improvements=percent_improvements,
            success_criteria_results=success_criteria_results,
            score_trend=score_trend,
            top_candidates=candidates[:5],
            output_path=benchmark_output_path,
        )
        self.repository.update_support_benchmark_report(benchmark.benchmark_run_id, report)
        if benchmark_output_path:
            out_path = Path(benchmark_output_path)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(report.model_dump_json(indent=2), encoding="utf-8")
        return report
