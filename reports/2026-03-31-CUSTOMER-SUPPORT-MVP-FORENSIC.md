# 01Deck / 01Evolve Forensic Analysis Against Customer Support Optimization MVP

Date: 2026-03-31
Scope: `D:\code\working\01Deck`
Requested target: CLI-first customer-support agent optimization MVP

## Executive verdict

Current status: `PARTIAL FOUNDATION, NOT MVP-COMPLIANT`

The repo already contains a real Python evolution core in `01Evolve` with useful building blocks:

- typed Pydantic schemas
- SQLite persistence
- CLI commands
- deterministic mock LLM adapter
- real adapter scaffold
- evaluation, baseline, selection, breeding, and lineage code

However, the implemented system is still a generic agent-evolution scaffold, not the requested first domain-specific MVP for customer support optimization.

The biggest gaps are:

1. the repo still contains and foregrounds a large React frontend even though the requested MVP must be CLI-first and must not build a frontend
2. the existing evaluation domain is generic phenotype/temperament testing, not tier-1 SaaS customer support
3. the current scoring categories, suite design, weights, and breeding gates do not match the required `support_tier1_v1` suite
4. the benchmark path only demonstrates baseline + 2 parents + 1 generation, not baseline + 20 variants + 3 generations
5. the codebase explicitly includes lifecycle/plugin/care/fun mechanics that the requested MVP explicitly forbids

## Review method

Reviewed authored project materials and executable code under:

- `D:\code\working\01Deck\src`
- `D:\code\working\01Deck\01Evolve`
- `D:\code\working\01Deck\01Protocol_testing`
- `D:\code\working\01Deck\01deckspc`
- `D:\code\working\01Deck\reports`

Excluded vendored dependencies under `node_modules` from detailed forensic review.

Validation performed:

- `python -m pytest` in `D:\code\working\01Deck\01Evolve` -> 5 tests passed
- `python example_run.py` in `D:\code\working\01Deck\01Evolve` -> baseline + 2 parents + 1 child generation executed successfully

## Observed project tree

```text
01Deck/
  src/                      React frontend application
    app/
      components/
      context/
      data/
      plugins/
    ondeck/
    styles/
  01Evolve/                Python evolution harness
    app/
      api/
      cli/
      configs/
        baselines/
        genomes/
        plugins/
        suites/
      core/
        agents/
        compiler/
        evaluation/
        evolution/
        fitness/
        lifecycle/
        llm/
        persistence/
        plugins/
        schemas/
      tests/
    README.md
    example_run.py
    pyproject.toml
    01evolve.sqlite3
  01Protocol_testing/      Separate protocol SDK / CLI
  reports/
    2026-03-30-FORENSIC-REPORT.md
    2026-03-30-FIX-PLAN.md
```

## High-level forensic conclusion

There are effectively three overlapping efforts in this repo:

1. `src/`: a broad React UI product called `01Deck`
2. `01Evolve/`: a generic Python agent evolution harness
3. `01Protocol_testing/`: a separate protocol/identity SDK

The requested MVP aligns most closely with `01Evolve`, not with the main frontend app.

## What is real vs mocked

### Real

- Pydantic data model layer: `D:\code\working\01Deck\01Evolve\app\core\schemas\models.py`
- SQLite persistence model: `D:\code\working\01Deck\01Evolve\app\core\persistence\models.py`
- repository persistence logic: `D:\code\working\01Deck\01Evolve\app\core\persistence\repository.py`
- Typer CLI surface: `D:\code\working\01Deck\01Evolve\app\cli\app.py`
- evaluation runner and score aggregation: `D:\code\working\01Deck\01Evolve\app\core\evaluation\runner.py`
- baseline creation and delta persistence: `D:\code\working\01Deck\01Evolve\app\core\evaluation\service.py`
- pair selection: `D:\code\working\01Deck\01Evolve\app\core\evolution\pairing.py`
- recombination and mutation: `D:\code\working\01Deck\01Evolve\app\core\evolution\recombination.py`
- lineage persistence: `D:\code\working\01Deck\01Evolve\app\core\persistence\repository.py`

### Mocked or scaffolded

- all task behavior in the current benchmark is driven by `MockLLMAdapter`: `D:\code\working\01Deck\01Evolve\app\core\llm\adapters.py`
- the real adapter is only an OpenAI-compatible transport scaffold and is not wired into any production benchmark flow
- current evaluation prompts are synthetic generic prompts like math, capitals, JSON validity, and short plans
- plugin outputs such as care guides and celebrations are synthetic overlays, not customer-support optimization logic

