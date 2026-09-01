import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';

type Tab = 'signin' | 'signup';

interface FieldState {
  value: string;
  touched: boolean;
}

function field(value = ''): FieldState {
  return { value, touched: false };
}

function touch(f: FieldState): FieldState {
  return { ...f, touched: true };
}

function set(f: FieldState, value: string): FieldState {
  return { ...f, value };
}

// ---- Validation helpers ----
function validateUsername(v: string): string | null {
  if (v.length < 3) return 'At least 3 characters';
  if (!/^[a-z0-9_]+$/i.test(v)) return 'Letters, numbers, and underscores only';
  return null;
}

function validatePassword(v: string): string | null {
  if (v.length < 6) return 'At least 6 characters';
  return null;
}

// ---- Shared input style ----
const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  background: '#181818',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
  padding: '0 16px',
  color: '#ffffff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

function FieldError({ msg, show }: { msg: string | null; show: boolean }) {
  if (!show || !msg) return null;
  return <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{msg}</p>;
}

export function AuthModal() {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState<Tab>('signin');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Sign-in fields
  const [siUsername, setSiUsername] = useState(field());
  const [siPassword, setSiPassword] = useState(field());

  // Sign-up fields
  const [suUsername, setSuUsername] = useState(field());
  const [suDisplayName, setSuDisplayName] = useState(field());
  const [suPassword, setSuPassword] = useState(field());
  const [suConfirm, setSuConfirm] = useState(field());

  const resetErrors = () => {
    setServerError(null);
    setSubmitAttempted(false);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    resetErrors();
  };

  // ---- Sign In ----
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!siUsername.value.trim() || !siPassword.value) return;

    setSubmitting(true);
    setServerError(null);
    const result = await login(siUsername.value.trim(), siPassword.value);
    setSubmitting(false);
    if (!result.success) setServerError(result.error ?? 'Login failed');
  };

  // ---- Sign Up ----
  const suUsernameErr = validateUsername(suUsername.value);
  const suPasswordErr = validatePassword(suPassword.value);
  const suConfirmErr = suConfirm.value !== suPassword.value ? 'Passwords do not match' : null;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    // Touch all fields so errors show
    setSuUsername(touch(suUsername));
    setSuDisplayName(touch(suDisplayName));
    setSuPassword(touch(suPassword));
    setSuConfirm(touch(suConfirm));

    if (suUsernameErr || suPasswordErr || suConfirmErr) return;

    setSubmitting(true);
    setServerError(null);
    const result = await signup(suUsername.value.trim(), suDisplayName.value.trim(), suPassword.value);
    setSubmitting(false);
    if (!result.success) setServerError(result.error ?? 'Signup failed');
  };

  // ---- Guest ----
  const { signup: signupFn } = useAuth();
  const guestRef = useRef(false);

  const handleGuest = async () => {
    if (guestRef.current) return;
    guestRef.current = true;
    const suffix = Math.random().toString(36).slice(2, 6);
    const guestUsername = 'guest_' + suffix;
    await signupFn(guestUsername, 'Agent Guest', Math.random().toString(36).slice(2, 14));
  };

  // ---- Shared show-error logic ----
  const showErr = (f: FieldState) => f.touched || submitAttempted;

  // This overlay is a mandatory gate (there's no route or content behind it
  // to return to), so it never closes on Escape — but it still needs dialog
  // semantics, a focus trap (nothing behind it should be tab-reachable),
  // and initial focus so keyboard/screen-reader users land inside it.
  const panelRef = useModalA11y<HTMLDivElement>({
    isOpen: true,
    closeOnEscape: false,
    initialFocusSelector: 'input',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="01Deck sign in"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          padding: 32,
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              color: '#ffffff',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '0.3em',
              marginBottom: 6,
            }}
          >
            01DECK
          </div>
          <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '0.05em' }}>
            Agent Authentication Protocol
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Sign in or create account"
          style={{
            display: 'flex',
            gap: 24,
            marginBottom: 24,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {(['signin', 'signup'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => switchTab(t)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 0 10px',
                fontSize: 13,
                fontWeight: 500,
                color: tab === t ? '#ffffff' : '#6b7280',
                borderBottom: tab === t ? '2px solid #ffffff' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Server error */}
        {serverError && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#ef4444',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {serverError}
          </div>
        )}

        {/* ---- SIGN IN FORM ---- */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <input
                style={inputStyle}
                placeholder="Username"
                autoComplete="username"
                value={siUsername.value}
                onChange={e => setSiUsername(set(siUsername, e.target.value))}
                onBlur={() => siUsername.value.trim() && setSiUsername(touch(siUsername))}
                disabled={submitting}
              />
              {showErr(siUsername) && !siUsername.value.trim() && (
                <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>Username is required</p>
              )}
            </div>

            <div>
              <input
                type="password"
                style={inputStyle}
                placeholder="Password"
                autoComplete="current-password"
                value={siPassword.value}
                onChange={e => setSiPassword(set(siPassword, e.target.value))}
                onBlur={() => siPassword.value && setSiPassword(touch(siPassword))}
                disabled={submitting}
              />
              {showErr(siPassword) && !siPassword.value && (
                <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>Password is required</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                height: 44,
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                marginTop: 4,
                transition: 'opacity 0.15s',
              }}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ---- SIGN UP FORM ---- */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <input
                style={inputStyle}
                placeholder="Username (letters, numbers, underscores)"
                autoComplete="username"
                value={suUsername.value}
                onChange={e => setSuUsername(set(suUsername, e.target.value.toLowerCase()))}
                onBlur={() => setSuUsername(touch(suUsername))}
                disabled={submitting}
              />
              <FieldError msg={suUsernameErr} show={showErr(suUsername)} />
            </div>

            <div>
              <input
                style={inputStyle}
                placeholder="Display Name"
                autoComplete="name"
                value={suDisplayName.value}
                onChange={e => setSuDisplayName(set(suDisplayName, e.target.value))}
                onBlur={() => setSuDisplayName(touch(suDisplayName))}
                disabled={submitting}
              />
            </div>

            <div>
              <input
                type="password"
                style={inputStyle}
                placeholder="Password (min 6 characters)"
                autoComplete="new-password"
                value={suPassword.value}
                onChange={e => setSuPassword(set(suPassword, e.target.value))}
                onBlur={() => setSuPassword(touch(suPassword))}
                disabled={submitting}
              />
              <FieldError msg={suPasswordErr} show={showErr(suPassword)} />
            </div>

            <div>
              <input
                type="password"
                style={inputStyle}
                placeholder="Confirm Password"
                autoComplete="new-password"
                value={suConfirm.value}
                onChange={e => setSuConfirm(set(suConfirm, e.target.value))}
                onBlur={() => setSuConfirm(touch(suConfirm))}
                disabled={submitting}
              />
              <FieldError msg={suConfirmErr} show={showErr(suConfirm)} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                height: 44,
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                marginTop: 4,
                transition: 'opacity 0.15s',
              }}
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Guest link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            type="button"
            onClick={handleGuest}
            aria-label="Continue without an account as a guest"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: 12,
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => ((e.target as HTMLButtonElement).style.textDecoration = 'underline')}
            onMouseLeave={e => ((e.target as HTMLButtonElement).style.textDecoration = 'none')}
          >
            Continue as Guest →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
