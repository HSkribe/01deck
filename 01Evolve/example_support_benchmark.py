from __future__ import annotations

from pathlib import Path

from app.core.bootstrap import build_services


def main() -> None:
    root = Path(__file__).resolve().parent
    report = build_services().support.run_support_benchmark(
        suite_path=root / "app" / "configs" / "suites" / "support_tier1_v1.yaml",
        baseline_config_path=root / "app" / "configs" / "baselines" / "support-baseline.yaml",
        parent_config_paths=[
            root / "app" / "configs" / "genomes" / "support-parent-a.yaml",
            root / "app" / "configs" / "genomes" / "support-parent-b.yaml",
        ],
        benchmark_output_path=str(root.parent / "reports" / "support-benchmark-report.json"),
    )
    print(report.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
