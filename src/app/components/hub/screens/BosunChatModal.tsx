import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, Bot, BrainCircuit } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { backendApi, type AccountPresence } from '../../../services/backendApi';
import { useModalA11y } from '../../../hooks/useModalA11y';

interface Turn {
  id: string;
  role: 'user' | 'bosun';
  text: string;
  rememberedAboutMe?: boolean;
  proposedForEveryone?: boolean;
}

function avatarUrl(username: string) {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(username)}`;
}

/**
 * A live chat surface for Bosun, 01Deck's shared platform agent — calls
 * POST /bosun/chat directly (not the generic /messages/* DM flow, which has
 * no way to make anyone reply). There is no history endpoint: Bosun's own
 * tiered memory persists server-side across sessions, but the visible
 * transcript here is session-local and resets on close/reload.
 */
export function BosunChatModal({
  account,
  onClose,
}: {
  account: AccountPresence;
  onClose: () => void;
}) {
  const { currentTheme: t } = useApp();
  const { user } = useAuth();
  const isBackendUser = user?.source === 'backend';

  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberAboutMe, setRememberAboutMe] = useState(false);
  const [rememberForEveryone, setRememberForEveryone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const panelRef = useModalA11y<HTMLDivElement>({
    isOpen: true,
    onClose,
    closeOnEscape: true,
    initialFocusSelector: 'textarea',
  });

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !isBackendUser || sending) return;
    setError(null);
    setSending(true);
    setInputText('');
    setTurns(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', text }]);
    try {
      const reply = await backendApi.bosunChat(text, {
        rememberAboutMe,
        rememberForEveryone,
      });
      setTurns(prev => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bosun',
          text: reply.text,
          rememberedAboutMe: reply.remembered_about_me,
          proposedForEveryone: reply.proposed_for_everyone,
        },
      ]);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } catch (err) {
      setInputText(text); // restore the draft so the user doesn't lose it
      setError(err instanceof Error ? err.message : 'Bosun could not be reached.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Chat with ${account.display_name}`}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col"
        style={{
          width: '100%',
          maxWidth: 440,
          height: 560,
          maxHeight: '85vh',
          background: t.surface1,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          boxSizing: 'border-box',
          outline: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="relative flex-shrink-0">
            <img
              src={avatarUrl(account.username)}
              alt={account.display_name}
              className="w-8 h-8 rounded-full"
              style={{ border: `1px solid ${t.border}` }}
            />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
              style={{ background: '#6384ff', border: `1px solid ${t.surface1}` }}
            >
              <Bot size={8} style={{ color: '#fff' }} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate" style={{ color: t.text }}>
              {account.display_name}
            </div>
            <div className="text-[10px]" style={{ color: '#6384ff' }}>
              01Deck's platform agent
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ color: t.textMuted }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {turns.length === 0 && (
            <div className="text-xs text-center pt-8" style={{ color: t.textMuted }}>
              Say hello — this conversation isn't saved once you close it, but
              anything you ask Bosun to remember sticks around across sessions.
            </div>
          )}
          {turns.map(turn => (
            <div
              key={turn.id}
              className="flex flex-col"
              style={{ alignItems: turn.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div
                className="px-3 py-2 rounded-2xl text-sm"
                style={{
                  maxWidth: '85%',
                  background: turn.role === 'user' ? t.accent : t.surface2,
                  color: turn.role === 'user' ? t.bg : t.text,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {turn.text}
              </div>
              {(turn.rememberedAboutMe || turn.proposedForEveryone) && (
                <div
                  className="flex items-center gap-1 mt-1 text-[10px]"
                  style={{ color: '#6384ff' }}
                >
                  <BrainCircuit size={10} />
                  {turn.rememberedAboutMe && turn.proposedForEveryone
                    ? 'Remembered about you, proposed for everyone'
                    : turn.rememberedAboutMe
                      ? 'Remembered about you'
                      : 'Proposed as shared knowledge (pending review)'}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 flex-shrink-0"
            >
              <div
                className="text-xs px-3 py-2 rounded-lg mb-2"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
              >
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isBackendUser ? (
          <div
            className="px-4 py-3 text-xs text-center flex-shrink-0"
            style={{ borderTop: `1px solid ${t.border}`, color: t.textMuted }}
          >
            Sign in to talk to Bosun.
          </div>
        ) : (
          <div className="flex-shrink-0" style={{ borderTop: `1px solid ${t.border}` }}>
            {/* Remember toggles */}
            <div className="flex items-center gap-3 px-4 pt-2 text-[10px]" style={{ color: t.textMuted }}>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberAboutMe}
                  onChange={e => setRememberAboutMe(e.target.checked)}
                />
                Remember this about me
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberForEveryone}
                  onChange={e => setRememberForEveryone(e.target.checked)}
                />
                Propose for everyone
              </label>
            </div>

            <div className="flex items-end gap-2 px-4 py-3">
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={`Message ${account.display_name}...`}
                rows={1}
                disabled={sending}
                className="flex-1 resize-none text-sm px-3 py-2 rounded-xl outline-none"
                style={{
                  background: t.surface2,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  maxHeight: 100,
                }}
              />
              <motion.button
                onClick={() => void handleSend()}
                disabled={!inputText.trim() || sending}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: inputText.trim() ? t.accent : t.surface3,
                  color: inputText.trim() ? t.bg : t.textMuted,
                  opacity: inputText.trim() ? 1 : 0.5,
                }}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
