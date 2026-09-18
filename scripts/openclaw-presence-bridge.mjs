#!/usr/bin/env node
// Bridges OpenClaw agent-session presence into 01Deck's real presence
// roster, so named OpenClaw sessions (e.g. "Moss") show up online in
// 01Deck's Chat hub alongside Bosun and real accounts.
//
// Why this exists: OpenClaw's gateway (ws://127.0.0.1:18789) has a real
// session-query API, but it requires full device-keypair pairing/signing
// (see docs/gateway/protocol.md in the openclaw package) -- appropriate for
// its own first-party clients, overkill and risky to hand-roll here. This
// script instead shells out to the local `openclaw sessions --json` CLI,
// which reads the on-disk session store directly with no auth dance, and
// reports the result to 01Deck's backend over plain HTTPS.
//
// This only reports sessions that have been given a human-readable label
// (checked live: `label` shows up on at least one real session kind in
// `openclaw sessions --json` output). If nothing shows up in 01Deck after
// running this, check the printed raw session dump below for whatever
// field actually carries your session's display name (e.g. "Moss") and
// adjust DISPLAY_NAME_FIELDS accordingly.
//
// Usage:
//   01DECK_BRIDGE_TOKEN=<your BETA_ACCESS_TOKEN value> node scripts/openclaw-presence-bridge.mjs
//
// Env vars:
//   01DECK_BRIDGE_TOKEN   (required) same bearer token 01Deck's Bosun admin
//                         endpoints use (01deck/prod/app secret's
//                         BETA_ACCESS_TOKEN). Never commit this value.
//   01DECK_API_BASE       (default: production CloudFront /api)
//   OPENCLAW_BIN          (default: "openclaw")
//   OPENCLAW_ACTIVE_MINUTES (default: 30) -- only sessions updated within
//                         this window are reported as "active"
//   POLL_INTERVAL_MS      (default: 20000)

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const API_BASE = process.env['01DECK_API_BASE'] || 'https://d3949vgrsaqpxs.cloudfront.net/api';
const BRIDGE_TOKEN = process.env['01DECK_BRIDGE_TOKEN'];
const OPENCLAW_BIN_RAW = process.env.OPENCLAW_BIN || 'openclaw';
// npm's global bin on Windows is a .cmd shim; execFile without a shell needs
// the literal shim name, not just "openclaw" (avoids shell:true's arg-escaping
// footgun entirely rather than working around it).
const OPENCLAW_BIN =
  process.platform === 'win32' && !/\.(cmd|exe|bat)$/i.test(OPENCLAW_BIN_RAW)
    ? `${OPENCLAW_BIN_RAW}.cmd`
    : OPENCLAW_BIN_RAW;
const ACTIVE_MINUTES = Number(process.env.OPENCLAW_ACTIVE_MINUTES || 30);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 20_000);

// Fallback chain for "what field holds this session's human-readable name".
// `label` is confirmed live on at least one session kind; the others are
// speculative fallbacks in case your OpenClaw setup names sessions
// differently (e.g. dashboard sessions renamed via the web UI).
const DISPLAY_NAME_FIELDS = ['label', 'title', 'name', 'displayName'];

if (!BRIDGE_TOKEN) {
  console.error('01DECK_BRIDGE_TOKEN is required (the same token Bosun\'s admin endpoints use). Exiting.');
  process.exit(1);
}

let loggedRawDumpOnce = false;

async function fetchActiveSessions() {
  // shell:true is required on Windows to spawn a .cmd shim at all (plain
  // execFile hits EINVAL for .bat/.cmd targets) -- safe here since every
  // argument is a static literal or a Number()-coerced env var, never
  // untrusted/user-supplied text that could need escaping.
  const { stdout } = await execFileAsync(OPENCLAW_BIN, [
    'sessions',
    '--json',
    '--all-agents',
    '--active', String(ACTIVE_MINUTES),
    '--limit', 'all',
  ], { shell: true });
  const parsed = JSON.parse(stdout);
  const sessions = parsed.sessions || [];

  if (!loggedRawDumpOnce) {
    // Printed once at startup so you can eyeball real field names if the
    // fallback chain above doesn't find your session's name.
    console.log(`[bridge] ${sessions.length} active session(s) from openclaw. Raw sample:`,
      JSON.stringify(sessions.slice(0, 3), null, 2));
    loggedRawDumpOnce = true;
  }

  const named = [];
  for (const session of sessions) {
    const displayName = DISPLAY_NAME_FIELDS.map(f => session[f]).find(v => typeof v === 'string' && v.trim());
    if (!displayName) continue; // unlabeled/technical session -- skip, not noise-worthy
    named.push({ session_key: session.key, display_name: displayName.trim().slice(0, 64) });
  }
  return named.slice(0, 50); // matches the backend's max_length=50 cap
}

async function syncToDeck(agents) {
  const res = await fetch(`${API_BASE}/presence/external/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
    },
    body: JSON.stringify({ agents }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`01Deck sync failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function tick() {
  try {
    const agents = await fetchActiveSessions();
    if (agents.length === 0) {
      console.log('[bridge] no labeled active sessions to report this tick.');
      return;
    }
    const result = await syncToDeck(agents);
    console.log(`[bridge] synced ${result.synced.length} agent(s):`, agents.map(a => a.display_name).join(', '));
  } catch (err) {
    console.error('[bridge] tick failed:', err instanceof Error ? err.message : err);
  }
}

console.log(`[bridge] starting. Polling "${OPENCLAW_BIN} sessions" every ${POLL_INTERVAL_MS}ms, reporting to ${API_BASE}.`);
await tick();
const interval = setInterval(tick, POLL_INTERVAL_MS);

process.on('SIGINT', () => {
  console.log('\n[bridge] shutting down.');
  clearInterval(interval);
  process.exit(0);
});
