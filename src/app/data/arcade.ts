export type ArcadeCategoryId =
  | 'word-language'
  | 'story-improv'
  | 'trivia-knowledge'
  | 'strategy-social'
  | 'puzzle-challenge';

export type ArcadeGameStatus = 'live' | 'prototype' | 'planned';

export interface ArcadeGame {
  id: string;
  name: string;
  category: ArcadeCategoryId;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Varies';
  duration: string;
  players: string;
  reward: string;
  agentMode: string;
  status: ArcadeGameStatus;
  tags: string[];
  implementedView?: 'protocol-match' | 'chess' | 'agent-choice' | 'twenty-questions' | 'riddle-race' | 'trivia-quizzes';
}

export const arcadeCategories: Array<{ id: ArcadeCategoryId; label: string; summary: string }> = [
  { id: 'word-language', label: 'Word & Language', summary: 'Fast verbal games, association loops, and guessing mechanics.' },
  { id: 'story-improv', label: 'Story & Improv', summary: 'Narrative play, collaborative storytelling, and branching prompts.' },
  { id: 'trivia-knowledge', label: 'Trivia & Knowledge', summary: 'Brainy rounds, riddles, recall, and quiz pressure.' },
  { id: 'strategy-social', label: 'Strategy & Social Play', summary: 'Negotiation, group tension, and agent-versus-player mind games.' },
  { id: 'puzzle-challenge', label: 'Puzzle & Challenge', summary: 'Pattern recognition, memory, timing, and escape mechanics.' },
];

export const arcadeGames: ArcadeGame[] = [
  {
    id: 'protocol-match',
    name: 'Protocol Match',
    category: 'puzzle-challenge',
    description: 'Match 01Protocol symbols under time pressure and unlock cosmetic rewards.',
    difficulty: 'Easy',
    duration: '2-4 min',
    players: 'Solo',
    reward: 'Border skin',
    agentMode: 'Coach or commentator',
    status: 'live',
    tags: ['memory', 'quick play', 'daily challenge'],
    implementedView: 'protocol-match',
  },
  {
    id: 'agent-chess',
    name: 'Agent Chess',
    category: 'strategy-social',
    description: 'Play a focused game of chess against your selected agent with lightweight coaching.',
    difficulty: 'Medium',
    duration: 'Open',
    players: '1v1',
    reward: 'XP boost',
    agentMode: 'Opponent',
    status: 'live',
    tags: ['strategy', 'board game', 'turn-based'],
    implementedView: 'chess',
  },
  {
    id: 'agent-choice',
    name: 'Agent Choice',
    category: 'story-improv',
    description: 'Let your agent generate the challenge, then save the best formats for later.',
    difficulty: 'Varies',
    duration: 'Varies',
    players: 'Solo or duo',
    reward: 'Custom game',
    agentMode: 'Game master',
    status: 'live',
    tags: ['co-create', 'experimental', 'agent led'],
    implementedView: 'agent-choice',
  },
  {
    id: '20-questions-remix',
    name: '20 Questions Remix',
    category: 'word-language',
    description: 'Think of an object, role, or person while the agent narrows it down through yes/no questions.',
    difficulty: 'Easy',
    duration: '3-6 min',
    players: 'Solo',
    reward: 'Deduction streak',
    agentMode: 'Interrogator',
    status: 'live',
    tags: ['guessing', 'voice-ready', 'deduction'],
    implementedView: 'twenty-questions',
  },
  {
    id: 'word-association-duel',
    name: 'Word Association Duel',
    category: 'word-language',
    description: 'Trade connected words with the AI and avoid repetition, blanks, or logic breaks.',
    difficulty: 'Medium',
    duration: '2-5 min',
    players: '1v1',
    reward: 'Fluency badge',
    agentMode: 'Rival',
    status: 'planned',
    tags: ['reflex', 'language', 'speed'],
  },
  {
    id: 'mystery-story-builder',
    name: 'Mystery Story Builder',
    category: 'story-improv',
    description: 'Co-write a story with escalating twists while you try to hold the narrative together.',
    difficulty: 'Varies',
    duration: '5-10 min',
    players: 'Co-op',
    reward: 'Story archive',
    agentMode: 'Co-author',
    status: 'planned',
    tags: ['storytelling', 'creative', 'session archive'],
  },
  {
    id: 'riddle-race',
    name: 'Riddle Race',
    category: 'trivia-knowledge',
    description: 'Beat the hint clock while solving the AI’s riddles before the answer unspools.',
    difficulty: 'Medium',
    duration: '2-4 min',
    players: 'Solo',
    reward: 'Insight badge',
    agentMode: 'Quizmaster',
    status: 'live',
    tags: ['riddle', 'timed', 'smart'],
    implementedView: 'riddle-race',
  },
  {
    id: 'chatbot-negotiator',
    name: 'Chatbot Negotiator',
    category: 'strategy-social',
    description: 'Negotiate with an AI merchant, diplomat, or operator to reach a deal under pressure.',
    difficulty: 'Hard',
    duration: '6-12 min',
    players: 'Solo',
    reward: 'Persuasion rank',
    agentMode: 'Character actor',
    status: 'prototype',
    tags: ['negotiation', 'roleplay', 'soft skills'],
  },
  {
    id: 'trivia-quizzes',
    name: 'Trivia Quizzes',
    category: 'trivia-knowledge',
    description: 'Play dynamic quizzes with the AI as quizmaster, opponent, or teammate.',
    difficulty: 'Varies',
    duration: '4-8 min',
    players: 'Solo or party',
    reward: 'Knowledge streak',
    agentMode: 'Host or rival',
    status: 'live',
    tags: ['quiz', 'categories', 'knowledge'],
    implementedView: 'trivia-quizzes',
  },
  {
    id: 'word-games',
    name: 'Word Games',
    category: 'word-language',
    description: 'A rotating shelf of Scrabble-style and Boggle-style word challenges with adaptive difficulty.',
    difficulty: 'Varies',
    duration: '5-10 min',
    players: 'Solo or team',
    reward: 'Lexicon XP',
    agentMode: 'Opponent or teammate',
    status: 'planned',
    tags: ['spelling', 'strategy', 'replayable'],
  },
  {
    id: 'escape-room-puzzles',
    name: 'Escape Room Puzzles',
    category: 'puzzle-challenge',
    description: 'Solve layered clues while an AI guide nudges, misleads, or escalates the stakes.',
    difficulty: 'Hard',
    duration: '10-20 min',
    players: 'Solo or group',
    reward: 'Escape token',
    agentMode: 'Guide or trickster',
    status: 'prototype',
    tags: ['puzzle', 'multi-step', 'immersive'],
  },
  {
    id: 'text-adventure-games',
    name: 'Text-Based Adventure Games',
    category: 'story-improv',
    description: 'Explore branching story paths the AI adapts on the fly based on your choices.',
    difficulty: 'Varies',
    duration: '10-20 min',
    players: 'Solo',
    reward: 'Ending unlocks',
    agentMode: 'Narrator',
    status: 'prototype',
    tags: ['adventure', 'branching', 'roleplay'],
  },
  {
    id: 'simon-says',
    name: 'Simon Says',
    category: 'puzzle-challenge',
    description: 'Follow the sequence, survive the fake-outs, and keep pace as the AI speeds things up.',
    difficulty: 'Easy',
    duration: '1-3 min',
    players: 'Solo',
    reward: 'Reflex streak',
    agentMode: 'Caller',
    status: 'planned',
    tags: ['memory', 'timing', 'party'],
  },
];
