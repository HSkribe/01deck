import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, ChevronLeft, Plus, Reply,
  Search, X, Send, Tag, Loader2, AlertCircle,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import {
  backendApi,
  type SocialForumThread,
  type SocialForumReply,
} from '../../../services/backendApi';
import { ForumTag, TAG_CONFIG } from '../../../data/forumData';

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function avatarUrl(username: string) {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(username)}`;
}

const ALL_TAGS: ForumTag[] = [
  'decks', 'strategy', 'question', 'showcase', 'meta', 'bug', 'feedback', 'off-topic',
];

// ─── Tag badge ────────────────────────────────────────────

const FALLBACK_TAG_STYLE = { label: '', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };

function TagBadge({ tag }: { tag: string }) {
  const cfg = (tag in TAG_CONFIG)
    ? TAG_CONFIG[tag as ForumTag]
    : { ...FALLBACK_TAG_STYLE, label: tag };
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
    >
      {cfg.label || tag}
    </span>
  );
}

// ─── New Thread Modal ─────────────────────────────────────

function NewThreadModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (title: string, body: string, tags: ForumTag[]) => void;
  submitting: boolean;
}) {
  const { currentTheme: t } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<ForumTag[]>([]);

  const toggleTag = (tag: ForumTag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(x => x !== tag)
        : prev.length < 3 ? [...prev, tag] : prev,
    );
  };

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && selectedTags.length > 0 && !submitting;

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
            <span className="text-sm font-medium" style={{ color: t.text }}>
              New Thread
            </span>
          </div>
          <motion.button onClick={onClose} whileHover={{ scale: 1.1 }} style={{ color: t.textMuted }}>
            <X size={14} />
          </motion.button>
        </div>

        <div className="p-5 space-y-4">
          <input
            type="text"
            placeholder="Thread title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            className="w-full bg-transparent outline-none text-sm rounded-lg px-3 py-2"
            style={{ color: t.text, border: `1px solid ${t.border}`, background: t.surface2 }}
          />

          <textarea
            placeholder="What's on your mind?"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            className="w-full bg-transparent outline-none text-sm rounded-lg px-3 py-2 resize-none"
            style={{ color: t.text, border: `1px solid ${t.border}`, background: t.surface2 }}
          />

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
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg"
              style={{
                background: canSubmit ? t.accent : t.surface3,
                color: canSubmit ? t.bg : t.textMuted,
                opacity: canSubmit ? 1 : 0.5,
              }}
            >
              {submitting && <Loader2 size={11} className="animate-spin" />}
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
  initialReplies,
  onBack,
  onAddReply,
  canReply,
}: {
  thread: SocialForumThread;
  initialReplies: SocialForumReply[];
  onBack: () => void;
  onAddReply: (threadId: string, content: string) => Promise<SocialForumReply>;
  canReply: boolean;
}) {
  const { currentTheme: t } = useApp();
  const { user } = useAuth();
  const [replies, setReplies] = useState<SocialForumReply[]>(initialReplies);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadIdRef = useRef(thread.thread_id);
  threadIdRef.current = thread.thread_id;

  // Poll for new replies while this thread is open.
  useEffect(() => {
    const pollReplies = async () => {
      try {
        const { replies: fetched } = await backendApi.getForumThread(thread.thread_id);
        if (threadIdRef.current === thread.thread_id) {
          setReplies(fetched);
        }
      } catch {
        // silent poll failures
      }
    };
    const id = setInterval(() => void pollReplies(), 15_000);
    return () => clearInterval(id);
  }, [thread.thread_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  const handleSubmit = async () => {
    const text = replyText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setReplyError(null);
    try {
      const reply = await onAddReply(thread.thread_id, text);
      setReplies(prev => [...prev, reply]);
      setReplyText('');
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Failed to post reply.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <span className="text-xs flex-1 truncate" style={{ color: t.text }}>
          {thread.title}
        </span>
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
              src={avatarUrl(thread.author.username)}
              alt={thread.author.display_name}
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ border: `1.5px solid ${t.border}` }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium" style={{ color: t.text }}>
                  {thread.author.display_name}
                </span>
                <span className="text-[10px]" style={{ color: t.textMuted }}>
                  @{thread.author.username}
                </span>
                <span className="text-[10px]" style={{ color: t.textMuted }}>
                  {timeAgo(thread.created_at)}
                </span>
              </div>
              <h2 className="text-sm font-semibold mt-1" style={{ color: t.text }}>
                {thread.title}
              </h2>
            </div>
          </div>

          <p
            className="text-xs leading-relaxed"
            style={{ color: t.text, whiteSpace: 'pre-wrap' }}
          >
            {thread.body}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {thread.tags.map(tag => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs" style={{ color: t.textMuted }}>
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </div>
            {replies.map((reply, idx) => (
              <motion.div
                key={reply.reply_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex gap-3"
              >
                <img
                  src={avatarUrl(reply.author.username)}
                  alt={reply.author.display_name}
                  className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                  style={{ border: `1.5px solid ${t.border}` }}
                />
                <div
                  className="flex-1 rounded-xl px-4 py-3"
                  style={{ background: t.surface2, border: `1px solid ${t.border}` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium" style={{ color: t.text }}>
                      {reply.author.display_name}
                    </span>
                    <span className="text-[10px]" style={{ color: t.textMuted }}>
                      {timeAgo(reply.created_at)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: t.text }}>
                    {reply.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <div
        className="flex flex-col gap-1.5 p-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${t.border}`, background: t.surface2 }}
      >
        {!canReply && (
          <p className="text-[10px]" style={{ color: t.textMuted }}>
            Sign in to a real account to reply.
          </p>
        )}
        {replyError && (
          <p className="text-[10px]" style={{ color: '#ef4444' }}>
            {replyError}
          </p>
        )}
        <div className="flex items-center gap-2">
          {user && (
            <img
              src={avatarUrl(user.username)}
              alt="You"
              className="w-6 h-6 rounded-full flex-shrink-0"
              style={{ border: `1px solid ${t.border}` }}
            />
          )}
          <input
            type="text"
            placeholder={canReply ? 'Write a reply…' : 'Sign in to reply…'}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            disabled={!canReply || submitting}
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: t.text, opacity: canReply ? 1 : 0.5 }}
          />
          <motion.button
            onClick={() => void handleSubmit()}
            disabled={!replyText.trim() || !canReply || submitting}
            whileHover={{ scale: replyText.trim() && canReply ? 1.05 : 1 }}
            whileTap={{ scale: 0.95 }}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: replyText.trim() && canReply ? t.accent : t.surface3,
              color: replyText.trim() && canReply ? t.bg : t.textMuted,
              opacity: replyText.trim() && canReply ? 1 : 0.5,
            }}
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Reply size={12} />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Thread List Item ─────────────────────────────────────

