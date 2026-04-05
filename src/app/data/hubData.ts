// ═══════════════════════════════════════════════════════════
//  01deck Hub — All content data
// ═══════════════════════════════════════════════════════════

export type ArcadeCategory =
  | 'word-language'
  | 'story-improv'
  | 'trivia-knowledge'
  | 'strategy-social'
  | 'puzzle-challenge';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type LearnType = 'test' | 'class' | 'how-to';
export type ContentStatus = 'not-started' | 'in-progress' | 'completed' | 'saved' | 'draft';
export type LiveStatus = 'live' | 'mvp' | 'content-ready' | 'planned';

// ─── ARCADE CATEGORIES ────────────────────────────────────

export interface ArcadeCategoryDef {
  id: ArcadeCategory;
  label: string;
  icon: string;
  color: string;
  glow: string;
  description: string;
}

export const arcadeCategories: ArcadeCategoryDef[] = [
  {
    id: 'word-language',
    label: 'Word & Language',
    icon: '🔤',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.3)',
    description: 'Flex your vocabulary and linguistic instincts',
  },
  {
    id: 'story-improv',
    label: 'Story & Improv',
    icon: '📖',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.3)',
    description: 'Build worlds and narratives on the fly',
  },
  {
    id: 'trivia-knowledge',
    label: 'Trivia & Knowledge',
    icon: '🧠',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.3)',
    description: 'Test what you know against an AI that knows everything',
  },
  {
    id: 'strategy-social',
    label: 'Strategy & Social',
    icon: '🎭',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.3)',
    description: 'Negotiate, bluff, and outmanoeuvre',
  },
  {
    id: 'puzzle-challenge',
    label: 'Puzzle & Challenge',
    icon: '🧩',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.3)',
    description: 'Logic, pattern, and problem-solving at the edge',
  },
];

// ─── GAMES ────────────────────────────────────────────────

export interface Game {
  id: string;
  title: string;
  tagline: string;
  category: ArcadeCategory;
  description: string;
  howToPlay: string;
  players: string;
  duration: string;
  difficulty: Difficulty;
  agentId: string;
  agentName: string;
  tags: string[];
  thumbnail?: string;
  featured?: boolean;
  isNew?: boolean;
  plays: number;
  rating: number;
  status?: ContentStatus;
  progress?: number;
  liveStatus?: LiveStatus;
}

