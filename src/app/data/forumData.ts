// ═══════════════════════════════════════════════════════════
//  01deck Hub — Forum seed data
// ═══════════════════════════════════════════════════════════

export type ForumTag =
  | 'decks'
  | 'strategy'
  | 'question'
  | 'showcase'
  | 'meta'
  | 'bug'
  | 'feedback'
  | 'off-topic';

export const TAG_CONFIG: Record<ForumTag, { label: string; color: string; bg: string }> = {
  decks:     { label: 'Decks',     color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  strategy:  { label: 'Strategy',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  question:  { label: 'Question',  color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  showcase:  { label: 'Showcase',  color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  meta:      { label: 'Meta',      color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  bug:       { label: 'Bug',       color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  feedback:  { label: 'Feedback',  color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  'off-topic': { label: 'Off-topic', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

export interface ForumAuthor {
  id: string;
  name: string;
  avatar: string;
  level: number;
}

export interface ForumReply {
  id: string;
  threadId: string;
  author: ForumAuthor;
  content: string;
  timestamp: string;
  likes: number;
}

export interface ForumThread {
  id: string;
  title: string;
  body: string;
  author: ForumAuthor;
  tags: ForumTag[];
  timestamp: string;
  views: number;
  likes: number;
  replies: ForumReply[];
  pinned?: boolean;
}

const AUTHORS: ForumAuthor[] = [
  { id: 'u1', name: 'NexusPilot', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=nexuspilot', level: 42 },
  { id: 'u2', name: 'VoidCaster', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=voidcaster', level: 18 },
  { id: 'u3', name: 'ArcHerald',  avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=archerald',  level: 31 },
  { id: 'u4', name: 'PulseRider', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=pulserider', level: 7  },
  { id: 'u5', name: 'ZenithCore', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=zenithcore', level: 55 },
];

export const seedThreads: ForumThread[] = [
  {
    id: 'thread-1',
    title: 'Tips for building a competitive Nexus deck?',
    body: 'I\'ve been experimenting with different agent compositions but keep hitting a wall around rank 20. What synergies are people finding most reliable right now? Particularly interested in whether the Void archetype is still viable after the last balance patch.',
    author: AUTHORS[1],
    tags: ['decks', 'strategy'],
    timestamp: '2026-08-24T07:10:00Z',
    views: 342,
    likes: 28,
    pinned: false,
    replies: [
      {
        id: 'r1-1',
        threadId: 'thread-1',
        author: AUTHORS[0],
        content: 'Void is definitely still viable. The key is pairing it with at least two support agents that have the Resonance trait. They amplify each other\'s passive abilities by roughly 30%.',
        timestamp: '2026-08-24T07:25:00Z',
        likes: 14,
      },
      {
        id: 'r1-2',
        threadId: 'thread-1',
        author: AUTHORS[4],
        content: 'Agreed on the Resonance synergy. Also don\'t sleep on the Protocol series — their chain abilities can clear boards that would otherwise stall you indefinitely.',
        timestamp: '2026-08-24T07:40:00Z',
        likes: 9,
      },
      {
        id: 'r1-3',
        threadId: 'thread-1',
        author: AUTHORS[2],
        content: 'What rank are you targeting? My competitive deck looks totally different from my ladder deck. Happy to share either.',
        timestamp: '2026-08-24T08:05:00Z',
        likes: 5,
      },
    ],
  },
  {
    id: 'thread-2',
    title: '[Showcase] My full Protocol-themed agent deck',
    body: 'After 3 weeks of grinding, I finally completed my Protocol deck. Here\'s the full lineup and the reasoning behind each slot. The core idea is to chain Protocol abilities to generate burst turns that opponents can\'t respond to.',
    author: AUTHORS[4],
    tags: ['showcase', 'decks'],
    timestamp: '2026-08-24T06:00:00Z',
    views: 891,
    likes: 73,
    pinned: true,
    replies: [
      {
        id: 'r2-1',
        threadId: 'thread-2',
        author: AUTHORS[1],
        content: 'This is beautiful. How long did it take to pull the Mythic Protocol Zero?',
        timestamp: '2026-08-24T06:15:00Z',
        likes: 11,
      },
      {
        id: 'r2-2',
        threadId: 'thread-2',
        author: AUTHORS[4],
        content: 'About 200 standard pulls before I started targeting banner summons. Worth every bit.',
        timestamp: '2026-08-24T06:22:00Z',
        likes: 8,
      },
    ],
  },
  {
    id: 'thread-3',
    title: 'Bug report: Arcade leaderboard not updating after a win',
    body: 'After completing a Riddle Race match my score didn\'t update on the leaderboard. Refreshing the page didn\'t help. This happened twice today. Other people experiencing this?',
    author: AUTHORS[3],
    tags: ['bug'],
    timestamp: '2026-08-23T22:10:00Z',
    views: 156,
    likes: 4,
    replies: [
      {
        id: 'r3-1',
        threadId: 'thread-3',
        author: AUTHORS[2],
        content: 'Same issue here, specifically in Riddle Race. Trivia Quizzes seems fine.',
        timestamp: '2026-08-23T22:30:00Z',
        likes: 3,
      },
    ],
  },
  {
    id: 'thread-4',
    title: 'How does the Evolution Lab unlock sequence work?',
    body: 'I\'ve been stuck on stage 3 of the Evolution Lab for days. The tooltips don\'t explain the unlock conditions clearly. Is there a guide anywhere or can someone break down the progression?',
    author: AUTHORS[2],
    tags: ['question'],
    timestamp: '2026-08-23T18:45:00Z',
    views: 204,
    likes: 12,
    replies: [
      {
        id: 'r4-1',
        threadId: 'thread-4',
        author: AUTHORS[0],
        content: 'Each stage requires a minimum rarity threshold across all agents in your active deck. Stage 3 needs at least 3 Rare or higher. Check the "Deck Power" indicator at the top of the workbench.',
        timestamp: '2026-08-23T19:00:00Z',
        likes: 17,
      },
    ],
  },
  {
    id: 'thread-5',
    title: 'Weekly meta discussion — August 24',
    body: 'What\'s everyone running this week? Any surprising tech you\'ve discovered? Post your current top deck and any off-meta picks you\'re testing.',
    author: AUTHORS[0],
    tags: ['meta', 'strategy'],
    timestamp: '2026-08-24T00:00:00Z',
    views: 445,
    likes: 31,
    pinned: true,
    replies: [],
  },
];
