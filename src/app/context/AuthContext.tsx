import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  displayName: string;
  joinedAt: number;
  xp: number;
  level: number;
}

// Password storage formats. `Pbkdf2PasswordHash` is what every new signup
// and every migrated login now produces; a bare `string` is the legacy
// format (see legacyHashPassword below) still present for accounts created
// before this change. Both are handled on login — see login() — so existing
// accounts keep working without a forced reset.
interface Pbkdf2PasswordHash {
  algo: 'pbkdf2-sha256';
  hash: string; // hex-encoded derived bits
  salt: string; // base64-encoded random salt, per user
  iterations: number;
}

interface StoredUserRecord extends User {
  passwordHash: string | Pbkdf2PasswordHash;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, displayName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  awardXP: (amount: number) => void;
}

const USERS_KEY = '01deck_users';
const SESSION_KEY = '01deck_session';
const ATTEMPTS_KEY = '01deck_login_attempts';

// ---------------------------------------------------------------------------
// Password hashing
//
// Previously this was `btoa(username + ':' + password)` — base64 is an
// encoding, not a hash; it is trivially reversible and stored the plaintext
// password in disguise. Every new signup, and every successful login against
// a legacy record, now uses PBKDF2-SHA256 with a random per-user salt via
// WebCrypto, following the same pattern already used for encryption keys in
// src/ondeck/lib/crypto.ts's deriveAesKeyFromPassphrase.
// ---------------------------------------------------------------------------

const PBKDF2_ITERATIONS = 150_000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Non-reversible, salted password hash. Derives 256 bits via PBKDF2-SHA256. */
async function derivePbkdf2Hash(password: string, saltB64?: string): Promise<Pbkdf2PasswordHash> {
  const encoder = new TextEncoder();
  const saltBytes = saltB64 ? base64ToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );

  return {
    algo: 'pbkdf2-sha256',
    hash: bytesToHex(new Uint8Array(derivedBits)),
    salt: bytesToBase64(saltBytes),
    iterations: PBKDF2_ITERATIONS,
  };
}

async function verifyPbkdf2Hash(password: string, record: Pbkdf2PasswordHash): Promise<boolean> {
  const attempt = await derivePbkdf2Hash(password, record.salt);
  // Not a constant-time comparison — a real timing-safe compare (and real
  // protection against offline guessing at all) needs server-side auth;
  // this is a client-only, best-effort improvement over plaintext-in-disguise.
  return attempt.hash === record.hash;
}

/** Legacy, reversible "hash" — base64 is an encoding, not a hash. Kept only to verify pre-migration accounts on login; see login()'s migration step below. */
function legacyHashPassword(username: string, password: string): string {
  return btoa(username.toLowerCase() + ':' + password);
}

// ---------------------------------------------------------------------------
// Secure-ish random ids
//
// Previously `Math.random().toString(36)...` — Math.random is not a
// cryptographically secure PRNG (predictable, not suitable for anything
// identity-adjacent). Every id below now comes from crypto.getRandomValues.
// ---------------------------------------------------------------------------

function generateSecureId(byteLength = 8): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

// ---------------------------------------------------------------------------
// Login throttling
//
// UX speed bump only, not real rate-limiting: this runs entirely in the
// browser, so a determined attacker can simply call login()/the underlying
// verify functions directly (e.g. from devtools) and bypass this cooldown
// completely. Real brute-force protection has to be enforced server-side.
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30_000;

interface AttemptRecord {
  count: number;
  lockedUntil?: number;
}

function readAttempts(): Record<string, AttemptRecord> {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAttempts(data: Record<string, AttemptRecord>): void {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(data));
}

function checkThrottle(username: string): { blocked: boolean; retryAfterMs: number } {
  const record = readAttempts()[username];
  if (!record?.lockedUntil) return { blocked: false, retryAfterMs: 0 };
  const remaining = record.lockedUntil - Date.now();
  if (remaining <= 0) return { blocked: false, retryAfterMs: 0 };
  return { blocked: true, retryAfterMs: remaining };
}

function recordFailedAttempt(username: string): void {
  const attempts = readAttempts();
  const record = attempts[username] ?? { count: 0 };
  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + COOLDOWN_MS;
    record.count = 0;
  }
  attempts[username] = record;
  writeAttempts(attempts);
}

function clearFailedAttempts(username: string): void {
  const attempts = readAttempts();
  if (attempts[username]) {
    delete attempts[username];
    writeAttempts(attempts);
  }
}

// ---------------------------------------------------------------------------

function readUsers(): StoredUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUserRecord[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Session expiry — client-only best-effort hardening. The session object in
// localStorage has no signature, so any script with page access can still
// forge or edit it into an arbitrary user; a real fix needs server-issued,
// signed/opaque sessions. What we *can* do client-side is stop a stale or
// silently-edited session from being trusted forever — an expiry that's
// checked and enforced on every read at least bounds how long a forged or
// leaked session object stays useful, and gives "sign out everywhere" a
// point to check against as this app grows a real backend.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface StoredSession {
  user: User;
  expiresAt: number;
}

function readSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Legacy format: the bare User object, written with no expiry at all
    // (from before this hardening pass). There's no way to know how old it
    // really is, so it's honored once rather than forcing every existing
    // logged-in user out on the next deploy — the initial useState below
    // immediately re-writes it via writeSession, upgrading it to the
    // expiring format from that point on.
    if (typeof parsed.id === 'string' && !('expiresAt' in parsed)) {
      return parsed as User;
    }

    const session = parsed as Partial<StoredSession>;
    if (!session.user || typeof session.expiresAt !== 'number') {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (Date.now() >= session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const user = session.user;
    return user && typeof user === 'object' && user.id ? user : null;
  } catch {
    return null;
  }
}

function writeSession(user: User | null): void {
  if (user === null) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    const session: StoredSession = { user, expiresAt: Date.now() + SESSION_TTL_MS };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

function calcLevel(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Re-writing a still-valid session on load both upgrades any legacy
  // (pre-expiry) session record to the new format and slides the expiry
  // forward from "last time the app was opened" rather than a fixed point
  // from login — a reasonable client-only approximation of "stay signed in
  // while active".
  const [user, setUser] = useState<User | null>(() => {
    const existing = readSession();
    if (existing) writeSession(existing);
    return existing;
  });

  const login = useCallback(async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = username.toLowerCase();

    const throttle = checkThrottle(cleanUsername);
    if (throttle.blocked) {
      const seconds = Math.ceil(throttle.retryAfterMs / 1000);
      return { success: false, error: `Too many failed attempts. Try again in ${seconds}s.` };
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.username === cleanUsername);
    if (idx === -1) {
      recordFailedAttempt(cleanUsername);
      return { success: false, error: 'Invalid username or password' };
    }

    const found = users[idx];
    let passwordOk: boolean;
    let needsMigration = false;

    if (typeof found.passwordHash === 'string') {
      // Legacy btoa record — verify against it, then transparently upgrade
      // this account to PBKDF2 below on success.
      passwordOk = found.passwordHash === legacyHashPassword(cleanUsername, password);
      needsMigration = passwordOk;
    } else {
      passwordOk = await verifyPbkdf2Hash(password, found.passwordHash);
    }

    if (!passwordOk) {
      recordFailedAttempt(cleanUsername);
      return { success: false, error: 'Invalid username or password' };
    }

    clearFailedAttempts(cleanUsername);

    if (needsMigration) {
      const migratedHash = await derivePbkdf2Hash(password);
      const latestUsers = readUsers();
      const latestIdx = latestUsers.findIndex(u => u.username === cleanUsername);
      if (latestIdx !== -1) {
        latestUsers[latestIdx] = { ...latestUsers[latestIdx], passwordHash: migratedHash };
        writeUsers(latestUsers);
      }
    }

    const sessionUser: User = {
      id: found.id,
      username: found.username,
      displayName: found.displayName,
      joinedAt: found.joinedAt,
      xp: found.xp,
      level: found.level,
    };
    writeSession(sessionUser);
    setUser(sessionUser);
    return { success: true };
  }, []);

  const signup = useCallback(async (
    username: string,
    displayName: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = username.toLowerCase().trim();

    if (cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (cleanUsername.length > 64) {
      return { success: false, error: 'Username must be 64 characters or fewer' };
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return { success: false, error: 'Username may only contain letters, numbers, and underscores' };
    }
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }
    if (!isPasswordComplexEnough(password)) {
      return { success: false, error: 'Password must include at least two of: lowercase, uppercase, numbers, symbols' };
    }

    const users = readUsers();
    if (users.some(u => u.username === cleanUsername)) {
      return { success: false, error: 'Username already taken' };
    }

    const newUser: StoredUserRecord = {
      id: generateSecureId(),
      username: cleanUsername,
      displayName: displayName.trim() || cleanUsername,
      joinedAt: Date.now(),
      xp: 0,
      level: 1,
      passwordHash: await derivePbkdf2Hash(password),
    };

    writeUsers([...users, newUser]);

    const sessionUser: User = {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      joinedAt: newUser.joinedAt,
      xp: newUser.xp,
      level: newUser.level,
    };
    writeSession(sessionUser);
    setUser(sessionUser);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const awardXP = useCallback((amount: number) => {
    setUser(prev => {
      if (!prev) return prev;
      const newXp = prev.xp + amount;
      const newLevel = calcLevel(newXp);
      const updated: User = { ...prev, xp: newXp, level: newLevel };

      // Persist to session
      writeSession(updated);

      // Persist to users store
      const users = readUsers();
      const idx = users.findIndex(u => u.username === updated.username);
      if (idx !== -1) {
        users[idx] = { ...users[idx], xp: newXp, level: newLevel };
        writeUsers(users);
      }

      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, signup, logout, awardXP }}>
      {children}
    </AuthContext.Provider>
  );
}

// Basic complexity check, not just length: requires characters from at least
// two of {lowercase, uppercase, digit, symbol}. This is a floor, not a real
// strength meter — it stops the weakest same-charset passwords (all lower,
// all digits) without demanding a specific character-class combination.
function isPasswordComplexEnough(password: string): boolean {
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];
  const matched = classes.filter(re => re.test(password)).length;
  return matched >= 2;
}