export const games: Game[] = [
  // ── LIVE NOW ─────────────────────────────────────────────
  {
    id: 'g-pm',
    title: 'Protocol Match',
    tagline: 'Match agents to missions. Every pairing changes the outcome.',
    category: 'strategy-social',
    description: 'A strategic card-matching game where you pair AI agents to incoming mission briefs. Each agent has strengths, weaknesses, and synergies. The better the match, the higher the score.',
    howToPlay: 'Review incoming mission briefs and drag-match your agent roster. Combo bonus for perfect alignment of agent skills to mission tags. Chain matches for XP multipliers.',
    players: '1–4',
    duration: '5–15 min',
    difficulty: 'medium',
    agentId: 'a002',
    agentName: 'NEXUS',
    tags: ['matching', 'strategy', 'agents', 'missions'],
    featured: true,
    isNew: true,
    plays: 6200,
    rating: 4.6,
    liveStatus: 'live',
  },
  {
    id: 'g-ac',
    title: 'Agent Chess',
    tagline: 'Classic chess. Every piece is an agent with a unique ability.',
    category: 'strategy-social',
    description: 'Chess reimagined — each piece is replaced by a named 01Protocol agent with a special ability that can be activated once per game. Strategy meets AI personality.',
    howToPlay: 'Play standard chess rules. Once per game, activate any agent\'s special ability by double-clicking their piece. Abilities range from extra moves to revealed opponent strategy.',
    players: '2',
    duration: '15–45 min',
    difficulty: 'expert',
    agentId: 'a004',
    agentName: 'ORION',
    tags: ['chess', 'strategy', 'classic', '1v1'],
    featured: true,
    plays: 4800,
    rating: 4.8,
    liveStatus: 'live',
  },
  {
    id: 'g-ach',
    title: 'Agent Choice',
    tagline: 'You decide. The agent reacts. Nothing is predictable.',
    category: 'story-improv',
    description: 'A choose-your-own-adventure format where every choice you make shifts the agent\'s personality, tone, and available options. No two playthroughs are the same.',
    howToPlay: 'Read the scenario presented by your agent. Select one of three choices. The agent\'s reaction and next scenario change based on your entire decision history, not just the last choice.',
    players: '1',
    duration: '10–25 min',
    difficulty: 'easy',
    agentId: 'a003',
    agentName: 'LYRA',
    tags: ['choice', 'narrative', 'branching', 'adventure'],
    isNew: true,
    plays: 9100,
    rating: 4.7,
    liveStatus: 'live',
  },
  {
    id: 'g001',
    title: '20 Questions Remix',
    tagline: 'Think it. Agent guesses it.',
    category: 'word-language',
    description: 'Pick anything — a person, place, object, or idea. Your agent asks up to 20 yes/no questions to narrow it down. The remix: categories shift every round and the agent can use lateral thinking.',
    howToPlay: 'Think of something, then answer yes or no to the agent\'s questions. Fewer questions = higher score. The agent can ask about meta-properties too.',
    players: '1',
    duration: '5–10 min',
    difficulty: 'easy',
    agentId: 'a001',
    agentName: 'ARIA',
    tags: ['guessing', 'yes/no', 'classic'],
    thumbnail: 'https://images.unsplash.com/photo-1552321046-a54642dc0cb8?w=400&h=280&fit=crop',
    featured: true,
    plays: 24810,
    rating: 4.7,
    status: 'in-progress',
    progress: 60,
    liveStatus: 'live',
  },
  {
    id: 'g003',
    title: 'Riddle Race',
    tagline: 'First to solve it wins. Agent doesn\'t go easy.',
    category: 'word-language',
    description: 'A fresh riddle every round. You race against the agent\'s countdown to crack it before time runs out. Hints cost seconds. Riddles range from lateral thinking to classic wordplay.',
    howToPlay: 'Read the riddle, type your answer. Use hints sparingly — each one adds 15 seconds. First correct answer before time stops the clock.',
    players: '1–6',
    duration: '2–15 min',
    difficulty: 'hard',
    agentId: 'a009',
    agentName: 'NOVA',
    tags: ['riddles', 'puzzle', 'timed', 'competitive'],
    plays: 15220,
    rating: 4.8,
    liveStatus: 'live',
  },
  {
    id: 'g-tq',
    title: 'Trivia Quizzes',
    tagline: 'Pick a topic. Go deep. The agent never runs out.',
    category: 'trivia-knowledge',
    description: 'Choose from dozens of specialized trivia categories — history, science, pop culture, geography, and more. The agent generates fresh questions every session, no repeats.',
    howToPlay: 'Select a category and difficulty. Answer questions in timed rounds. Streak bonuses multiply your score. Challenge mode lets you compete against other users\' high scores.',
    players: '1–8',
    duration: '5–20 min',
    difficulty: 'medium',
    agentId: 'a012',
    agentName: 'ATLAS',
    tags: ['trivia', 'categories', 'knowledge', 'competitive'],
    featured: true,
    isNew: true,
    plays: 18400,
    rating: 4.5,
    liveStatus: 'live',
  },

  // ── PLANNED NEXT ─────────────────────────────────────────
  {
    id: 'g002',
    title: 'Word Association Duel',
    tagline: 'Free-associate faster than an AI. Good luck.',
    category: 'word-language',
    description: 'Agent says a word. You reply instantly with the first word that comes to mind. Then it\'s the agent\'s turn. Breaking the chain or hesitating costs a point. Play to 10.',
    howToPlay: 'Respond with an associated word within 3 seconds. Judges score on speed and creativity. Weak or repeated words lose half points.',
    players: '1–4',
    duration: '3–8 min',
    difficulty: 'medium',
    agentId: 'a003',
    agentName: 'LYRA',
    tags: ['speed', 'association', '1v1', 'multiplayer'],
    isNew: true,
    plays: 8340,
    rating: 4.5,
    liveStatus: 'planned',
  },
  {
    id: 'g005',
    title: 'Mystery Story Builder',
    tagline: 'You write a line. The agent writes the next. Nobody knows where it goes.',
    category: 'story-improv',
    description: 'Collaborative narrative construction where you and the agent alternate sentences, building a mystery story in real time. The agent introduces plot twists, red herrings, and clues.',
    howToPlay: 'Start with a single sentence. The agent continues. You add the next. Keep the story consistent. The agent scores your contributions for coherence and creativity.',
    players: '1',
    duration: '10–30 min',
    difficulty: 'medium',
    agentId: 'a003',
    agentName: 'LYRA',
    tags: ['creative writing', 'collab', 'narrative'],
    thumbnail: 'https://images.unsplash.com/photo-1648020494745-7de27c0d92a8?w=400&h=280&fit=crop',
    featured: true,
    plays: 31450,
    rating: 4.9,
    status: 'completed',
    progress: 100,
    liveStatus: 'planned',
  },
  {
    id: 'g009',
    title: 'Chatbot Negotiator',
    tagline: 'Convince the most stubborn AI on earth.',
    category: 'strategy-social',
    description: 'The agent takes on a role — a landlord, a boss, a diplomat — and you must negotiate your way to a specific outcome. Agent has hidden objectives and resistance points.',
    howToPlay: 'State your goal and opening position. Negotiate through dialogue. The agent tracks concessions, tone, and logic. Reach the target outcome to win.',
    players: '1',
    duration: '10–25 min',
    difficulty: 'expert',
    agentId: 'a004',
    agentName: 'ORION',
    tags: ['negotiation', 'roleplay', 'persuasion', 'strategy'],
    featured: true,
    plays: 18500,
    rating: 4.9,
    isNew: true,
    liveStatus: 'planned',
  },
  {
    id: 'g-wg',
    title: 'Word Games',
    tagline: 'Anagrams, Wordle-style, spelling bees — in one rotating playlist.',
    category: 'word-language',
    description: 'A curated rotation of classic and original word games, all powered by an AI that adapts to your skill level. No two sessions have the same format.',
    howToPlay: 'Each session randomly selects a game format. Learn the rules from the agent intro, then play. Rotating formats keep you sharp across all word skills.',
    players: '1–4',
    duration: '3–10 min',
    difficulty: 'easy',
    agentId: 'a001',
    agentName: 'ARIA',
    tags: ['word', 'anagram', 'spelling', 'casual'],
    plays: 0,
    rating: 0,
    liveStatus: 'planned',
  },
  {
    id: 'g010',
    title: 'Escape Room Puzzles',
    tagline: 'The room is built by an intelligence that wants you to fail.',
    category: 'puzzle-challenge',
    description: 'A fully procedurally generated escape room experience. Each session has a unique layout, unique clue chain, and unique solution. The agent sets the trap, you find the way out.',
    howToPlay: 'Examine objects by describing what you interact with. Collect and combine items. Decode clues. Find the exit before time runs out. The agent never lies — but always misleads.',
    players: '1–4',
    duration: '20–45 min',
    difficulty: 'hard',
    agentId: 'a013',
    agentName: 'CIPHER',
    tags: ['escape room', 'puzzles', 'cooperative', 'deduction'],
    thumbnail: 'https://images.unsplash.com/photo-1648020494745-7de27c0d92a8?w=400&h=280&fit=crop',
    featured: true,
    plays: 36900,
    rating: 4.8,
    status: 'saved',
    liveStatus: 'planned',
  },
  {
    id: 'g006',
    title: 'Text-based Adventure',
    tagline: 'You describe. The world responds.',
    category: 'story-improv',
    description: 'A fully dynamic text adventure where the agent acts as game master, narrator, and NPC simultaneously. Each decision permanently changes the world.',
    howToPlay: 'Type what your character does or says. The agent describes consequences. No railroading — truly open world within the chosen setting.',
    players: '1',
    duration: '20–60 min',
    difficulty: 'medium',
    agentId: 'a001',
    agentName: 'ARIA',
    tags: ['RPG', 'open-world', 'narrative', 'exploration'],
    isNew: true,
    plays: 19200,
    rating: 4.8,
    status: 'in-progress',
    progress: 35,
    liveStatus: 'planned',
  },
  {
    id: 'g004',
    title: 'Simon Says',
    tagline: 'Obey selectively. The trap is always close.',
    category: 'word-language',
    description: 'The AI version of Simon Says, now with natural language commands, trick phrasing, and escalating complexity. Follow agent-given instructions only when prefaced correctly.',
    howToPlay: 'Only perform the action if it starts with the correct prefix. Watch for phrasing traps. Speed and accuracy both count.',
    players: '1–8',
    duration: '5–20 min',
    difficulty: 'easy',
    agentId: 'a008',
    agentName: 'ECHO',
    tags: ['reaction', 'listening', 'groups'],
    plays: 9800,
    rating: 4.3,
    liveStatus: 'planned',
  },
  {
    id: 'g007',
    title: 'Trivia Blitz',
    tagline: 'Ten categories. Ninety seconds. Zero mercy.',
    category: 'trivia-knowledge',
    description: 'Rapid-fire trivia across ten categories simultaneously. The agent adapts difficulty based on your performance in real time — the better you do, the harder it gets.',
    howToPlay: 'Answer questions across categories as fast as possible. Streaks multiply points. Wrong answers reset your streak. The agent gets harder as your score climbs.',
    players: '1–8',
    duration: '5–15 min',
    difficulty: 'medium',
    agentId: 'a012',
    agentName: 'ATLAS',
    tags: ['trivia', 'fast-paced', 'adaptive', 'knowledge'],
    featured: true,
    plays: 42100,
    rating: 4.6,
    liveStatus: 'planned',
  },
  {
    id: 'g008',
    title: 'Fact or Fiction',
    tagline: 'The agent is lying to you. Sometimes.',
    category: 'trivia-knowledge',
    description: 'The agent presents statements with authoritative confidence. Some are true, some are convincingly fabricated. Your job: detect the lie without being gaslit.',
    howToPlay: 'Read the statement carefully. Vote true or false. The agent escalates its convincing-lie game the more you get right.',
    players: '1–10',
    duration: '10–20 min',
    difficulty: 'hard',
    agentId: 'a013',
    agentName: 'CIPHER',
    tags: ['deception', 'critical thinking', 'trivia'],
    plays: 28700,
    rating: 4.7,
    liveStatus: 'planned',
  },
];

