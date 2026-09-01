import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hash, Send, Users } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  ChatChannel, ChatMessage, ChatUser,
  chatChannels, seedChatMessages, ME, CHAT_USERS,
} from '../../../data/chatData';

// ─── Helpers ─────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isConsecutive(msg: ChatMessage, prev: ChatMessage | undefined) {
  if (!prev) return false;
  if (msg.author.id !== prev.author.id) return false;
  return new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime() < 3 * 60 * 1000;
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
      <Hash size={13} style={{ color: active ? channel.color : t.textMuted, flexShrink: 0 }} />
      <span className="flex-1 text-xs" style={{ color: active ? channel.color : t.textMuted }}>
        {channel.name}
      </span>
      {channel.unread != null && channel.unread > 0 && (
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full"
          style={{ background: channel.color + '30', color: channel.color }}
        >
          {channel.unread}
        </span>
      )}
    </motion.button>
  );
}

// ─── Message Row ─────────────────────────────────────────

function MessageRow({
  message,
  isMe,
  compact,
}: {
  message: ChatMessage;
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
          src={message.author.avatar}
          alt={message.author.name}
          className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
          style={{ border: `1.5px solid ${t.border}` }}
        />
      ) : (
        <div className="w-7 flex-shrink-0" />
      )}
      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[72%]`}>
        {!compact && (
          <div className={`flex items-baseline gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
            <span className="text-[11px] font-medium" style={{ color: isMe ? t.accent : t.text }}>
              {isMe ? 'You' : message.author.name}
            </span>
            <span className="text-[10px]" style={{ color: t.textMuted }}>
              {formatTime(message.timestamp)}
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
  const [channels, setChannels] = useState<ChatChannel[]>(chatChannels);
  const [activeChannelId, setActiveChannelId] = useState(chatChannels[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>(seedChatMessages);
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeChannel = channels.find(c => c.id === activeChannelId) ?? channels[0];
  const channelMessages = messages.filter(m => m.channelId === activeChannelId);

  const handleSelectChannel = (channel: ChatChannel) => {
    setActiveChannelId(channel.id);
    // Clear unread
    setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, unread: 0 } : c));
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const msg: ChatMessage = {
      id: `cm-${Date.now()}`,
      channelId: activeChannelId,
      author: ME as ChatUser,
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    setInputText('');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, activeChannelId]);

  const totalUnread = channels.reduce((sum, c) => sum + (c.unread ?? 0), 0);
  const onlineCount = CHAT_USERS.filter(u => u.online).length;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: t.bg }}>

      {/* ── Channel sidebar ─────────────────────────────── */}
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
            <span className="text-xs font-medium" style={{ color: t.text }}>Channels</span>
            {totalUnread > 0 && (
              <span
                className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: t.accent + '30', color: t.accent }}
              >
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {channels.map(ch => (
            <ChannelButton
              key={ch.id}
              channel={ch}
              active={ch.id === activeChannelId}
              onClick={() => handleSelectChannel(ch)}
            />
          ))}
        </div>

        {/* Online count — derived from seed users */}
        <div
          className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
          <span className="text-[10px]" style={{ color: t.textMuted }}>
            {onlineCount} online
          </span>
          <Users size={10} className="ml-auto" style={{ color: t.textMuted }} />
        </div>
      </div>

      {/* ── Message pane ─────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Channel header */}
        <div
          className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${t.border}`, background: t.surface1 }}
        >
          <Hash size={14} style={{ color: activeChannel.color }} />
          <span className="text-sm font-medium" style={{ color: t.text }}>{activeChannel.name}</span>
          <span className="text-xs" style={{ color: t.textMuted }}>— {activeChannel.description}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence initial={false}>
            {channelMessages.length === 0 ? (
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
              channelMessages.map((msg, idx) => (
                <MessageRow
                  key={msg.id}
                  message={msg}
                  isMe={msg.author.id === 'me'}
                  compact={isConsecutive(msg, channelMessages[idx - 1])}
                />
              ))
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${t.border}`, background: t.surface1 }}
        >
          <div
            className="flex items-center flex-1 gap-2 rounded-xl px-3 py-2"
            style={{ background: t.surface2, border: `1px solid ${t.border}` }}
          >
            <Hash size={11} style={{ color: t.textMuted }} />
            <input
              type="text"
              placeholder={`Message #${activeChannel.name}…`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: t.text }}
            />
          </div>
          <motion.button
            onClick={handleSend}
            disabled={!inputText.trim()}
            whileHover={{ scale: inputText.trim() ? 1.05 : 1 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: inputText.trim() ? t.accent : t.surface3,
              color: inputText.trim() ? t.bg : t.textMuted,
              opacity: inputText.trim() ? 1 : 0.5,
            }}
          >
            <Send size={13} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
