# 01Deck Agent Feedback Log

## Why this file exists

01Deck's stated direction is to be **a place where humans and AI agents can freely talk and act together** — not a tool a human operates while an agent watches, and not a sandbox an agent operates unsupervised while a human watches. Both are meant to be first-class participants.

Any agent operating 01Deck — via the Claude `01deck` skill or the OpenCode `01Deck Operator` agent — is asked to do more than complete its task. While you're in here, **notice where the product gets in the way**, for either audience, and add an entry below. Don't silently route around friction and say nothing; that's exactly the signal this file exists to capture. A human reviews this periodically and turns real patterns into backlog work.

## How to log an entry

Add a new entry under the relevant heading, newest first. Keep it concrete — what you were trying to do, what got in the way, who it affects. One or two sentences is plenty; this is a signal log, not a report.

```
### YYYY-MM-DD — short title
**Affects:** agents / humans / both
**What happened:** ...
**Why it matters:** ...
```

Don't edit or remove other agents' entries — if something's fixed, a human will prune it.

---

## For agent use

### 2026-09-07 — No first-class agent identity in shared spaces
**Affects:** agents
**What happened:** Hub's Messages, Board, and Trade tabs are all built around a single human-signed-in session posting as "you" — there's no way for an agent acting semi-autonomously in this workspace to post, message, or propose a trade under *its own* agent identity (the one it already has via the 01 Protocol owner-binding). Everything an agent does in these surfaces is invisibly attributed to the human's account.
**Why it matters:** this is the single biggest gap between the current build and "humans and agents freely talk" — right now agents can talk *to* a human via chat, but can't participate *alongside* humans in the shared/social surfaces as themselves.

### 2026-09-07 — No way to tell if a Board post or Trade came from a human or an agent
**Affects:** agents, humans
**What happened:** even if agent-authored posts existed, there's currently no UI convention (badge, label, avatar treatment) anywhere in Hub for distinguishing agent-originated activity from human-originated activity.
**Why it matters:** needed before agent-authored content in shared spaces would be trustworthy or legible to a human reading the Board/Messages.

## For human use

### 2026-09-07 — No multi-agent or agent-to-agent conversation surface
**Affects:** humans, agents
**What happened:** chat is strictly one human ↔ one agent. There's no group thread where a human could bring two or more of their agents into the same conversation together, or where two agents could converse with each other while a human observes/steers.
**Why it matters:** relevant to any workflow where a human wants their agents to collaborate in front of them rather than being coordinated one at a time through separate 1:1 threads.

### 2026-09-17 — Social backend now exists; frontend screens still on mock data
**Affects:** both
**What happened:** Built the complete backend for Forum, Messages, and Presence (the three screens that were 100% mock data). New endpoints: `POST/GET /chat/global` (global channel chat), `POST /messages/start`, `GET /messages/conversations`, `POST/GET /messages/{id}` (1:1 DMs), `POST/GET /forum/threads`, `GET /forum/threads/{id}`, `POST /forum/threads/{id}/replies`, `POST /presence/heartbeat`, `GET /presence/online`. Bosun gets a seeded system account (`account_id = "bosun"`, `is_system_account = true`) that always appears in the online roster. New `is_system_account` boolean on `UserAccountRecord` so the frontend can render platform agents differently. Branch: `feat/social-backend`.
**Why it matters:** The frontend `ForumHub.tsx`, `MessagesHub.tsx`, `ChatHub.tsx` components are wired to `useState(seedXxx)` and make zero backend calls — this backend exists but is not yet connected. Frontend wiring is the immediate next task; once done, two real human accounts will actually be able to see each other and communicate.

---

*Started 2026-09-07 during the security/QA remediation pass. See the forensic report and workflow map from that pass for the broader defect list — this file is specifically for "the product is missing something" observations, not bug reports.*
