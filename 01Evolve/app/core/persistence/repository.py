from __future__ import annotations

import json
from typing import Any

from sqlalchemy import delete, desc, select
from sqlalchemy.orm import Session

from app.core.persistence.models import (
    AgentRecord,
    BaselineProfileRecord,
    ConfigRecord,
    EvaluationRunRecord,
    EvaluationSuiteRecord,
    GenomeRecord,
    LifecycleEventRecord,
    LineageLinkRecord,
    MatingEventRecord,
    PluginReportRecord,
    SupportBaselineRecordModel,
    SupportBenchmarkRunRecord,
    SupportCaseResultRecord,
    SupportEvaluationRunRecord,
    TemperamentRecord,
    TestRunRecord,
)
from app.core.schemas.models import (
    AgentRead,
    BaselineProfile,
    EvaluationRunRead,
    EvaluationSuiteConfig,
    LifecycleEventRead,
    PluginReportRead,
    SupportBaselineRecord,
    SupportBenchmarkCandidate,
    SupportBenchmarkRun,
    SupportBenchmarkReport,
    SupportCaseResult,
    SupportEvaluationRun,
    SupportScorecard,
    TestRunRead,
)


class Repository:
    def __init__(self, session: Session):
        self.session = session

    def _decode_agent(self, agent: AgentRecord) -> AgentRead:
        genome = self.session.scalar(
            select(GenomeRecord).where(GenomeRecord.agent_id == agent.agent_id).order_by(desc(GenomeRecord.id))
        )
        temperament = self.session.scalar(
            select(TemperamentRecord).where(TemperamentRecord.agent_id == agent.agent_id).order_by(desc(TemperamentRecord.id))
        )
        configs = {
            row.config_type: row
            for row in self.session.scalars(select(ConfigRecord).where(ConfigRecord.agent_id == agent.agent_id)).all()
        }
        return AgentRead.model_validate(
            {
                "agent_id": agent.agent_id,
                "name": agent.name,
                "description": agent.description,
                "species_tag": agent.species_tag,
                "base_model": agent.base_model,
                "model_provider": agent.model_provider,
                "system_prompt_template": agent.system_prompt_template,
                "metadata": json.loads(agent.metadata_json),
                "active": agent.is_active,
                "created_at": agent.created_at,
                "genome": {
                    "genome_version": genome.genome_version,
                    "traits": json.loads(genome.traits_json),
                    "strategy_genes": json.loads(genome.strategy_genes_json),
                    "mutation": json.loads(genome.mutation_json),
                },
                "temperament": {
                    "temperament_version": temperament.temperament_version,
                    "traits": json.loads(temperament.traits_json),
                },
                "policy_config": json.loads(configs["policy"].config_json),
                "memory_config": json.loads(configs["memory"].config_json),
                "tool_config": json.loads(configs["tool"].config_json),
                "runtime_config": json.loads(configs["runtime"].config_json),
            }
        )

    def save_agent(self, agent: AgentRead) -> AgentRead:
        existing = self.session.scalar(select(AgentRecord).where(AgentRecord.agent_id == agent.agent_id))
        if existing:
            self.session.execute(delete(AgentRecord).where(AgentRecord.agent_id == agent.agent_id))
            self.session.execute(delete(GenomeRecord).where(GenomeRecord.agent_id == agent.agent_id))
            self.session.execute(delete(TemperamentRecord).where(TemperamentRecord.agent_id == agent.agent_id))
            self.session.execute(delete(ConfigRecord).where(ConfigRecord.agent_id == agent.agent_id))
            self.session.flush()
        self.session.add(
            AgentRecord(
                agent_id=agent.agent_id,
                name=agent.name,
                description=agent.description,
                species_tag=agent.species_tag,
                base_model=agent.base_model,
                model_provider=agent.model_provider,
                system_prompt_template=agent.system_prompt_template,
                metadata_json=json.dumps(agent.metadata),
                is_active=agent.active,
                created_at=agent.created_at,
            )
        )
        self.session.add(
            GenomeRecord(
                agent_id=agent.agent_id,
                genome_version=agent.genome.genome_version,
                traits_json=agent.genome.traits.model_dump_json(),
                strategy_genes_json=agent.genome.strategy_genes.model_dump_json(),
                mutation_json=agent.genome.mutation.model_dump_json(),
            )
        )
        self.session.add(
            TemperamentRecord(
                agent_id=agent.agent_id,
                temperament_version=agent.temperament.temperament_version,
                traits_json=agent.temperament.traits.model_dump_json(),
            )
        )
        for config_type, config in {
            "policy": agent.policy_config,
            "memory": agent.memory_config,
            "tool": agent.tool_config,
            "runtime": agent.runtime_config,
        }.items():
            self.session.add(
                ConfigRecord(agent_id=agent.agent_id, config_type=config_type, config_json=config.model_dump_json())
            )
        self.session.commit()
        return agent

    def get_agent(self, agent_id: str) -> AgentRead | None:
        agent = self.session.scalar(select(AgentRecord).where(AgentRecord.agent_id == agent_id))
        if not agent:
            return None
        return self._decode_agent(agent)

    def list_agents(self, species_tag: str | None = None) -> list[AgentRead]:
        query = select(AgentRecord).order_by(AgentRecord.id)
        if species_tag:
            query = query.where(AgentRecord.species_tag == species_tag)
        return [self._decode_agent(record) for record in self.session.scalars(query).all()]

    def save_suite(self, suite: EvaluationSuiteConfig) -> None:
        self.session.add(
            EvaluationSuiteRecord(
                suite_id=suite.suite_id,
                version=suite.version,
                description=suite.description,
                suite_json=suite.model_dump_json(),
            )
        )
        self.session.commit()

    def save_baseline(self, baseline: BaselineProfile) -> int:
        record = BaselineProfileRecord(
            baseline_agent_id=baseline.baseline_agent_id,
            suite_id=baseline.suite_id,
            phenotype_json=baseline.phenotype.model_dump_json(),
            temperament_json=baseline.temperament.model_dump_json(),
            variance_json=baseline.variance.model_dump_json(),
            created_at=baseline.created_at,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record.id

    def get_latest_baseline(self, baseline_agent_id: str, suite_id: str) -> tuple[int, BaselineProfile] | None:
        record = self.session.scalar(
            select(BaselineProfileRecord)
            .where(
                BaselineProfileRecord.baseline_agent_id == baseline_agent_id,
                BaselineProfileRecord.suite_id == suite_id,
            )
            .order_by(desc(BaselineProfileRecord.id))
        )
        if not record:
            return None
        return (
            record.id,
            BaselineProfile(
                baseline_agent_id=record.baseline_agent_id,
                suite_id=record.suite_id,
                phenotype=json.loads(record.phenotype_json),
                temperament=json.loads(record.temperament_json),
                variance=json.loads(record.variance_json),
                created_at=record.created_at,
            ),
        )

    def save_evaluation_run(self, evaluation: EvaluationRunRead) -> EvaluationRunRead:
        record = EvaluationRunRecord(
            run_id=evaluation.run_id,
            agent_id=evaluation.agent_id,
            baseline_profile_id=int(evaluation.baseline_profile_id) if evaluation.baseline_profile_id else None,
            suite_id=evaluation.suite_id,
            status=evaluation.status.value,
            phenotype_json=evaluation.phenotype.model_dump_json(),
            temperament_json=evaluation.temperament.model_dump_json(),
            variance_json=evaluation.variance.model_dump_json(),
            delta_json=evaluation.delta.model_dump_json(),
            latent_traits_json=evaluation.latent_traits.model_dump_json(),
            fitness_json=evaluation.fitness.model_dump_json(),
            eligible_to_breed=evaluation.eligible_to_breed,
            started_at=evaluation.started_at,
            completed_at=evaluation.completed_at,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        for test_run in evaluation.test_runs:
            self.session.add(
                TestRunRecord(
                    evaluation_run_id=record.id,
                    test_id=test_run.test_id,
                    category=test_run.category,
                    prompt_text=test_run.prompt_text,
                    expected_json=json.dumps(test_run.expected_json),
                    actual_output=test_run.actual_output,
                    score=test_run.score,
                    score_explanation=test_run.score_explanation,
                    prompt_tokens=test_run.prompt_tokens,
                    completion_tokens=test_run.completion_tokens,
                    total_tokens=test_run.total_tokens,
                    latency_ms=test_run.latency_ms,
                    raw_trace_json=json.dumps(test_run.raw_trace_json),
                    created_at=test_run.created_at,
                )
            )
        self.session.commit()
        return evaluation

    def get_latest_evaluations(self, species_tag: str | None = None) -> list[EvaluationRunRead]:
        rows = self.session.scalars(select(EvaluationRunRecord).order_by(desc(EvaluationRunRecord.id))).all()
        seen: set[str] = set()
        output: list[EvaluationRunRead] = []
        for row in rows:
            if row.agent_id in seen:
                continue
            agent = self.get_agent(row.agent_id)
            if species_tag and agent and agent.species_tag != species_tag:
                continue
            seen.add(row.agent_id)
            tests = self.session.scalars(select(TestRunRecord).where(TestRunRecord.evaluation_run_id == row.id)).all()
            evaluation = EvaluationRunRead(
                run_id=row.run_id,
                agent_id=row.agent_id,
                baseline_profile_id=str(row.baseline_profile_id) if row.baseline_profile_id else None,
                suite_id=row.suite_id,
                status=row.status,
                phenotype=json.loads(row.phenotype_json),
                temperament=json.loads(row.temperament_json),
                variance=json.loads(row.variance_json),
                delta=json.loads(row.delta_json),
                latent_traits=json.loads(row.latent_traits_json),
                fitness=json.loads(row.fitness_json),
                eligible_to_breed=row.eligible_to_breed,
                started_at=row.started_at,
                completed_at=row.completed_at,
                test_runs=[
                    TestRunRead(
                        test_id=test.test_id,
                        category=test.category,
                        prompt_text=test.prompt_text,
                        expected_json=json.loads(test.expected_json),
                        actual_output=test.actual_output,
                        score=test.score,
                        score_explanation=test.score_explanation,
                        prompt_tokens=test.prompt_tokens,
                        completion_tokens=test.completion_tokens,
                        total_tokens=test.total_tokens,
                        latency_ms=test.latency_ms,
                        raw_trace_json=json.loads(test.raw_trace_json),
                        created_at=test.created_at,
                    )
                    for test in tests
                ],
                plugin_reports=self.list_plugin_reports(target_id=row.run_id),
            )
            output.append(evaluation)
        return output

    def get_latest_evaluation(self, agent_id: str) -> EvaluationRunRead | None:
        return {item.agent_id: item for item in self.get_latest_evaluations()}.get(agent_id)

    def save_mating_event(self, event) -> None:
        self.session.add(
            MatingEventRecord(
                event_id=event.event_id,
                parent_a_id=event.parent_a_id,
                parent_b_id=event.parent_b_id,
                child_agent_id=event.child_agent_id,
                pairing_mode=event.pairing_mode.value,
                recombination_json=event.recombination.model_dump_json(),
                mutation_json=json.dumps([item.model_dump() for item in event.mutation_records]),
                parent_snapshot_json=json.dumps(event.parent_snapshot),
                created_at=event.created_at,
            )
        )
        self.session.add(
            LineageLinkRecord(parent_id=event.parent_a_id, child_id=event.child_agent_id, relation_type="genetic_parent")
        )
        self.session.add(
            LineageLinkRecord(parent_id=event.parent_b_id, child_id=event.child_agent_id, relation_type="genetic_parent")
        )
        self.session.commit()

    def get_lineage(self, agent_id: str) -> dict[str, Any]:
        parents = self.session.scalars(select(LineageLinkRecord).where(LineageLinkRecord.child_id == agent_id)).all()
        children = self.session.scalars(select(LineageLinkRecord).where(LineageLinkRecord.parent_id == agent_id)).all()
        events = self.session.scalars(
            select(MatingEventRecord).where(
                (MatingEventRecord.child_agent_id == agent_id)
                | (MatingEventRecord.parent_a_id == agent_id)
                | (MatingEventRecord.parent_b_id == agent_id)
            )
        ).all()
        return {
            "parents": [
                {
                    "parent_id": row.parent_id,
                    "child_id": row.child_id,
                    "relation_type": row.relation_type,
                    "created_at": row.created_at.isoformat(),
                }
                for row in parents
            ],
            "children": [
                {
                    "parent_id": row.parent_id,
                    "child_id": row.child_id,
                    "relation_type": row.relation_type,
                    "created_at": row.created_at.isoformat(),
                }
                for row in children
            ],
            "events": [
                {
                    "event_id": row.event_id,
                    "parent_a_id": row.parent_a_id,
                    "parent_b_id": row.parent_b_id,
                    "child_agent_id": row.child_agent_id,
                    "pairing_mode": row.pairing_mode,
                    "recombination": json.loads(row.recombination_json),
                    "mutation": json.loads(row.mutation_json),
                    "parent_snapshot": json.loads(row.parent_snapshot_json),
                    "created_at": row.created_at.isoformat(),
                }
                for row in events
            ],
            "lifecycle": [item.model_dump(mode="json") for item in self.list_lifecycle(agent_id)],
        }

    def save_lifecycle_event(self, event: LifecycleEventRead) -> LifecycleEventRead:
        self.session.add(
            LifecycleEventRecord(
                event_id=event.event_id,
                agent_id=event.agent_id,
                event_type=event.event_type.value,
                lifecycle_state=event.state.value,
                summary=event.summary,
                payload_json=json.dumps(event.payload),
                created_at=event.created_at,
            )
        )
        self.session.commit()
        return event

    def list_lifecycle(self, agent_id: str) -> list[LifecycleEventRead]:
        rows = self.session.scalars(
            select(LifecycleEventRecord)
            .where(LifecycleEventRecord.agent_id == agent_id)
            .order_by(LifecycleEventRecord.id)
        ).all()
        return [
            LifecycleEventRead(
                event_id=row.event_id,
                agent_id=row.agent_id,
                event_type=row.event_type,
                state=row.lifecycle_state,
                summary=row.summary,
                payload=json.loads(row.payload_json),
                created_at=row.created_at,
            )
            for row in rows
        ]

    def save_plugin_report(self, report: PluginReportRead) -> PluginReportRead:
        self.session.add(
            PluginReportRecord(
                report_id=report.report_id,
                plugin_id=report.plugin_id,
                layer=report.layer.value,
                hook=report.hook.value,
                target_type=report.target_type.value,
                target_id=report.target_id,
                summary=report.summary,
                payload_json=json.dumps(report.payload),
                created_at=report.created_at,
            )
        )
        self.session.commit()
        return report

    def list_plugin_reports(self, target_id: str, target_type: str | None = None) -> list[PluginReportRead]:
        query = select(PluginReportRecord).where(PluginReportRecord.target_id == target_id).order_by(PluginReportRecord.id)
        if target_type:
            query = query.where(PluginReportRecord.target_type == target_type)
        rows = self.session.scalars(query).all()
        return [
            PluginReportRead(
                report_id=row.report_id,
                plugin_id=row.plugin_id,
                layer=row.layer,
                hook=row.hook,
                target_type=row.target_type,
                target_id=row.target_id,
                summary=row.summary,
                payload=json.loads(row.payload_json),
                created_at=row.created_at,
            )
            for row in rows
        ]

    def save_support_baseline(self, baseline: SupportBaselineRecord) -> SupportBaselineRecord:
        self.session.add(
            SupportBaselineRecordModel(
                baseline_id=baseline.baseline_id,
                agent_id=baseline.agent_id,
                suite_id=baseline.suite_id,
                scorecard_json=baseline.scorecard.model_dump_json(),
                created_at=baseline.created_at,
            )
        )
        self.session.commit()
        return baseline

    def get_latest_support_baseline(self, agent_id: str, suite_id: str) -> SupportBaselineRecord | None:
        row = self.session.scalar(
            select(SupportBaselineRecordModel)
            .where(
                SupportBaselineRecordModel.agent_id == agent_id,
                SupportBaselineRecordModel.suite_id == suite_id,
            )
            .order_by(desc(SupportBaselineRecordModel.id))
        )
        if not row:
            return None
        return SupportBaselineRecord(
            baseline_id=row.baseline_id,
            agent_id=row.agent_id,
            suite_id=row.suite_id,
            scorecard=json.loads(row.scorecard_json),
            created_at=row.created_at,
        )

    def save_support_evaluation_run(self, evaluation: SupportEvaluationRun) -> SupportEvaluationRun:
        record = SupportEvaluationRunRecord(
            run_id=evaluation.run_id,
            agent_id=evaluation.agent_id,
            suite_id=evaluation.suite_id,
            adapter_mode=evaluation.adapter_mode.value,
            status=evaluation.status.value,
            baseline_agent_id=evaluation.baseline_agent_id,
            benchmark_run_id=evaluation.benchmark_run_id,
            generation_number=evaluation.generation_number,
            intent_classification_score=evaluation.scorecard.intent_classification,
            policy_correct_response_score=evaluation.scorecard.policy_correct_response,
            format_compliance_score=evaluation.scorecard.format_compliance,
            escalation_judgment_score=evaluation.scorecard.escalation_judgment,
            correction_after_feedback_score=evaluation.scorecard.correction_after_feedback,
            efficiency_score=evaluation.scorecard.efficiency,
            weighted_overall_score=evaluation.scorecard.weighted_overall_fitness,
            delta_vs_baseline_json=json.dumps(evaluation.scorecard.delta_vs_baseline),
            parent_eligible=evaluation.scorecard.parent_eligible,
            failed_threshold_reasons_json=json.dumps(evaluation.scorecard.failed_threshold_reasons),
            tags_json=json.dumps(evaluation.tags),
            created_at=evaluation.created_at,
            completed_at=evaluation.completed_at,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        for case_result in evaluation.case_results:
            self.session.add(
                SupportCaseResultRecord(
                    support_evaluation_run_id=record.id,
                    case_id=case_result.case_id,
                    issue_type=case_result.issue_type.value,
                    first_response=case_result.first_response,
                    revised_response=case_result.revised_response,
                    metrics_json=json.dumps(case_result.metrics),
                    notes_json=json.dumps(case_result.notes),
                    prompt_tokens=case_result.prompt_tokens,
                    completion_tokens=case_result.completion_tokens,
                    total_tokens=case_result.total_tokens,
                    feedback_total_tokens=case_result.feedback_total_tokens,
                    latency_ms=case_result.latency_ms,
                    feedback_latency_ms=case_result.feedback_latency_ms,
                    created_at=case_result.created_at,
                )
            )
        self.session.commit()
        return evaluation

    def _decode_support_evaluation(self, row: SupportEvaluationRunRecord) -> SupportEvaluationRun:
        case_rows = self.session.scalars(
            select(SupportCaseResultRecord)
            .where(SupportCaseResultRecord.support_evaluation_run_id == row.id)
            .order_by(SupportCaseResultRecord.id)
        ).all()
        return SupportEvaluationRun(
            run_id=row.run_id,
            agent_id=row.agent_id,
            suite_id=row.suite_id,
            adapter_mode=row.adapter_mode,
            status=row.status,
            baseline_agent_id=row.baseline_agent_id,
            benchmark_run_id=row.benchmark_run_id,
            generation_number=row.generation_number,
            scorecard=SupportScorecard(
                intent_classification=row.intent_classification_score,
                policy_correct_response=row.policy_correct_response_score,
                format_compliance=row.format_compliance_score,
                escalation_judgment=row.escalation_judgment_score,
                correction_after_feedback=row.correction_after_feedback_score,
                efficiency=row.efficiency_score,
                weighted_overall_fitness=row.weighted_overall_score,
                delta_vs_baseline=json.loads(row.delta_vs_baseline_json),
                parent_eligible=row.parent_eligible,
                failed_threshold_reasons=json.loads(row.failed_threshold_reasons_json),
            ),
            case_results=[
                SupportCaseResult(
                    case_id=case.case_id,
                    issue_type=case.issue_type,
                    first_response=case.first_response,
                    revised_response=case.revised_response,
                    metrics=json.loads(case.metrics_json),
                    notes=json.loads(case.notes_json),
                    prompt_tokens=case.prompt_tokens,
                    completion_tokens=case.completion_tokens,
                    total_tokens=case.total_tokens,
                    feedback_total_tokens=case.feedback_total_tokens,
                    latency_ms=case.latency_ms,
                    feedback_latency_ms=case.feedback_latency_ms,
                    created_at=case.created_at,
                )
                for case in case_rows
            ],
            tags=json.loads(row.tags_json),
            created_at=row.created_at,
            completed_at=row.completed_at,
        )

    def get_latest_support_evaluation(self, agent_id: str) -> SupportEvaluationRun | None:
        row = self.session.scalar(
            select(SupportEvaluationRunRecord)
            .where(SupportEvaluationRunRecord.agent_id == agent_id)
            .order_by(desc(SupportEvaluationRunRecord.id))
        )
        return self._decode_support_evaluation(row) if row else None

    def get_latest_support_evaluations(self, benchmark_run_id: str | None = None) -> list[SupportEvaluationRun]:
        rows = self.session.scalars(select(SupportEvaluationRunRecord).order_by(desc(SupportEvaluationRunRecord.id))).all()
        seen: set[str] = set()
        output: list[SupportEvaluationRun] = []
        for row in rows:
            if benchmark_run_id and row.benchmark_run_id != benchmark_run_id:
                continue
            if row.agent_id in seen:
                continue
            seen.add(row.agent_id)
            output.append(self._decode_support_evaluation(row))
        return output

    def list_support_evaluations_for_benchmark(self, benchmark_run_id: str) -> list[SupportEvaluationRun]:
        rows = self.session.scalars(
            select(SupportEvaluationRunRecord)
            .where(SupportEvaluationRunRecord.benchmark_run_id == benchmark_run_id)
            .order_by(SupportEvaluationRunRecord.id)
        ).all()
        return [self._decode_support_evaluation(row) for row in rows]

    def save_support_benchmark_run(self, benchmark: SupportBenchmarkRun) -> SupportBenchmarkRun:
        self.session.add(
            SupportBenchmarkRunRecord(
                benchmark_run_id=benchmark.benchmark_run_id,
                suite_id=benchmark.suite_id,
                baseline_agent_id=benchmark.baseline_agent_id,
                population_size=benchmark.population_size,
                generations_requested=benchmark.generations_requested,
                mutation_rate=benchmark.mutation_rate,
                selection_strategy=benchmark.selection_strategy.value,
                adapter_mode=benchmark.adapter_mode.value,
                report_json=benchmark.report.model_dump_json() if benchmark.report else "{}",
                created_at=benchmark.created_at,
            )
        )
        self.session.commit()
        return benchmark

    def update_support_benchmark_report(self, benchmark_run_id: str, report: SupportBenchmarkReport) -> None:
        row = self.session.scalar(
            select(SupportBenchmarkRunRecord).where(SupportBenchmarkRunRecord.benchmark_run_id == benchmark_run_id)
        )
        if not row:
            return
        row.report_json = report.model_dump_json()
        self.session.commit()

    def get_support_benchmark_report(self, benchmark_run_id: str) -> SupportBenchmarkReport | None:
        row = self.session.scalar(
            select(SupportBenchmarkRunRecord).where(SupportBenchmarkRunRecord.benchmark_run_id == benchmark_run_id)
        )
        if not row or row.report_json == "{}":
            return None
        return SupportBenchmarkReport.model_validate(json.loads(row.report_json))

    def list_support_candidates(self, benchmark_run_id: str | None = None) -> list[SupportBenchmarkCandidate]:
        evaluations = (
            self.list_support_evaluations_for_benchmark(benchmark_run_id)
            if benchmark_run_id
            else self.get_latest_support_evaluations()
        )
        return [
            SupportBenchmarkCandidate(
                agent_id=item.agent_id,
                latest_run_id=item.run_id,
                generation_number=item.generation_number,
                scorecard=item.scorecard,
                tags=item.tags,
            )
            for item in evaluations
        ]
