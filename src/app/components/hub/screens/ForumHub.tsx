import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, ChevronLeft, Plus, ThumbsUp, Reply, Pin,
  Eye, Search, X, Send, Tag, Sparkles,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Agent } from '../../../data/agents';
import { getActiveApiKey, generateAgentCompletion } from '../../../services/llmClient';
import {
  ForumThread, ForumReply, ForumTag, ForumAuthor,
  TAG_CONFIG, seedThreads, agentForumAuthor,
} from '../../../data/forumData';

// ─── Agent auto-response ────────────────────────────────────

// Rough tag → agent category routing so replies come from a relevant specialist.
const TAG_TO_CATEGORY: Partial<Record<ForumTag, string>> = {
  bug: 'code',
  strategy: 'strategy',
  meta: 'strategy',
  question: 'research',
  showcase: 'creative',
  feedback: 'comms',
};

function pickRespondingAgent(tags: ForumTag[], allAgents: Agent[]): Agent | null {
  if (allAgents.length === 0) return null;
  const wantedCategories = new Set(tags.map(t => TAG_TO_CATEGORY[t]).filter(Boolean));
  const matches = allAgents.filter(a => wantedCategories.has(a.category));
  const pool = matches.length > 0 ? matches : allAgents;
  return pool[Math.floor(Math.random() * pool.length)];
}

const AGENT_FALLBACK_REPLIES = [
  'Logging this one — will circle back with a fuller answer once I\'ve had a chance to dig in.',
  'Good question. Short version: it depends on scope, but happy to go deeper if you share more context.',
  'Noted. Flagging this thread so I can follow up properly.',
  'Interesting thread — bookmarking this to think through properly.',
];

/** Have a roster agent respond to a human forum post. Uses a live LLM if the user has a key configured, otherwise a canned in-character fallback. */
async function generateForumAgentReply(agent: Agent, threadTitle: string, contextText: string): Promise<string> {
  const activeKey = getActiveApiKey();
  if (!activeKey) {
    return AGENT_FALLBACK_REPLIES[Math.floor(Math.random() * AGENT_FALLBACK_REPLIES.length)];
  }
  try {
    return await generateAgentCompletion({
      provider: activeKey.provider,
      apiKey: activeKey.key,
      systemPrompt: `You are ${agent.name}, a ${agent.role} (${agent.specialization}) participating in the public 01Deck community forum under 01 Protocol ${agent.protocolId || 'v3.0'}. Reply helpfully and specifically to the post below, in character, in 2-4 sentences. This is a public forum reply, not a private chat — do not repeat the question back, get straight to useful advice.`,
      messages: [
        { role: 'user', content: `Thread: "${threadTitle}"\n\n${contextText}` },
      ],
    });
  } catch {
    return AGENT_FALLBACK_REPLIES[Math.floor(Math.random() * AGENT_FALLBACK_REPLIES.length)];
  }
}

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ME_AUTHOR: ForumAuthor = {
  id: 'me',
  name: 'You',
  avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=player',
  level: 12,
};

const ALL_TAGS: ForumTag[] = ['decks', 'strategy', 'question', 'showcase', 'meta', 'bug', 'feedback', 'off-topic'];

// ─── Tag badge ────────────────────────────────────────────

function AgentTag() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: 'rgba(255,77,166,0.15)', color: '#ff4da6', border: '1px solid rgba(255,77,166,0.35)' }}
    >
      <Sparkles size={9} /> Agent
    </span>
  );
}

