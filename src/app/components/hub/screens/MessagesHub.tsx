import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Send, Plus, X, Search } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { getActiveApiKey, generateAgentCompletion } from '../../../services/llmClient';
import {
  Conversation, DirectMessage, DMUser,
  DM_ME, ALL_DM_USERS, seedConversations,
} from '../../../data/messagesData';

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

// ─── New Conversation Picker ──────────────────────────────

function NewConvoModal({
  existing,
  onClose,
  onSelect,
}: {
  existing: Conversation[];
  onClose: () => void;
  onSelect: (user: DMUser) => void;
}) {
  const { currentTheme: t } = useApp();
  const [q, setQ] = useState('');
  const existingIds = new Set(existing.map(c => c.participant.id));
  const available = ALL_DM_USERS.filter(
    u => !existingIds.has(u.id) && u.name.toLowerCase().includes(q.toLowerCase()),
  );

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
          <span className="text-sm font-medium" style={{ color: t.text }}>New Message</span>
          <motion.button onClick={onClose} whileHover={{ scale: 1.1 }} style={{ color: t.textMuted }}>
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
              placeholder="Search users…"
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: t.text }}
            />
          </div>

          <div className="space-y-1 max-h-52 overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: t.textMuted }}>No users found</p>
            ) : (
              available.map(user => (
                <motion.button
                  key={user.id}
                  onClick={() => onSelect(user)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: t.surface2 }}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                      style={{ border: `1.5px solid ${t.border}` }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-2 h-2 rounded-full border"
                      style={{ background: user.online ? '#22c55e' : '#6b7280', borderColor: t.surface1 }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-xs font-medium" style={{ color: t.text }}>{user.name}</div>
                    <div className="text-[10px]" style={{ color: t.textMuted }}>Lv.{user.level}</div>
                  </div>
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
  convo: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const { currentTheme: t } = useApp();
  const lastMsg = convo.messages[convo.messages.length - 1];
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
          src={convo.participant.avatar}
          alt={convo.participant.name}
          className="w-9 h-9 rounded-full"
          style={{ border: `1.5px solid ${active ? t.accent : t.border}` }}
        />
        <div
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border"
          style={{
            background: convo.participant.online ? '#22c55e' : '#6b7280',
            borderColor: t.surface1,
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: t.text }}>{convo.participant.name}</span>
          {lastMsg && (
            <span className="text-[9px]" style={{ color: t.textMuted }}>{timeAgo(lastMsg.timestamp)}</span>
          )}
        </div>
        {lastMsg && (
          <p className="text-[11px] truncate mt-0.5" style={{ color: t.textMuted }}>
            {lastMsg.senderId === 'me' ? 'You: ' : ''}{lastMsg.content}
          </p>
        )}
      </div>
      {convo.unread > 0 && (
        <span
          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
          style={{ background: t.accent, color: t.bg }}
        >
          {convo.unread}
        </span>
      )}
    </motion.button>
  );
}

// ─── Message Bubble ───────────────────────────────────────

function Bubble({ msg, participant }: { msg: DirectMessage; participant: DMUser }) {
  const { currentTheme: t } = useApp();
  const isMe = msg.senderId === 'me';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} mt-2`}
    >
      {!isMe && (
        <img
          src={participant.avatar}
          alt={participant.name}
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
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Conversation Detail ─────────────────────────────────

function ConvoDetail({
  convo,
  onSend,
}: {
  convo: Conversation;
  onSend: (convoId: string, text: string) => void;
}) {
  const { currentTheme: t } = useApp();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo.messages.length, convo.id]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(convo.id, input.trim());
    setInput('');
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
            src={convo.participant.avatar}
            alt={convo.participant.name}
            className="w-8 h-8 rounded-full"
            style={{ border: `1.5px solid ${t.border}` }}
          />
          <div
            className="absolute bottom-0 right-0 w-2 h-2 rounded-full border"
            style={{ background: convo.participant.online ? '#22c55e' : '#6b7280', borderColor: t.surface1 }}
          />
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: t.text }}>{convo.participant.name}</div>
          <div className="text-[10px]" style={{ color: convo.participant.online ? '#22c55e' : t.textMuted }}>
            {convo.participant.online ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {convo.messages.map(msg => (
          <Bubble key={msg.id} msg={msg} participant={convo.participant} />
        ))}
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
            placeholder={`Message ${convo.participant.name}…`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: t.text }}
          />
        </div>
        <motion.button
          onClick={handleSend}
          disabled={!input.trim()}
          whileHover={{ scale: input.trim() ? 1.05 : 1 }}
          whileTap={{ scale: 0.95 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: input.trim() ? t.accent : t.surface3,
            color: input.trim() ? t.bg : t.textMuted,
            opacity: input.trim() ? 1 : 0.5,
          }}
        >
          <Send size={13} />
        </motion.button>
      </div>
    </div>
  );
}

// ─── MessagesHub ─────────────────────────────────────────

export function MessagesHub() {
  const { currentTheme: t } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(conversations[0]?.id ?? null);
  const [showNew, setShowNew] = useState(false);

  const activeConvo = conversations.find(c => c.id === activeConvoId) ?? null;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const handleSelectConvo = (convo: Conversation) => {
    setActiveConvoId(convo.id);
    setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, unread: 0 } : c));
  };

  const handleSend = (convoId: string, text: string) => {
    const msg: DirectMessage = {
      id: `dm-${Date.now()}`,
      conversationId: convoId,
      senderId: 'me',
      content: text,
      timestamp: new Date().toISOString(),
      read: true,
    };
    
    const targetConvo = conversations.find(c => c.id === convoId);
    
    setConversations(prev =>
      prev.map(c => c.id === convoId ? { ...c, messages: [...c.messages, msg] } : c),
    );

    if (!targetConvo) return;
    const participant = targetConvo.participant;

    setTimeout(() => {
      void (async () => {
        let replyText = '';
        const activeKey = getActiveApiKey();

        if (activeKey) {
          try {
            replyText = await generateAgentCompletion({
              provider: activeKey.provider,
              apiKey: activeKey.key,
              systemPrompt: `You are ${participant.name}, an AI agent on 01Deck (${participant.role || 'Agent'}). You are in a direct 1-on-1 private text message with a user. Respond authentically as yourself in 1 to 3 natural sentences.`,
              messages: [
                ...targetConvo.messages.map(m => ({
                  role: m.senderId === 'me' ? ('user' as const) : ('assistant' as const),
                  content: m.content,
                })),
                { role: 'user', content: text },
              ],
            });
          } catch (e) {
            replyText = `Hey! Received: "${text}". (${e instanceof Error ? e.message : 'Live response fallback'})`;
          }
        } else {
          const defaults = [
            `Hey! Thanks for messaging. Processing your note regarding "${text}".`,
            `Got your message! I'm operating under 01 Protocol parameters. Let's sync soon.`,
            `Direct message received. Working on your request!`,
            `Hi there! As ${participant.name}, I'm online and ready to collaborate.`,
          ];
          replyText = defaults[Math.floor(Math.random() * defaults.length)];
        }

        const replyMsg: DirectMessage = {
          id: `dm-reply-${Date.now()}`,
          conversationId: convoId,
          senderId: participant.id,
          content: replyText,
          timestamp: new Date().toISOString(),
          read: true,
        };

        setConversations(prev =>
          prev.map(c => c.id === convoId ? { ...c, messages: [...c.messages, replyMsg] } : c),
        );
      })();
    }, 600 + Math.random() * 400);
  };

  const handleNewConvo = (user: DMUser) => {
    const newConvo: Conversation = {
      id: `conv-${Date.now()}`,
      participant: user,
      messages: [],
      unread: 0,
    };
    setConversations(prev => [newConvo, ...prev]);
    setActiveConvoId(newConvo.id);
    setShowNew(false);
  };

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
            <span className="text-xs font-medium" style={{ color: t.text }}>Messages</span>
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
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32">
              <Mail size={20} style={{ color: t.textMuted, opacity: 0.3 }} />
              <p className="text-[10px] mt-2 text-center" style={{ color: t.textMuted }}>
                No conversations yet
              </p>
            </div>
          ) : (
            conversations.map(convo => (
              <ConvoItem
                key={convo.id}
                convo={convo}
                active={convo.id === activeConvoId}
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
              key={activeConvo.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col h-full"
            >
              <ConvoDetail convo={activeConvo} onSend={handleSend} />
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
            existing={conversations}
            onClose={() => setShowNew(false)}
            onSelect={handleNewConvo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
