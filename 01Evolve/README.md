# 01Evolve

`01Evolve` is the backend engine for the `01FOUNDRY` support-optimization workflow inside `01Deck`.

## Backend Role

`01Evolve` owns:
- support-domain evaluation
- support scoring
- parent eligibility gating
- population benchmarking
- lineage persistence
- benchmark report generation

`01Evolve` does not own:
- playful lifecycle UI
- arcade experiences
- companion mechanics in the serious product path

## Support Workflow

Primary suite:
- [support_tier1_v1.yaml](/D:/code/working/01Deck/01Evolve/app/configs/suites/support_tier1_v1.yaml)

Synthetic assets:
- [support-baseline.yaml](/D:/code/working/01Deck/01Evolve/app/configs/baselines/support-baseline.yaml)
- [support-parent-a.yaml](/D:/code/working/01Deck/01Evolve/app/configs/genomes/support-parent-a.yaml)
- [support-parent-b.yaml](/D:/code/working/01Deck/01Evolve/app/configs/genomes/support-parent-b.yaml)
- [support_policy.yaml](/D:/code/working/01Deck/01Evolve/app/configs/support_policy.yaml)
- [support_dataset.yaml](/D:/code/working/01Deck/01Evolve/app/configs/support_dataset.yaml)

Support dimensions:
- `intent_classification`
- `policy_correct_response`
- `format_compliance`
- `escalation_judgment`
- `correction_after_feedback`
- `efficiency`

## Service Layer

Serious support operations are exposed through:
- `create_support_agent`
- `create_baseline_support_agent`
- `evaluate_support_agent`
- `evaluate_support_population`
- `select_support_parents`
- `breed_support_variant`
- `run_support_generation`
- `run_support_benchmark`
- `get_support_lineage`
- `get_benchmark_report`

The API exposes matching support routes under:
- `/support-agents`
- `/support-baselines`
- `/support-evaluations/run`
- `/support-populations/evaluate`
- `/support-generations/run`
- `/support-benchmark/run`

## Setup

```bash
cd 01Deck/01Evolve
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev]
```

## Run Benchmark

```bash
python example_support_benchmark.py
```

Or:

```bash
evolve run-support-benchmark
```

## Tests

```bash
pytest
```