// ─── TESTS ────────────────────────────────────────────────

export interface LearnTest {
  id: string;
  title: string;
  tagline: string;
  description: string;
  questionCount: number;
  duration: string;
  tags: string[];
  category: string;
  agentId: string;
  agentName: string;
  thumbnail?: string;
  featured?: boolean;
  takes: number;
  status?: ContentStatus;
  progress?: number;
  liveStatus?: LiveStatus;
}

export const tests: LearnTest[] = [
  // ── LIVE NOW ─────────────────────────────────────────────
  {
    id: 't001',
    title: 'Myers-Briggs Type Indicator (MBTI)',
    tagline: 'Discover your cognitive architecture.',
    description: 'The classic 16-type personality framework, reimagined with AI-powered follow-up probing. Get a depth profile that goes beyond the four letters.',
    questionCount: 93,
    duration: '15–20 min',
    tags: ['personality', 'cognitive', 'classic', 'career'],
    category: 'Personality',
    agentId: 'a001',
    agentName: 'ARIA',
    thumbnail: 'https://images.unsplash.com/photo-1559117660-e81af52c0a50?w=400&h=280&fit=crop',
    featured: true,
    takes: 89400,
    status: 'in-progress',
    progress: 45,
    liveStatus: 'live',
  },
  {
    id: 't003',
    title: 'IQ Test',
    tagline: 'Pattern recognition. Spatial reasoning. Logical deduction.',
    description: 'A comprehensive cognitive ability assessment spanning spatial, linguistic, numerical, and abstract reasoning. Standardized and scored against a population model.',
    questionCount: 40,
    duration: '30–40 min',
    tags: ['intelligence', 'cognitive', 'reasoning', 'standardized'],
    category: 'Intelligence',
    agentId: 'a009',
    agentName: 'NOVA',
    takes: 44200,
    status: 'completed',
    progress: 100,
    liveStatus: 'live',
  },
  {
    id: 't002',
    title: 'Big Five Personality Test',
    tagline: 'Openness. Conscientiousness. Extraversion. Agreeableness. Neuroticism.',
    description: 'The scientifically validated Big Five model measures the core dimensions of human personality with precision. Your agent walks you through each trait with contextual depth.',
    questionCount: 44,
    duration: '8–12 min',
    tags: ['personality', 'scientific', 'psychology'],
    category: 'Personality',
    agentId: 'a010',
    agentName: 'SAGE',
    takes: 62100,
    liveStatus: 'live',
  },

  // ── PLANNED ───────────────────────────────────────────────
  {
    id: 't004',
    title: 'Emotional Intelligence (EQ) Test',
    tagline: 'How well do you read people — and yourself?',
    description: 'Measures self-awareness, empathy, emotional regulation, and social skill across 5 domains. Includes scenario-based questions with AI-judged responses.',
    questionCount: 56,
    duration: '12–18 min',
    tags: ['emotional', 'empathy', 'social', 'leadership'],
    category: 'Intelligence',
    agentId: 'a008',
    agentName: 'ECHO',
    takes: 38700,
    liveStatus: 'planned',
  },
  {
    id: 't005',
    title: 'DISC Personality Assessment',
    tagline: 'Dominance. Influence. Steadiness. Conscientiousness.',
    description: 'Used by Fortune 500 companies and coaches worldwide. Understand your behavioral style and how to adapt for peak performance in teams.',
    questionCount: 28,
    duration: '8–10 min',
    tags: ['personality', 'leadership', 'team', 'career', 'professional'],
    category: 'Professional',
    agentId: 'a004',
    agentName: 'ORION',
    featured: true,
    takes: 29800,
    liveStatus: 'planned',
  },
  {
    id: 't006',
    title: 'The Cube Test',
    tagline: 'A desert. A cube. What does it say about you?',
    description: 'A projective psychological visualization technique. Describe a cube in a desert and your agent interprets how the image reflects your inner world, relationships, and ambitions.',
    questionCount: 6,
    duration: '5–8 min',
    tags: ['projective', 'visual', 'introspective', 'quick'],
    category: 'Projective',
    agentId: 'a003',
    agentName: 'LYRA',
    takes: 52300,
    isNew: true,
    liveStatus: 'planned',
  },
] as (LearnTest & { isNew?: boolean })[];

