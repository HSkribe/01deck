from __future__ import annotations

import json
from pathlib import Path

import typer

from app.core.bootstrap import build_services
from app.core.lineage.service import LineageService
from app.core.schemas.models import LifecycleEventType, LifecycleState, PluginHook, SupportAdapterMode, SupportSelectionStrategy

app = typer.Typer(no_args_is_help=True)


def _services(db_url: str | None = None, plugin_config: str | None = None):
    return build_services(db_url=db_url, plugin_config_path=plugin_config)


@app.command("create-agent")
def create_agent(config_path: str, db_url: str | None = None, plugin_config: str | None = None):
    services = _services(db_url, plugin_config)
    agent = services.agents.create_agent_from_path(config_path)
    typer.echo(json.dumps({"agent_id": agent.agent_id, "name": agent.name}, indent=2))


@app.command("create-baseline")
def create_baseline(
    agent_config_path: str,
    phenotype_suite_path: str,
    temperament_suite_path: str,
    db_url: str | None = None,
    plugin_config: str | None = None,
):
    services = _services(db_url, plugin_config)
    agent = services.agents.create_agent_from_path(agent_config_path)
    baseline_id, baseline = services.evaluations.create_baseline(
        agent.agent_id,
        phenotype_suite_path=phenotype_suite_path,
        temperament_suite_path=temperament_suite_path,
    )
    typer.echo(
        json.dumps(
            {
                "baseline_id": baseline_id,
                "baseline_agent_id": baseline.baseline_agent_id,
                "suite_id": baseline.suite_id,
            },
            indent=2,
        )
    )


@app.command("eval-agent")
def eval_agent(
    agent_id: str,
    phenotype_suite_path: str,
    temperament_suite_path: str,
    baseline_agent_id: str | None = None,
    db_url: str | None = None,
    plugin_config: str | None = None,
):
    services = _services(db_url, plugin_config)
    evaluation = services.evaluations.evaluate_agent(
        agent_id,
        phenotype_suite_path=phenotype_suite_path,
        temperament_suite_path=temperament_suite_path,
        baseline_agent_id=baseline_agent_id,
    )
    typer.echo(evaluation.model_dump_json(indent=2))


@app.command("eval-population")
def eval_population(
    species_tag: str,
    phenotype_suite_path: str,
    temperament_suite_path: str,
    baseline_agent_id: str | None = None,
    db_url: str | None = None,
    plugin_config: str | None = None,
):
    services = _services(db_url, plugin_config)
    evaluations = services.evaluations.evaluate_population(
        species_tag,
        phenotype_suite_path=phenotype_suite_path,
        temperament_suite_path=temperament_suite_path,
        baseline_agent_id=baseline_agent_id,
    )
    typer.echo(
        json.dumps(
            [
                {
                    "agent_id": item.agent_id,
                    "fitness": item.fitness.fitness,
                    "eligible_to_breed": item.eligible_to_breed,
                }
                for item in evaluations
            ],
            indent=2,
        )
    )


@app.command("show-profile")
def show_profile(agent_id: str, db_url: str | None = None):
    evaluation = _services(db_url).repository.get_latest_evaluation(agent_id)
    if not evaluation:
        raise typer.BadParameter(f"no evaluation found for {agent_id}")
    typer.echo(evaluation.model_dump_json(indent=2))


@app.command("show-lifecycle")
def show_lifecycle(agent_id: str, db_url: str | None = None):
    lifecycle = _services(db_url).lifecycle.show(agent_id)
    typer.echo(json.dumps([item.model_dump(mode="json") for item in lifecycle], indent=2))


@app.command("select-pairs")
def select_pairs_command(species_tag: str | None = None, top_k: int = 10, db_url: str | None = None):
    pairs = _services(db_url).evolution.select_pairs(species_tag=species_tag, top_k=top_k)
    typer.echo(json.dumps([item.model_dump(mode="json") for item in pairs], indent=2))


@app.command("breed")
def breed(parent_a_id: str, parent_b_id: str, db_url: str | None = None, plugin_config: str | None = None):
    services = _services(db_url, plugin_config)
    child, event, plugin_reports = services.evolution.breed(parent_a_id, parent_b_id)
    typer.echo(
        json.dumps(
            {
                "child_agent_id": child.agent_id,
                "event_id": event.event_id,
                "plugin_reports": [item.model_dump(mode="json") for item in plugin_reports],
            },
            indent=2,
        )
    )


@app.command("run-generation")
def run_generation(
    species_tag: str,
    phenotype_suite_path: str,
    temperament_suite_path: str,
    baseline_agent_id: str | None = None,
    db_url: str | None = None,
    plugin_config: str | None = None,
):
    services = _services(db_url, plugin_config)
    pair, child, event, evaluation = services.evolution.run_generation(
        species_tag,
        phenotype_suite_path=phenotype_suite_path,
        temperament_suite_path=temperament_suite_path,
        baseline_agent_id=baseline_agent_id,
    )
    typer.echo(
        json.dumps(
            {
                "pair": pair.model_dump(mode="json"),
                "child_agent_id": child.agent_id,
                "mating_event_id": event.event_id,
                "fitness": evaluation.fitness.fitness,
            },
            indent=2,
        )
    )