function ThreadItem({
  thread,
  onClick,
}: {
  thread: SocialForumThread;
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
      <span
        className="text-sm font-medium leading-snug block"
        style={{ color: t.text }}
      >
        {thread.title}
      </span>

      <p
        className="text-[11px] line-clamp-2 leading-relaxed"
        style={{ color: t.textMuted }}
      >
        {thread.body}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {thread.tags.map(tag => (
          <TagBadge key={tag} tag={tag} />
        ))}
        <div className="ml-auto flex items-center gap-3 text-[10px]" style={{ color: t.textMuted }}>
          <span className="flex items-center gap-1">
            <MessageSquare size={10} />
            {thread.reply_count}
          </span>
          <span>{timeAgo(thread.created_at)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <img
          src={avatarUrl(thread.author.username)}
          alt={thread.author.display_name}
          className="w-4 h-4 rounded-full"
        />
        <span className="text-[10px]" style={{ color: t.textMuted }}>
          {thread.author.display_name}
        </span>
      </div>
    </motion.button>
  );
}

// ─── ForumHub ─────────────────────────────────────────────

export function ForumHub() {
  const { currentTheme: t } = useApp();
  const { user } = useAuth();

  const [threads, setThreads] = useState<SocialForumThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);

  // When a thread is selected, fetch its detail + replies.
  const [selectedThread, setSelectedThread] = useState<SocialForumThread | null>(null);
  const [selectedReplies, setSelectedReplies] = useState<SocialForumReply[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [submittingThread, setSubmittingThread] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<ForumTag | null>(null);

  const isBackendUser = user?.source === 'backend';

  const loadThreads = useCallback(async () => {
    try {
      const { threads: fetched } = await backendApi.getForumThreads();
      setThreads(fetched);
      setThreadsError(null);
    } catch (err) {
      setThreadsError(
        err instanceof Error ? err.message : 'Could not load forum threads.',
      );
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const handleSelectThread = async (thread: SocialForumThread) => {
    setSelectedThread(thread);
    setLoadingDetail(true);
    try {
      const { thread: detail, replies } = await backendApi.getForumThread(thread.thread_id);
      setSelectedThread(detail);
      setSelectedReplies(replies);
    } catch {
      // If detail fails, show what we have with empty replies.
      setSelectedReplies([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleBack = () => {
    setSelectedThread(null);
    setSelectedReplies([]);
    // Refresh the thread list (reply counts may have changed).
    void loadThreads();
  };

  const handleNewThread = async (title: string, body: string, tags: ForumTag[]) => {
    if (!isBackendUser) return;
    setSubmittingThread(true);
    try {
      const { thread } = await backendApi.createForumThread(title, body, tags);
      setShowNew(false);
      setThreads(prev => [thread, ...prev]);
      // Open the new thread immediately.
      setSelectedThread(thread);
      setSelectedReplies([]);
    } catch (err) {
      // Surface the error through the modal's submitting state — the modal
      // stays open so the user can see something went wrong (the button will
      // re-enable once submittingThread is false).
    } finally {
      setSubmittingThread(false);
    }
  };

  const handleAddReply = async (threadId: string, content: string): Promise<SocialForumReply> => {
    const { reply } = await backendApi.createForumReply(threadId, content);
    // Update the reply count in the thread list so it's correct when the user backs out.
    setThreads(prev =>
      prev.map(th =>
        th.thread_id === threadId
          ? { ...th, reply_count: th.reply_count + 1 }
          : th,
      ),
    );
    return reply;
  };

  const filteredThreads = threads
    .filter(th =>
      (search === '' || th.title.toLowerCase().includes(search.toLowerCase())) &&
      (filterTag === null || th.tags.includes(filterTag)),
    );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: t.bg }}>
      <AnimatePresence mode="wait">
        {selectedThread ? (
          loadingDetail ? (
            <motion.div
              key="detail-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center flex-1 h-full"
            >
              <Loader2 size={20} style={{ color: t.textMuted }} className="animate-spin" />
            </motion.div>
          ) : (
            <ThreadDetail
              key={selectedThread.thread_id}
              thread={selectedThread}
              initialReplies={selectedReplies}
              onBack={handleBack}
              onAddReply={handleAddReply}
              canReply={isBackendUser}
            />
          )
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
              {isBackendUser && (
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
              )}
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
              {loadingThreads ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 size={20} style={{ color: t.textMuted }} className="animate-spin" />
                </div>
              ) : threadsError ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <AlertCircle size={24} style={{ color: t.textMuted, opacity: 0.4 }} />
                  <p className="text-xs text-center" style={{ color: t.textMuted }}>
                    {threadsError}
                  </p>
                  <motion.button
                    onClick={() => { setLoadingThreads(true); void loadThreads(); }}
                    whileHover={{ scale: 1.05 }}
                    className="text-xs px-3 py-1.5 rounded-lg mt-1"
                    style={{ background: t.surface2, color: t.textMuted, border: `1px solid ${t.border}` }}
                  >
                    Retry
                  </motion.button>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40">
                  <MessageSquare size={28} style={{ color: t.textMuted, opacity: 0.3 }} />
                  <p className="text-xs mt-2" style={{ color: t.textMuted }}>
                    {threads.length === 0
                      ? 'No threads yet. Be the first to post!'
                      : 'No threads match your search.'}
                  </p>
                  {threads.length === 0 && isBackendUser && (
                    <motion.button
                      onClick={() => setShowNew(true)}
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg mt-3"
                      style={{ background: t.accent, color: t.bg }}
                    >
                      <Plus size={12} />
                      Start a thread
                    </motion.button>
                  )}
                </div>
              ) : (
                filteredThreads.map(thread => (
                  <ThreadItem
                    key={thread.thread_id}
                    thread={thread}
                    onClick={() => void handleSelectThread(thread)}
                  />
                ))
              )}
            </div>

            {/* Sign-in nudge for local users */}
            {!isBackendUser && threads.length > 0 && (
              <div
                className="px-4 py-2 flex-shrink-0 text-center"
                style={{ borderTop: `1px solid ${t.border}` }}
              >
                <p className="text-[10px]" style={{ color: t.textMuted }}>
                  Sign in to a real account to post threads and replies.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New thread modal */}
      <AnimatePresence>
        {showNew && (
          <NewThreadModal
            onClose={() => setShowNew(false)}
            onSubmit={(title, body, tags) => void handleNewThread(title, body, tags)}
            submitting={submittingThread}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
