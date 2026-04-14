# Artifact Bundle Template

Create one directory per attempt:

`01Deck/test_ads/artifacts/SXX-short-name-attempt-0N/`

Recommended contents:

- `scenario.yaml`
- `run-log.md`
- `screenshots/`
- `recording.mp4`
- `console.log`
- `network.log`
- `classification.md`
- `creative.md`

## `scenario.yaml`

```yaml
scenario_id: S01
scenario_name: First-time user reaches a live interactive assessment
attempt: 1
status: planned
persona: Curious new visitor
qa_priority: Critical
ad_potential: High
record_screen: true
```

## Rules

- store only one attempt per folder
- keep timestamps in the logs
- do not overwrite old attempts
- if rerunning, create a new attempt folder
