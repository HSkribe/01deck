from __future__ import annotations

import json
from typing import Any

import secrets
from datetime import timedelta

from sqlalchemy import delete, desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.persistence.models import (
    AgentRecord,
    BaselineProfileRecord,
    BosunConversationTurnRecord,
    BosunCoreKnowledgeRecord,
    BosunSharedMemoryRecord,
    BosunUserMemoryRecord,
    ConfigRecord,
    DirectConversationRecord,
    DirectMessageRecord,
    EvaluationRunRecord,
    EvaluationSuiteRecord,
    ForumReplyRecord,
    ForumThreadRecord,
    GenomeRecord,
    GlobalChatMessageRecord,
    LifecycleEventRecord,
    LineageLinkRecord,
    MatingEventRecord,
    PluginReportRecord,
    PresenceHeartbeatRecord,
    SupportBaselineRecordModel,
    SupportBenchmarkRunRecord,
    SupportCaseResultRecord,
    SupportEvaluationRunRecord,
    TemperamentRecord,
    TestRunRecord,
    UserAccountRecord,
    utc_now,
)
from app.core.schemas.models import (
    AccountPresence,
    AccountPublic,
    AgentRead,
    BaselineProfile,
    BosunSharedMemoryProposal,
    BosunUserMemory,
    DirectConversation,
    DirectMessage,
    EvaluationRunRead,
    EvaluationSuiteConfig,
    ForumReply,
    ForumThread,
    GlobalChatMessage,
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

    def _decode_account(self, record: UserAccountRecord) -> AccountPublic:
        return AccountPublic(
            account_id=record.account_id,
            username=record.username,
            display_name=record.display_name,
            xp=record.xp,
            level=record.level,
            is_system_account=record.is_system_account,
            created_at=record.created_at,
            last_login_at=record.last_login_at,
        )

    def _presence_from_account(self, record: UserAccountRecord) -> AccountPresence:
        """Minimal public identity for social surfaces — no XP/level/timestamps."""
        return AccountPresence(
            account_id=record.account_id,
            username=record.username,
            display_name=record.display_name,
            is_system_account=record.is_system_account,
        )

    def get_account_record_by_username(self, username: str) -> UserAccountRecord | None:
        return self.session.scalar(select(UserAccountRecord).where(UserAccountRecord.username == username))

    def get_account_by_id(self, account_id: str) -> AccountPublic | None:
        record = self.session.scalar(select(UserAccountRecord).where(UserAccountRecord.account_id == account_id))
        return self._decode_account(record) if record else None

    def create_account(
        self,
        account_id: str,
        username: str,
        display_name: str,
        password_hash: str,
        password_salt: str,
        password_iterations: int,
        email: str | None = None,
        is_system_account: bool = False,
    ) -> AccountPublic:
        """Raises sqlalchemy.exc.IntegrityError on a concurrent duplicate username/email/account_id."""
        record = UserAccountRecord(
            account_id=account_id,
            username=username,
            display_name=display_name,
            email=email,
            password_hash=password_hash,
            password_salt=password_salt,
            password_iterations=password_iterations,
            is_system_account=is_system_account,
        )
        self.session.add(record)
        self.session.commit()
        return self._decode_account(record)

    def update_account_password(self, username: str, password_hash: str, password_salt: str, password_iterations: int) -> None:
        record = self.get_account_record_by_username(username)
        if not record:
            return
        record.password_hash = password_hash
        record.password_salt = password_salt
        record.password_iterations = password_iterations
        self.session.commit()

    def mark_account_login(self, username: str) -> AccountPublic | None:
        record = self.get_account_record_by_username(username)
        if not record:
            return None
        record.last_login_at = utc_now()
        self.session.commit()
        return self._decode_account(record)

    def award_account_xp(self, account_id: str, amount: int) -> AccountPublic | None:
        record = self.session.scalar(select(UserAccountRecord).where(UserAccountRecord.account_id == account_id))
        if not record:
            return None
        record.xp = max(0, record.xp + amount)
        record.level = record.xp // 500 + 1
        self.session.commit()
        return self._decode_account(record)

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

    # ------------------------------------------------------------------
    # Presence
    # ------------------------------------------------------------------

    def upsert_presence_heartbeat(self, account_id: str) -> None:
        """Mark account_id as online right now (upsert last_seen_at)."""
        existing = self.session.scalar(
            select(PresenceHeartbeatRecord).where(PresenceHeartbeatRecord.account_id == account_id)
        )
        if existing:
            existing.last_seen_at = utc_now()
        else:
            self.session.add(PresenceHeartbeatRecord(account_id=account_id, last_seen_at=utc_now()))
        self.session.commit()

    def get_online_accounts(self, window_seconds: int = 120) -> list[AccountPresence]:
        """Return accounts seen within window_seconds, plus Bosun who is always present.

        The BOSUN_ACCOUNT_ID constant is used to exclude Bosun from the
        recency filter so he appears online unconditionally — he's a backend
        service, not something that heartbeats.
        """
        cutoff = utc_now() - timedelta(seconds=window_seconds)
        # Join heartbeats to accounts for username/display_name; include
        # Bosun's row regardless of last_seen_at.
        rows = self.session.scalars(
            select(PresenceHeartbeatRecord).where(
                or_(
                    PresenceHeartbeatRecord.account_id == BOSUN_ACCOUNT_ID,
                    PresenceHeartbeatRecord.last_seen_at >= cutoff,
                )
            )
        ).all()
        result: list[AccountPresence] = []
        for row in rows:
            account = self.session.scalar(
                select(UserAccountRecord).where(UserAccountRecord.account_id == row.account_id)
            )
            if account:
                result.append(self._presence_from_account(account))
        return result

    # ------------------------------------------------------------------
    # Global chat
    # ------------------------------------------------------------------

    def post_global_message(self, channel: str, sender_account_id: str, content: str) -> GlobalChatMessage:
        """Persist a global chat message and return it with sender info resolved.

        The record's auto-increment `id` is used directly as the message_id
        exposed to clients — no separate column needed.
        """
        record = GlobalChatMessageRecord(
            channel=channel,
            sender_account_id=sender_account_id,
            content=content,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        sender = self.session.scalar(
            select(UserAccountRecord).where(UserAccountRecord.account_id == sender_account_id)
        )
        return GlobalChatMessage(
            message_id=record.id,
            channel=record.channel,
            sender=self._presence_from_account(sender) if sender else AccountPresence(
                account_id=sender_account_id, username=sender_account_id, display_name=sender_account_id
            ),
            content=record.content,
            created_at=record.created_at,
        )

    def get_global_messages(
        self,
        channel: str = "general",
        after_id: int | None = None,
        limit: int = 100,
    ) -> list[GlobalChatMessage]:
        """Return up to `limit` messages in `channel` oldest-first.
        Pass `after_id` for cursor-based polling (only messages with id > after_id).
        The record's `id` is the message_id exposed to clients.
        """
        query = select(GlobalChatMessageRecord).where(GlobalChatMessageRecord.channel == channel)
        if after_id is not None:
            query = query.where(GlobalChatMessageRecord.id > after_id)
        query = query.order_by(GlobalChatMessageRecord.id).limit(limit)
        rows = self.session.scalars(query).all()
        # Batch-fetch senders to avoid N+1
        sender_ids = {row.sender_account_id for row in rows}
        senders: dict[str, UserAccountRecord] = {}
        for sid in sender_ids:
            record = self.session.scalar(select(UserAccountRecord).where(UserAccountRecord.account_id == sid))
            if record:
                senders[sid] = record
        return [
            GlobalChatMessage(
                message_id=row.id,
                channel=row.channel,
                sender=self._presence_from_account(senders[row.sender_account_id])
                if row.sender_account_id in senders
                else AccountPresence(
                    account_id=row.sender_account_id,
                    username=row.sender_account_id,
                    display_name=row.sender_account_id,
                ),
                content=row.content,
                created_at=row.created_at,
            )
            for row in rows
        ]

    # ------------------------------------------------------------------
    # Direct messages
    # ------------------------------------------------------------------

    def find_or_create_direct_conversation(
        self, account_a: str, account_b: str
    ) -> DirectConversationRecord:
        """Return the existing conversation between account_a and account_b,
        creating it if necessary. The two IDs are stored in lexicographic order
        so the lookup is deterministic regardless of who initiates.
        """
        a, b = sorted([account_a, account_b])
        existing = self.session.scalar(
            select(DirectConversationRecord).where(
                DirectConversationRecord.account_a_id == a,
                DirectConversationRecord.account_b_id == b,
            )
        )
        if existing:
            return existing
        conversation_id = secrets.token_hex(16)
        record = DirectConversationRecord(
            conversation_id=conversation_id,
            account_a_id=a,
            account_b_id=b,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def get_direct_conversation(self, conversation_id: str) -> DirectConversationRecord | None:
        return self.session.scalar(
            select(DirectConversationRecord).where(
                DirectConversationRecord.conversation_id == conversation_id
            )
        )

    def list_direct_conversations(self, account_id: str) -> list[DirectConversation]:
        """Return the caller's conversations, most-recently-active first,
        with other-participant info and last message preview resolved.
        """
        rows = self.session.scalars(
            select(DirectConversationRecord)
            .where(
                or_(
                    DirectConversationRecord.account_a_id == account_id,
                    DirectConversationRecord.account_b_id == account_id,
                )
            )
            .order_by(desc(DirectConversationRecord.last_message_at))
        ).all()
        result: list[DirectConversation] = []
        for row in rows:
            other_id = row.account_b_id if row.account_a_id == account_id else row.account_a_id
            other_record = self.session.scalar(
                select(UserAccountRecord).where(UserAccountRecord.account_id == other_id)
            )
            # Fetch last message for preview
            last_msg = self.session.scalar(
                select(DirectMessageRecord)
                .where(DirectMessageRecord.conversation_id == row.conversation_id)
                .order_by(desc(DirectMessageRecord.id))
            )
            result.append(
                DirectConversation(
                    conversation_id=row.conversation_id,
                    other_participant=self._presence_from_account(other_record)
                    if other_record
                    else AccountPresence(account_id=other_id, username=other_id, display_name=other_id),
                    last_message_at=row.last_message_at,
                    last_message_preview=last_msg.content[:128] if last_msg else None,
                )
            )
        return result

    def send_direct_message(
        self, conversation_id: str, sender_account_id: str, content: str
    ) -> DirectMessage:
        """Persist a DM and bump the conversation's last_message_at."""
        record = DirectMessageRecord(
            conversation_id=conversation_id,
            sender_account_id=sender_account_id,
            content=content,
        )
        self.session.add(record)
        self.session.flush()
        # Bump last_message_at on the conversation for ordering
        conv = self.session.scalar(
            select(DirectConversationRecord).where(
                DirectConversationRecord.conversation_id == conversation_id
            )
        )
        if conv:
            conv.last_message_at = utc_now()
        self.session.commit()
        self.session.refresh(record)
        sender = self.session.scalar(
            select(UserAccountRecord).where(UserAccountRecord.account_id == sender_account_id)
        )
        return DirectMessage(
            message_id=record.id,
            conversation_id=record.conversation_id,
            sender=self._presence_from_account(sender) if sender else AccountPresence(
                account_id=sender_account_id, username=sender_account_id, display_name=sender_account_id
            ),
            content=record.content,
            created_at=record.created_at,
        )

    def get_direct_messages(
        self,
        conversation_id: str,
        after_id: int | None = None,
        limit: int = 100,
    ) -> list[DirectMessage]:
        """Return up to `limit` DMs in the conversation, oldest-first.
        Pass `after_id` for cursor-based polling.
        """
        query = select(DirectMessageRecord).where(DirectMessageRecord.conversation_id == conversation_id)
        if after_id is not None:
            query = query.where(DirectMessageRecord.id > after_id)
        query = query.order_by(DirectMessageRecord.id).limit(limit)
        rows = self.session.scalars(query).all()
        sender_ids = {row.sender_account_id for row in rows}
        senders: dict[str, UserAccountRecord] = {}
        for sid in sender_ids:
            rec = self.session.scalar(select(UserAccountRecord).where(UserAccountRecord.account_id == sid))
            if rec:
                senders[sid] = rec
        return [
            DirectMessage(
                message_id=row.id,
                conversation_id=row.conversation_id,
                sender=self._presence_from_account(senders[row.sender_account_id])
                if row.sender_account_id in senders
                else AccountPresence(
                    account_id=row.sender_account_id,
                    username=row.sender_account_id,
                    display_name=row.sender_account_id,
                ),
                content=row.content,
                created_at=row.created_at,
            )
            for row in rows
        ]

    # ------------------------------------------------------------------
    # Forum
    # ------------------------------------------------------------------

    def create_forum_thread(
        self, author_account_id: str, title: str, body: str, tags: list[str]
    ) -> ForumThread:
        thread_id = secrets.token_hex(16)
        record = ForumThreadRecord(
            thread_id=thread_id,
            author_account_id=author_account_id,
            title=title,
            body=body,
            tags_json=json.dumps(tags),
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        author = self.session.scalar(
            select(UserAccountRecord).where(UserAccountRecord.account_id == author_account_id)
        )
        return ForumThread(
            thread_id=record.thread_id,
            author=self._presence_from_account(author) if author else AccountPresence(
                account_id=author_account_id, username=author_account_id, display_name=author_account_id
            ),
            title=record.title,
            body=record.body,
            tags=json.loads(record.tags_json),
            reply_count=0,
            created_at=record.created_at,
        )

    def list_forum_threads(
        self, before_id: str | None = None, limit: int = 20
    ) -> list[ForumThread]:
        """List threads newest-first with author info and reply count. before_id is the
        thread_id of the last item from the previous page (exclusive lower bound by
        insertion order via the integer PK)."""
        query = select(ForumThreadRecord)
        if before_id is not None:
            pivot = self.session.scalar(
                select(ForumThreadRecord).where(ForumThreadRecord.thread_id == before_id)
            )
            if pivot:
                query = query.where(ForumThreadRecord.id < pivot.id)
        query = query.order_by(desc(ForumThreadRecord.id)).limit(limit)
        rows = self.session.scalars(query).all()
        author_ids = {row.author_account_id for row in rows}
        authors: dict[str, UserAccountRecord] = {}
        for aid in author_ids:
            rec = self.session.scalar(select(UserAccountRecord).where(UserAccountRecord.account_id == aid))
            if rec:
                authors[aid] = rec
        result: list[ForumThread] = []
        for row in rows:
            reply_count = self.session.scalar(
                select(func.count()).where(ForumReplyRecord.thread_id == row.thread_id)
            ) or 0
            author_rec = authors.get(row.author_account_id)
            result.append(
                ForumThread(
                    thread_id=row.thread_id,
                    author=self._presence_from_account(author_rec) if author_rec else AccountPresence(
                        account_id=row.author_account_id,
                        username=row.author_account_id,
                        display_name=row.author_account_id,
                    ),
                    title=row.title,
                    body=row.body,
                    tags=json.loads(row.tags_json),
                    reply_count=reply_count,
                    created_at=row.created_at,
                )
            )
        return result

    def get_forum_thread(self, thread_id: str) -> ForumThreadRecord | None:
        return self.session.scalar(
            select(ForumThreadRecord).where(ForumThreadRecord.thread_id == thread_id)
        )

    def get_forum_thread_with_replies(self, thread_id: str) -> tuple[ForumThread, list[ForumReply]] | None:
        """Return (thread, replies) or None if thread not found."""
        row = self.get_forum_thread(thread_id)
        if not row:
            return None
        author = self.session.scalar(
            select(UserAccountRecord).where(UserAccountRecord.account_id == row.author_account_id)
        )
        reply_rows = self.session.scalars(
            select(ForumReplyRecord)
            .where(ForumReplyRecord.thread_id == thread_id)
            .order_by(ForumReplyRecord.id)
        ).all()
        # Batch-fetch reply authors
        reply_author_ids = {r.author_account_id for r in reply_rows}
        reply_authors: dict[str, UserAccountRecord] = {}
        for aid in reply_author_ids:
            rec = self.session.scalar(select(UserAccountRecord).where(UserAccountRecord.account_id == aid))
            if rec:
                reply_authors[aid] = rec
        thread = ForumThread(
            thread_id=row.thread_id,
            author=self._presence_from_account(author) if author else AccountPresence(
                account_id=row.author_account_id, username=row.author_account_id, display_name=row.author_account_id
            ),
            title=row.title,
            body=row.body,
            tags=json.loads(row.tags_json),
            reply_count=len(reply_rows),
            created_at=row.created_at,
        )
        replies = [
            ForumReply(
                reply_id=r.reply_id,
                thread_id=r.thread_id,
                author=self._presence_from_account(reply_authors[r.author_account_id])
                if r.author_account_id in reply_authors
                else AccountPresence(
                    account_id=r.author_account_id,
                    username=r.author_account_id,
                    display_name=r.author_account_id,
                ),
                content=r.content,
                created_at=r.created_at,
            )
            for r in reply_rows
        ]
        return thread, replies

    def create_forum_reply(
        self, thread_id: str, author_account_id: str, content: str
    ) -> ForumReply:
        reply_id = secrets.token_hex(16)
        record = ForumReplyRecord(
            reply_id=reply_id,
            thread_id=thread_id,
            author_account_id=author_account_id,
            content=content,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        author = self.session.scalar(
            select(UserAccountRecord).where(UserAccountRecord.account_id == author_account_id)
        )
        return ForumReply(
            reply_id=record.reply_id,
            thread_id=record.thread_id,
            author=self._presence_from_account(author) if author else AccountPresence(
                account_id=author_account_id, username=author_account_id, display_name=author_account_id
            ),
            content=record.content,
            created_at=record.created_at,
        )

    # ------------------------------------------------------------------
    # Bosun system account bootstrap
    # ------------------------------------------------------------------

    def ensure_bosun_account(self) -> None:
        """Idempotently create Bosun's system account row if it doesn't exist.

        Called from build_services() on every app boot. Bosun never logs in
        via password; the hash is a placeholder that can never match any real
        password string (bcrypt prefix, non-hex content, unreachable length).
        """
        existing = self.session.scalar(
            select(UserAccountRecord).where(UserAccountRecord.account_id == BOSUN_ACCOUNT_ID)
        )
        if existing:
            return
        self.session.add(
            UserAccountRecord(
                account_id=BOSUN_ACCOUNT_ID,
                username="bosun",
                display_name="Bosun",
                email=None,
                # Intentionally unusable placeholder — Bosun authenticates via
                # backend service logic, never via this hash.
                password_hash="SYSTEM_ACCOUNT_NO_PASSWORD",
                password_salt="00" * 16,
                password_iterations=1,
                is_system_account=True,
            )
        )
        # Seed Bosun's presence row so he always shows up in /presence/online
        # without needing a heartbeat. The upsert will never delete this row.
        self.session.add(
            PresenceHeartbeatRecord(
                account_id=BOSUN_ACCOUNT_ID,
                last_seen_at=utc_now(),
            )
        )
        self.session.commit()

    # -----------------------------------------------------------------
    # Bosun memory tiers — see app/core/bosun/service.py for the tier
    # semantics (core knowledge / shared / per-user / raw turns).
    # -----------------------------------------------------------------

    def get_bosun_core_knowledge(self) -> list[str]:
        rows = self.session.scalars(select(BosunCoreKnowledgeRecord).order_by(BosunCoreKnowledgeRecord.key)).all()
        return [row.content for row in rows]

    def upsert_bosun_core_knowledge(self, key: str, content: str) -> None:
        row = self.session.scalar(select(BosunCoreKnowledgeRecord).where(BosunCoreKnowledgeRecord.key == key))
        if row:
            row.content = content
        else:
            self.session.add(BosunCoreKnowledgeRecord(key=key, content=content))
        self.session.commit()

    def create_bosun_shared_memory_proposal(self, memory_id: str, content: str, source_account_id: str | None) -> None:
        self.session.add(
            BosunSharedMemoryRecord(memory_id=memory_id, content=content, source_account_id=source_account_id)
        )
        self.session.commit()

    def get_approved_bosun_shared_memories(self) -> list[BosunSharedMemoryProposal]:
        rows = self.session.scalars(
            select(BosunSharedMemoryRecord).where(BosunSharedMemoryRecord.status == "approved")
        ).all()
        return [self._decode_shared_memory(row) for row in rows]

    def _decode_shared_memory(self, row: BosunSharedMemoryRecord) -> BosunSharedMemoryProposal:
        return BosunSharedMemoryProposal(
            memory_id=row.memory_id,
            content=row.content,
            source_account_id=row.source_account_id,
            status=row.status,
            created_at=row.created_at,
            reviewed_at=row.reviewed_at,
        )

    def list_pending_bosun_shared_memories(self) -> list[BosunSharedMemoryProposal]:
        rows = self.session.scalars(
            select(BosunSharedMemoryRecord).where(BosunSharedMemoryRecord.status == "pending").order_by(BosunSharedMemoryRecord.id)
        ).all()
        return [self._decode_shared_memory(row) for row in rows]

    def review_bosun_shared_memory(self, memory_id: str, approve: bool) -> BosunSharedMemoryProposal | None:
        row = self.session.scalar(select(BosunSharedMemoryRecord).where(BosunSharedMemoryRecord.memory_id == memory_id))
        if not row:
            return None
        row.status = "approved" if approve else "rejected"
        row.reviewed_at = utc_now()
        self.session.commit()
        return self._decode_shared_memory(row)

    def add_bosun_user_memory(self, account_id: str, content: str, max_per_account: int) -> None:
        self.session.add(BosunUserMemoryRecord(account_id=account_id, content=content))
        self.session.commit()
        # Prune oldest-first so storage grows with user count, not message
        # volume — see BosunUserMemoryRecord's docstring.
        rows = self.session.scalars(
            select(BosunUserMemoryRecord)
            .where(BosunUserMemoryRecord.account_id == account_id)
            .order_by(desc(BosunUserMemoryRecord.id))
        ).all()
        for stale in rows[max_per_account:]:
            self.session.delete(stale)
        self.session.commit()

    def get_bosun_user_memories(self, account_id: str) -> list[BosunUserMemory]:
        rows = self.session.scalars(
            select(BosunUserMemoryRecord)
            .where(BosunUserMemoryRecord.account_id == account_id)
            .order_by(BosunUserMemoryRecord.id)
        ).all()
        return [BosunUserMemory(content=row.content, created_at=row.created_at) for row in rows]

    def delete_bosun_user_memories(self, account_id: str) -> None:
        self.session.execute(delete(BosunUserMemoryRecord).where(BosunUserMemoryRecord.account_id == account_id))
        self.session.commit()

    def record_bosun_turn(self, account_id: str, role: str, content: str) -> None:
        self.session.add(BosunConversationTurnRecord(account_id=account_id, role=role, content=content))
        self.session.commit()

    def get_recent_bosun_turns(self, account_id: str, limit: int) -> list[tuple[str, str]]:
        """Most recent turns first is what callers want for relevance scoring;
        returned oldest-first so it reads naturally when replayed into a prompt."""
        rows = self.session.scalars(
            select(BosunConversationTurnRecord)
            .where(BosunConversationTurnRecord.account_id == account_id)
            .order_by(desc(BosunConversationTurnRecord.id))
            .limit(limit)
        ).all()
        return [(row.role, row.content) for row in reversed(rows)]


# Well-known fixed account_id for Bosun. Used both in ensure_bosun_account()
# and in get_online_accounts() to exclude him from the recency filter.
# Defined at module level so both methods reference the same constant without
# circular dependency risk.
BOSUN_ACCOUNT_ID = "bosun"
