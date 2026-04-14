# 01Deck + 01FOUNDRY

`01Deck` now acts as the thin business UI shell for `01FOUNDRY`, a serious customer-support agent optimization product backed by `01Evolve`.

## Product Purpose

This branch is for:
- tier-1 SaaS and digital-product support optimization
- baseline creation, variant evaluation, optimization generations, lineage review, and benchmark reporting

This branch is not for:
- care systems
- lifecycle play
- companion agents
- arcade or playful consumer features

## Architecture

```text
01Deck serious UI shell
  -> plugin/bridge layer
  -> 01Evolve service + API surface
  -> SQLite persistence + configs + benchmark artifacts
```

`01Deck` owns:
- controls
- serious dashboard surfaces
- workflow orchestration
- report presentation

`01Evolve` owns:
- support scoring
- evaluation execution
- parent eligibility
- generation runs
- lineage persistence
- benchmark reports

## Support Domain

`support_tier1_v1` covers only:
- billing
- access/login
- product_info
- refund
- technical_issue
- escalation_required

Scored dimensions:
- intent_classification
- policy_correct_response
- format_compliance
- escalation_judgment
- correction_after_feedback
- efficiency

Weights:
- intent_classification: `0.15`
- policy_correct_response: `0.30`
- format_compliance: `0.15`
- escalation_judgment: `0.20`
- correction_after_feedback: `0.15`
- efficiency: `0.05`

Parent eligibility gates:
- intent_classification `>= 0.75`
- policy_correct_response `>= 0.70`
- format_compliance `>= 0.85`
- escalation_judgment `>= 0.80`
- correction_after_feedback `>= 0.50`

## Synthetic Assets

Support configs and data live under [01Evolve/app/configs](/D:/code/working/01Deck/01Evolve/app/configs):
- [support-baseline.yaml](/D:/code/working/01Deck/01Evolve/app/configs/baselines/support-baseline.yaml)
- [support-parent-a.yaml](/D:/code/working/01Deck/01Evolve/app/configs/genomes/support-parent-a.yaml)
- [support-parent-b.yaml](/D:/code/working/01Deck/01Evolve/app/configs/genomes/support-parent-b.yaml)
- [support-variant-template.yaml](/D:/code/working/01Deck/01Evolve/app/configs/genomes/support-variant-template.yaml)
- [support_tier1_v1.yaml](/D:/code/working/01Deck/01Evolve/app/configs/suites/support_tier1_v1.yaml)
- [support_policy.yaml](/D:/code/working/01Deck/01Evolve/app/configs/support_policy.yaml)
- [support_dataset.yaml](/D:/code/working/01Deck/01Evolve/app/configs/support_dataset.yaml)

## Setup

```bash
cd 01Deck
npm install

cd 01Evolve
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev]
```

Security env template:
- [.env.example](/D:/code/working/01Deck/.env.example)
- [.env.deck.example](/media/Ryan/PROJECTS/code/working/01Deck/.env.deck.example)

Beta deployment checklist:
- [BETA_DEPLOYMENT_CHECKLIST.md](/D:/code/working/01Deck/BETA_DEPLOYMENT_CHECKLIST.md)

Google Cloud beta deploy:
- [DEPLOY_GOOGLE_CLOUD.md](/media/Ryan/PROJECTS/code/working/01Deck/DEPLOY_GOOGLE_CLOUD.md)

## Product Profiles

This repo now supports two product profiles on the same shared core:

- `01Deck` for the agent workspace experience
- `01Foundry` for support-optimization workflows

Run them independently:

```bash
npm run dev:deck
npm run dev:foundry
```

Default local ports:

- `01Deck`: `http://127.0.0.1:4173`
- `01Foundry`: `http://127.0.0.1:4174`

Build them independently:

```bash
npm run build:deck
npm run build:foundry
```

## Run The Benchmark

```bash
cd 01Deck/01Evolve
python example_support_benchmark.py
```

Or via CLI:

```bash
evolve run-support-benchmark
```

Benchmark success criteria:
- weighted overall score improves by at least `10%`
- escalation judgment improves by at least `15%`
- correction after feedback improves by at least `10%`
- token cost does not increase by more than `5%`

## View Results In 01Deck

Start the frontend and open the `01FOUNDRY` workspace. The serious shell surfaces:
- dashboard
- baseline manager
- variant manager
- evaluation runner
- scorecard
- optimization run panel
- lineage viewer
- benchmark report

The React plugin uses a thin bridge abstraction and is designed to swap between mock/demo data and the support API endpoints without moving optimization logic into TypeScript.
