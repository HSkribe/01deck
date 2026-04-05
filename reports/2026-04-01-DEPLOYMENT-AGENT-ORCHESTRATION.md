# 01Deck Deployment Agent Orchestration

## Objective

Run two parallel tracks against `01Deck` before deployment:

- Track A: release readiness and broken-surface detection
- Track B: product-shape, workflow, and noise reduction

This plan assumes the intended release candidate is the serious `01FOUNDRY` support-optimization surface, not the broader consumer/game shell.

## Current Reality

Based on repo review:

- `01FOUNDRY` exists and maps cleanly to the serious support-optimization workflow.
- The app still exposes broader consumer surfaces: `Deck`, `Arcade`, `Learn`, `Create`, `Library`, `Profile`, Hub overlays, and Ops flows.
- `SERIOUS_PRODUCT_MODE` is currently disabled in [src/app/utils/productMode.ts](/D:/code/working/01Deck/src/app/utils/productMode.ts).
- Several primary CTAs appear to be dead ends or prototype-only flows.
- No frontend smoke or e2e test harness is declared in [package.json](/D:/code/working/01Deck/package.json).

## Orchestration Model

### Conductor

- Agent: `specialized/agents-orchestrator.md`
- Role: owns test matrix, dispatches agents, consolidates findings, enforces evidence requirements, and prepares final recommendation.

### Track A: Release Readiness

1. `testing/testing-evidence-collector.md`
   - Mission: click through major surfaces, capture screenshots, log broken areas, broken links, missing handlers, visual regressions, and obvious workflow traps.
   - Output: evidence-backed issue list with screenshots and reproduction steps.

2. `testing/testing-accessibility-auditor.md`
   - Mission: keyboard navigation, focus states, overlay behavior, labels, dialog handling, and core WCAG risks on the actual release candidate surfaces.
   - Output: accessibility issue list prioritized by release impact.

3. `engineering/engineering-code-reviewer.md`
   - Mission: inspect CTA wiring, dead-end flows, mismatched copy vs. actual behavior, and release-risk code paths.
   - Output: code-backed findings with file references.

4. `testing/testing-performance-benchmarker.md`
   - Mission: verify build footprint, runtime responsiveness, and any launch-blocking performance issues on the narrowed candidate surface.
   - Output: performance risk summary and thresholds.

5. `testing/testing-reality-checker.md`
   - Mission: final go/no-go gate using outputs from all Track A agents.
   - Output: `READY`, `NEEDS WORK`, or `NOT READY`.

### Track B: Product Shape and Deployment Scope

1. `design/design-ux-researcher.md`
   - Mission: assess whether the product is too busy, whether navigation matches user intent, and whether the app tells one coherent product story.
   - Output: journey-level friction map and clarity recommendations.

2. `testing/testing-workflow-optimizer.md`
   - Mission: simplify user flow, reduce surface sprawl, and recommend what should be hidden, deferred, or merged before launch.
   - Output: current-state vs. launch-state workflow proposal.

3. `engineering/engineering-code-reviewer.md`
   - Mission: identify code-level areas that keep non-launch surfaces alive and where gating or hiding can happen cleanly.
   - Output: implementation-risk notes for scope reduction.

4. `support/support-executive-summary-generator.md`
   - Mission: turn both tracks into a deployment decision memo.
   - Output: short executive summary with recommended launch scope.

## Testing Scope

### Primary Release Candidate

Must be fully tested:

- `01FOUNDRY`
- benchmark and evaluation surfaces
- baseline and variant management
- lineage and reporting
- any auth, API, or protected backend interaction used by the serious workflow

### Secondary Surfaces

Must be explicitly classified:

- `Deck`
- `Arcade`
- `Learn`
- `Create`
- `Library`
- `Profile`
- `HubApp`
- `OperationsHub`
- onboarding
- import flows
- plugin toggles

Each secondary surface must be labeled as one of:

- ship now
- hide for launch
- leave visible with beta labeling
- cut entirely from deployment candidate

## Required Output Format

Each agent should report:

- finding
- severity: `Critical`, `High`, `Medium`, or `Low`
- reproduction steps
- evidence
- likely owner
- launch recommendation

## Prompt Pack

### Prompt 1: Conductor

```text
Read D:\code\working\01Deck and orchestrate a two-track pre-deployment review for 01Deck.

Track A is release readiness:
- Evidence Collector
- Accessibility Auditor
- Code Reviewer
- Performance Benchmarker
- Reality Checker

Track B is product-shape and workflow:
- UX Researcher
- Workflow Optimizer
- Code Reviewer
- Executive Summary Generator

Important context:
- The intended serious product is 01FOUNDRY support optimization.
- The repo README says this branch is not for playful consumer features.
- The app currently still exposes broader consumer/game/create/library/profile surfaces.
- Default to evidence-backed findings, not optimism.

Your job:
- define the test matrix
- assign exact surfaces to each agent
- require screenshots or code references for claims
- consolidate outputs into one launch recommendation
- force a final scope decision: what ships, what hides, what stays beta
```

