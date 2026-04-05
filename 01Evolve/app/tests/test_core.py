from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from app.cli.app import app
from app.core.bootstrap import build_services
from app.core.compiler.service import AgentCompiler
from app.core.evaluation.latent_traits import map_latent_traits
from app.core.evaluation.runner import EvaluationRunner, run_async
from app.core.evaluation.support_scoring import (
    build_support_scorecard,
    score_correction_after_feedback,
    score_escalation_judgment,
    score_policy_correct_response,
)
from app.core.evaluation.support_suite import load_support_dataset, load_support_policy, load_support_suite
from app.core.evaluation.suite_loader import load_suite
from app.core.fitness.service import FitnessService
from app.core.llm.adapters import MockLLMAdapter
from app.core.schemas.models import AgentCreate, LifecycleEventType, LifecycleState, PluginLayer

ROOT = Path(__file__).resolve().parents[2]
RUNNER = CliRunner()


def sample_path(*parts: str) -> Path:
    return ROOT / "app" / "configs" / Path(*parts)


def services_for(tmp_path: Path, plugin_config: str = "production-stack.yaml"):
    return build_services(
        db_url=f"sqlite:///{tmp_path / 'test.sqlite3'}",
        plugin_config_path=sample_path("plugins", plugin_config),
    )


def test_schema_validation_rejects_missing_prompt_placeholder():
    with pytest.raises(Exception):
        AgentCreate(
            name="bad",
            base_model="mock",
            model_provider="mock",
            system_prompt_template="no placeholder here",
            genome={
                "traits": {
                    "discipline": 0.5,
                    "adaptability": 0.5,
                    "exploration": 0.5,
                    "persistence": 0.5,
                    "social_receptivity": 0.5,
                    "economy": 0.5,
                }
            },
            temperament={
                "traits": {
                    "caution": 0.5,
                    "assertiveness": 0.5,
                    "deference": 0.5,
                    "stubbornness": 0.5,
                    "novelty_seeking": 0.5,
                    "patience": 0.5,
                    "verbosity": 0.5,
                }
            },
            policy_config={},
            memory_config={},
            tool_config={},
            runtime_config={},
        )


def test_agent_creation_records_lifecycle_and_serious_plugin_report(tmp_path: Path):
    services = services_for(tmp_path)
    agent = services.agents.create_agent_from_path(sample_path("genomes", "parent-a.yaml"))
    lifecycle = services.lifecycle.show(agent.agent_id)
    assert lifecycle[0].event_type == LifecycleEventType.AGENT_CREATED
    assert lifecycle[0].state == LifecycleState.REGISTERED
    reports = services.repository.list_plugin_reports(agent.agent_id, target_type="agent")
    assert len(reports) == 1
    assert reports[0].layer == PluginLayer.SERIOUS


def test_evaluation_runner_and_fitness_service_use_suite_weights(tmp_path: Path):
    services = services_for(tmp_path)
    agent = services.agents.create_agent_from_path(sample_path("genomes", "parent-a.yaml"))
    phenotype_suite = load_suite(sample_path("suites", "phenotype-suite.yaml"))
    temperament_suite = load_suite(sample_path("suites", "temperament-suite.yaml"))
    evaluation = run_async(
        EvaluationRunner(
            MockLLMAdapter(),
            compiler=AgentCompiler(),
            fitness_service=FitnessService(),
        ).evaluate(agent, phenotype_suite, temperament_suite)
    )
    latent = map_latent_traits(evaluation.phenotype, evaluation.temperament)
    assert evaluation.fitness.fitness > 0
    assert latent.discipline >= 0
    assert evaluation.phenotype.viability >= phenotype_suite.thresholds["viability"]