@app.command("show-lineage")
def show_lineage(agent_id: str, db_url: str | None = None):
    services = _services(db_url)
    typer.echo(json.dumps(LineageService(services.repository).show(agent_id), indent=2))


@app.command("export-run")
def export_run(agent_id: str, out_path: str, db_url: str | None = None, plugin_config: str | None = None):
    services = _services(db_url, plugin_config)
    evaluation = services.repository.get_latest_evaluation(agent_id)
    if not evaluation:
        raise typer.BadParameter(f"no evaluation found for {agent_id}")
    path = Path(out_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(evaluation.model_dump_json(indent=2), encoding="utf-8")
    lifecycle_event = services.lifecycle.record(
        agent_id=agent_id,
        event_type=LifecycleEventType.EXPORT_WRITTEN,
        state=LifecycleState.EXPORTED,
        summary="Evaluation export written to disk.",
        payload={"path": str(path), "run_id": evaluation.run_id},
    )
    services.plugins.run_hook(
        PluginHook.EXPORT_WRITTEN,
        target_id=evaluation.run_id,
        agent=services.repository.get_agent(agent_id),
        evaluation=evaluation,
        lifecycle_event=lifecycle_event,
        metadata={"path": str(path)},
    )
    typer.echo(str(path))


@app.command("list-plugins")
def list_plugins(db_url: str | None = None, plugin_config: str | None = None):
    services = _services(db_url, plugin_config)
    typer.echo(json.dumps([item.model_dump(mode="json") for item in services.plugins.list_plugins()], indent=2))


@app.command("create-support-agent")
def create_support_agent(config_path: str, db_url: str | None = None):
    agent = _services(db_url).support.create_support_agent_from_path(config_path)
    typer.echo(json.dumps({"agent_id": agent.agent_id, "name": agent.name}, indent=2))


@app.command("create-support-baseline")
def create_support_baseline(
    agent_config_path: str,
    suite_path: str = "app/configs/suites/support_tier1_v1.yaml",
    db_url: str | None = None,
):
    agent, baseline = _services(db_url).support.create_baseline_support_agent(agent_config_path, suite_path)
    typer.echo(json.dumps({"agent_id": agent.agent_id, "baseline_id": baseline.baseline_id, "suite_id": baseline.suite_id}, indent=2))


@app.command("eval-support-agent")
def eval_support_agent(
    agent_id: str,
    suite_path: str = "app/configs/suites/support_tier1_v1.yaml",
    baseline_agent_id: str | None = None,
    adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK,
    db_url: str | None = None,
):
    evaluation = _services(db_url).support.evaluate_support_agent(
        agent_id,
        suite_path=suite_path,
        baseline_agent_id=baseline_agent_id,
        adapter_mode=adapter_mode,
    )
    typer.echo(evaluation.model_dump_json(indent=2))


@app.command("run-support-benchmark")
def run_support_benchmark(
    suite_path: str = "app/configs/suites/support_tier1_v1.yaml",
    baseline_config_path: str = "app/configs/baselines/support-baseline.yaml",
    parent_config_paths: list[str] = typer.Option(
        [
            "app/configs/genomes/support-parent-a.yaml",
            "app/configs/genomes/support-parent-b.yaml",
        ]
    ),
    population_size: int = 20,
    generations: int = 3,
    mutation_rate: float = 0.08,
    selection_strategy: SupportSelectionStrategy = SupportSelectionStrategy.BALANCED,
    adapter_mode: SupportAdapterMode = SupportAdapterMode.MOCK,
    benchmark_output_path: str | None = "reports/support-benchmark-report.json",
    db_url: str | None = None,
):
    report = _services(db_url).support.run_support_benchmark(
        suite_path=suite_path,
        baseline_config_path=baseline_config_path,
        parent_config_paths=parent_config_paths,
        population_size=population_size,
        generations=generations,
        mutation_rate=mutation_rate,
        selection_strategy=selection_strategy,
        adapter_mode=adapter_mode,
        benchmark_output_path=benchmark_output_path,
    )
    typer.echo(report.model_dump_json(indent=2))


@app.command("show-support-lineage")
def show_support_lineage(agent_id: str, db_url: str | None = None):
    typer.echo(json.dumps(_services(db_url).support.get_support_lineage(agent_id), indent=2))


@app.command("show-support-report")
def show_support_report(benchmark_run_id: str, db_url: str | None = None):
    report = _services(db_url).support.get_benchmark_report(benchmark_run_id)
    if not report:
        raise typer.BadParameter(f"no support benchmark report found for {benchmark_run_id}")
    typer.echo(report.model_dump_json(indent=2))
