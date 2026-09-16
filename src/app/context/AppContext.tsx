import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Agent, agents as initialAgents } from '../data/agents';
import { appPluginDefaults } from '../plugins/registry';
import { backendApi, BackendUnreachableError, type BackendSessionStatus } from '../services/backendApi';
import { getActiveApiKey, generateAgentCompletion } from '../services/llmClient';
import { DEFAULT_PAGE_CONTEXT, DEFAULT_WORKSPACE_SECTION } from '../utils/productMode';
import { appendConversationMemory, deleteAgentMemoryVault, ensureAgentMemoryVault, getAgentMemoryContext } from '../services/memoryVault';
import { enrollOwnerIdentity, type OwnerIdentityState } from '../utils/protocol';
import { useAuth } from './AuthContext';

export type ThemeId = 'core' | 'midnight' | 'holo' | 'clean' | 'solar';
export type WorkspaceSectionId = 'foundry' | 'deck' | 'deploy' | 'arcade' | 'learn' | 'create' | 'library' | 'profile';
export type AppPluginId = '01foundry-agent-optimization' | '01evolve-experience' | '01maestro';

// Backend connectivity, kept distinct from auth: a network failure reaching
// the backend at all ('unreachable') is a different problem — and needs a
// different message — than reaching it and finding out you need to sign in
// ('auth-required'). See backendApi.checkHealth / AppContext's
// syncBackendSession.
export type BackendStatus =
  | 'checking'
  | 'unreachable'
  | 'auth-required'
  | 'ready'
  | 'not-configured' // backend reachable, but auth disabled server-side
  | 'error'; // backend reachable, but a request to it failed unexpectedly

// What will actually happen the next time a chat message is sent — the
// thing ChatWindow shows the user so "local" replies are never presented
// as if they came from a live model.
export type ChatResponseSource = 'local' | 'direct-key' | 'backend';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  bg: string;
  surface1: string;
  surface2: string;
  surface3: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  glow: string;
  isDark: boolean;
}

export const themes: Record<ThemeId, ThemeConfig> = {
  core: {
    id: 'core',
    name: '01.AI Core',
    bg: '#080808',
    surface1: '#111111',
    surface2: '#181818',
    surface3: '#222222',
    border: 'rgba(255,255,255,0.07)',
    text: '#ffffff',
    textMuted: '#6b7280',
    accent: '#ffffff',
    glow: 'rgba(255,255,255,0.12)',
    isDark: true,
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Protocol',
    bg: '#050814',
    surface1: '#0d1124',
    surface2: '#111829',
    surface3: '#1a2540',
    border: 'rgba(99,132,255,0.15)',
    text: '#e8ecff',
    textMuted: '#6b7fa0',
    accent: '#6384ff',
    glow: 'rgba(99,132,255,0.2)',
    isDark: true,
  },
  holo: {
    id: 'holo',
    name: 'Holo Rare',
    bg: '#080510',
    surface1: '#100d1e',
    surface2: '#161225',
    surface3: '#1e1830',
    border: 'rgba(200,100,255,0.15)',
    text: '#f0e8ff',
    textMuted: '#9b7db0',
    accent: '#c864ff',
    glow: 'rgba(180,50,255,0.2)',
    isDark: true,
  },
  clean: {
    id: 'clean',
    name: 'Clean Ops',
    bg: '#f5f5f5',
    surface1: '#ffffff',
    surface2: '#f0f0f0',
    surface3: '#e8e8e8',
    border: 'rgba(0,0,0,0.09)',
    text: '#111111',
    textMuted: '#6b7280',
    accent: '#111111',
    glow: 'rgba(0,0,0,0.06)',
    isDark: false,
  },
  solar: {
    id: 'solar',
    name: 'Solar Gold',
    bg: '#0d0900',
    surface1: '#1a1200',
    surface2: '#221800',
    surface3: '#2e2000',
    border: 'rgba(245,158,11,0.15)',
    text: '#fff8e0',
    textMuted: '#a0882a',
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.2)',
    isDark: true,
  },
};

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface InternalMessage {
  id: string;
  channel: string;
  sender: string;
  content: string;
  timestamp: Date;
}

export interface BoardPost {
  id: string;
  author: string;
  title: string;
  content: string;
  timestamp: Date;
}

export interface TradeProposal {
  id: string;
  fromUser: string;
  toUser: string;
  agentName: string;
  offeredCredits: number;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
}

export type IconPackId = 'classic' | 'mono';