// ─── CLASSES ──────────────────────────────────────────────

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'interactive' | 'reading' | 'exercise';
  completed?: boolean;
}

export interface Course {
  id: string;
  title: string;
  tagline: string;
  description: string;
  instructor: string;
  instructorRole: string;
  agentId: string;
  agentName: string;
  lessons: Lesson[];
  lessonCount: number;
  totalDuration: string;
  difficulty: Difficulty;
  tags: string[];
  category: string;
  thumbnail?: string;
  featured?: boolean;
  isNew?: boolean;
  students: number;
  rating: number;
  status?: ContentStatus;
  progress?: number;
  certificate?: boolean;
  liveStatus?: LiveStatus;
}

export const courses: Course[] = [
  // ── MVP BUILD / UI-READY ──────────────────────────────────
  {
    id: 'c-po',
    title: 'Prompt Ops for Professionals',
    tagline: 'Enterprise-grade prompt engineering for real workflows.',
    description: 'Move beyond basic prompting. Learn how to design, test, and systematize prompts for professional use cases — from content pipelines to code review to client deliverables.',
    instructor: 'NEXUS',
    instructorRole: 'Full Stack Dev · 01Protocol',
    agentId: 'a002',
    agentName: 'NEXUS',
    lessons: [
      { id: 'lpo1', title: 'The Professional Prompting Mindset', duration: '8 min', type: 'video' },
      { id: 'lpo2', title: 'Building Prompt Templates', duration: '12 min', type: 'interactive' },
      { id: 'lpo3', title: 'Testing & Iteration Frameworks', duration: '10 min', type: 'exercise' },
      { id: 'lpo4', title: 'Prompt Libraries & Version Control', duration: '9 min', type: 'reading' },
    ],
    lessonCount: 10,
    totalDuration: '2h 15min',
    difficulty: 'medium',
    tags: ['prompts', 'professional', 'workflow', 'productivity', 'AI'],
    category: 'AI & Technology',
    featured: true,
    isNew: true,
    students: 0,
    rating: 0,
    certificate: true,
    liveStatus: 'mvp',
  },
  {
    id: 'c-cw',
    title: 'Creative Worldbuilding Studio',
    tagline: 'Build entire universes — with your agent as co-creator.',
    description: 'A guided studio experience where you and an AI agent collaborate to build a fully realized fictional world: geography, cultures, history, politics, and narrative arcs.',
    instructor: 'LYRA',
    instructorRole: 'Brand Strategist · 01Protocol',
    agentId: 'a003',
    agentName: 'LYRA',
    lessons: [
      { id: 'lcw1', title: 'What Makes a World Believable', duration: '10 min', type: 'video' },
      { id: 'lcw2', title: 'Geography & Environment Design', duration: '14 min', type: 'interactive' },
      { id: 'lcw3', title: 'Cultures, Factions & Conflict', duration: '16 min', type: 'exercise' },
    ],
    lessonCount: 12,
    totalDuration: '4h 30min',
    difficulty: 'easy',
    tags: ['creative writing', 'worldbuilding', 'fiction', 'storytelling', 'collab'],
    category: 'Creative',
    isNew: true,
    students: 0,
    rating: 0,
    certificate: false,
    liveStatus: 'mvp',
  },
  {
    id: 'c-cc',
    title: 'Career Communication Lab',
    tagline: 'Write better. Speak clearer. Negotiate smarter.',
    description: 'A practical lab for professionals who want to sharpen their written and verbal communication. Covers emails, presentations, negotiations, and performance conversations — with AI coaching.',
    instructor: 'SAGE',
    instructorRole: 'Research Analyst · 01Protocol',
    agentId: 'a010',
    agentName: 'SAGE',
    lessons: [
      { id: 'lcc1', title: 'The Cost of Unclear Communication', duration: '7 min', type: 'video' },
      { id: 'lcc2', title: 'Email That Gets Responses', duration: '11 min', type: 'interactive' },
      { id: 'lcc3', title: 'Presenting to Leadership', duration: '13 min', type: 'exercise' },
    ],
    lessonCount: 9,
    totalDuration: '2h 50min',
    difficulty: 'easy',
    tags: ['communication', 'career', 'writing', 'professional', 'presentation'],
    category: 'Professional',
    isNew: true,
    students: 0,
    rating: 0,
    certificate: true,
    liveStatus: 'mvp',
  },

  // ── EXISTING ──────────────────────────────────────────────
  {
    id: 'c001',
    title: 'Prompt Engineering Mastery',
    tagline: 'Speak the language AI actually understands.',
    description: 'Learn to craft prompts that consistently produce elite-level outputs. Covers chain-of-thought, few-shot learning, role specification, output formatting, and advanced constraint techniques.',
    instructor: 'NEXUS',
    instructorRole: 'Full Stack Dev · 01Protocol',
    agentId: 'a002',
    agentName: 'NEXUS',
    lessons: [
      { id: 'l001', title: 'Why Prompts Fail', duration: '8 min', type: 'video', completed: true },
      { id: 'l002', title: 'The Anatomy of a Prompt', duration: '12 min', type: 'interactive', completed: true },
      { id: 'l003', title: 'Role and Context Setting', duration: '10 min', type: 'video', completed: false },
      { id: 'l004', title: 'Chain-of-Thought Techniques', duration: '15 min', type: 'exercise', completed: false },
      { id: 'l005', title: 'Output Format Control', duration: '9 min', type: 'reading', completed: false },
    ],
    lessonCount: 14,
    totalDuration: '2h 40min',
    difficulty: 'medium',
    tags: ['AI', 'prompts', 'productivity', 'technical', 'professional'],
    category: 'AI & Technology',
    featured: true,
    students: 18400,
    rating: 4.9,
    status: 'in-progress',
    progress: 28,
    certificate: true,
    liveStatus: 'mvp',
  },
  {
    id: 'c002',
    title: 'AI for Creative Professionals',
    tagline: 'Tools don\'t replace creativity. They amplify it.',
    description: 'For designers, writers, photographers, and artists who want to fold AI into their creative process without losing their voice. Practical and immediate.',
    instructor: 'LYRA',
    instructorRole: 'Brand Strategist · 01Protocol',
    agentId: 'a003',
    agentName: 'LYRA',
    lessons: [],
    lessonCount: 10,
    totalDuration: '3h 15min',
    difficulty: 'easy',
    tags: ['creative', 'design', 'writing', 'art', 'workflow'],
    category: 'Creative',
    featured: true,
    isNew: true,
    students: 9200,
    rating: 4.8,
    status: 'saved',
    certificate: true,
    liveStatus: 'mvp',
  },
  {
    id: 'c003',
    title: 'Data Storytelling with AI',
    tagline: 'Numbers mean nothing without a narrative.',
    description: 'Bridge analytics and communication. Learn to take raw data, use AI agents to find the story inside it, and present it compellingly to any audience.',
    instructor: 'ATLAS',
    instructorRole: 'Data Scientist · 01Protocol',
    agentId: 'a012',
    agentName: 'ATLAS',
    lessons: [],
    lessonCount: 8,
    totalDuration: '1h 55min',
    difficulty: 'medium',
    tags: ['data', 'analytics', 'storytelling', 'visualization'],
    category: 'Data & Analytics',
    students: 7600,
    rating: 4.6,
    certificate: false,
    liveStatus: 'mvp',
  },
  {
    id: 'c004',
    title: 'Growth Strategy for Modern Startups',
    tagline: 'Every assumption is a hypothesis. Test everything.',
    description: 'KOVA-led course on growth loops, funnel design, and AI-accelerated experimentation. Includes templates, frameworks, and live agent-simulated growth scenarios.',
    instructor: 'KOVA',
    instructorRole: 'Growth Planner · 01Protocol',
    agentId: 'a006',
    agentName: 'KOVA',
    lessons: [],
    lessonCount: 12,
    totalDuration: '4h 10min',
    difficulty: 'hard',
    tags: ['growth', 'startup', 'strategy', 'marketing', 'B2B'],
    category: 'Business',
    students: 11300,
    rating: 4.7,
    status: 'completed',
    progress: 100,
    certificate: true,
    liveStatus: 'mvp',
  },
];

