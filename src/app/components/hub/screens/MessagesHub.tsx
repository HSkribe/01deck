import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Send, Plus, X, Search, Loader2, AlertCircle, Bot } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import {
  backendApi,
  type AccountPresence,
  type SocialDirectConversation,
  type SocialDirectMessage,
} from '../../../services/backendApi';

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function avatarUrl(username: string) {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(username)}`;
}

// ─── New Conversation Modal ───────────────────────────────

function NewConvoModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (accountId: string, displayName: string) => void;
}) {
  const { currentTheme: t } = useApp();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [online, setOnline] = useState<AccountPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const { online: users } = await backendApi.getOnlinePresence();
        setOnline(users.filter(u => u.account_id !== user?.id));
      } catch {
        // If presence is unreachable, show empty list with a note rather than crash.
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const filtered = online.filter(
    u =>
      u.display_name.toLowerCase().includes(q.toLowerCase()) ||
      u.username.toLowerCase().includes(q.toLowerCase()),
  );

  const handleSelect = async (account: AccountPresence) => {
    setStarting(account.account_id);
    setError(null);
    try {
      await backendApi.startConversation(account.account_id);
      onStart(account.account_id, account.display_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start conversation.');
      setStarting(null);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: t.surface1, border: `1px solid ${t.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${t.border}`, background: t.surface2 }}
        >
          <span className="text-sm font-medium" style={{ color: t.text }}>
            New Message
          </span>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            style={{ color: t.textMuted }}
          >
            <X size={14} />
          </motion.button>
        </div>

        <div className="p-4 space-y-3">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: t.surface2, border: `1px solid ${t.border}` }}
          >
            <Search size={12} style={{ color: t.textMuted }} />
            <input
              type="text"
              placeholder="Search online users…"
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: t.text }}
            />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          <div className="space-y-1 max-h-52 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} style={{ color: t.textMuted }} className="animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: t.textMuted }}>
                {online.length === 0
                  ? 'No other users are online right now.'
                  : 'No users match your search.'}
              </p>
            ) : (
              filtered.map(account => (
                <motion.button
                  key={account.account_id}
                  onClick={() => void handleSelect(account)}
                  disabled={starting === account.account_id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: t.surface2 }}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={avatarUrl(account.username)}
                      alt={account.display_name}
                      className="w-8 h-8 rounded-full"
                      style={{ border: `1.5px solid ${t.border}` }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-2 h-2 rounded-full border"
                      style={{ background: '#22c55e', borderColor: t.surface1 }}
                    />
                    {account.is_system_account && (
                      <div
                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                        style={{ background: '#6384ff', border: `1px solid ${t.surface1}` }}
                      >
                        <Bot size={8} style={{ color: '#fff' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-xs font-medium" style={{ color: t.text }}>
                      {account.display_name}
                    </div>
                    <div className="text-[10px]" style={{ color: t.textMuted }}>
                      @{account.username}
                      {account.is_system_account ? ' · System' : ''}
                    </div>
                  </div>
                  {starting === account.account_id && (
                    <Loader2 size={12} style={{ color: t.textMuted }} className="animate-spin" />
                  )}
                </motion.button>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Conversation List Item ───────────────────────────────

function ConvoItem({
  convo,
  active,
  onClick,
}: {
  convo: SocialDirectConversation;
  active: boolean;
  onClick: () => void;
}) {
  const { currentTheme: t } = useApp();
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
      style={{
        background: active ? `${t.accent}15` : 'transparent',
        border: `1px solid ${active ? t.accent + '40' : 'transparent'}`,
      }}
    >
      <div className="relative flex-shrink-0">
        <img
          src={avatarUrl(convo.other_participant.username)}
          alt={convo.other_participant.display_name}
          className="w-9 h-9 rounded-full"
          style={{ border: `1.5px solid ${active ? t.accent : t.border}` }}
        />
        {convo.other_participant.is_system_account && (
          <div
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{ background: '#6384ff', border: `1px solid ${t.surface1}` }}
          >
            <Bot size={8} style={{ color: '#fff' }} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: t.text }}>
            {convo.other_participant.display_name}
          </span>
          <span className="text-[9px]" style={{ color: t.textMuted }}>
            {timeAgo(convo.last_message_at)}
          </span>
        </div>
        {convo.last_message_preview && (
          <p className="text-[11px] truncate mt-0.5" style={{ color: t.textMuted }}>
            {convo.last_message_preview}
          </p>
        )}
      </div>
    </motion.button>
  );
}

// ─── Message Bubble ───────────────────────────────────────

function Bubble({
  msg,
  currentUserId,
  otherParticipant,
}: {
  msg: SocialDirectMessage;
  currentUserId: string;
  otherParticipant: AccountPresence;
}) {
  const { currentTheme: t } = useApp();
  const isMe = msg.sender.account_id === currentUserId;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} mt-2`}
    >
      {!isMe && (
        <img
          src={avatarUrl(otherParticipant.username)}
          alt={otherParticipant.display_name}
          className="w-6 h-6 rounded-full flex-shrink-0 mt-1"
          style={{ border: `1.5px solid ${t.border}` }}
        />
      )}
      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div
          className="px-3 py-2 rounded-xl text-xs leading-relaxed"
          style={{
            background: isMe ? `${t.accent}22` : t.surface2,
            border: `1px solid ${t.border}`,
            color: t.text,
          }}
        >
          {msg.content}
        </div>
        <span className="text-[9px] mt-0.5 px-1" style={{ color: t.textMuted }}>
          {formatTime(msg.created_at)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Conversation Detail ──────────────────────────────────

function ConvoDetail({
  convo,
  currentUserId,
}: {
  convo: SocialDirectConversation;
  currentUserId: string;
}) {
  const { currentTheme: t } = useApp();
  const [messages, setMessages] = useState<SocialDirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const maxMessageIdRef = useRef<number>(0);
  const convoIdRef = useRef(convo.conversation_id);
  convoIdRef.current = convo.conversation_id;

  const loadMessages = useCallback(async (convId: string, initial: boolean) => {
    try {
      const afterId = initial ? undefined : (maxMessageIdRef.current > 0 ? maxMessageIdRef.current : undefined);
      const { messages: fetched } = await backendApi.getDirectMessages(convId, afterId);
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
        setError(err instanceof Error ? err.message : 'Could not load messages.');
      }
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    maxMessageIdRef.current = 0;
    void loadMessages(convo.conversation_id, true);

    const id = setInterval(() => {
      if (convoIdRef.current === convo.conversation_id) {
        void loadMessages(convo.conversation_id, false);
      }
    }, 4_000);

    return () => clearInterval(id);
  }, [convo.conversation_id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, convo.conversation_id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const { message } = await backendApi.sendDirectMessage(convo.conversation_id, text);
      setMessages(prev => [...prev, message]);
      if (message.message_id > maxMessageIdRef.current) {
        maxMessageIdRef.current = message.message_id;
      }
    } catch (err) {
      setInput(text);
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, background: t.surface1 }}
      >
        <div className="relative">
          <img
            src={avatarUrl(convo.other_participant.username)}
            alt={convo.other_participant.display_name}
            className="w-8 h-8 rounded-full"
            style={{ border: `1.5px solid ${t.border}` }}
          />
          {convo.other_participant.is_system_account && (
            <div
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
              style={{ background: '#6384ff', border: `1px solid ${t.surface1}` }}
            >
              <Bot size={8} style={{ color: '#fff' }} />
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: t.text }}>
            {convo.other_participant.display_name}
          </div>
          {convo.other_participant.is_system_account && (
            <div className="text-[10px]" style={{ color: '#6384ff' }}>
              System account
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={16} style={{ color: t.textMuted }} className="animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <AlertCircle size={18} style={{ color: t.textMuted, opacity: 0.5 }} />
            <p className="text-xs text-center" style={{ color: t.textMuted }}>
              {error}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32">
            <Mail size={20} style={{ color: t.textMuted, opacity: 0.2 }} />
            <p className="text-xs mt-2" style={{ color: t.textMuted }}>
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <Bubble
              key={msg.message_id}
              msg={msg}
              currentUserId={currentUserId}
              otherParticipant={convo.other_participant}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${t.border}`, background: t.surface1 }}
      >
        <div
          className="flex items-center flex-1 gap-2 rounded-xl px-3 py-2"
          style={{ background: t.surface2, border: `1px solid ${t.border}` }}
        >
          <input
            type="text"
            placeholder={`Message ${convo.other_participant.display_name}…`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            disabled={sending}
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: t.text }}
          />
        </div>
        <motion.button
          onClick={() => void handleSend()}
          disabled={!input.trim() || sending}
          whileHover={{ scale: input.trim() && !sending ? 1.05 : 1 }}
          whileTap={{ scale: 0.95 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: input.trim() ? t.accent : t.surface3,
            color: input.trim() ? t.bg : t.textMuted,
            opacity: input.trim() ? 1 : 0.5,
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
  );
}

// ─── MessagesHub ─────────────────────────────────────────

export function MessagesHub() {
  const { currentTheme: t } = useApp();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<SocialDirectConversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [convosError, setConvosError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const isBackendUser = user?.source === 'backend';

  const fetchConversations = useCallback(async () => {
    if (!isBackendUser) return;
    try {
      const { conversations: convos } = await backendApi.getConversations();
      setConversations(convos);
      setConvosError(null);
    } catch (err) {
      setConvosError(
        err instanceof Error ? err.message : 'Could not load conversations.',
      );
    } finally {
      setLoadingConvos(false);
    }
  }, [isBackendUser]);

  useEffect(() => {
    if (!isBackendUser) {
      setLoadingConvos(false);
      return;
    }
    void fetchConversations();
  }, [fetchConversations, isBackendUser]);

  const activeConvo =
    conversations.find(c => c.conversation_id === activeConvoId) ?? null;
  const totalUnread = 0; // Unread counts are not in the DirectConversation schema

  const handleSelectConvo = (convo: SocialDirectConversation) => {
    setActiveConvoId(convo.conversation_id);
  };

  // After the modal calls startConversation successfully, refresh the list
  // and auto-select the conversation with the target account.
  const handleNewConvoStartedV2 = async (accountId: string) => {
    setShowNew(false);
    if (!isBackendUser) return;
    try {
      const { conversations: fresh } = await backendApi.getConversations();
      setConversations(fresh);
      // The conversation with this account will be in the list; find it.
      const target = fresh.find(
        c => c.other_participant.account_id === accountId,
      );
      if (target) setActiveConvoId(target.conversation_id);
      else if (fresh.length > 0) setActiveConvoId(fresh[0].conversation_id);
    } catch {
      // Ignore — user can click the conversation in the list.
    }
  };

  if (!isBackendUser) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ background: t.bg }}
      >
        <Mail size={32} style={{ color: t.textMuted, opacity: 0.25 }} />
        <p className="text-sm font-medium" style={{ color: t.text }}>
          Direct messages
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: t.textMuted }}>
          Sign in to a real account to send and receive direct messages.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: t.bg }}>

      {/* ── Conversation list ─────────────────────────── */}
      <div
        className="flex flex-col w-56 flex-shrink-0"
        style={{ background: t.surface1, borderRight: `1px solid ${t.border}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-1.5">
            <Mail size={12} style={{ color: t.accent }} />
            <span className="text-xs font-medium" style={{ color: t.text }}>
              Messages
            </span>
            {totalUnread > 0 && (
              <span
                className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: t.accent + '30', color: t.accent }}
              >
                {totalUnread}
              </span>
            )}
          </div>
          <motion.button
            onClick={() => setShowNew(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: t.surface2, color: t.textMuted }}
            title="New message"
          >
            <Plus size={12} />
          </motion.button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loadingConvos ? (
            <div className="flex justify-center py-8">
              <Loader2 size={16} style={{ color: t.textMuted }} className="animate-spin" />
            </div>
          ) : convosError ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 px-3">
              <AlertCircle size={16} style={{ color: t.textMuted, opacity: 0.5 }} />
              <p className="text-[10px] text-center" style={{ color: t.textMuted }}>
                {convosError}
              </p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32">
              <Mail size={20} style={{ color: t.textMuted, opacity: 0.3 }} />
              <p className="text-[10px] mt-2 text-center" style={{ color: t.textMuted }}>
                No conversations yet
              </p>
            </div>
          ) : (
            conversations.map(convo => (
              <ConvoItem
                key={convo.conversation_id}
                convo={convo}
                active={convo.conversation_id === activeConvoId}
                onClick={() => handleSelectConvo(convo)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Detail pane ───────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeConvo ? (
            <motion.div
              key={activeConvo.conversation_id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col h-full"
            >
              <ConvoDetail
                convo={activeConvo}
                currentUserId={user?.id ?? ''}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center flex-1"
            >
              <Mail size={32} style={{ color: t.textMuted, opacity: 0.25 }} />
              <p className="text-xs mt-3" style={{ color: t.textMuted }}>
                Select a conversation or start a new one
              </p>
              <motion.button
                onClick={() => setShowNew(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg mt-4"
                style={{ background: t.accent, color: t.bg }}
              >
                <Plus size={12} />
                New Message
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New conversation modal */}
      <AnimatePresence>
        {showNew && (
          <NewConvoModal
            onClose={() => setShowNew(false)}
            onStart={(accountId, _displayName) => void handleNewConvoStartedV2(accountId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
