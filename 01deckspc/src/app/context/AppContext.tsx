import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Agent, agents as initialAgents } from '../data/agents';

export type ThemeId = 'core' | 'midnight' | 'holo' | 'clean' | 'solar';

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

interface AppContextType {
  // Theme
  currentTheme: ThemeConfig;
  setThemeId: (id: ThemeId) => void;

  // Navigation
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  selectedRole: string | null;
  setSelectedRole: (role: string | null) => void;

  // Agents
  agentList: Agent[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addAgent: (agent: Agent) => void;

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

  // Agent Import Flow
  showAgentImport: boolean;
  setShowAgentImport: (v: boolean) => void;

  // Maestro Extension
  maestroEnabled: boolean;
  setMaestroEnabled: (v: boolean) => void;
  maestroOpen: boolean;
  setMaestroOpen: (v: boolean) => void;
  vstAgents: Agent[];
  addToVST: (agent: Agent) => void;
  removeFromVST: (agentId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>('core');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatAgent, setChatAgentState] = useState<Agent | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isArcadeOpen, setIsArcadeOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [showAgentImport, setShowAgentImport] = useState(false);
  const [userAgents, setUserAgents] = useState<Agent[]>([]);
  const [maestroEnabled, setMaestroEnabled] = useState(false);
  const [maestroOpen, setMaestroOpen] = useState(false);
  const [vstAgents, setVstAgents] = useState<Agent[]>([]);

  const setThemeId = useCallback((id: ThemeId) => {
    setCurrentThemeId(id);
  }, []);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const addAgent = useCallback((agent: Agent) => {
    setUserAgents(prev => [agent, ...prev]);
  }, []);

  const setChatAgent = useCallback((agent: Agent | null) => {
    setChatAgentState(agent);
    if (agent) {
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

  const addToVST = useCallback((agent: Agent) => {
    setVstAgents(prev => [...prev, agent]);
  }, []);

  const removeFromVST = useCallback((agentId: string) => {
    setVstAgents(prev => prev.filter(a => a.id !== agentId));
  }, []);

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

  return (
    <AppContext.Provider
      value={{
        currentTheme: themes[currentThemeId],
        setThemeId,
        selectedCategory,
        setSelectedCategory,
        selectedRole,
        setSelectedRole,
        agentList: filteredAgents,
        searchQuery,
        setSearchQuery,
        addAgent,
        activeAgent,
        setActiveAgent,
        isCardVisible,
        setIsCardVisible,
        isChatOpen,
        setIsChatOpen,
        chatAgent,
        setChatAgent,
        chatMessages,
        sendMessage,
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
        maestroEnabled,
        setMaestroEnabled,
        maestroOpen,
        setMaestroOpen,
        vstAgents,
        addToVST,
        removeFromVST,
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