# 01Deck Forensic Release Report

Date: 2026-03-30
Mode: NEXUS-Sprint forensic hardening pass
Scope: `D:\code\working\01Deck`

## Selected NEXUS roles

- Agents Orchestrator: coordinate the forensic pass and consolidate evidence.
- Senior Project Manager: convert the spec and release intent into concrete issue buckets.
- UX Architect: inspect layout, navigation, responsiveness, and misleading affordances.
- Frontend Developer: review implementation quality and component gaps.
- Backend Architect: validate 01protocol integration and verification trust boundaries.
- Evidence Collector: capture build/runtime evidence and file-level proof.
- Reality Checker: judge release readiness against the current spec, not aspirations.
- Performance Benchmarker: record build output and bundle-size risk.
- Legal Compliance Checker: flag privacy and third-party exposure risks.
- Test Results Analyzer: assess verification coverage and missing QA infrastructure.

## Evidence captured

- Read `D:\code\working\01Deck\01deckspc\01deck-spec.md`
- Read NEXUS strategy docs from `D:\code\survos\agency-agents\strategy\nexus-strategy.md` and `D:\code\working\agents\agency-agents-main\strategy\runbooks\scenario-enterprise-feature.md`
- Built the app successfully with `npm run build`
- Build result: `dist/assets/index-C9HEQOPp.js` at 541.56 kB minified with Vite chunk-size warning
- Security package check: `npm audit --omit=dev --json` returned `0` known vulnerabilities
- Historical repo evidence: `vite.err.log` still shows earlier broken Figma asset imports, useful for provenance but not current-source truth

## Release verdict

Current status: `NEEDS WORK` before first release.

The app now builds and the verification path is materially stronger than before, but the release still over-promises relative to the current implementation. The biggest blocker is not a compiler failure. It is a product-trust gap: several spec-defined surfaces are missing entirely, several visible actions are placeholders or local simulations, and the layout is not hardened for smaller viewports.

## Findings

### High

1. `01maestro` is absent from the shipped app surface.
   Evidence:
   - `D:\code\working\01Deck\src\app\App.tsx` renders no `MaestroPanel`
   - `D:\code\working\01Deck\src\app\context\AppContext.tsx` has no `maestroEnabled`, `maestroOpen`, or `vstAgents`
   - Missing spec files:
     - `D:\code\working\01Deck\src\app\data\musicAgents.ts`
     - `D:\code\working\01Deck\src\app\components\MaestroPanel.tsx`
     - `D:\code\working\01Deck\src\app\plugins\01maestro\MaestroVSTPlugin.tsx`
   Impact:
   - The product story says `01Deck` is the viewer/interface and `01maestro` is the add-on layer, but the current release candidate exposes none of that path.

2. The spec-defined import flow is missing.
   Evidence:
   - Missing file: `D:\code\working\01Deck\src\app\components\AgentImportFlow.tsx`
   - `D:\code\working\01Deck\src\app\App.tsx` renders no import modal or onboarding import flow
   - `D:\code\working\01Deck\src\app\context\AppContext.tsx` has no `showAgentImport` state
   Impact:
   - Import exists only as a textarea inside Ops Hub, which is useful for operators but below the intended first-run/import UX in the spec.

3. The agent creation flow is materially below the spec.
   Evidence:
   - `D:\code\working\01Deck\src\app\components\AgentCreatorModal.tsx` is a compact four-screen modal (`form`, `generating`, `preview`, `success`)
   - The spec calls for a deeper 6-tab split-panel builder with richer configuration
   Impact:
   - Current creation works, but the shipped UI would not match the promised product depth for first release.

4. Release UI still contains simulated or misleading product surfaces.
   Evidence:
   - `D:\code\working\01Deck\src\app\components\OperationsHub.tsx` social connections, internal messages, board, and trade flows are all local state simulations backed only by `AppContext`
   - `D:\code\working\01Deck\src\app\components\AgentList.tsx` shows `01Protocol Registry · Browse Available Agents` as a non-interactive affordance
   - `D:\code\working\01Deck\src\app\components\ArcadePanel.tsx` shows `Browse Registry →` with no real action
   Impact:
   - These are trust hazards for a first release because they look integrated even when they are not.

5. Bundle verification currently overstates what it proves.
   Evidence:
   - `D:\code\working\01Deck\src\app\utils\protocol.ts` verifies only the embedded `identity` block when a `.01bundle` is supplied
   - `D:\code\working\01Deck\src\app\components\OperationsHub.tsx` presents this as broad integrity verification
   - `D:\code\working\01Deck\src\app\context\AppContext.tsx` trading copy encourages users to trust verification before trades
   Impact:
   - A modified bundle can still pass if the identity block is intact but other bundled data is altered. This is a real trust-boundary bug, not just wording polish.

### Medium

6. Missing rarity detail modal and other spec-listed components.
   Evidence:
   - Missing file: `D:\code\working\01Deck\src\app\components\RarityInfoModal.tsx`
   - `D:\code\working\01Deck\src\app\components\RarityBadge.tsx` only toggles an inline tooltip
   Impact:
   - Not a blocker by itself, but it confirms the implementation is still behind the canonical spec.

7. Seed data diverges from the stated protocol baseline.
   Evidence:
   - `D:\code\working\01Deck\src\app\data\agents.ts` still includes seed agents on `01P v2.8`
   - Several seeded agents have no stored identity artifact or verification metadata
   Impact:
   - The app now supports real verification, but the default collection still mixes legacy/demo inventory with the new trust model.

