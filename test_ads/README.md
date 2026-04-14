# 01Deck Test Ads Workflow

This folder contains the implemented `mprompt` workflow for testing `01Deck` and extracting short-form ad material from real evidence.

## Run Order

1. Use [mprompt-master-prompt.md](/run/media/Ryan/01D6C62CA8BDCCC0/code/working/01Deck/test_ads/mprompt-master-prompt.md) to activate the orchestrated sprint.
2. Start from [templates/scenario-plan-01deck.yaml](/run/media/Ryan/01D6C62CA8BDCCC0/code/working/01Deck/test_ads/templates/scenario-plan-01deck.yaml).
3. Capture each scenario into its own artifact bundle under `artifacts/`.
4. Classify each run with [templates/classification-template.md](/run/media/Ryan/01D6C62CA8BDCCC0/code/working/01Deck/test_ads/templates/classification-template.md).
5. Only move `PASS_MARKETABLE` scenarios into [templates/creative-extraction-template.md](/run/media/Ryan/01D6C62CA8BDCCC0/code/working/01Deck/test_ads/templates/creative-extraction-template.md).

## First-Wave Priority

Start with the flows most likely to produce usable footage:

1. `S04` Universal Deploy
2. `S07` Foundry dashboard or scorecard proof
3. `S08` Benchmark report or lineage before-and-after
4. `S02` Completed interactive assessment result

Treat Learn browsing, Arcade browsing, and other support surfaces as secondary until the hero flows are captured cleanly.

## Folder Intent

- `artifacts/`: scenario bundles, one directory per attempt
- `logs/`: sprint summaries, scenario execution logs, and classification decisions
- `reruns/`: approved rerun requests for cleaner captures
- `approved/`: final scripts and shot lists based only on proven flows
- `templates/`: reusable templates for scenario planning, execution, classification, handoff, and creative extraction

All `mprompt` workflow data for this system should stay under `01Deck/test_ads`.

## Naming Pattern

Use this bundle format:

`SXX-short-name-attempt-0N`

Example:

`S03-learn-mbti-attempt-01`

## Non-Negotiables

- one artifact bundle per scenario attempt
- maximum 3 retries per scenario
- no failed footage in ad generation
- no claims that are not visually demonstrated
- if value is not obvious inside 10 to 20 seconds, mark it weak for short-form ads