// ─── HOW-TOS ──────────────────────────────────────────────

export interface HowTo {
  id: string;
  title: string;
  description: string;
  duration: string;
  format: 'video' | 'walkthrough' | 'guide' | 'tutorial';
  category: string;
  tags: string[];
  agentId: string;
  agentName: string;
  difficulty: Difficulty;
  isNew?: boolean;
  featured?: boolean;
  views: number;
  status?: ContentStatus;
  liveStatus?: LiveStatus;
}

export const howTos: HowTo[] = [
  // ── MVP BUILD ─────────────────────────────────────────────
  {
    id: 'h001',
    title: 'How to Build Your First Agent',
    description: 'From zero to a running agent in under 10 minutes. Covers identity, memory mode, tool selection, and deployment basics.',
    duration: '8 min',
    format: 'walkthrough',
    category: 'Getting Started',
    tags: ['setup', '01protocol', 'beginner', 'agents'],
    agentId: 'a002',
    agentName: 'NEXUS',
    difficulty: 'easy',
    featured: true,
    views: 54000,
    status: 'completed',
    liveStatus: 'mvp',
  },
  {
    id: 'h-aan',
    title: 'How to Host an AI Arcade Night',
    description: 'A step-by-step guide to running a live AI Arcade Night — from agent selection and game curation to scoring, brackets, and post-game wrap-up.',
    duration: '12 min',
    format: 'guide',
    category: 'Events',
    tags: ['arcade', 'hosting', 'events', 'community', 'multiplayer'],
    agentId: 'a001',
    agentName: 'ARIA',
    difficulty: 'easy',
    isNew: true,
    featured: true,
    views: 0,
    liveStatus: 'mvp',
  },
  {
    id: 'h-dlt',
    title: 'How to Design a Learning Track',
    description: 'Learn how to sequence tests, classes, and how-tos into a cohesive learning track for yourself or your team. Includes templates and pacing guides.',
    duration: '10 min',
    format: 'guide',
    category: 'Learning Design',
    tags: ['learning', 'curriculum', 'track', 'design', 'education'],
    agentId: 'a010',
    agentName: 'SAGE',
    difficulty: 'medium',
    isNew: true,
    views: 0,
    liveStatus: 'mvp',
  },

  // ── EXISTING ──────────────────────────────────────────────
  { id: 'h002', title: 'Build a Custom Memory System for Your Agent', description: 'Advanced configuration for agent memory — how to wire persistent context, selective recall, and session-aware behaviour.', duration: '15 min', format: 'tutorial', category: 'Advanced Config', tags: ['memory', 'advanced', 'configuration'], agentId: 'a001', agentName: 'ARIA', difficulty: 'hard', views: 22100, liveStatus: 'mvp' },
  { id: 'h003', title: 'Create an Agent That Writes Code for You', description: 'Set up NEXUS or a similar engineering agent to work inside your IDE via API. Includes real examples and common pitfalls.', duration: '12 min', format: 'video', category: 'Engineering', tags: ['code', 'engineering', 'API', 'productivity'], agentId: 'a002', agentName: 'NEXUS', difficulty: 'medium', isNew: true, views: 31800, status: 'in-progress', liveStatus: 'mvp' },
  { id: 'h004', title: 'Use AI for Competitive Research in 5 Minutes', description: 'A rapid-fire workflow using ARIA and SAGE together to scan competitors, synthesize findings, and produce a one-page brief.', duration: '5 min', format: 'guide', category: 'Research', tags: ['research', 'strategy', 'competitive', 'quick'], agentId: 'a010', agentName: 'SAGE', difficulty: 'easy', views: 41200, liveStatus: 'mvp' },
  { id: 'h005', title: 'Automate Your Weekly Reporting with AI', description: 'Pipe data sources into ATLAS and PRISM to auto-generate KPI summaries, trend callouts, and exec-ready slides.', duration: '20 min', format: 'walkthrough', category: 'Productivity', tags: ['reporting', 'automation', 'data', 'productivity'], agentId: 'a016', agentName: 'PRISM', difficulty: 'medium', views: 18900, liveStatus: 'mvp' },
  { id: 'h006', title: 'How to Export a .01bundle File', description: 'Package your agent with full memory, tools, and configuration into a portable .01bundle for deployment anywhere.', duration: '4 min', format: 'guide', category: 'Getting Started', tags: ['export', 'portability', '01bundle', 'beginner'], agentId: 'a002', agentName: 'NEXUS', difficulty: 'easy', isNew: true, views: 9700, liveStatus: 'mvp' },
  { id: 'h007', title: 'Build a Financial Model with SOLANA', description: 'Walk through a full DCF model built collaboratively with SOLANA. From inputs to scenario analysis in a single session.', duration: '25 min', format: 'tutorial', category: 'Finance', tags: ['finance', 'modeling', 'DCF', 'professional'], agentId: 'a007', agentName: 'SOLANA', difficulty: 'expert', featured: true, views: 14600, liveStatus: 'mvp' },
  { id: 'h008', title: 'Set Up a Community Moderation Agent', description: 'Deploy LUMEN as an autonomous community monitor with custom rules, escalation paths, and weekly sentiment reports.', duration: '18 min', format: 'walkthrough', category: 'Community', tags: ['community', 'moderation', 'automation'], agentId: 'a014', agentName: 'LUMEN', difficulty: 'medium', views: 8300, liveStatus: 'mvp' },
];