## Requirement-by-requirement comparison

### MVP goals

| Requirement | Status | Evidence | Notes |
|---|---|---|---|
| 1. Create agents from external JSON or YAML configs | `MET` | `01Evolve/app/core/utils/common.py:29`, `01Evolve/app/core/agents/service.py` | JSON and YAML loading exists |
| 2. Create and evaluate a baseline support agent | `PARTIAL` | `01Evolve/app/cli/app.py:26`, `01Evolve/app/core/evaluation/service.py:35` | Baselines exist, but not support-domain agents |
| 3. Evaluate support-agent variants against a domain-specific test suite | `MISSING` | current suites are `phenotype-v1` and `temperament-v1` | No support-domain suite |
| 4. Compute phenotype scores and delta vs baseline | `PARTIAL` | `01Evolve/app/core/evaluation/runner.py:135-145` | Delta exists, but categories are wrong |
| 5. Compute an overall weighted fitness score | `MET` | `01Evolve/app/core/evolution/fitness.py` | Weighted fitness exists |
| 6. Select viable parent agents using threshold gates | `MET` | `01Evolve/app/core/evolution/fitness.py`, `01Evolve/app/core/evolution/pairing.py:19` | Uses current generic thresholds, not required support gates |
| 7. Breed offspring using recombination + bounded mutation | `MET` | `01Evolve/app/core/evolution/recombination.py:22` | Implemented |
| 8. Run multiple generations and show whether offspring outperform baseline | `PARTIAL` | `01Evolve/app/cli/app.py:139`, `01Evolve/example_run.py` | One generation demonstrated; no multi-generation benchmark script |
| 9. Persist evaluation runs, scores, and lineage in SQLite | `MET` | `01Evolve/app/core/persistence/models.py` | Implemented |
| 10. Expose everything through a CLI | `PARTIAL` | `01Evolve/app/cli/app.py` | Required commands exist, but benchmark orchestration is incomplete |

### Required CLI commands

All required commands are present:

- `create-agent`: `01Evolve/app/cli/app.py:19`
- `create-baseline`: `01Evolve/app/cli/app.py:26`
- `eval-agent`: `01Evolve/app/cli/app.py:53`
- `eval-population`: `01Evolve/app/cli/app.py:72`
- `show-profile`: `01Evolve/app/cli/app.py:103`
- `select-pairs`: `01Evolve/app/cli/app.py:117`
- `breed`: `01Evolve/app/cli/app.py:123`
- `run-generation`: `01Evolve/app/cli/app.py:139`
- `show-lineage`: `01Evolve/app/cli/app.py:168`

Additional non-required commands also exist:

- `show-lifecycle`
- `export-run`
- `list-plugins`

## Domain fit analysis

### Required domain

The requested MVP must optimize customer-support agents for:

- billing
- access/login
- product_info
- refund
- technical_issue
- escalation_required

### Actual domain

The existing `01Evolve` domain is generic and evaluates abstract traits such as:

- viability
- context sensitivity
- instruction following
- entropy
- consistency
- goal pursuit
- correction
- robustness
- cooperation
- efficiency

Evidence:

- `D:\code\working\01Deck\01Evolve\app\configs\suites\phenotype-suite.yaml`
- `D:\code\working\01Deck\01Evolve\app\configs\suites\temperament-suite.yaml`

Verdict: `MISMATCH`

## Evaluation suite comparison

### Required suite

Required suite name: `support_tier1_v1`

Required tests:

1. `intent_classification`
2. `policy_correct_response`
3. `format_compliance`
4. `escalation_judgment`
5. `correction_after_feedback`
6. `efficiency`

### Actual suites

Implemented suites:

- `phenotype-v1`
- `temperament-v1`

Representative test IDs currently implemented:

- `viability_ready`
- `viability_math`
- `context_capitals`
- `instruction_three_words`
- `instruction_json`
- `goal_plan`
- `correction_retry`
- `cooperation_peer`
- `efficiency_brief`

Evidence:

- `D:\code\working\01Deck\01Evolve\app\configs\suites\phenotype-suite.yaml`
- `D:\code\working\01Deck\01Evolve\app\configs\suites\temperament-suite.yaml`

Verdict: `MISSING REQUIRED SUITE`

## Scoring and breeding gate comparison

### Required weights

- intent_classification: 0.15
- policy_correct_response: 0.30
- format_compliance: 0.15
- escalation_judgment: 0.20
- correction_after_feedback: 0.15
- efficiency: 0.05

