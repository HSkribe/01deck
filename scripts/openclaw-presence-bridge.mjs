#!/usr/bin/env node
// Bridges OpenClaw agent sessions into real, two-way 01Deck conversations:
// - Presence: named OpenClaw sessions (e.g. "Moss") show up online in
//   01Deck's Chat hub roster, same as Bosun.
// - Messaging: humans can DM an OpenClaw agent through 01Deck's normal
//   Messages UI; this bridge delivers those DMs into the real OpenClaw
//   session via the CLI, and relays the real reply back.
//
// Why CLI, not the gateway WS API: OpenClaw's gateway (ws://127.0.0.1:18789)
// requires full device-keypair pairing/signing to query or drive sessions
// (see docs/gateway/protocol.md in the openclaw package) -- appropriate for
// its own first-party clients, overkill and risky to hand-roll here.
// `openclaw sessions --json` (read) and `openclaw agent --session-key ...
// --message ... --json` (send+run a real turn) both go through the same
// local session store with no auth dance, so this script shells out to
// those instead and talks to 01Deck's backend over plain HTTPS.
//
// This only reports/relays for sessions that have been given a human-
// readable label (checked live: `label` shows up on at least one real
// session kind in `openclaw sessions --json` output). If "Moss" doesn't
// show up, check the raw session dump this script prints at startup for
// whatever field actually carries the name you gave it, and adjust
// DISPLAY_NAME_FIELDS below.
//
// Usage:
//   01DECK_BRIDGE_TOKEN=<your BETA_ACCESS_TOKEN value> node scripts/openclaw-presence-bridge.mjs
//
// Env vars:
//   01DECK_BRIDGE_TOKEN     (required) same bearer token 01Deck's Bosun
//                           admin endpoints use (01deck/prod/app secret's
//                           BETA_ACCESS_TOKEN). Never commit this value.
//   01DECK_API_BASE         (default: production CloudFront /api)
//   OPENCLAW_BIN            (default: "openclaw")
//   OPENCLAW_ACTIVE_MINUTES (default: 30) -- only sessions updated within
//                           this window are reported as "active"
//   OPENCLAW_AGENT_ID       (default: "main") -- passed as --agent to
//                           `openclaw agent` when relaying a message
//   POLL_INTERVAL_MS        (default: 20000)
//   BRIDGE_STATE_FILE       (default: .openclaw-bridge-state.json next to
//                           this script) -- persists each agent's last-seen
//                           message id across restarts

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
const AGENT_ID = process.env.OPENCLAW_AGENT_ID || 'main';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 20_000);
const STATE_FILE =
  process.env.BRIDGE_STATE_FILE ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '.openclaw-bridge-state.json');

// Fallback chain for "what field holds this session's human-readable name".
// `label` is confirmed live on at least one session kind; the others are
// speculative fallbacks in case your OpenClaw setup names sessions
// differently (e.g. dashboard sessions renamed via the web UI).
const DISPLAY_NAME_FIELDS = ['label', 'title', 'name', 'displayName'];

// Defensive fallback chain for "where's the reply text" in `openclaw agent
// --json` output -- unverified against a real success response (blocked by
// a model-provider config issue at write time), see extractReplyText below.
const REPLY_TEXT_PATHS = [
  ['reply'], ['text'], ['message'], ['output'],
  ['result', 'text'], ['result', 'reply'], ['result', 'message'],
  ['response', 'text'], ['response', 'message'],
];

if (!BRIDGE_TOKEN) {
  console.error('01DECK_BRIDGE_TOKEN is required (the same token Bosun\'s admin endpoints use). Exiting.');
  process.exit(1);
}

// account_id -> session_key, rebuilt each presence tick from the sync
// response (the account_id is a one-way hash of session_key, so this
// process is the only place that can reverse the mapping).
const sessionKeyByAccountId = new Map();

let loggedRawSessionDumpOnce = false;
let loggedRawAgentReplyOnce = false;

async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return { cursors: {} }; // { [account_id]: last_seen_message_id }
  }
}

async function saveState(state) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

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

  if (!loggedRawSessionDumpOnce) {
    console.log(`[bridge] ${sessions.length} active session(s) from openclaw. Raw sample:`,
      JSON.stringify(sessions.slice(0, 3), null, 2));
    loggedRawSessionDumpOnce = true;
  }

  const named = [];
  for (const session of sessions) {
    const displayName = DISPLAY_NAME_FIELDS.map(f => session[f]).find(v => typeof v === 'string' && v.trim());
    if (!displayName) continue; // unlabeled/technical session -- skip, not noise-worthy
    named.push({ session_key: session.key, display_name: displayName.trim().slice(0, 64) });
  }
  return named.slice(0, 50); // matches the backend's max_length=50 cap
}