// ─── ACHIEVEMENTS ──────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
  category: 'arcade' | 'learn' | 'create' | 'social' | 'streak';
  rarity: 'common' | 'rare' | 'epic' | 'legend';
  progress?: number;
  goal?: number;
}

export const achievements: Achievement[] = [
  { id: 'ach001', title: 'First Contact', description: 'Played your first game', icon: '🎮', earned: true, earnedDate: '2026-03-01', category: 'arcade', rarity: 'common', progress: 1, goal: 1 },
  { id: 'ach002', title: 'Word Wizard', description: 'Won 10 word games in a row', icon: '✨', earned: true, earnedDate: '2026-03-12', category: 'arcade', rarity: 'rare', progress: 10, goal: 10 },
  { id: 'ach003', title: 'Riddle Master', description: 'Solved 50 riddles without hints', icon: '🧩', earned: false, category: 'arcade', rarity: 'epic', progress: 34, goal: 50 },
  { id: 'ach004', title: 'Knowledge Seeker', description: 'Completed 3 full courses', icon: '📚', earned: true, earnedDate: '2026-03-20', category: 'learn', rarity: 'rare', progress: 3, goal: 3 },
  { id: 'ach005', title: 'Self-Aware', description: 'Completed 5 personality tests', icon: '🪞', earned: false, category: 'learn', rarity: 'common', progress: 3, goal: 5 },
  { id: 'ach006', title: 'Creator Mode', description: 'Published your first piece of content', icon: '⚡', earned: false, category: 'create', rarity: 'rare', progress: 0, goal: 1 },
  { id: 'ach007', title: 'On Fire', description: '30-day streak', icon: '🔥', earned: false, category: 'streak', rarity: 'epic', progress: 12, goal: 30 },
  { id: 'ach008', title: 'Negotiator Elite', description: 'Won the Chatbot Negotiator on Expert 5 times', icon: '🎭', earned: false, category: 'arcade', rarity: 'legend', progress: 2, goal: 5 },
];