8. User-created artifacts are persisted in plaintext browser storage.
   Evidence:
   - `D:\code\working\01Deck\src\app\components\AgentCreatorModal.tsx` stores `identityRecord`, `bundleRecord`, and `systemPrompt` on created agents
   - `D:\code\working\01Deck\src\app\components\OnboardingFlow.tsx` does the same for onboarding-created agents
   - `D:\code\working\01Deck\src\app\context\AppContext.tsx` persists `userAgents` to `localStorage`
   Impact:
   - On shared machines or compromised browser contexts, private goals, prompts, and agent artifacts are exposed as easy-to-read plaintext.

9. Privacy and brand trust risks from third-party assets remain.
   Evidence:
   - `D:\code\working\01Deck\src\app\data\agents.ts` uses many external `images.unsplash.com` portraits
   - `D:\code\working\01Deck\src\styles\fonts.css` imports Google Fonts directly
   - `D:\code\working\01Deck\src\app\components\TopBar.tsx` social links point to generic platform homepages, not official 01AI properties
   Impact:
   - External image/font calls leak client metadata and make the first release feel like a mockup rather than a production product.

10. Responsive layout is not release-hardened.
   Evidence:
   - `D:\code\working\01Deck\src\app\components\TopBar.tsx` uses a dense fixed top bar with no mobile collapse pattern
   - `D:\code\working\01Deck\src\app\components\ChatWindow.tsx` initializes with `window.innerWidth - 420` and uses fixed width `380`
   - `D:\code\working\01Deck\src\app\components\ThemePickerPanel.tsx` fixes width at `360`
   - `D:\code\working\01Deck\src\app\components\OperationsHub.tsx` uses a fixed two-column layout
   - `D:\code\working\01Deck\src\app\components\AgentCardModal.tsx` fixes the card at `380 x 532`
   Impact:
   - Desktop may feel acceptable, but tablet/smaller viewport behavior is likely to clip, overlap, or overflow.

11. Release packaging and repo hygiene still look scaffold-grade.
   Evidence:
   - `D:\code\working\01Deck\package.json` still names the package `@figma/my-make-file`
   - The package only exposes a `build` script and no standard `dev`/`preview`/`lint`/`test` workflow
   Impact:
   - This does not break the app, but it weakens release confidence and onboarding for anyone else touching the project.

12. Automated QA coverage is effectively absent.
    Evidence:
    - No test files found under `D:\code\working\01Deck\src`
    - No test tooling or scripts are defined in `D:\code\working\01Deck\package.json`
    Impact:
    - Verification logic, onboarding, creation, and import flows are currently protected only by manual testing.

13. Release folder contents can leak internal implementation material if packaged as-is.
    Evidence:
    - `D:\code\working\01Deck\src.zip`
    - `D:\code\working\01Deck\01deckspc.zip`
    - `D:\code\working\01Deck\Build Agent View.zip`
    - `D:\code\working\01Deck\guidelines.zip`
    - `D:\code\working\01Deck\vite.err.log`
    Impact:
    - If the release directory is distributed directly, it exposes internal docs, source duplicates, and local build metadata.

14. Performance headroom is tight for first release.
    Evidence:
    - Production build emitted a 541.56 kB JS bundle with Vite chunk-size warning
    Impact:
    - First-load cost is higher than it should be for a UI-first product, especially once more features are restored.

### Low

15. Visible placeholder UI remains in release-facing surfaces.
    Evidence:
    - `D:\code\working\01Deck\src\app\components\ThemePickerPanel.tsx` shows `Import Soon`, `Export Soon`, and inactive frame styles
   Impact:
   - Honest placeholders are better than fake actions, but they still need to be hidden or clearly marked if the target is a polished first release.

16. Some user-visible text/branding still looks unpolished.
   Evidence:
   - `D:\code\working\01Deck\dist\index.html` still uses the title `Agentview`
   - visible UI text contains encoding artifacts such as `Â·` and `âœ•`
   Impact:
   - Small polish defects matter more in a product whose core pitch is trust and verification.

## Security review summary

- Positive:
  - `npm audit --omit=dev` reported no known dependency vulnerabilities
  - The prior unsafe `innerHTML` fallback has been removed
  - Verification now uses 01protocol-backed artifact checks instead of a fake checksum baseline
- Remaining concerns:
  - Bundle verification only proves the embedded identity block, not the whole bundle payload
  - Plaintext localStorage persistence exposes user-created prompts and artifacts
  - Third-party asset/font requests create avoidable privacy leakage
  - Placeholder integrations can mislead users into assuming live connectivity or supported workflows
  - Legacy seeded agents weaken the clarity of the verification standard unless clearly labeled

## Recommended release gate

Do not ship as a full `01Deck + cross-environment + 01maestro-ready` release yet.

Ship only after one of these is true:

- Option A: narrow the scope and market this as an `01Deck alpha` focused on collection, creation, and verification
- Option B: implement the missing import/maestro/release-hardening work and ship the broader story

## Immediate priorities

1. Remove or disable misleading registry/social/trade affordances that do not perform real work.
2. Fix the verifier trust boundary or relabel bundle checks so they only claim identity verification.
3. Decide whether first release includes `01maestro` visibility or explicitly excludes it.
4. Add a real import entry flow outside Ops Hub.
5. Harden responsive behavior for TopBar, ChatWindow, AgentCardModal, Theme panel, and Ops Hub.
6. Replace third-party portraits/fonts or make them local.
7. Normalize seeded agents to the verification story and reduce plaintext artifact exposure.