### Prompt 2: Evidence Collector

```text
Test 01Deck as a pre-deployment UI QA specialist.

Focus first on the serious release path:
- 01FOUNDRY
- dashboard
- baseline manager
- variant manager
- evaluation runner
- scorecard
- optimization run panel
- lineage viewer
- benchmark report

Then inspect visible secondary surfaces:
- Deck
- Hub
- Arcade
- Learn
- Create
- Library
- Profile
- Operations Hub
- onboarding
- import flow

Find:
- broken areas
- dead buttons
- links or CTAs that do nothing
- overlays that trap the user
- misleading surfaces that look shippable but are prototype-only
- visual clutter that hurts clarity

Default to finding issues. Provide reproduction steps and screenshot-backed evidence.
```

### Prompt 3: Accessibility Auditor

```text
Audit 01Deck for launch-blocking accessibility issues, starting with the serious 01FOUNDRY workflow.

Check:
- keyboard-only navigation
- visible focus
- dialog and overlay behavior
- button/link accessible names
- form labels and status messaging
- color contrast risks
- screen-reader semantics on primary controls

Then spot-check the visible non-core surfaces if they remain in the deployment candidate.

Report only concrete issues with WCAG references and prioritize release blockers first.
```

### Prompt 4: Code Reviewer

```text
Review 01Deck for deployment-risk code paths.

Look for:
- prominent CTAs without real handlers
- flows that navigate but lose the selected item or context
- search/import/mock features presented as real
- scope mismatch between README and active UI
- easy places to gate or hide non-serious surfaces before launch

Prioritize findings over summary. Include file references and explain why each issue matters before deployment.
```

### Prompt 5: UX Researcher

```text
Assess whether 01Deck feels too busy or tells multiple product stories at once.

Evaluate:
- first-run impression
- top-level navigation clarity
- whether 01FOUNDRY is clearly the product or just one area among many
- whether the broader shell creates confusion, distraction, or trust issues
- whether workflows feel coherent from landing to report review

Deliver:
- main user journeys
- friction points
- places where users may ask "what is this product actually for?"
- recommendations for launch simplification
```

### Prompt 6: Workflow Optimizer

```text
Map the current 01Deck user flow and propose a lean deployment workflow.

Current goal:
- support-optimization product centered on 01FOUNDRY

Identify:
- unnecessary steps
- extra surfaces that compete with the serious workflow
- where users can enter dead ends or prototype branches
- what should be hidden, deferred, relabeled, or moved behind beta gates

Output:
- current-state workflow
- recommended launch-state workflow
- prioritized simplification actions
```

### Prompt 7: Performance Benchmarker

```text
Assess whether 01Deck has launch-risk performance issues for the actual deployment candidate.

Focus on:
- build size
- bundle weight
- large non-essential surfaces loaded into the same shell
- runtime risk from shipping too much UI at once

Use the serious 01FOUNDRY candidate as the baseline, then note what extra cost comes from keeping broader consumer surfaces alive.
```

### Prompt 8: Reality Checker

```text
Make the final deployment-readiness call for 01Deck after reviewing the outputs from QA, accessibility, code review, UX, workflow, and performance.

Default to NEEDS WORK unless evidence strongly supports release.

Your final answer must include:
- launch verdict
- top blockers
- exact scope recommendation
- whether only 01FOUNDRY should ship now
```

### Prompt 9: Executive Summary Generator

```text
Convert the combined agent findings for 01Deck into a concise deployment decision memo for leadership.

The memo must answer:
- what is ready
- what is not ready
- what should be hidden before deployment
- what the recommended launch scope is
- what work remains for a fuller release
```

## Recommended Execution Order

Run in parallel:

- Evidence Collector
- Accessibility Auditor
- Code Reviewer
- UX Researcher
- Workflow Optimizer
- Performance Benchmarker

Then run:

- Reality Checker
- Executive Summary Generator

## Immediate Recommendations Before Any Public Deployment

1. Treat `01FOUNDRY` as the only presumed release candidate until proven otherwise.
2. Decide whether to enable a serious-only mode and hide non-core surfaces.
3. Audit all visible primary CTAs and either wire them or remove them.
4. Label any surviving prototype surface clearly as beta or internal.
5. Add at least one repeatable smoke-test path for the release candidate.

## Expected Final Decisions

By the end of this orchestration, you should be able to answer:

- Is `01FOUNDRY` ready to deploy?
- Which visible surfaces are launch blockers?
- Which visible surfaces should be hidden?
- What exact work remains before broader release?
