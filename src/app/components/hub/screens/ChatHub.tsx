import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hash, Send, Users, Loader2, AlertCircle, Bot } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useHub } from '../../../context/HubContext';
import {
  backendApi,
  type AccountPresence,
  type SocialGlobalChatMessage,
} from '../../../services/backendApi';
import { chatChannels, type ChatChannel } from '../../../data/chatData';
import { BosunChatModal } from './BosunChatModal';

// ─── Helpers ─────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function avatarUrl(username: string) {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(username)}`;
}

function isConsecutive(
  msg: SocialGlobalChatMessage,
  prev: SocialGlobalChatMessage | undefined,
) {
  if (!prev) return false;
  if (msg.sender.account_id !== prev.sender.account_id) return false;
  return (
    new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() <
    3 * 60 * 1000
  );
}

// ─── Online Roster ────────────────────────────────────────

function OnlineRoster({ onUserClick }: { onUserClick: (account: AccountPresence) => void }) {
  const { currentTheme: t } = useApp();
  const { user } = useAuth();
  const [roster, setRoster] = useState<AccountPresence[]>([]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const { online } = await backendApi.getOnlinePresence();
        if (active) setRoster(online);
      } catch {
        // Presence poll failures are silent — they don't break the chat experience.
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 25_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Filter out the current user; show system accounts at the end.
  const others = roster.filter(p => p.account_id !== user?.id);
  const shown = others.slice(0, 6);

  return (
    <div style={{ borderTop: `1px solid ${t.border}` }}>
      <div className="flex items-center gap-1.5 px-3 py-2">
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: '#22c55e' }}
        />
        <span className="text-[10px]" style={{ color: t.textMuted }}>
          {roster.length} online
        </span>
        <Users size={10} className="ml-auto" style={{ color: t.textMuted }} />
      </div>

      {shown.length > 0 && (
        <div className="px-2 pb-2 space-y-0.5">
          {shown.map(p => (
            <motion.button
              key={p.account_id}
              onClick={() => onUserClick(p)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
              style={{ background: 'transparent' }}
              title={
                p.is_system_account
                  ? `Chat with ${p.display_name}`
                  : `Message ${p.display_name}`
              }
            >
              <div className="relative flex-shrink-0">
                <img
                  src={avatarUrl(p.username)}
                  alt={p.display_name}
                  className="w-5 h-5 rounded-full"
                  style={{ border: `1px solid ${t.border}` }}
                />
                {p.is_system_account && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                    style={{ background: '#6384ff', border: `1px solid ${t.surface1}` }}
                  >
                    <Bot size={7} style={{ color: '#fff' }} />
                  </div>
                )}
              </div>
              <span
                className="text-[10px] truncate"
                style={{ color: p.is_system_account ? '#6384ff' : t.textMuted }}
              >
                {p.display_name}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Channel Button ───────────────────────────────────────

function ChannelButton({
  channel,
  active,
  onClick,
}: {
  channel: ChatChannel;
  active: boolean;
  onClick: () => void;
}) {
  const { currentTheme: t } = useApp();
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.97 }}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left"
      style={{
        background: active ? `${channel.color}15` : 'transparent',
        border: `1px solid ${active ? channel.color + '40' : 'transparent'}`,
      }}
    >
      <Hash
        size={13}
        style={{ color: active ? channel.color : t.textMuted, flexShrink: 0 }}
      />
      <span
        className="flex-1 text-xs"
        style={{ color: active ? channel.color : t.textMuted }}
      >
        {channel.name}
      </span>
    </motion.button>
  );
}

// ─── Message Row ─────────────────────────────────────────

function MessageRow({
  message,
  isMe,
  compact,
}: {
  message: SocialGlobalChatMessage;
  isMe: boolean;
  compact: boolean;
}) {
  const { currentTheme: t } = useApp();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''} ${compact ? 'mt-0.5' : 'mt-3'}`}
    >
      {!compact ? (
        <img
          src={avatarUrl(message.sender.username)}
          alt={message.sender.display_name}
          className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
          style={{ border: `1.5px solid ${t.border}` }}
        />
      ) : (
        <div className="w-7 flex-shrink-0" />
      )}

      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[72%]`}>
        {!compact && (
          <div
            className={`flex items-baseline gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}
          >
            <span
              className="text-[11px] font-medium"
              style={{ color: isMe ? t.accent : t.text }}
            >
              {isMe ? 'You' : message.sender.display_name}
            </span>
            {message.sender.is_system_account && (
              <span
                className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded"
                style={{ background: '#6384ff20', color: '#6384ff' }}
              >
                <Bot size={8} />
                AI
              </span>
            )}
            <span className="text-[10px]" style={{ color: t.textMuted }}>
              {formatTime(message.created_at)}
            </span>
          </div>
        )}

        <div
          className="px-3 py-2 rounded-xl text-xs leading-relaxed"
          style={{
            background: isMe ? `${t.accent}20` : t.surface2,
            border: `1px solid ${t.border}`,
            color: t.text,
          }}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}

// ─── ChatHub ──────────────────────────────────────────────

export function ChatHub() {
  const { currentTheme: t } = useApp();
  const { user } = useAuth();
  const { setCurrentView } = useHub();

  const [activeChannelId, setActiveChannelId] = useState(chatChannels[0].id);
  const [messages, setMessages] = useState<SocialGlobalChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [bosunChatWith, setBosunChatWith] = useState<AccountPresence | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  // Tracks the highest message_id we've rendered — used as the after_id poll
  // cursor so each poll only fetches new messages, not the full history.
  const maxMessageIdRef = useRef<number>(0);
  // Keeps a stable reference to the current channel for the poll closure.
  const activeChannelRef = useRef(activeChannelId);
  activeChannelRef.current = activeChannelId;

  const isBackendUser = user?.source === 'backend';

  const loadMessages = useCallback(
    async (channel: string, initial: boolean) => {
      try {
        const afterId = initial ? undefined : (maxMessageIdRef.current > 0 ? maxMessageIdRef.current : undefined);
        const { messages: fetched } = await backendApi.getGlobalChatMessages(
          channel,
          afterId,
        );

        if (initial) {
          setMessages(fetched);
          setError(null);
        } else if (fetched.length > 0) {
          setMessages(prev => [...prev, ...fetched]);
        }

        if (fetched.length > 0) {
          const maxId = Math.max(...fetched.map(m => m.message_id));
          if (maxId > maxMessageIdRef.current) maxMessageIdRef.current = maxId;
        }
      } catch (err) {
        if (initial) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load messages. Check your connection.',
          );
        }
      } finally {
        if (initial) setLoading(false);
      }
    },
    [],
  );

  // Load on channel change, then poll for new messages every 3 s.
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    maxMessageIdRef.current = 0;
    void loadMessages(activeChannelId, true);

    const id = setInterval(() => {
      if (activeChannelRef.current === activeChannelId) {
        void loadMessages(activeChannelId, false);
      }
    }, 3_000);

    return () => clearInterval(id);
  }, [activeChannelId, loadMessages]);

  // Scroll to bottom whenever new messages arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !isBackendUser || sending) return;
    setSending(true);
    setInputText('');
    try {
      const { message } = await backendApi.postGlobalChatMessage(
        activeChannelId,
        text,
      );
      setMessages(prev => [...prev, message]);
      if (message.message_id > maxMessageIdRef.current) {
        maxMessageIdRef.current = message.message_id;
      }
    } catch (err) {
      setInputText(text); // restore on failure so the user doesn't lose their draft
      setError(
        err instanceof Error ? err.message : 'Failed to send message.',
      );
    } finally {
      setSending(false);
    }
  };

  // Called when a user in the online roster is clicked: start or open a DM,
  // then navigate to the Messages view. The conversation list there will
  // include the newly created (or already existing) conversation.
  const handleDmUser = async (accountId: string) => {
    if (!isBackendUser) return;
    try {
      await backendApi.startConversation(accountId);
    } catch {
      // If startConversation fails (e.g. own account, or network), still navigate
      // to Messages so the user lands on their existing conversations.
    }
    setCurrentView('messages');
  };

  // System accounts (Bosun) don't participate in the generic DM backend --
  // nothing there ever replies as them. Route those clicks to a dedicated
  // chat surface that hits /bosun/chat directly instead.
  const handleRosterUserClick = (account: AccountPresence) => {
    if (account.is_system_account) {
      setBosunChatWith(account);
      return;
    }
    void handleDmUser(account.account_id);
  };

  const activeChannel =
    chatChannels.find(c => c.id === activeChannelId) ?? chatChannels[0];

  return (
    <div className="flex h-full overflow-hidden" style={{ background: t.bg }}>

      {/* ── Channel sidebar + online roster ──────────────────── */}
      <div
        className="flex flex-col w-44 flex-shrink-0"
        style={{ background: t.surface1, borderRight: `1px solid ${t.border}` }}
      >
        {/* Sidebar header */}
        <div
          className="px-3 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-1.5">
            <Hash size={12} style={{ color: t.accent }} />
            <span className="text-xs font-medium" style={{ color: t.text }}>
              Channels
            </span>
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {chatChannels.map(ch => (
            <ChannelButton
              key={ch.id}
              channel={ch}
              active={ch.id === activeChannelId}
              onClick={() => setActiveChannelId(ch.id)}
            />
          ))}
        </div>

        {/* Online roster — real presence data, polls every 25 s */}
        <OnlineRoster onUserClick={handleRosterUserClick} />
      </div>

      {/* ── Message pane ─────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Channel header */}
        <div
          className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${t.border}`, background: t.surface1 }}
        >
          <Hash size={14} style={{ color: activeChannel.color }} />
          <span className="text-sm font-medium" style={{ color: t.text }}>
            {activeChannel.name}
          </span>
          <span className="text-xs" style={{ color: t.textMuted }}>
            — {activeChannel.description}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2
                size={18}
                style={{ color: t.textMuted }}
                className="animate-spin"
              />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <AlertCircle
                size={20}
                style={{ color: t.textMuted, opacity: 0.5 }}
              />
              <p className="text-xs text-center" style={{ color: t.textMuted }}>
                {error}
              </p>
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-32"
            >
              <Hash size={24} style={{ color: t.textMuted, opacity: 0.3 }} />
              <p className="text-xs mt-2" style={{ color: t.textMuted }}>
                No messages yet. Be the first to say something!
              </p>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <MessageRow
                  key={msg.message_id}
                  message={msg}
                  isMe={msg.sender.account_id === user?.id}
                  compact={isConsecutive(msg, messages[idx - 1])}
                />
              ))}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="flex flex-col gap-1.5 px-4 py-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${t.border}`, background: t.surface1 }}
        >
          {!isBackendUser && (
            <p className="text-[10px]" style={{ color: t.textMuted }}>
              Sign in to a real account to post in global chat.
            </p>
          )}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center flex-1 gap-2 rounded-xl px-3 py-2"
              style={{
                background: t.surface2,
                border: `1px solid ${t.border}`,
                opacity: isBackendUser ? 1 : 0.5,
              }}
            >
              <Hash size={11} style={{ color: t.textMuted }} />
              <input
                type="text"
                placeholder={
                  isBackendUser
                    ? `Message #${activeChannel.name}…`
                    : 'Sign in to chat…'
                }
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={!isBackendUser || sending}
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: t.text }}
              />
            </div>
            <motion.button
              onClick={() => void handleSend()}
              disabled={!inputText.trim() || !isBackendUser || sending}
              whileHover={{
                scale: inputText.trim() && isBackendUser && !sending ? 1.05 : 1,
              }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  inputText.trim() && isBackendUser ? t.accent : t.surface3,
                color:
                  inputText.trim() && isBackendUser ? t.bg : t.textMuted,
                opacity: inputText.trim() && isBackendUser ? 1 : 0.5,
              }}
            >
              {sending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {bosunChatWith && (
        <BosunChatModal
          account={bosunChatWith}
          onClose={() => setBosunChatWith(null)}
        />
      )}
    </div>
  );
}