async function syncPresence(agents) {
  const res = await fetch(`${API_BASE}/presence/external/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BRIDGE_TOKEN}` },
    body: JSON.stringify({ agents }),
  });
  if (!res.ok) throw new Error(`presence sync failed: ${res.status} ${await res.text().catch(() => '')}`);
  const { synced } = await res.json();
  for (const { session_key, account_id } of synced) sessionKeyByAccountId.set(account_id, session_key);
  return synced;
}

async function fetchPending(accountId, afterId) {
  const params = new URLSearchParams({ account_id: accountId });
  if (afterId != null) params.set('after_id', String(afterId));
  const res = await fetch(`${API_BASE}/messages/external/pending?${params}`, {
    headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
  });
  if (!res.ok) throw new Error(`pending fetch failed: ${res.status} ${await res.text().catch(() => '')}`);
  return (await res.json()).messages;
}

async function sendReply(accountId, conversationId, content) {
  const res = await fetch(`${API_BASE}/messages/external/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BRIDGE_TOKEN}` },
    body: JSON.stringify({ account_id: accountId, conversation_id: conversationId, content }),
  });
  if (!res.ok) throw new Error(`reply send failed: ${res.status} ${await res.text().catch(() => '')}`);
}

function extractReplyText(parsed) {
  for (const pathSegs of REPLY_TEXT_PATHS) {
    let value = parsed;
    for (const seg of pathSegs) value = value?.[seg];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

async function relayIntoSession(sessionKey, message) {
  const { stdout } = await execFileAsync(OPENCLAW_BIN, [
    'agent',
    '--agent', AGENT_ID,
    '--session-key', sessionKey,
    '--message', message,
    '--json',
  ], { shell: true });
  const parsed = JSON.parse(stdout);
  if (!loggedRawAgentReplyOnce) {
    // First real reply's shape, printed once so the REPLY_TEXT_PATHS list
    // above can be corrected if it doesn't match your OpenClaw version.
    console.log('[bridge] raw `openclaw agent --json` response sample:', JSON.stringify(parsed, null, 2));
    loggedRawAgentReplyOnce = true;
  }
  const replyText = extractReplyText(parsed);
  if (!replyText) {
    throw new Error(
      'could not find reply text in openclaw agent response -- see the raw sample logged above and tell Claude which field holds it'
    );
  }
  return replyText;
}

async function tick() {
  const state = await loadState();
  try {
    const agents = await fetchActiveSessions();
    if (agents.length === 0) {
      console.log('[bridge] no labeled active sessions this tick.');
      return;
    }
    const synced = await syncPresence(agents);
    console.log(`[bridge] presence synced: ${agents.map(a => a.display_name).join(', ')}`);

    for (const { account_id: accountId } of synced) {
      const sessionKey = sessionKeyByAccountId.get(accountId);
      if (!sessionKey) continue;
      const afterId = state.cursors[accountId] ?? null;
      let pending;
      try {
        pending = await fetchPending(accountId, afterId);
      } catch (err) {
        console.error(`[bridge] pending fetch failed for ${accountId}:`, err.message);
        continue;
      }
      for (const msg of pending) {
        console.log(`[bridge] relaying message ${msg.message_id} into ${sessionKey}: "${msg.content.slice(0, 80)}"`);
        try {
          const replyText = await relayIntoSession(sessionKey, msg.content);
          await sendReply(accountId, msg.conversation_id, replyText);
          console.log(`[bridge] replied in conversation ${msg.conversation_id}.`);
        } catch (err) {
          console.error(`[bridge] failed to relay message ${msg.message_id}:`, err.message);
          // Don't advance the cursor past a message we failed to answer --
          // it'll be retried next tick instead of silently dropped.
          break;
        }
        state.cursors[accountId] = msg.message_id;
      }
    }
  } catch (err) {
    console.error('[bridge] tick failed:', err instanceof Error ? err.message : err);
  } finally {
    await saveState(state);
  }
}

console.log(`[bridge] starting. Polling "${OPENCLAW_BIN} sessions" every ${POLL_INTERVAL_MS}ms, reporting to ${API_BASE}.`);
console.log(`[bridge] state file: ${STATE_FILE}`);
await tick();
const interval = setInterval(tick, POLL_INTERVAL_MS);

process.on('SIGINT', () => {
  console.log('\n[bridge] shutting down.');
  clearInterval(interval);
  process.exit(0);
});