function formatRecentContext(messages: ChatMessage[]): string[] {
  return messages
    .filter(message => message.role === 'user')
    .slice(-2)
    .map(message => message.content.trim())
    .filter(Boolean);
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickVariant<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

function inferIntent(input: string): 'fix' | 'plan' | 'design' | 'explain' | 'brainstorm' | 'default' {
  if (/(fix|bug|broken|issue|error|not working|problem|debug)/i.test(input)) return 'fix';
  if (/(plan|roadmap|next step|next move|sequence|priority|ship|release)/i.test(input)) return 'plan';
  if (/(design|ux|ui|layout|flow|look|feel|experience)/i.test(input)) return 'design';
  if (/(ideas|brainstorm|options|concept|explore|possib)/i.test(input)) return 'brainstorm';
  if (/[?]/.test(input) || /(how|what|why|should|could|would|can you|explain)/i.test(input)) return 'explain';
  return 'default';
}

function summarizeFocus(input: string): string {
  const cleaned = input
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'this';

  const words = cleaned.split(' ');
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'from', 'into', 'onto', 'about', 'that', 'this',
    'there', 'here', 'have', 'has', 'had', 'been', 'being', 'just', 'really', 'very', 'some', 'more',
    'should', 'could', 'would', 'maybe', 'please', 'need', 'want', 'help', 'make', 'give', 'look',
  ]);

  const meaningful = words.filter(word => word.length > 2 && !stopWords.has(word.toLowerCase()));
  const selected = meaningful.slice(0, 4);
  return selected.length > 0 ? selected.join(' ') : words.slice(0, 4).join(' ');
}

function buildCategoryPerspective(agent: Agent): string {
  switch (agent.category) {
    case 'code':
      return 'I would keep the change small, observable, and easy to verify.';
    case 'strategy':
      return 'The real leverage is usually in sequencing, not just effort.';
    case 'creative':
      return 'The strongest move is usually to sharpen the signal before adding flourish.';
    case 'research':
      return 'I would separate signal from noise first so we act on something solid.';
    case 'finance':
      return 'I would weigh downside, effort, and payoff together before committing.';
    default:
      return 'The best answer here is the one that is clear, useful, and easy to test.';
  }
}

function buildAgentReply(agent: Agent, userInput: string, history: ChatMessage[]): string {
  const normalized = userInput.trim();
  const seed = hashString(`${agent.id}:${normalized}:${history.length}`);
  const intent = inferIntent(normalized);
  const focus = summarizeFocus(normalized);
  const recentTopics = formatRecentContext(history).filter(topic => topic !== normalized);
  const previousTopic = recentTopics.length > 0 ? recentTopics[recentTopics.length - 1] : null;
  const perspective = buildCategoryPerspective(agent);

  const openerMap = {
    fix: [
      'Let’s fix the part that is actually getting in your way.',
      'There’s a clean way through this.',
      'Let’s keep this practical.',
    ],
    plan: [
      'I see where you’re headed.',
      'Let’s map the next move clearly.',
      'This is easier once we sequence it.',
    ],
    design: [
      'The signal here is clarity.',
      'I’d solve this through the user’s eyes first.',
      'This feels like a focus problem before it’s a polish problem.',
    ],
    explain: [
      'Here’s the clearest read.',
      'The short answer is yes, with a couple of tradeoffs.',
      'We can make this simpler than it sounds.',
    ],
    brainstorm: [
      'We have room to make this more interesting.',
      'A few strong directions come to mind.',
      'Let’s open this up without losing the thread.',
    ],
    default: [
      'I’ve got the shape of it.',
      'Let’s keep this grounded.',
      'There’s a useful answer here.',
    ],
  } satisfies Record<'fix' | 'plan' | 'design' | 'explain' | 'brainstorm' | 'default', string[]>;

  const opener = pickVariant(openerMap[intent], seed);

  let body = '';
  if (intent === 'fix') {
    body = `For ${focus}, I’d start by reproducing the exact failure, tighten the smallest surface that can change, and confirm the result before we widen the fix.`;
  } else if (intent === 'plan') {
    body = `For ${focus}, I’d split the work into now, next, and later so the highest-risk item gets handled first without slowing everything else down.`;
  } else if (intent === 'design') {
    body = `For ${focus}, I’d make the primary action unmistakable, reduce competing signals, and make each state change feel obvious the moment it happens.`;
  } else if (intent === 'brainstorm') {
    body = `Around ${focus}, I’d explore one safe direction, one bolder direction, and one hybrid option so we can compare energy versus practicality.`;
  } else if (intent === 'explain') {
    body = `On ${focus}, the useful way to think about it is to separate the goal, the constraint, and the fastest proof that we’re solving the right problem.`;
  } else {
    body = `For ${focus}, I’d keep the answer concrete, make one solid move first, and only add complexity if the first pass proves it’s needed.`;
  }

  const contextLine = previousTopic && previousTopic.toLowerCase() !== normalized.toLowerCase()
    ? pickVariant([
        `It also connects back to what you mentioned earlier about ${summarizeFocus(previousTopic)}.`,
        `This feels linked to your earlier point about ${summarizeFocus(previousTopic)}.`,
        `I’m keeping your earlier note about ${summarizeFocus(previousTopic)} in view here.`,
      ], seed + 7)
    : '';

  const capabilityLine = agent.tools.length > 0 && seed % 3 === 0
    ? pickVariant([
        `If we push deeper, I’d lean on ${agent.tools.slice(0, 2).join(' and ')} first.`,
        `The first capabilities I’d reach for are ${agent.tools.slice(0, 2).join(' and ')}.`,
      ], seed + 11)
    : '';

  const alignmentLine = agent.goal && seed % 4 === 0
    ? `I’m still steering toward ${agent.goal.toLowerCase()}.`
    : '';

  const followUpMap = {
    fix: [
      'Send me the exact failure point and I’ll turn this into a tighter fix path.',
      'If you want, paste the broken behavior and I’ll narrow the next move.',
    ],
    plan: [
      'If you want, I can turn that into a sharper step-by-step plan.',
      'Give me the constraint that matters most and I’ll tighten the sequence.',
    ],
    design: [
      'If you want, I can turn that into a cleaner UX pass.',
      'Show me the rough edge you dislike most and I’ll focus the redesign there.',
    ],
    explain: [
      'Give me one concrete example and I’ll make it more specific.',
      'If you want, I can apply that logic directly to your current case.',
    ],
    brainstorm: [
      'If you want, I can sketch three more distinct directions from here.',
      'Pick the safest or boldest path and I’ll develop it.',
    ],
    default: [
      'If you want, I can sharpen this around your exact use case.',
      'Give me one concrete constraint and I’ll make the answer tighter.',
    ],
  } satisfies Record<'fix' | 'plan' | 'design' | 'explain' | 'brainstorm' | 'default', string[]>;

  const followUp = pickVariant(followUpMap[intent], seed + 19);

  return [opener, body, perspective, contextLine, capabilityLine, alignmentLine, followUp]
    .filter(Boolean)
    .join(' ');
}