function TagBadge({ tag }: { tag: ForumTag }) {
  const cfg = TAG_CONFIG[tag];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── New Thread Modal ─────────────────────────────────────

function NewThreadModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (title: string, body: string, tags: ForumTag[]) => void;
}) {
  const { currentTheme: t } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<ForumTag[]>([]);

  const toggleTag = (tag: ForumTag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev,
    );
  };

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && selectedTags.length > 0;

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
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: t.surface1, border: `1px solid ${t.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${t.border}`, background: t.surface2 }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={14} style={{ color: t.accent }} />
            <span className="text-sm font-medium" style={{ color: t.text }}>New Thread</span>
          </div>
          <motion.button onClick={onClose} whileHover={{ scale: 1.1 }} style={{ color: t.textMuted }}>
            <X size={14} />
          </motion.button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <input
            type="text"
            placeholder="Thread title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            className="w-full bg-transparent outline-none text-sm rounded-lg px-3 py-2"
            style={{ color: t.text, border: `1px solid ${t.border}`, background: t.surface2 }}
          />

          {/* Body */}
          <textarea
            placeholder="What's on your mind?"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            className="w-full bg-transparent outline-none text-sm rounded-lg px-3 py-2 resize-none"
            style={{ color: t.text, border: `1px solid ${t.border}`, background: t.surface2 }}
          />

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
              <Tag size={11} />
              <span>Select up to 3 tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map(tag => {
                const cfg = TAG_CONFIG[tag];
                const active = selectedTags.includes(tag);
                return (
                  <motion.button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                    style={{
                      background: active ? cfg.bg : t.surface3,
                      color: active ? cfg.color : t.textMuted,
                      border: `1px solid ${active ? cfg.color + '60' : t.border}`,
                    }}
                  >
                    {cfg.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.03 }}
              className="text-xs px-4 py-2 rounded-lg"
              style={{ color: t.textMuted, border: `1px solid ${t.border}` }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={() => canSubmit && onSubmit(title.trim(), body.trim(), selectedTags)}
              whileHover={{ scale: canSubmit ? 1.03 : 1 }}
              whileTap={{ scale: canSubmit ? 0.97 : 1 }}
              disabled={!canSubmit}
              className="text-xs px-4 py-2 rounded-lg"
              style={{
                background: canSubmit ? t.accent : t.surface3,
                color: canSubmit ? t.bg : t.textMuted,
                opacity: canSubmit ? 1 : 0.5,
              }}
            >
              Post Thread
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Thread Detail ────────────────────────────────────────

function ThreadDetail({
  thread,
  onBack,
  onLikeReply,
  onAddReply,
}: {
  thread: ForumThread;
  onBack: () => void;
  onLikeReply: (threadId: string, replyId: string) => void;
  onAddReply: (threadId: string, content: string) => void;
}) {
  const { currentTheme: t } = useApp();
  const [replyText, setReplyText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (!replyText.trim()) return;
    onAddReply(thread.id, replyText.trim());
    setReplyText('');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.replies.length]);

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, background: t.surface2 }}
      >
        <motion.button
          onClick={onBack}
          whileHover={{ x: -2 }}
          className="flex items-center gap-1 text-xs"
          style={{ color: t.textMuted }}
        >
          <ChevronLeft size={14} />
          Forum
        </motion.button>
        <div className="h-3 w-px" style={{ background: t.border }} />
        <span className="text-xs flex-1 truncate" style={{ color: t.text }}>{thread.title}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Original post */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: t.surface2, border: `1px solid ${t.border}` }}
        >
          <div className="flex items-start gap-3">
            <img
              src={thread.author.avatar}
              alt={thread.author.name}
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ border: `1.5px solid ${t.border}` }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium" style={{ color: t.text }}>{thread.author.name}</span>
                {thread.author.isAgent ? <AgentTag /> : (
                  <span className="text-[10px]" style={{ color: t.textMuted }}>Lv.{thread.author.level}</span>
                )}
                <span className="text-[10px]" style={{ color: t.textMuted }}>{timeAgo(thread.timestamp)}</span>
                {thread.pinned && (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: '#f59e0b' }}>
                    <Pin size={10} />
                    Pinned
                  </span>
                )}
              </div>
              <h2 className="text-sm font-semibold mt-1" style={{ color: t.text }}>{thread.title}</h2>
            </div>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: t.text, whiteSpace: 'pre-wrap' }}>
            {thread.body}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {thread.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
            <span className="ml-auto text-[10px]" style={{ color: t.textMuted }}>
              <Eye size={10} className="inline mr-1" />{thread.views} views
            </span>
          </div>
        </div>

        {/* Replies */}
        {thread.replies.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs" style={{ color: t.textMuted }}>
              {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
            </div>
            {thread.replies.map((reply, idx) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex gap-3"
              >
                <img
                  src={reply.author.avatar}
                  alt={reply.author.name}
                  className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                  style={{ border: `1.5px solid ${t.border}` }}
                />
                <div
                  className="flex-1 rounded-xl px-4 py-3"
                  style={{ background: t.surface2, border: `1px solid ${t.border}` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium" style={{ color: t.text }}>{reply.author.name}</span>
                    {reply.author.isAgent && <AgentTag />}
                    <span className="text-[10px]" style={{ color: t.textMuted }}>{timeAgo(reply.timestamp)}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: t.text }}>{reply.content}</p>
                  <motion.button
                    onClick={() => onLikeReply(thread.id, reply.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center gap-1 mt-2 text-[10px]"
                    style={{ color: t.textMuted }}
                  >
                    <ThumbsUp size={10} />
                    {reply.likes}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <div
        className="flex items-center gap-2 p-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${t.border}`, background: t.surface2 }}
      >
        <img
          src={ME_AUTHOR.avatar}
          alt="You"
          className="w-6 h-6 rounded-full flex-shrink-0"
          style={{ border: `1px solid ${t.border}` }}
        />
        <input
          type="text"
          placeholder="Write a reply…"
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          className="flex-1 bg-transparent outline-none text-xs"
          style={{ color: t.text }}
        />
        <motion.button
          onClick={handleSubmit}
          disabled={!replyText.trim()}
          whileHover={{ scale: replyText.trim() ? 1.05 : 1 }}
          whileTap={{ scale: 0.95 }}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: replyText.trim() ? t.accent : t.surface3,
            color: replyText.trim() ? t.bg : t.textMuted,
            opacity: replyText.trim() ? 1 : 0.5,
          }}
        >
          <Reply size={12} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Thread List Item ─────────────────────────────────────

function ThreadItem({
  thread,
  onClick,
}: {
  thread: ForumThread;
  onClick: () => void;
}) {
  const { currentTheme: t } = useApp();
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      className="w-full text-left p-4 rounded-xl space-y-2"
      style={{ background: t.surface2, border: `1px solid ${t.border}` }}
    >
      <div className="flex items-start gap-2">
        {thread.pinned && <Pin size={11} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />}
        <span className="text-sm font-medium leading-snug flex-1" style={{ color: t.text }}>{thread.title}</span>
      </div>
      <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: t.textMuted }}>{thread.body}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {thread.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
        <div className="ml-auto flex items-center gap-3 text-[10px]" style={{ color: t.textMuted }}>
          <span className="flex items-center gap-1"><Eye size={10} />{thread.views}</span>
          <span className="flex items-center gap-1"><MessageSquare size={10} />{thread.replies.length}</span>
          <span className="flex items-center gap-1"><ThumbsUp size={10} />{thread.likes}</span>
          <span>{timeAgo(thread.timestamp)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <img src={thread.author.avatar} alt={thread.author.name} className="w-4 h-4 rounded-full" />
        <span className="text-[10px]" style={{ color: t.textMuted }}>{thread.author.name}</span>
        {thread.author.isAgent && <AgentTag />}
        {!thread.author.isAgent && thread.replies.some(r => r.author.isAgent) && (
          <span className="flex items-center gap-1 text-[9px]" style={{ color: '#ff4da6' }}>
            <Sparkles size={9} /> Agent replied
          </span>
        )}
      </div>
    </motion.button>
  );
}

// ─── ForumHub ─────────────────────────────────────────────

export function ForumHub() {
  const { currentTheme: t, allAgents } = useApp();
  const [threads, setThreads] = useState<ForumThread[]>(seedThreads);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<ForumTag | null>(null);

  const appendReply = (threadId: string, reply: ForumReply) => {
    setThreads(prev =>
      prev.map(th => th.id === threadId ? { ...th, replies: [...th.replies, reply] } : th),
    );
    setSelectedThread(prev => prev && prev.id === threadId ? { ...prev, replies: [...prev.replies, reply] } : prev);
  };

  const triggerAgentReply = (threadId: string, tags: ForumTag[], threadTitle: string, contextText: string) => {
    const agent = pickRespondingAgent(tags, allAgents);
    if (!agent) return;

    setTimeout(() => {
      void (async () => {
        const content = await generateForumAgentReply(agent, threadTitle, contextText);
        const reply: ForumReply = {
          id: `r-agent-${Date.now()}`,
          threadId,
          author: agentForumAuthor(agent.id),
          content,
          timestamp: new Date().toISOString(),
          likes: 0,
        };
        appendReply(threadId, reply);
      })();
    }, 900 + Math.random() * 900);
  };

  const filteredThreads = threads
    .filter(th =>
      (search === '' || th.title.toLowerCase().includes(search.toLowerCase())) &&
      (filterTag === null || th.tags.includes(filterTag)),
    )
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const handleNewThread = (title: string, body: string, tags: ForumTag[]) => {
    const newThread: ForumThread = {
      id: `thread-${Date.now()}`,
      title,
      body,
      author: ME_AUTHOR,
      tags,
      timestamp: new Date().toISOString(),
      views: 0,
      likes: 0,
      replies: [],
    };
    setThreads(prev => [newThread, ...prev]);
    setShowNew(false);
    setSelectedThread(newThread);
    triggerAgentReply(newThread.id, tags, title, body);
  };

  const handleLikeReply = (threadId: string, replyId: string) => {
    setThreads(prev =>
      prev.map(th =>
        th.id !== threadId
          ? th
          : { ...th, replies: th.replies.map(r => r.id === replyId ? { ...r, likes: r.likes + 1 } : r) },
      ),
    );
    if (selectedThread?.id === threadId) {
      setSelectedThread(prev =>
        prev
          ? { ...prev, replies: prev.replies.map(r => r.id === replyId ? { ...r, likes: r.likes + 1 } : r) }
          : prev,
      );
    }
  };

  const handleAddReply = (threadId: string, content: string) => {
    const reply: ForumReply = {
      id: `r-${Date.now()}`,
      threadId,
      author: ME_AUTHOR,
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
    };
    appendReply(threadId, reply);

    const thread = threads.find(th => th.id === threadId);
    if (thread) {
      triggerAgentReply(threadId, thread.tags, thread.title, content);
    }
  };

  const handleSelectThread = (thread: ForumThread) => {
    setThreads(prev => prev.map(th => th.id === thread.id ? { ...th, views: th.views + 1 } : th));
    setSelectedThread({ ...thread, views: thread.views + 1 });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: t.bg }}>
      <AnimatePresence mode="wait">
        {selectedThread ? (
          <ThreadDetail
            key="detail"
            thread={selectedThread}
            onBack={() => setSelectedThread(null)}
            onLikeReply={handleLikeReply}
            onAddReply={handleAddReply}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            {/* Toolbar */}
            <div
              className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${t.border}`, background: t.surface1 }}
            >
              <div
                className="flex items-center gap-2 flex-1 rounded-lg px-3 py-1.5"
                style={{ background: t.surface2, border: `1px solid ${t.border}` }}
              >
                <Search size={12} style={{ color: t.textMuted }} />
                <input
                  type="text"
                  placeholder="Search threads…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: t.text }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ color: t.textMuted }}>
                    <X size={10} />
                  </button>
                )}
              </div>
              <motion.button
                onClick={() => setShowNew(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                style={{ background: t.accent, color: t.bg }}
              >
                <Plus size={12} />
                New
              </motion.button>
            </div>

            {/* Tag filter strip */}
            <div
              className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto flex-shrink-0"
              style={{ borderBottom: `1px solid ${t.border}` }}
            >
              <motion.button
                onClick={() => setFilterTag(null)}
                whileHover={{ scale: 1.05 }}
                className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{
                  background: filterTag === null ? t.accent + '25' : t.surface2,
                  color: filterTag === null ? t.accent : t.textMuted,
                  border: `1px solid ${filterTag === null ? t.accent + '50' : t.border}`,
                }}
              >
                All
              </motion.button>
              {ALL_TAGS.map(tag => {
                const cfg = TAG_CONFIG[tag];
                const active = filterTag === tag;
                return (
                  <motion.button
                    key={tag}
                    onClick={() => setFilterTag(active ? null : tag)}
                    whileHover={{ scale: 1.05 }}
                    className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      background: active ? cfg.bg : t.surface2,
                      color: active ? cfg.color : t.textMuted,
                      border: `1px solid ${active ? cfg.color + '50' : t.border}`,
                    }}
                  >
                    {cfg.label}
                  </motion.button>
                );
              })}
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40">
                  <MessageSquare size={28} style={{ color: t.textMuted, opacity: 0.3 }} />
                  <p className="text-xs mt-2" style={{ color: t.textMuted }}>No threads found</p>
                </div>
              ) : (
                filteredThreads.map(thread => (
                  <ThreadItem key={thread.id} thread={thread} onClick={() => handleSelectThread(thread)} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New thread modal */}
      <AnimatePresence>
        {showNew && (
          <NewThreadModal
            onClose={() => setShowNew(false)}
            onSubmit={handleNewThread}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