### Actual weights

Current default weights in `01Evolve/app/core/evolution/fitness.py`:

- viability: 0.10
- context_sensitivity: 0.14
- instruction_following: 0.10
- entropy: 0.08
- consistency: 0.12
- goal_pursuit: 0.15
- correction: 0.10
- robustness: 0.08
- cooperation: 0.08
- efficiency: 0.05

### Required parent eligibility gates

- intent_classification >= 0.75
- policy_correct_response >= 0.70
- format_compliance >= 0.85
- escalation_judgment >= 0.80
- correction_after_feedback >= 0.50

### Actual parent eligibility gates

Current default thresholds in `01Evolve/app/core/evolution/fitness.py`:

- viability >= 0.80
- context_sensitivity >= 0.50
- instruction_following >= 0.50
- goal_pursuit >= 0.45
- correction >= 0.30
- cooperation >= 0.30
- stubbornness <= 0.85
- minimum_fitness >= 0.50

Verdict: `NOT SPEC-COMPLIANT`

## Data and config comparison

### Required synthetic local data

Must include:

- one baseline support agent
- at least two parent support agents
- one mock support policy file
- one evaluation suite config
- one sample dataset of support prompts and expected answers/labels

### Actual data present

Present:

- one baseline agent config: `01Evolve/app/configs/baselines/baseline-agent.yaml`
- two parent genome configs: `01Evolve/app/configs/genomes/parent-a.yaml`, `parent-b.yaml`
- evaluation suite configs: phenotype and temperament suites

Missing for requested MVP:

- support-domain baseline agent
- support-domain parent agents
- support policy file
- support prompt dataset with expected labels/actions
- `support_tier1_v1` suite config

Verdict: `PARTIAL`

## Benchmark comparison

### Required benchmark goals

The first benchmark must:

1. create one baseline support agent
2. create at least 20 support-agent variants
3. evaluate all variants on `support_tier1_v1`
4. select top performers
5. breed and evaluate offspring for at least 3 generations
6. show whether the best final agent beats the baseline

### Actual benchmark evidence

`example_run.py` currently:

- creates 1 baseline
- creates 2 parent agents
- evaluates parent A
- evaluates parent B
- runs 1 generation
- reports child fitness

Evidence:

- `D:\code\working\01Deck\01Evolve\example_run.py`

Observed runtime result:

- baseline created successfully
- one pair selected
- one child produced
- child fitness reported as `0.8542426125`

Missing benchmark capabilities:

- no generation loop for 3+ generations
- no 20-variant population creation
- no support-specific benchmark suite
- no final report that compares best-final vs baseline using required success criteria
- no explicit token-cost delta cap analysis

Verdict: `NOT BENCHMARK-READY`

## Scope compliance findings

### Finding 1: The top-level app violates the strict no-frontend constraint

The requested MVP says:

- do not build a frontend
- expose everything through a CLI

But the repo still contains a large active React app under `src/` and the current top-level `package.json` is a Vite frontend package.

Evidence:

- `D:\code\working\01Deck\package.json`
- `D:\code\working\01Deck\src\app\App.tsx`

Impact:

- the overall project is not currently focused on the requested CLI-only MVP

### Finding 2: The frontend still includes explicitly forbidden fun and care mechanics

The requested MVP forbids:

- lifecycle plugins
- care systems
- fun/consumer mechanics
- multi-agent orchestration

But the current app wires in exactly those concepts.

Evidence:

- `D:\code\working\01Deck\src\app\App.tsx` renders `ArcadePanel`, `MaestroPanel`, `AgentImportFlow`, and `EvolutionExperiencePlugin`
- `D:\code\working\01Deck\src\app\plugins\01evolve\manifest.ts` describes the plugin as `fun` and mentions `care-oriented companion mechanics`
- `D:\code\working\01Deck\src\app\components\EvolutionLab.tsx` contains companion systems, satiety, grooming, sleep, mutation flavor, lineage theatre, and partner session mechanics

Impact:

- the repo’s visible product direction is materially broader and noisier than the requested MVP

### Finding 3: `01Evolve` itself still includes forbidden lifecycle/plugin/fun layers

Even the Python core README defines optional lifecycle and fun/care plugins as first-class parts of the system.

Evidence:

- `D:\code\working\01Deck\01Evolve\README.md`
- `D:\code\working\01Deck\01Evolve\app\configs\plugins\playful-stack.yaml`
- `D:\code\working\01Deck\01Evolve\app\core\plugins\builtin.py`