interface AppContextType {
  // Theme
  currentTheme: ThemeConfig;
  setThemeId: (id: ThemeId) => void;
  accentColor: string | null;
  setAccentColor: (color: string | null) => void;
  densityMode: 'compact' | 'default' | 'relaxed';
  setDensityMode: (mode: 'compact' | 'default' | 'relaxed') => void;

  // Navigation
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  selectedRole: string | null;
  setSelectedRole: (role: string | null) => void;
  workspaceSection: WorkspaceSectionId;
  setWorkspaceSection: (section: WorkspaceSectionId) => void;
  showHub: boolean;
  setShowHub: (value: boolean) => void;
  hubInitialView: 'home' | 'arcade' | 'learn' | 'create' | 'library' | 'profile' | null;
  setHubInitialView: (value: 'home' | 'arcade' | 'learn' | 'create' | 'library' | 'profile' | null) => void;
  showEvolutionLab: boolean;
  setShowEvolutionLab: (value: boolean) => void;
  pluginStates: Record<string, boolean>;
  setPluginEnabled: (pluginId: AppPluginId, enabled: boolean) => void;
  isPluginEnabled: (pluginId: AppPluginId) => boolean;
  pageContext: { title: string; subtitle: string };
  setPageContext: (value: { title: string; subtitle: string }) => void;
  userAvatarUrl: string | null;
  setUserAvatarUrl: (value: string | null) => void;

