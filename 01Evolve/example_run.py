from __future__ import annotations

from pathlib import Path

from app.core.bootstrap import build_services

ROOT = Path(__file__).resolve().parent


def main() -> None:
    services = build_services(
        plugin_config_path=ROOT / "app" / "configs" / "plugins" / "playful-stack.yaml"
    )
    baseline_agent = services.agents.create_agent_from_path(
        ROOT / "app" / "configs" / "baselines" / "baseline-agent.yaml"
    )
    parent_a = services.agents.create_agent_from_path(ROOT / "app" / "configs" / "genomes" / "parent-a.yaml")
    parent_b = services.agents.create_agent_from_path(ROOT / "app" / "configs" / "genomes" / "parent-b.yaml")

    baseline_id, _ = services.evaluations.create_baseline(
        baseline_agent.agent_id,
        ROOT / "app" / "configs" / "suites" / "phenotype-suite.yaml",
        ROOT / "app" / "configs" / "suites" / "temperament-suite.yaml",
    )
    services.evaluations.evaluate_agent(
        parent_a.agent_id,
        ROOT / "app" / "configs" / "suites" / "phenotype-suite.yaml",
        ROOT / "app" / "configs" / "suites" / "temperament-suite.yaml",
        baseline_agent_id=baseline_agent.agent_id,
    )
    services.evaluations.evaluate_agent(
        parent_b.agent_id,
        ROOT / "app" / "configs" / "suites" / "phenotype-suite.yaml",
        ROOT / "app" / "configs" / "suites" / "temperament-suite.yaml",
        baseline_agent_id=baseline_agent.agent_id,
    )
    pair, child, _event, evaluation = services.evolution.run_generation(
        "deck-population",
        ROOT / "app" / "configs" / "suites" / "phenotype-suite.yaml",
        ROOT / "app" / "configs" / "suites" / "temperament-suite.yaml",
        baseline_agent_id=baseline_agent.agent_id,
    )
    print(
        {
            "baseline_id": baseline_id,
            "selected_pair": pair.model_dump(mode="json"),
            "child_agent_id": child.agent_id,
            "child_fitness": evaluation.fitness.fitness,
        }
    )


if __name__ == "__main__":
    main()