def test_baseline_population_and_generation_flow_with_fun_plugins(tmp_path: Path):
    services = services_for(tmp_path, plugin_config="playful-stack.yaml")
    baseline_agent = services.agents.create_agent_from_path(sample_path("baselines", "baseline-agent.yaml"))
    parent_a = services.agents.create_agent_from_path(sample_path("genomes", "parent-a.yaml"))
    parent_b = services.agents.create_agent_from_path(sample_path("genomes", "parent-b.yaml"))

    baseline_id, baseline = services.evaluations.create_baseline(
        baseline_agent.agent_id,
        sample_path("suites", "phenotype-suite.yaml"),
        sample_path("suites", "temperament-suite.yaml"),
    )
    assert baseline_id > 0
    assert baseline.suite_id == "phenotype-v1"

    eval_a = services.evaluations.evaluate_agent(
        parent_a.agent_id,
        sample_path("suites", "phenotype-suite.yaml"),
        sample_path("suites", "temperament-suite.yaml"),
        baseline_agent_id=baseline_agent.agent_id,
    )
    eval_b = services.evaluations.evaluate_agent(
        parent_b.agent_id,
        sample_path("suites", "phenotype-suite.yaml"),
        sample_path("suites", "temperament-suite.yaml"),
        baseline_agent_id=baseline_agent.agent_id,
    )
    assert any(report.plugin_id == "care_guide" for report in eval_a.plugin_reports)
    assert any(report.plugin_id == "milestone_celebration" for report in eval_b.plugin_reports)

    pair, child, event, child_eval = services.evolution.run_generation(
        "deck-population",
        sample_path("suites", "phenotype-suite.yaml"),
        sample_path("suites", "temperament-suite.yaml"),
        baseline_agent_id=baseline_agent.agent_id,
    )
    assert pair.total_score >= 0
    assert child.agent_id.startswith("agent_")
    assert event.child_agent_id == child.agent_id
    assert child_eval.agent_id == child.agent_id
    lineage = services.repository.get_lineage(child.agent_id)
    assert len(lineage["parents"]) == 2
    lifecycle = services.lifecycle.show(child.agent_id)
    assert lifecycle[0].state == LifecycleState.BRED


def test_cli_happy_path(tmp_path: Path):
    db_url = f"sqlite:///{tmp_path / 'cli.sqlite3'}"
    plugin_path = str(sample_path("plugins", "playful-stack.yaml"))
    phenotype_path = str(sample_path("suites", "phenotype-suite.yaml"))
    temperament_path = str(sample_path("suites", "temperament-suite.yaml"))
    baseline_cfg = str(sample_path("baselines", "baseline-agent.yaml"))
    parent_a_cfg = str(sample_path("genomes", "parent-a.yaml"))
    parent_b_cfg = str(sample_path("genomes", "parent-b.yaml"))

    baseline = RUNNER.invoke(
        app,
        [
            "create-baseline",
            baseline_cfg,
            phenotype_path,
            temperament_path,
            "--db-url",
            db_url,
            "--plugin-config",
            plugin_path,
        ],
    )
    assert baseline.exit_code == 0

    created_a = RUNNER.invoke(
        app,
        ["create-agent", parent_a_cfg, "--db-url", db_url, "--plugin-config", plugin_path],
    )
    created_b = RUNNER.invoke(
        app,
        ["create-agent", parent_b_cfg, "--db-url", db_url, "--plugin-config", plugin_path],
    )
    assert created_a.exit_code == 0
    assert created_b.exit_code == 0

    agent_a_id = json.loads(created_a.stdout)["agent_id"]
    agent_b_id = json.loads(created_b.stdout)["agent_id"]
    baseline_agent_id = json.loads(baseline.stdout)["baseline_agent_id"]

    evaluated_a = RUNNER.invoke(
        app,
        [
            "eval-agent",
            agent_a_id,
            phenotype_path,
            temperament_path,
            "--baseline-agent-id",
            baseline_agent_id,
            "--db-url",
            db_url,
            "--plugin-config",
            plugin_path,
        ],
    )
    evaluated_b = RUNNER.invoke(
        app,
        [
            "eval-agent",
            agent_b_id,
            phenotype_path,
            temperament_path,
            "--baseline-agent-id",
            baseline_agent_id,
            "--db-url",
            db_url,
            "--plugin-config",
            plugin_path,
        ],
    )
    assert evaluated_a.exit_code == 0
    assert evaluated_b.exit_code == 0

    plugins = RUNNER.invoke(
        app,
        ["list-plugins", "--db-url", db_url, "--plugin-config", plugin_path],
    )
    assert plugins.exit_code == 0
    assert any(item["enabled"] for item in json.loads(plugins.stdout))

    pairs = RUNNER.invoke(app, ["select-pairs", "--species-tag", "deck-population", "--db-url", db_url])
    assert pairs.exit_code == 0
    assert len(json.loads(pairs.stdout)) == 1

    bred = RUNNER.invoke(
        app,
        ["breed", agent_a_id, agent_b_id, "--db-url", db_url, "--plugin-config", plugin_path],
    )
    assert bred.exit_code == 0
    child_agent_id = json.loads(bred.stdout)["child_agent_id"]

    lifecycle = RUNNER.invoke(app, ["show-lifecycle", child_agent_id, "--db-url", db_url])
    assert lifecycle.exit_code == 0
    assert json.loads(lifecycle.stdout)[0]["state"] == "bred"

    export_path = tmp_path / "exports" / "latest.json"
    exported = RUNNER.invoke(
        app,
        [
            "export-run",
            agent_a_id,
            str(export_path),
            "--db-url",
            db_url,
            "--plugin-config",
            plugin_path,
        ],
    )
    assert exported.exit_code == 0
    assert export_path.exists()