Impact:

- while these layers are separable, the current project still advertises and tests non-MVP behavior instead of keeping the core tightly domain-focused

### Finding 4: There is no migration framework; schema creation is implicit at runtime

Database initialization uses `Base.metadata.create_all(engine)` directly.

Evidence:

- `D:\code\working\01Deck\01Evolve\app\core\persistence\database.py`

Impact:

- acceptable for an MVP
- but this can silently paper over schema drift rather than giving explicit migration history

## Reusable components for the requested MVP

These pieces are good salvage candidates:

- `01Evolve/app/core/schemas/models.py`
  - keep, but replace generic phenotype/temperament schema parts with support-domain schemas
- `01Evolve/app/core/persistence/models.py`
  - keep the SQLite pattern and tables, extend with support-domain suite/test metadata
- `01Evolve/app/core/agents/service.py`
  - keep the JSON/YAML-driven agent creation flow
- `01Evolve/app/core/evaluation/service.py`
  - keep the orchestration shape
- `01Evolve/app/core/evaluation/runner.py`
  - keep the runner shell, replace scoring logic and suite assumptions
- `01Evolve/app/core/evolution/pairing.py`
  - keep the parent selection structure, update gates to support metrics
- `01Evolve/app/core/evolution/recombination.py`
  - keep recombination + mutation foundation
- `01Evolve/app/cli/app.py`
  - keep the command surface and extend benchmark/reporting flows

## Components that should be excluded from the requested MVP

- all React frontend code under `D:\code\working\01Deck\src`
- plugin stacks under `01Evolve/app/configs/plugins`
- builtin fun/care plugins in `01Evolve/app/core/plugins/builtin.py`
- lifecycle-first framing in `01Evolve/README.md`
- `01Protocol_testing` unless you explicitly want support-agent identity/export as a later phase

## README and documentation status

### Present

- `D:\code\working\01Deck\01Evolve\README.md`
- `D:\code\working\01Deck\01Protocol_testing\README.md`
- `D:\code\working\01Deck\01deckspc\01deck-spec.md`

### Missing for requested MVP

There is no README that currently documents:

- customer-support optimization as the primary business use case
- `support_tier1_v1`
- the required support categories
- the required benchmark success criteria
- a benchmark walkthrough showing 20 variants and 3 generations

Verdict: `DOCS NOT ALIGNED`

## Benchmark success criteria measurement status

Required success criteria:

- best agent improves weighted overall score by at least 10% over baseline
- escalation_judgment improves by at least 15%
- correction_after_feedback improves by at least 10%
- token cost does not increase by more than 5%, ideally decreases

Current measurement status:

- weighted overall score exists generically
- correction-like scoring exists generically
- efficiency exists generically
- escalation judgment does not exist
- support policy correctness does not exist
- no benchmark script computes final-vs-baseline success criteria in the required support categories

Verdict: `CANNOT CURRENTLY MEASURE REQUIRED SUCCESS CRITERIA`

## Final scorecard

### What already exists and is usable

- CLI foundation
- config-driven agent creation
- SQLite persistence
- baseline capture
- variant evaluation
- weighted fitness
- threshold-gated parent eligibility
- recombination + bounded mutation
- lineage persistence

### What must be replaced or newly built

- support-domain schemas and configs
- support policy file and support dataset
- `support_tier1_v1` suite
- support-domain scoring methods
- required support weights and breeding gates
- 20+ variant population benchmark
- 3-generation benchmark loop
- final benchmark reporting against required success criteria

### What should be removed from the MVP path

- frontend dependency as a delivery requirement
- fun/care/lifecycle/plugin overlays
- arcade, maestro, partner session, and companion-system mechanics

## Practical recommendation

Recommended path: do not treat the current `01Deck` frontend as the MVP target.

Instead:

1. treat `01Evolve` as the base implementation
2. strip plugin/fun/care framing from the MVP branch
3. replace generic phenotype/temperament evaluation with support-domain evaluation
4. add a deterministic synthetic customer-support dataset, policy file, and `support_tier1_v1`
5. add a benchmark runner that creates baseline + 20 variants + 3 generations
6. emit a final CLI report that proves or disproves the required benchmark success criteria

## Bottom line

If judged strictly against the requested specification, the project is not yet the requested MVP.

If judged as a starting point, `01Evolve` is a credible base to convert into that MVP with moderate refactoring, while the current React `01Deck` app is mostly out of scope noise for this goal.