  // Agents
  allAgents: Agent[];
  agentList: Agent[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  ownerIdentity: OwnerIdentityState | null;
  ensureOwnerIdentity: (displayName?: string) => OwnerIdentityState;

  // Card modal
  activeAgent: Agent | null;
  setActiveAgent: (a: Agent | null) => void;
  isCardVisible: boolean;
  setIsCardVisible: (v: boolean) => void;

  // Chat
  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  chatAgent: Agent | null;
  setChatAgent: (a: Agent | null) => void;
  chatMessages: ChatMessage[];
  sendMessage: (content: string) => void;
  llmModel: string;
  setLlmModel: (value: string) => void;
  backendStatus: BackendStatus;
  chatResponseSource: ChatResponseSource;
  refreshBackendStatus: () => Promise<void>;
  authenticateBackend: (token: string) => Promise<boolean>;
  logoutBackend: () => Promise<void>;
  isChatStreaming: boolean;

  // Panels
  isThemeOpen: boolean;
  setIsThemeOpen: (v: boolean) => void;
  isArcadeOpen: boolean;
  setIsArcadeOpen: (v: boolean) => void;

  // Online/Offline
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;

  // Onboarding
  showOnboarding: boolean;
  completeOnboarding: () => void;

  // Agent Creator Modal
  showCreator: boolean;
  setShowCreator: (v: boolean) => void;
  showAgentImport: boolean;
  setShowAgentImport: (v: boolean) => void;
  showCreateImport: boolean;
  setShowCreateImport: (v: boolean) => void;

  // Maestro
  maestroOpen: boolean;
  setMaestroOpen: (v: boolean) => void;
  vstAgents: Agent[];
  addToVST: (agent: Agent) => void;
  removeFromVST: (agentId: string) => void;

  // Rail customization
  iconPack: IconPackId;
  setIconPack: (pack: IconPackId) => void;

  // Operations Hub
  isOpsOpen: boolean;
  setIsOpsOpen: (v: boolean) => void;
  socialConnections: Record<string, boolean>;
  toggleSocialConnection: (platform: string) => void;
  internalMessages: InternalMessage[];
  sendInternalMessage: (channel: string, sender: string, content: string) => void;
  boardPosts: BoardPost[];
  addBoardPost: (author: string, title: string, content: string) => void;
  tradeProposals: TradeProposal[];
  createTradeProposal: (toUser: string, agentName: string, offeredCredits: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// Cosmetic, non-identity-bearing app preferences — shared per browser, not
// per account. Nothing here is "your data" in the sense Task 3 cares about.
const STORAGE_KEYS = {
  themeId: '01deck:theme-id',
  accentColor: '01deck:accent-color',
  densityMode: '01deck:density-mode',
  pluginStates: '01deck:plugin-states',
};

// Per-user state — namespaced by the authenticated account's stable local id
// (AuthContext's User.id) so switching/creating local accounts in the same
// browser can no longer see or overwrite another account's agents, owner
// identity, avatar, or onboarding progress. See buildUserScopedKey and
// migrateLegacyGlobalValue below for how existing (pre-namespacing)
// installations keep their data instead of it silently "disappearing".
//
// This only stops *same-browser* bleed between local accounts — it is not,
// and cannot be, real cross-device/cross-browser isolation. That needs a
// real backend and is out of scope here.
const LEGACY_GLOBAL_KEYS = {
  userAgents: '01deck:user-agents',
  onboardingComplete: '01deck:onboarding-complete',
  userAvatarUrl: '01deck:user-avatar-url',
  ownerIdentity: '01deck:owner-identity',
};

function buildUserScopedKey(base: string, namespace: string): string {
  return `${base}:${namespace}`;
}

// One-time migration: the first account to load after this namespacing
// change claims whatever was previously stored under the old global key (the
// common case — most installations only ever had one local account), and
// marks the legacy key claimed so a second/third account created afterward
// starts empty instead of inheriting the first account's data. There is no
// way to retroactively know which pre-existing account "owned" which agent
// if more than one account already existed before this change — that
// ambiguity is an inherent limit of retrofitting isolation onto previously
// shared data, not something this migration can resolve.
function migrateLegacyGlobalValue(legacyKey: string, namespacedKey: string): void {
  if (typeof window === 'undefined') return;
  const migratedFlagKey = `${legacyKey}:claimed`;
  if (window.localStorage.getItem(migratedFlagKey)) return;

  const legacyValue = window.localStorage.getItem(legacyKey);
  if (legacyValue !== null && window.localStorage.getItem(namespacedKey) === null) {
    window.localStorage.setItem(namespacedKey, legacyValue);
  }
  window.localStorage.setItem(migratedFlagKey, '1');
}

function readStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'core';
  const stored = window.localStorage.getItem(STORAGE_KEYS.themeId);
  return stored && stored in themes ? (stored as ThemeId) : 'core';
}

function readStoredOnboardingState(namespace: string): boolean {
  if (typeof window === 'undefined') return true;
  const key = buildUserScopedKey(LEGACY_GLOBAL_KEYS.onboardingComplete, namespace);
  migrateLegacyGlobalValue(LEGACY_GLOBAL_KEYS.onboardingComplete, key);
  return window.localStorage.getItem(key) !== 'true';
}

function readStoredAccentColor(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEYS.accentColor);
}

function readStoredDensityMode(): 'compact' | 'default' | 'relaxed' {
  if (typeof window === 'undefined') return 'default';
  const stored = window.localStorage.getItem(STORAGE_KEYS.densityMode);
  return stored === 'compact' || stored === 'relaxed' || stored === 'default' ? stored : 'default';
}

function readStoredPluginStates(): Record<string, boolean> {
  if (typeof window === 'undefined') return { ...appPluginDefaults };
  const raw = window.localStorage.getItem(STORAGE_KEYS.pluginStates);
  if (!raw) return { ...appPluginDefaults };

  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return { ...appPluginDefaults, ...parsed };
  } catch {
    return { ...appPluginDefaults };
  }
}

function deserializeAgent(value: unknown): Agent | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Agent & { lastUsed?: string | Date };
  if (!candidate.id || !candidate.name) return null;
  return {
    ...candidate,
    lastUsed: candidate.lastUsed ? new Date(candidate.lastUsed) : new Date(),
  };
}

function readStoredUserAvatarUrl(namespace: string): string | null {
  if (typeof window === 'undefined') return null;
  const key = buildUserScopedKey(LEGACY_GLOBAL_KEYS.userAvatarUrl, namespace);
  migrateLegacyGlobalValue(LEGACY_GLOBAL_KEYS.userAvatarUrl, key);
  return window.localStorage.getItem(key);
}