def test_support_suite_loading_and_scoring(tmp_path: Path):
    suite = load_support_suite(sample_path("suites", "support_tier1_v1.yaml"))
    dataset = load_support_dataset(sample_path("support_dataset.yaml"))
    policy = load_support_policy(sample_path("support_policy.yaml"))
    assert suite.suite_id == "support_tier1_v1"
    assert len(dataset) >= 8
    assert len(policy) >= 6

    case = dataset[0]
    response = {
        "issue_type": case.issue_type.value,
        "recommended_action": case.expected_action,
        "escalate": case.expected_escalate,
        "customer_response": case.expected_customer_response,
        "escalation_target": case.expected_escalation_target,
    }
    assert score_policy_correct_response(response, case, policy) == 1.0
    assert score_escalation_judgment(response, case) == 1.0
    assert score_correction_after_feedback(None, response, case, policy) >= 0.5


def test_support_scorecard_and_parent_eligibility():
    scorecard = build_support_scorecard(
        [
            {
                "intent_classification": 0.80,
                "policy_correct_response": 0.83,
                "format_compliance": 0.91,
                "escalation_judgment": 0.88,
                "correction_after_feedback": 0.72,
                "efficiency": 0.76,
            }
        ],
        weights={
            "intent_classification": 0.15,
            "policy_correct_response": 0.30,
            "format_compliance": 0.15,
            "escalation_judgment": 0.20,
            "correction_after_feedback": 0.15,
            "efficiency": 0.05,
        },
        eligibility_gates={
            "intent_classification": 0.75,
            "policy_correct_response": 0.70,
            "format_compliance": 0.85,
            "escalation_judgment": 0.80,
            "correction_after_feedback": 0.50,
        },
    )
    assert scorecard.parent_eligible is True
    assert scorecard.weighted_overall_fitness > 0.8


def test_support_benchmark_three_generations_and_report(tmp_path: Path):
    services = build_services(db_url=f"sqlite:///{tmp_path / 'support.sqlite3'}")
    report = services.support.run_support_benchmark(
        suite_path=sample_path("suites", "support_tier1_v1.yaml"),
        baseline_config_path=sample_path("baselines", "support-baseline.yaml"),
        parent_config_paths=[
            sample_path("genomes", "support-parent-a.yaml"),
            sample_path("genomes", "support-parent-b.yaml"),
        ],
        benchmark_output_path=str(tmp_path / "support-report.json"),
    )
    assert report.generations_completed == 3
    assert report.population_size == 20
    assert len(report.score_trend) == 4
    assert report.best_scorecard.weighted_overall_fitness >= report.baseline_scorecard.weighted_overall_fitness
    assert (tmp_path / "support-report.json").exists()