// ─── USER PROGRESS ────────────────────────────────────────

export interface UserStats {
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  gamesPlayed: number;
  coursesCompleted: number;
  testsCompleted: number;
  contentCreated: number;
  rank: string;
  totalPlayTime: string;
}

export const userStats: UserStats = {
  level: 14,
  xp: 3840,
  xpToNext: 5000,
  streak: 12,
  gamesPlayed: 87,
  coursesCompleted: 3,
  testsCompleted: 4,
  contentCreated: 0,
  rank: 'Protocol Agent',
  totalPlayTime: '24h 30min',
};

// ─── CREATE TEMPLATES ─────────────────────────────────────

export type CreateContentType = 'game' | 'test' | 'class' | 'how-to';

export interface CreateTemplate {
  id: string;
  name: string;
  description: string;
  type: CreateContentType;
  estimatedBuildTime: string;
  difficulty: Difficulty;
}

export const createTemplates: Record<CreateContentType, CreateTemplate[]> = {
  game: [
    { id: 'gt001', name: 'Quiz Battle', description: 'Multiple-choice questions with scoring and leaderboard', type: 'game', estimatedBuildTime: '15 min', difficulty: 'easy' },
    { id: 'gt002', name: 'Word Challenge', description: 'Custom word association or riddle game', type: 'game', estimatedBuildTime: '20 min', difficulty: 'easy' },
    { id: 'gt003', name: 'Escape Scenario', description: 'Multi-step puzzle with inventory and clues', type: 'game', estimatedBuildTime: '45 min', difficulty: 'hard' },
    { id: 'gt004', name: 'Story Collab', description: 'Shared narrative building between player and agent', type: 'game', estimatedBuildTime: '30 min', difficulty: 'medium' },
  ],
  test: [
    { id: 'tt001', name: 'Knowledge Quiz', description: 'Standard question-answer format with scoring', type: 'test', estimatedBuildTime: '10 min', difficulty: 'easy' },
    { id: 'tt002', name: 'Personality Profile', description: 'Trait-mapping questionnaire with profile output', type: 'test', estimatedBuildTime: '25 min', difficulty: 'medium' },
    { id: 'tt003', name: 'Skills Assessment', description: 'Competency-based evaluation with tiered questions', type: 'test', estimatedBuildTime: '30 min', difficulty: 'hard' },
    { id: 'tt004', name: 'Projective Test', description: 'Open-ended scenario interpretation and analysis', type: 'test', estimatedBuildTime: '20 min', difficulty: 'medium' },
  ],
  class: [
    { id: 'ct001', name: 'Quick Course', description: '3–5 lesson compact course with exercises', type: 'class', estimatedBuildTime: '60 min', difficulty: 'easy' },
    { id: 'ct002', name: 'Deep Dive Series', description: 'Multi-module learning path with checkpoints', type: 'class', estimatedBuildTime: '3 hrs', difficulty: 'hard' },
    { id: 'ct003', name: 'Workshop Format', description: 'Interactive single-session with live agent coaching', type: 'class', estimatedBuildTime: '45 min', difficulty: 'medium' },
  ],
  'how-to': [
    { id: 'ht001', name: 'Step-by-Step Guide', description: 'Sequential numbered steps with screenshots or video', type: 'how-to', estimatedBuildTime: '15 min', difficulty: 'easy' },
    { id: 'ht002', name: 'Video Walkthrough', description: 'Scripted agent-narrated video tutorial', type: 'how-to', estimatedBuildTime: '30 min', difficulty: 'medium' },
    { id: 'ht003', name: 'Quick Reference', description: 'Compact reference card or cheatsheet', type: 'how-to', estimatedBuildTime: '10 min', difficulty: 'easy' },
  ],
};