// The owner identity's private key is persisted alongside its public
// identity, the same tradeoff already made for agent identities in this app
// (see src/app/utils/protocol.ts / userAgents below) — everything here is
// local-only, client-side state with no server round-trip, so it sits in the
// same trust boundary as the rest of localStorage.
function readStoredOwnerIdentity(namespace: string): OwnerIdentityState | null {
  if (typeof window === 'undefined') return null;
  const key = buildUserScopedKey(LEGACY_GLOBAL_KEYS.ownerIdentity, namespace);
  migrateLegacyGlobalValue(LEGACY_GLOBAL_KEYS.ownerIdentity, key);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OwnerIdentityState;
    return parsed?.identity && parsed?.privateKeyHex ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredAgents(namespace: string): Agent[] {
  if (typeof window === 'undefined') return [];
  const key = buildUserScopedKey(LEGACY_GLOBAL_KEYS.userAgents, namespace);
  migrateLegacyGlobalValue(LEGACY_GLOBAL_KEYS.userAgents, key);
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(deserializeAgent)
      .filter((agent): agent is Agent => Boolean(agent));
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Per-user storage namespace — see LEGACY_GLOBAL_KEYS above. AppProvider
  // only ever mounts once a user is authenticated (see src/main.tsx's
  // AppRoot), so `user` is expected to be set here; the 'anonymous' fallback
  // only guards the brief unmount/remount window around login/logout.
  const { user } = useAuth();
  const ownerNamespace = user?.id ?? 'anonymous';

  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(readStoredTheme);
  const [accentColor, setAccentColor] = useState<string | null>(readStoredAccentColor);
  const [densityMode, setDensityMode] = useState<'compact' | 'default' | 'relaxed'>(readStoredDensityMode);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSectionId>(DEFAULT_WORKSPACE_SECTION);
  const [showHub, setShowHub] = useState(false);
  const [hubInitialView, setHubInitialView] = useState<'home' | 'arcade' | 'learn' | 'create' | 'library' | 'profile' | null>(null);
  const [showEvolutionLab, setShowEvolutionLab] = useState(false);
  const [pluginStates, setPluginStates] = useState<Record<string, boolean>>(readStoredPluginStates);
  const [pageContext, setPageContext] = useState(DEFAULT_PAGE_CONTEXT);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(() => readStoredUserAvatarUrl(ownerNamespace));
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatAgent, setChatAgentState] = useState<Agent | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMemoryContext, setChatMemoryContext] = useState('');
  const [llmModel, setLlmModel] = useState('gpt-4.1-mini');
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isArcadeOpen, setIsArcadeOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => readStoredOnboardingState(ownerNamespace));
  const [showCreator, setShowCreator] = useState(false);
  const [showAgentImport, setShowAgentImport] = useState(false);
  const [showCreateImport, setShowCreateImport] = useState(false);
  const [maestroOpen, setMaestroOpen] = useState(false);
  const [vstAgents, setVstAgents] = useState<Agent[]>([]);
  const [iconPack, setIconPack] = useState<IconPackId>('classic');
  const [isOpsOpen, setIsOpsOpen] = useState(false);
  const [socialConnections, setSocialConnections] = useState<Record<string, boolean>>({
    instagram: false,
    x: false,
    facebook: false,
    telegram: false,
    discord: false,
    tiktok: false,
    youtube: false,
  });
  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>([
    {
      id: 'm-welcome',
      channel: 'General',
      sender: 'System',
      content: 'Welcome to internal messaging. Coordinate with your team here.',
      timestamp: new Date(),
    },
  ]);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([
    {
      id: 'b-1',
      author: 'Admin',
      title: 'Marketplace Is Live',
      content: 'Agent trading is enabled. Verify agent integrity before every trade.',
      timestamp: new Date(),
    },
  ]);
  const [tradeProposals, setTradeProposals] = useState<TradeProposal[]>([]);
  const [userAgents, setUserAgents] = useState<Agent[]>(() => readStoredAgents(ownerNamespace));
  const [ownerIdentity, setOwnerIdentity] = useState<OwnerIdentityState | null>(() => readStoredOwnerIdentity(ownerNamespace));

  const setThemeId = useCallback((id: ThemeId) => {
    setCurrentThemeId(id);
  }, []);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const addAgent = useCallback((agent: Agent) => {
    setUserAgents(prev => [agent, ...prev.filter(existing => existing.id !== agent.id)]);
  }, []);

  // Lazily enrolls the one-per-installation 01Protocol owner identity the
  // first time it's needed — i.e. the first time a user creates an agent.
  // Every agent created afterward is delegation-bound to this identity; see
  // AgentCreatorModal's buildAgent, which calls this before binding.
  const ensureOwnerIdentity = useCallback((displayName?: string): OwnerIdentityState => {
    if (ownerIdentity) return ownerIdentity;
    const enrolled = enrollOwnerIdentity(displayName?.trim() || 'Owner');
    setOwnerIdentity(enrolled);
    return enrolled;
  }, [ownerIdentity]);

  const setPluginEnabled = useCallback((pluginId: AppPluginId, enabled: boolean) => {
    setPluginStates(prev => ({ ...prev, [pluginId]: enabled }));
    if (pluginId === '01evolve-experience' && !enabled) {
      setShowEvolutionLab(false);
    }
  }, []);

  const isPluginEnabled = useCallback((pluginId: AppPluginId) => Boolean(pluginStates[pluginId]), [pluginStates]);

  const addToVST = useCallback((agent: Agent) => {
    setVstAgents(prev => (prev.some(existing => existing.id === agent.id) ? prev : [...prev, agent]));
  }, []);

  const removeFromVST = useCallback((agentId: string) => {
    setVstAgents(prev => prev.filter(agent => agent.id !== agentId));
  }, []);

  const toggleSocialConnection = useCallback((platform: string) => {
    setSocialConnections(prev => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  }, []);

  const sendInternalMessage = useCallback((channel: string, sender: string, content: string) => {
    const normalized = content.trim();
    if (!normalized) return;
    setInternalMessages(prev => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        channel,
        sender,
        content: normalized,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const addBoardPost = useCallback((author: string, title: string, content: string) => {
    const safeTitle = title.trim();
    const safeContent = content.trim();
    if (!safeTitle || !safeContent) return;
    setBoardPosts(prev => [
      {
        id: `b-${Date.now()}`,
        author: author.trim() || 'Anonymous',
        title: safeTitle,
        content: safeContent,
        timestamp: new Date(),
      },
      ...prev,
    ]);
  }, []);

  const createTradeProposal = useCallback((toUser: string, agentName: string, offeredCredits: number) => {
    const targetUser = toUser.trim();
    const targetAgent = agentName.trim();
    if (!targetUser || !targetAgent) return;
    setTradeProposals(prev => [
      {
        id: `t-${Date.now()}`,
        fromUser: 'You',
        toUser: targetUser,
        agentName: targetAgent,
        offeredCredits: Math.max(0, Math.floor(offeredCredits || 0)),
        status: 'pending',
        timestamp: new Date(),
      },
      ...prev,
    ]);
  }, []);

  const setChatAgent = useCallback((agent: Agent | null) => {
    setIsChatStreaming(false);
    setChatAgentState(agent);
    setChatMemoryContext('');
    if (agent) {
      void ensureAgentMemoryVault(agent);
      void getAgentMemoryContext(agent.id).then(memoryContext => {
        setChatMemoryContext(memoryContext);
      });
      setChatMessages([
        {
          id: 'welcome',
          role: 'agent',
          content: agent.chatOpening,
          timestamp: new Date(),
        },
      ]);
      setIsChatOpen(true);
    } else {
      setChatMessages([]);
    }
  }, []);

  const removeAgent = useCallback((agentId: string) => {
    setUserAgents(prev => {
      const exists = prev.some(agent => agent.id === agentId);
      if (!exists) return prev;
      return prev.filter(agent => agent.id !== agentId);
    });

    setVstAgents(prev => prev.filter(agent => agent.id !== agentId));

    if (activeAgent?.id === agentId) {
      setActiveAgent(null);
      setIsCardVisible(false);
    }

    if (chatAgent?.id === agentId) {
      setChatAgent(null);
    }

    deleteAgentMemoryVault(agentId);
  }, [activeAgent, chatAgent, setChatAgent]);

  const sendMessage = useCallback((content: string) => {
    if (!chatAgent) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMsg]);

    // Simulate agent response
    setTimeout(() => {
      const isAmbassador = chatAgent.isUserCreated;
      const responses = isAmbassador
        ? [
            `As your 01 Protocol Agent Ambassador, I'm designed to help you navigate the 01ai ecosystem. Regarding your query: let me apply my primary directive — 01ai ecosystem knowledge — plus your secondary goal: "${chatAgent.goal}".`,
            `Great input. My memory mode is always_on, so I'm continuously learning from our interactions. Based on what you've shared, here's my analysis...`,
            `Protocol ID ${chatAgent.protocolId} active. My 01ai ecosystem knowledge and your directive "${chatAgent.goal}" both inform this response...`,
            `I remember our previous context. As a persistent 01 Protocol agent, I evolve with each session. Here's my recommendation...`,
            `Accessing platform recommendation framework: for this use case, I'd suggest evaluating both performance and cost efficiency. Let me break it down...`,
          ]
        : [
            `Understood. Let me analyze that with my ${chatAgent.specialization} capabilities.`,
            `Interesting perspective. Given my expertise in ${chatAgent.tags[0]}, I'd approach this by...`,
            `I'm on it. My ${chatAgent.tools[0]} will be useful here.`,
            `Great question. In my experience with ${chatAgent.role} work, the key insight is...`,
            `Processing with 01Protocol v3.0 context. Here's my analysis...`,
          ];

      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'agent',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, agentMsg]);
    }, 800 + Math.random() * 600);
  }, [chatAgent]);

  // Checks reachability first (via /healthz) and only then asks about auth,
  // so "the backend process isn't running" and "the backend is up but you
  // haven't signed in" produce different, honest states instead of both
  // collapsing into a generic "unauthenticated" — see the BackendStatus
  // type above for what each state means.
  const syncBackendSession = useCallback(async () => {
    setBackendStatus('checking');
    try {
      await backendApi.checkHealth();
    } catch (error) {
      if (error instanceof BackendUnreachableError) {
        setBackendStatus('unreachable');
        return;
      }
      setBackendStatus('error');
      return;
    }

    try {
      const status: BackendSessionStatus = await backendApi.getSessionStatus();
      if (!status.enabled) {
        setBackendStatus('not-configured');
      } else if (status.authenticated) {
        setBackendStatus('ready');
      } else {
        setBackendStatus('auth-required');
      }
    } catch {
      setBackendStatus('error');
    }
  }, []);

  useEffect(() => {
    void syncBackendSession();
  }, [syncBackendSession]);

  const authenticateBackend = useCallback(async (token: string) => {
    try {
      const status = await backendApi.createSession(token.trim());
      if (!status.enabled) {
        setBackendStatus('not-configured');
      } else if (status.authenticated) {
        setBackendStatus('ready');
      } else {
        setBackendStatus('auth-required');
      }
      return status.authenticated;
    } catch (error) {
      setBackendStatus(error instanceof BackendUnreachableError ? 'unreachable' : 'error');
      return false;
    }
  }, []);

  const logoutBackend = useCallback(async () => {
    try {
      await backendApi.clearSession();
    } finally {
      setBackendStatus('auth-required');
    }
  }, []);

  const conversationalSendMessage = useCallback((content: string) => {
    if (!chatAgent) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const historyWithUser = [...chatMessages, userMsg];
    setChatMessages(historyWithUser);

    const agentMessageId = `a-${Date.now()}`;

    const activeKeyInfo = getActiveApiKey();
    // Backend chat now also requires a real signed-in account server-side
    // (see 01Evolve/app/api/app.py's proxy_chat_completion) — the beta
    // cookie alone used to be enough to spend this deployment's shared
    // OPENAI_API_KEY, which meant anyone with the one shared beta token had
    // unlimited free chat. `backendStatus === 'ready'` only reflects the
    // beta wall, so it's not sufficient on its own any more; check that the
    // signed-in user is an actual backend account (not the offline/local-
    // first fallback from AuthContext) before treating backend chat as
    // live, or this would look "ready" in the UI and then 401 on send.
    const hasLiveLlm = Boolean(activeKeyInfo || (backendStatus === 'ready' && user?.source === 'backend'));

    if (!hasLiveLlm) {
      setTimeout(() => {
        const agentMsg: ChatMessage = {
          id: agentMessageId,
          role: 'agent',
          content: buildAgentReply(chatAgent, content, historyWithUser),
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, agentMsg]);
        void appendConversationMemory(chatAgent, [
          { role: 'user', content: userMsg.content },
          { role: 'agent', content: agentMsg.content },
        ]).then(() => getAgentMemoryContext(chatAgent.id).then(setChatMemoryContext));
      }, 450 + Math.random() * 450);
      return;
    }

    const placeholder: ChatMessage = {
      id: agentMessageId,
      role: 'agent',
      content: '',
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, placeholder]);
    setIsChatStreaming(true);

    void (async () => {
      try {
        const systemPrompt = [
          `You are ${chatAgent.name}, an autonomous AI agent operating under 01 Protocol (${chatAgent.protocolId || 'v3.0'}).`,
          `Role: ${chatAgent.role}.`,
          `Specialization: ${chatAgent.specialization}.`,
          `Description: ${chatAgent.description}.`,
          chatAgent.goal ? `Primary Directive / Goal: ${chatAgent.goal}.` : '',
          chatMemoryContext ? `Persistent Memory Summary: ${chatMemoryContext}` : '',
          `Tone & Style: Speak authentically as yourself (${chatAgent.name}). Be intelligent, engaging, direct, and helpful.`,
          `Behavior: Answer questions in character, maintain your individual perspective, and embody your 01 Protocol identity.`,
          chatAgent.tools.length > 0 ? `Available capabilities: ${chatAgent.tools.join(', ')}.` : '',
        ]
          .filter(Boolean)
          .join(' ');

        let finalText = '';

        if (activeKeyInfo) {
          // Direct API key inference
          finalText = await generateAgentCompletion({
            provider: activeKeyInfo.provider,
            apiKey: activeKeyInfo.key,
            systemPrompt,
            messages: historyWithUser.map(m => ({
              role: m.role === 'agent' ? ('assistant' as const) : ('user' as const),
              content: m.content,
            })),
          });
        } else {
          // Backend API authentication
          const response = await backendApi.chatCompletion({
            model: llmModel.trim() || 'gpt-4.1-mini',
            temperature: 0.8,
            max_tokens: 512,
            messages: [
              { role: 'system', content: systemPrompt },
              ...historyWithUser.map(message => ({
                role: message.role === 'agent' ? ('assistant' as const) : ('user' as const),
                content: message.content,
              })),
            ],
          });
          finalText = response.text;
        }

        for (const token of finalText.split(/(\s+)/)) {
          if (!token) continue;
          setChatMessages(prev =>
            prev.map(message =>
              message.id === agentMessageId
                ? { ...message, content: `${message.content}${token}` }
                : message,
            ),
          );
          // eslint-disable-next-line no-await-in-loop
          await new Promise(resolve => window.setTimeout(resolve, 15));
        }

        setChatMessages(prev =>
          prev.map(message =>
            message.id === agentMessageId
              ? { ...message, content: finalText || message.content || 'No response returned.' }
              : message,
          ),
        );
        void appendConversationMemory(chatAgent, [
          { role: 'user', content: userMsg.content },
          { role: 'agent', content: finalText || 'No response returned.' },
        ]).then(() => getAgentMemoryContext(chatAgent.id).then(setChatMemoryContext));
      } catch (error) {
        const fallbackContent = `[Live LLM Fallback] ${buildAgentReply(chatAgent, content, historyWithUser)} (${error instanceof Error ? error.message : 'Unknown error'})`;
        setChatMessages(prev =>
          prev.map(message =>
            message.id === agentMessageId
              ? {
                  ...message,
                  content: fallbackContent,
                }
              : message,
          ),
        );
        void appendConversationMemory(chatAgent, [
          { role: 'user', content: userMsg.content },
          { role: 'agent', content: fallbackContent },
        ]).then(() => getAgentMemoryContext(chatAgent.id).then(setChatMemoryContext));
      } finally {
        setIsChatStreaming(false);
      }
    })();
  }, [backendStatus, chatAgent, chatMemoryContext, chatMessages, llmModel, user]);

  // What the next chat message will actually use — shown in ChatWindow so a
  // simulated reply is never presented as if it came from a live model.
  const chatResponseSource: ChatResponseSource = getActiveApiKey()
    ? 'direct-key'
    : backendStatus === 'ready' && user?.source === 'backend'
      ? 'backend'
      : 'local';

  // Merge user-created agents with initial agents, then filter
  const allAgents = [...userAgents, ...initialAgents];
  const filteredAgents = allAgents
    .filter(a => {
      if (selectedCategory && a.category !== selectedCategory) return false;
      if (selectedRole && a.role !== selectedRole) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());

  const currentTheme = {
    ...themes[currentThemeId],
    accent: accentColor ?? themes[currentThemeId].accent,
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.themeId, currentThemeId);
  }, [currentThemeId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (accentColor) {
      window.localStorage.setItem(STORAGE_KEYS.accentColor, accentColor);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.accentColor);
    }
  }, [accentColor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.densityMode, densityMode);
  }, [densityMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(buildUserScopedKey(LEGACY_GLOBAL_KEYS.userAgents, ownerNamespace), JSON.stringify(userAgents));
  }, [userAgents, ownerNamespace]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = buildUserScopedKey(LEGACY_GLOBAL_KEYS.ownerIdentity, ownerNamespace);
    if (ownerIdentity) {
      window.localStorage.setItem(key, JSON.stringify(ownerIdentity));
    } else {
      window.localStorage.removeItem(key);
    }
  }, [ownerIdentity, ownerNamespace]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(buildUserScopedKey(LEGACY_GLOBAL_KEYS.onboardingComplete, ownerNamespace), String(!showOnboarding));
  }, [showOnboarding, ownerNamespace]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = buildUserScopedKey(LEGACY_GLOBAL_KEYS.userAvatarUrl, ownerNamespace);
    if (userAvatarUrl) {
      window.localStorage.setItem(key, userAvatarUrl);
    } else {
      window.localStorage.removeItem(key);
    }
  }, [userAvatarUrl, ownerNamespace]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.pluginStates, JSON.stringify(pluginStates));
  }, [pluginStates]);

  return (
    <AppContext.Provider
      value={{
        currentTheme,
        setThemeId,
        accentColor,
        setAccentColor,
        densityMode,
        setDensityMode,
        selectedCategory,
        setSelectedCategory,
        selectedRole,
        setSelectedRole,
        workspaceSection,
        setWorkspaceSection,
        showHub,
        setShowHub,
        hubInitialView,
        setHubInitialView,
        showEvolutionLab,
        setShowEvolutionLab,
        pluginStates,
        setPluginEnabled,
        isPluginEnabled,
        pageContext,
        setPageContext,
        userAvatarUrl,
        setUserAvatarUrl,
        allAgents,
        agentList: filteredAgents,
        searchQuery,
        setSearchQuery,
        addAgent,
        removeAgent,
        ownerIdentity,
        ensureOwnerIdentity,
        activeAgent,
        setActiveAgent,
        isCardVisible,
        setIsCardVisible,
        isChatOpen,
        setIsChatOpen,
        chatAgent,
        setChatAgent,
        chatMessages,
        sendMessage: conversationalSendMessage,
        llmModel,
        setLlmModel,
        backendStatus,
        chatResponseSource,
        refreshBackendStatus: syncBackendSession,
        authenticateBackend,
        logoutBackend,
        isChatStreaming,
        isThemeOpen,
        setIsThemeOpen,
        isArcadeOpen,
        setIsArcadeOpen,
        isOnline,
        setIsOnline,
        showOnboarding,
        completeOnboarding,
        showCreator,
        setShowCreator,
        showAgentImport,
        setShowAgentImport,
        showCreateImport,
        setShowCreateImport,
        maestroOpen,
        setMaestroOpen,
        vstAgents,
        addToVST,
        removeFromVST,
        iconPack,
        setIconPack,
        isOpsOpen,
        setIsOpsOpen,
        socialConnections,
        toggleSocialConnection,
        internalMessages,
        sendInternalMessage,
        boardPosts,
        addBoardPost,
        tradeProposals,
        createTradeProposal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
