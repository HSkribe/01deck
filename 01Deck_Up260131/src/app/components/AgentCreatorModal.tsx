import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ArrowRight, Cpu, Check, RefreshCw, User, Palette, Brain,
  Wrench, Database, Settings, Sparkles, Play, ChevronRight,
  ChevronLeft, RotateCcw, Save, Zap, MessageSquare, Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent } from '../data/agents';
import { ProceduralAvatar } from './ProceduralAvatar';
import { generateAvatarDataUrl, AvatarStyle } from '../utils/avatarUtils';

// ═══════════════════════════════════════════════════════════
//  PRESETS & TEMPLATES
// ═══════════════════════════════════════════════════════════

interface AgentTemplate {
  name: string;
  description: string;
  icon: string;
  category: string;
  role: string;
  goal: string;
  stats: Record<string, number>;
  personality: Record<string, number>;
  tools: string[];
  style: AvatarStyle;
  hue?: number;
}

const TEMPLATES: AgentTemplate[] = [
  {
    name: 'Intelligence Scout',
    description: 'Master of research, data gathering, and trend analysis',
    icon: '🔍',
    category: 'research',
    role: 'Intelligence Scout',
    goal: 'Discover insights, track patterns, and map knowledge across domains',
    stats: { intelligence: 95, speed: 85, memory: 90, adaptability: 75 },
    personality: { analytical: 90, creative: 40, assertive: 60, empathetic: 50 },
    tools: ['Web Crawler', 'NLP Analyzer', 'Data Miner', 'Trend Tracker'],
    style: 'futuristic',
    hue: 210,
  },
  {
    name: 'Creative Visionary',
    description: 'Innovative thinker specializing in content and design',
    icon: '🎨',
    category: 'creative',
    role: 'Creative Director',
    goal: 'Generate original ideas, craft compelling narratives, and design experiences',
    stats: { intelligence: 80, speed: 70, memory: 75, adaptability: 95 },
    personality: { analytical: 50, creative: 95, assertive: 70, empathetic: 85 },
    tools: ['Idea Generator', 'Story Crafter', 'Visual Designer', 'Brand Builder'],
    style: 'abstract',
    hue: 270,
  },
  {
    name: 'Code Architect',
    description: 'Expert programmer and system designer',
    icon: '⚡',
    category: 'code',
    role: 'Software Architect',
    goal: 'Build robust systems, write clean code, and solve complex technical challenges',
    stats: { intelligence: 92, speed: 88, memory: 85, adaptability: 80 },
    personality: { analytical: 95, creative: 60, assertive: 75, empathetic: 45 },
    tools: ['Code Generator', 'Debugger', 'Architecture Planner', 'API Designer'],
    style: 'neon',
    hue: 150,
  },
  {
    name: 'Strategic Advisor',
    description: 'Business strategy and decision-making specialist',
    icon: '🧭',
    category: 'strategy',
    role: 'Strategic Planner',
    goal: 'Analyze markets, optimize decisions, and chart growth paths',
    stats: { intelligence: 88, speed: 75, memory: 90, adaptability: 85 },
    personality: { analytical: 85, creative: 70, assertive: 90, empathetic: 65 },
    tools: ['Market Analyzer', 'Risk Calculator', 'Growth Modeler', 'Competitor Tracker'],
    style: 'minimal',
    hue: 40,
  },
  {
    name: 'Data Scientist',
    description: 'Analytics, modeling, and insight extraction expert',
    icon: '📊',
    category: 'data',
    role: 'Data Analyst',
    goal: 'Transform raw data into actionable insights and predictive models',
    stats: { intelligence: 94, speed: 80, memory: 92, adaptability: 70 },
    personality: { analytical: 98, creative: 55, assertive: 65, empathetic: 50 },
    tools: ['Data Parser', 'ML Modeler', 'Visualization Engine', 'Statistics Suite'],
    style: 'futuristic',
    hue: 190,
  },
  {
    name: 'Blank Canvas',
    description: 'Start from scratch and build your perfect agent',
    icon: '✨',
    category: 'research',
    role: 'Custom Agent',
    goal: '',
    stats: { intelligence: 80, speed: 80, memory: 80, adaptability: 80 },
    personality: { analytical: 50, creative: 50, assertive: 50, empathetic: 50 },
    tools: [],
    style: 'futuristic',
  },
];

const AVAILABLE_TOOLS = [
  'Web Crawler', 'NLP Analyzer', 'Data Miner', 'Trend Tracker',
  'Idea Generator', 'Story Crafter', 'Visual Designer', 'Brand Builder',
  'Code Generator', 'Debugger', 'Architecture Planner', 'API Designer',
  'Market Analyzer', 'Risk Calculator', 'Growth Modeler', 'Competitor Tracker',
  'Data Parser', 'ML Modeler', 'Visualization Engine', 'Statistics Suite',
  'Memory Manager', 'Context Builder', 'Learning Engine', 'Protocol Registry',
  'Chat Interface', 'Voice Synthesis', 'Sentiment Analyzer', 'Translation Engine',
];

const CATEGORIES = [
  { id: 'research', label: 'Research', icon: '🔬' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'code', label: 'Engineering', icon: '💻' },
  { id: 'strategy', label: 'Strategy', icon: '🧭' },
  { id: 'comms', label: 'Communications', icon: '💬' },
  { id: 'finance', label: 'Finance & Legal', icon: '⚖️' },
  { id: 'data', label: 'Data & Analytics', icon: '📊' },
];

const STYLES: { id: AvatarStyle; label: string; description: string }[] = [
  { id: 'futuristic', label: 'Futuristic', description: 'Tech circuits & hexagonal grids' },
  { id: 'abstract', label: 'Abstract', description: 'Organic flows & diamond eyes' },
  { id: 'neon', label: 'Neon', description: 'High contrast neon aesthetic' },
  { id: 'minimal', label: 'Minimal', description: 'Clean & sophisticated' },
];

const COLOR_PALETTES = [
  { label: 'Void Blue', hue: 210, description: 'Deep space intelligence' },
  { label: 'Solar Gold', hue: 40, description: 'Warm optimistic energy' },
  { label: 'Neon Violet', hue: 270, description: 'Creative electric power' },
  { label: 'Emerald', hue: 150, description: 'Growth & precision' },
  { label: 'Crimson', hue: 0, description: 'Bold decisive force' },
  { label: 'Arctic', hue: 190, description: 'Cool analytical clarity' },
  { label: 'Amber', hue: 30, description: 'Strategic warmth' },
  { label: 'Magenta', hue: 300, description: 'Innovative edge' },
];

type Tab = 'template' | 'identity' | 'appearance' | 'personality' | 'capabilities' | 'memory';
type Screen = 'creator' | 'generating' | 'success';

const GEN_STEPS = [
  { label: 'Initializing 01 Protocol v3.0', duration: 500 },
  { label: 'Encoding neural architecture', duration: 600 },
  { label: 'Generating identity hash', duration: 700 },
  { label: 'Compiling capability matrix', duration: 600 },
  { label: 'Rendering visual identity', duration: 800 },
  { label: 'Finalizing agent bundle', duration: 500 },
];

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function AgentCreatorModal() {
  const { showCreator, setShowCreator, currentTheme: t, addAgent, setChatAgent } = useApp();

  // Screen & Navigation
  const [screen, setScreen] = useState<Screen>('creator');
  const [currentTab, setCurrentTab] = useState<Tab>('template');

  // Identity
  const [agentName, setAgentName] = useState('');
  const [agentRole, setAgentRole] = useState('');
  const [agentGoal, setAgentGoal] = useState('');
  const [agentCategory, setAgentCategory] = useState('research');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  // Appearance
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('futuristic');
  const [avatarHue, setAvatarHue] = useState<number | undefined>(210);
  const [avatarSeed, setAvatarSeed] = useState(0);
  const [eyeSize, setEyeSize] = useState(1);
  const [eyeSpacing, setEyeSpacing] = useState(1);
  const [glowIntensity, setGlowIntensity] = useState(1);
  const [patternDensity, setPatternDensity] = useState(1);

  // Personality Traits (0-100)
  const [analytical, setAnalytical] = useState(50);
  const [creative, setCreative] = useState(50);
  const [assertive, setAssertive] = useState(50);
  const [empathetic, setEmpathetic] = useState(50);

  // Stats (0-100)
  const [intelligence, setIntelligence] = useState(80);
  const [speed, setSpeed] = useState(80);
  const [memory, setMemory] = useState(80);
  const [adaptability, setAdaptability] = useState(80);
  const [statPoints, setStatPoints] = useState(20); // Bonus points to allocate

  // Capabilities
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [memoryMode, setMemoryMode] = useState<'always_on' | 'session_only' | 'manual'>('always_on');
  const [responseStyle, setResponseStyle] = useState<'detailed' | 'concise' | 'adaptive'>('adaptive');

  // Generation
  const [genStep, setGenStep] = useState(-1);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ───────────────────────────────────────────────────────────
  //  TEMPLATE APPLICATION
  // ───────────────────────────────────────────────────────────

  const applyTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setAgentName(template.name !== 'Blank Canvas' ? template.name : '');
    setAgentRole(template.role);
    setAgentGoal(template.goal);
    setAgentCategory(template.category);
    setAvatarStyle(template.style);
    setAvatarHue(template.hue);
    setAnalytical(template.personality.analytical);
    setCreative(template.personality.creative);
    setAssertive(template.personality.assertive);
    setEmpathetic(template.personality.empathetic);
    setIntelligence(template.stats.intelligence);
    setSpeed(template.stats.speed);
    setMemory(template.stats.memory);
    setAdaptability(template.stats.adaptability);
    setSelectedTools(template.tools);
    setCurrentTab('identity');
  };

  // ───────────────────────────────────────────────────────────
  //  STAT ALLOCATION
  // ───────────────────────────────────────────────────────────

  const totalAllocated = intelligence + speed + memory + adaptability;
  const maxTotal = 320 + statPoints;
  const remainingPoints = maxTotal - totalAllocated;

  const adjustStat = (
    current: number,
    setter: (v: number) => void,
    delta: number
  ) => {
    const newVal = Math.max(0, Math.min(100, current + delta));
    if (delta > 0 && remainingPoints <= 0) return;
    setter(newVal);
  };

  // ───────────────────────────────────────────────────────────
  //  VALIDATION
  // ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!agentName.trim() || agentName.trim().length < 2) {
      errs.name = 'Name required (min 2 characters)';
    }
    if (!agentRole.trim()) {
      errs.role = 'Role required';
    }
    if (!agentGoal.trim() || agentGoal.trim().length < 10) {
      errs.goal = 'Goal required (min 10 characters)';
    }
    if (selectedTools.length === 0) {
      errs.tools = 'Select at least one tool';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ───────────────────────────────────────────────────────────
  //  GENERATION & FINALIZATION
  // ───────────────────────────────────────────────────────────

  const handleGenerate = () => {
    if (!validate()) {
      // Jump to first tab with error
      if (errors.name || errors.role || errors.goal) setCurrentTab('identity');
      else if (errors.tools) setCurrentTab('capabilities');
      return;
    }
    setScreen('generating');
    setGenStep(0);
  };

  useEffect(() => {
    if (screen !== 'generating' || genStep < 0) return;
    if (genStep >= GEN_STEPS.length) {
      // Done
      setTimeout(() => {
        const portrait = generateAvatarDataUrl({
          name: agentName.trim().toUpperCase(),
          role: agentRole,
          goal: agentGoal,
          seed: avatarSeed,
          style: avatarStyle,
          hueOverride: avatarHue,
        });
        const agent = buildAgent(portrait);
        setCreatedAgent(agent);
        addAgent(agent);
        setScreen('success');
      }, 300);
      return;
    }
    const delay = GEN_STEPS[genStep].duration;
    const timer = setTimeout(() => setGenStep(s => s + 1), delay);
    return () => clearTimeout(timer);
  }, [screen, genStep]);

  const buildAgent = (portrait: string): Agent => {
    const name = agentName.trim().toUpperCase();
    const serial = Date.now();
    return {
      id: `user-${serial}`,
      name,
      category: agentCategory,
      role: agentRole,
      description: agentGoal.trim(),
      specialization: `${agentRole} · 01ai Ecosystem`,
      lastUsed: new Date(),
      rarity: 'common',
      rarityCount: '1/1',
      portrait,
      tools: selectedTools,
      memoryNotes: `Memory mode: ${memoryMode}. Response style: ${responseStyle}.`,
      online: true,
      tags: ['01protocol', agentCategory, 'custom'],
      stats: [
        { label: 'Intelligence', value: intelligence },
        { label: 'Speed', value: speed },
        { label: 'Memory', value: memory },
        { label: 'Adaptability', value: adaptability },
      ],
      protocolVersion: '01P v3.0',
      protocolId: `PRO-U${String(serial).slice(-4)}-${name}`,
      chatOpening: `I'm ${name}. ${agentGoal.trim()} Let's get started.`,
      isUserCreated: true,
      goal: agentGoal.trim(),
      memoryMode,
      serial: 1,
      totalSupply: 1,
      isVerified: true,
    };
  };

  const reset = () => {
    setScreen('creator');
    setCurrentTab('template');
    setAgentName('');
    setAgentRole('');
    setAgentGoal('');
    setAgentCategory('research');
    setSelectedTemplate(null);
    setAvatarStyle('futuristic');
    setAvatarHue(210);
    setAvatarSeed(0);
    setEyeSize(1);
    setEyeSpacing(1);
    setGlowIntensity(1);
    setPatternDensity(1);
    setAnalytical(50);
    setCreative(50);
    setAssertive(50);
    setEmpathetic(50);
    setIntelligence(80);
    setSpeed(80);
    setMemory(80);
    setAdaptability(80);
    setStatPoints(20);
    setSelectedTools([]);
    setMemoryMode('always_on');
    setResponseStyle('adaptive');
    setGenStep(-1);
    setCreatedAgent(null);
    setErrors({});
  };

  const handleClose = () => {
    setShowCreator(false);
    setTimeout(reset, 400);
  };

  const handleOpenAgent = () => {
    if (createdAgent) setChatAgent(createdAgent);
    handleClose();
  };

  if (!showCreator) return null;

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'template', label: 'Template', icon: Sparkles },
    { id: 'identity', label: 'Identity', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'personality', label: 'Personality', icon: Brain },
    { id: 'capabilities', label: 'Capabilities', icon: Wrench },
    { id: 'memory', label: 'Memory', icon: Database },
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="creator-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          key="creator-panel"
          initial={{ scale: 0.94, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 30 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full mx-4 rounded-3xl overflow-hidden flex"
          style={{
            background: t.bg,
            border: `1px solid ${t.border}`,
            boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
            maxWidth: screen === 'creator' ? 1100 : 500,
            height: screen === 'creator' ? '85vh' : 'auto',
            maxHeight: '90vh',
          }}
        >
          {/* ═══════════════════════════════════════════════════ */}
          {/*  CREATOR SCREEN                                     */}
          {/* ═══════════════════════════════════════════════════ */}
          {screen === 'creator' && (
            <>
              {/* Left Sidebar - Preview */}
              <div
                className="w-80 flex-shrink-0 flex flex-col"
                style={{
                  background: t.surface1,
                  borderRight: `1px solid ${t.border}`,
                }}
              >
                {/* Header */}
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${t.border}` }}
                >
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: t.text }}>
                      Agent Creator
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                      01 Protocol v3.0
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{ background: t.surface3, color: t.textMuted }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Live Preview */}
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                  <motion.div
                    key={`${avatarSeed}-${avatarStyle}-${avatarHue}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl overflow-hidden mb-4"
                    style={{
                      width: 240,
                      height: 336,
                      border: `2px solid ${t.border}`,
                      boxShadow: `0 0 60px ${avatarHue ? `hsla(${avatarHue}, 70%, 50%, 0.25)` : t.glow}`,
                    }}
                  >
                    <ProceduralAvatar
                      name={agentName.toUpperCase() || 'AGENT'}
                      role={agentRole || 'Role'}
                      goal={agentGoal || 'Goal'}
                      seed={avatarSeed}
                      style={avatarStyle}
                      hueOverride={avatarHue}
                      width={240}
                      height={336}
                      canvasStyle={{ display: 'block' }}
                    />
                  </motion.div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => setAvatarSeed(s => s + 1)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-all"
                      style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
                    >
                      <RefreshCw size={11} /> Randomize
                    </button>
                    <button
                      onClick={reset}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-all"
                      style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  </div>

                  {/* Stats Preview */}
                  {currentTab !== 'template' && (
                    <div className="w-full mt-6 space-y-2">
                      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>
                        Core Stats
                      </div>
                      {[
                        { label: 'Intelligence', value: intelligence },
                        { label: 'Speed', value: speed },
                        { label: 'Memory', value: memory },
                        { label: 'Adaptability', value: adaptability },
                      ].map(stat => (
                        <div key={stat.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: t.textMuted }}>{stat.label}</span>
                            <span style={{ color: t.accent }}>{stat.value}</span>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: t.surface3 }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stat.value}%` }}
                              className="h-full rounded-full"
                              style={{
                                background: `linear-gradient(90deg, ${t.accent}80, ${t.accent})`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <div className="p-5" style={{ borderTop: `1px solid ${t.border}` }}>
                  <motion.button
                    onClick={handleGenerate}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: `${t.accent}20`,
                      border: `1px solid ${t.accent}50`,
                      color: t.text,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Play size={15} />
                    Generate Agent
                    <ArrowRight size={15} />
                  </motion.button>
                  {Object.keys(errors).length > 0 && (
                    <p className="text-xs text-center mt-2" style={{ color: '#ef4444' }}>
                      {Object.values(errors)[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab Navigation */}
                <div
                  className="flex items-center gap-1 px-6 py-3"
                  style={{ borderBottom: `1px solid ${t.border}` }}
                >
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = currentTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setCurrentTab(tab.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: isActive ? `${t.accent}15` : 'transparent',
                          border: `1px solid ${isActive ? `${t.accent}40` : 'transparent'}`,
                          color: isActive ? t.accent : t.textMuted,
                        }}
                      >
                        <Icon size={13} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence mode="wait">
                    {/* ─────────── TEMPLATE TAB ─────────── */}
                    {currentTab === 'template' && (
                      <motion.div
                        key="template"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div>
                          <h4 className="text-base font-medium mb-1" style={{ color: t.text }}>
                            Choose a Template
                          </h4>
                          <p className="text-xs" style={{ color: t.textMuted }}>
                            Start with a preset or build from scratch
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {TEMPLATES.map(template => (
                            <motion.button
                              key={template.name}
                              onClick={() => applyTemplate(template)}
                              className="text-left p-4 rounded-xl transition-all"
                              style={{
                                background: selectedTemplate?.name === template.name ? `${t.accent}12` : t.surface2,
                                border: `1px solid ${selectedTemplate?.name === template.name ? `${t.accent}40` : t.border}`,
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="text-2xl mb-2">{template.icon}</div>
                              <div className="text-sm font-medium mb-1" style={{ color: t.text }}>
                                {template.name}
                              </div>
                              <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
                                {template.description}
                              </p>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* ─────────── IDENTITY TAB ─────────── */}
                    {currentTab === 'identity' && (
                      <motion.div
                        key="identity"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div>
                          <h4 className="text-base font-medium mb-1" style={{ color: t.text }}>
                            Agent Identity
                          </h4>
                          <p className="text-xs" style={{ color: t.textMuted }}>
                            Define who your agent is and what they do
                          </p>
                        </div>

                        {/* Name */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: t.textMuted }}>
                            Agent Name *
                          </label>
                          <input
                            value={agentName}
                            onChange={e => { setAgentName(e.target.value); setErrors(e => ({ ...e, name: '' })); }}
                            placeholder="e.g. ARIA, NEXUS, CIPHER..."
                            maxLength={20}
                            className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none transition-all"
                            style={{
                              background: t.surface2,
                              border: `1px solid ${errors.name ? '#ef4444' : t.border}`,
                              color: t.text,
                            }}
                          />
                          {errors.name && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{errors.name}</p>}
                        </div>

                        {/* Role */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: t.textMuted }}>
                            Role / Title *
                          </label>
                          <input
                            value={agentRole}
                            onChange={e => { setAgentRole(e.target.value); setErrors(e => ({ ...e, role: '' })); }}
                            placeholder="e.g. Intelligence Scout, Creative Director..."
                            className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none transition-all"
                            style={{
                              background: t.surface2,
                              border: `1px solid ${errors.role ? '#ef4444' : t.border}`,
                              color: t.text,
                            }}
                          />
                          {errors.role && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{errors.role}</p>}
                        </div>

                        {/* Goal */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: t.textMuted }}>
                            Primary Directive / Goal *
                          </label>
                          <textarea
                            value={agentGoal}
                            onChange={e => { setAgentGoal(e.target.value); setErrors(e => ({ ...e, goal: '' })); }}
                            placeholder="Describe what this agent should accomplish..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none resize-none transition-all"
                            style={{
                              background: t.surface2,
                              border: `1px solid ${errors.goal ? '#ef4444' : t.border}`,
                              color: t.text,
                            }}
                          />
                          {errors.goal && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{errors.goal}</p>}
                        </div>

                        {/* Category */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: t.textMuted }}>
                            Category
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {CATEGORIES.map(cat => (
                              <button
                                key={cat.id}
                                onClick={() => setAgentCategory(cat.id)}
                                className="text-left px-3 py-2.5 rounded-lg text-xs transition-all"
                                style={{
                                  background: agentCategory === cat.id ? `${t.accent}18` : t.surface2,
                                  border: `1px solid ${agentCategory === cat.id ? t.accent : t.border}`,
                                  color: agentCategory === cat.id ? t.accent : t.textMuted,
                                }}
                              >
                                <span className="mr-2">{cat.icon}</span>
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ─────────── APPEARANCE TAB ─────────── */}
                    {currentTab === 'appearance' && (
                      <motion.div
                        key="appearance"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div>
                          <h4 className="text-base font-medium mb-1" style={{ color: t.text }}>
                            Visual Identity
                          </h4>
                          <p className="text-xs" style={{ color: t.textMuted }}>
                            Customize your agent's appearance
                          </p>
                        </div>

                        {/* Style */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: t.textMuted }}>
                            Visual Style
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {STYLES.map(s => (
                              <button
                                key={s.id}
                                onClick={() => setAvatarStyle(s.id)}
                                className="text-left px-3 py-3 rounded-lg transition-all"
                                style={{
                                  background: avatarStyle === s.id ? `${t.accent}18` : t.surface2,
                                  border: `1px solid ${avatarStyle === s.id ? `${t.accent}40` : t.border}`,
                                  color: avatarStyle === s.id ? t.accent : t.textMuted,
                                }}
                              >
                                <div className="text-xs font-medium mb-0.5">{s.label}</div>
                                <div className="text-[10px]" style={{ opacity: 0.7 }}>
                                  {s.description}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Color Palette */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: t.textMuted }}>
                            Color Palette
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {COLOR_PALETTES.map(p => (
                              <button
                                key={p.hue}
                                onClick={() => setAvatarHue(avatarHue === p.hue ? undefined : p.hue)}
                                className="relative rounded-lg overflow-hidden transition-all"
                                title={p.label}
                                style={{
                                  height: 56,
                                  background: `linear-gradient(135deg, hsl(${p.hue}, 70%, 20%), hsl(${p.hue}, 70%, 50%))`,
                                  border: `2px solid ${avatarHue === p.hue ? '#fff' : 'transparent'}`,
                                  opacity: avatarHue === undefined || avatarHue === p.hue ? 1 : 0.5,
                                }}
                              >
                                <div className="absolute inset-0 flex items-center justify-center">
                                  {avatarHue === p.hue && <Check size={16} style={{ color: '#fff' }} />}
                                </div>
                                <div
                                  className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[9px] text-center"
                                  style={{
                                    background: 'rgba(0,0,0,0.6)',
                                    color: '#fff',
                                  }}
                                >
                                  {p.label}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Advanced Sliders */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-3" style={{ color: t.textMuted }}>
                            Fine Tuning (Coming Soon)
                          </label>
                          {[
                            { label: 'Eye Size', value: eyeSize, setter: setEyeSize },
                            { label: 'Eye Spacing', value: eyeSpacing, setter: setEyeSpacing },
                            { label: 'Glow Intensity', value: glowIntensity, setter: setGlowIntensity },
                            { label: 'Pattern Density', value: patternDensity, setter: setPatternDensity },
                          ].map(slider => (
                            <div key={slider.label} className="mb-3" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                              <div className="flex justify-between text-xs mb-1.5">
                                <span style={{ color: t.textMuted }}>{slider.label}</span>
                                <span style={{ color: t.accent }}>{slider.value.toFixed(1)}</span>
                              </div>
                              <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.1"
                                value={slider.value}
                                onChange={e => slider.setter(parseFloat(e.target.value))}
                                className="w-full"
                                style={{ accentColor: t.accent }}
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* ─────────── PERSONALITY TAB ─────────── */}
                    {currentTab === 'personality' && (
                      <motion.div
                        key="personality"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div>
                          <h4 className="text-base font-medium mb-1" style={{ color: t.text }}>
                            Personality Traits
                          </h4>
                          <p className="text-xs" style={{ color: t.textMuted }}>
                            Shape how your agent thinks and communicates
                          </p>
                        </div>

                        {/* Trait Sliders */}
                        {[
                          {
                            label: 'Analytical',
                            desc: 'Logical, data-driven reasoning',
                            value: analytical,
                            setter: setAnalytical,
                            opposite: 'Intuitive',
                          },
                          {
                            label: 'Creative',
                            desc: 'Innovative, unconventional thinking',
                            value: creative,
                            setter: setCreative,
                            opposite: 'Practical',
                          },
                          {
                            label: 'Assertive',
                            desc: 'Direct, confident communication',
                            value: assertive,
                            setter: setAssertive,
                            opposite: 'Reserved',
                          },
                          {
                            label: 'Empathetic',
                            desc: 'Understanding, people-focused',
                            value: empathetic,
                            setter: setEmpathetic,
                            opposite: 'Task-focused',
                          },
                        ].map(trait => (
                          <div
                            key={trait.label}
                            className="p-4 rounded-xl"
                            style={{ background: t.surface2, border: `1px solid ${t.border}` }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="text-sm font-medium" style={{ color: t.text }}>
                                  {trait.label}
                                </div>
                                <div className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>
                                  {trait.desc}
                                </div>
                              </div>
                              <div
                                className="text-sm font-medium px-2 py-0.5 rounded"
                                style={{ background: `${t.accent}15`, color: t.accent }}
                              >
                                {trait.value}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] w-14" style={{ color: t.textMuted }}>
                                {trait.opposite}
                              </span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={trait.value}
                                onChange={e => trait.setter(parseInt(e.target.value))}
                                className="flex-1"
                                style={{ accentColor: t.accent }}
                              />
                              <span className="text-[9px] w-14 text-right" style={{ color: t.textMuted }}>
                                {trait.label}
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Personality Summary */}
                        <div
                          className="p-4 rounded-xl"
                          style={{ background: `${t.accent}08`, border: `1px solid ${t.accent}30` }}
                        >
                          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>
                            Personality Profile
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: t.text }}>
                            {analytical > 70 ? 'Highly analytical and data-driven. ' : analytical < 30 ? 'Intuitive and instinct-guided. ' : ''}
                            {creative > 70 ? 'Thrives on creativity and innovation. ' : creative < 30 ? 'Practical and methodical. ' : ''}
                            {assertive > 70 ? 'Direct and confident in communication. ' : assertive < 30 ? 'Reserved and thoughtful. ' : ''}
                            {empathetic > 70 ? 'People-focused and understanding.' : empathetic < 30 ? 'Task-oriented and efficient.' : ''}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* ─────────── CAPABILITIES TAB ─────────── */}
                    {currentTab === 'capabilities' && (
                      <motion.div
                        key="capabilities"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div>
                          <h4 className="text-base font-medium mb-1" style={{ color: t.text }}>
                            Capabilities & Stats
                          </h4>
                          <p className="text-xs" style={{ color: t.textMuted }}>
                            Allocate stats and select tools
                          </p>
                        </div>

                        {/* Stat Allocation */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>
                              Core Stats
                            </label>
                            <div
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                background: remainingPoints > 0 ? `${t.accent}15` : t.surface3,
                                color: remainingPoints > 0 ? t.accent : t.textMuted,
                              }}
                            >
                              {remainingPoints} points remaining
                            </div>
                          </div>

                          {[
                            { label: 'Intelligence', desc: 'Problem-solving & reasoning', value: intelligence, setter: setIntelligence },
                            { label: 'Speed', desc: 'Response time & efficiency', value: speed, setter: setSpeed },
                            { label: 'Memory', desc: 'Context retention', value: memory, setter: setMemory },
                            { label: 'Adaptability', desc: 'Learning & flexibility', value: adaptability, setter: setAdaptability },
                          ].map(stat => (
                            <div
                              key={stat.label}
                              className="p-3 rounded-lg mb-2"
                              style={{ background: t.surface2, border: `1px solid ${t.border}` }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="text-xs font-medium" style={{ color: t.text }}>
                                    {stat.label}
                                  </div>
                                  <div className="text-[9px]" style={{ color: t.textMuted }}>
                                    {stat.desc}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => adjustStat(stat.value, stat.setter, -5)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-xs"
                                    style={{ background: t.surface3, color: t.textMuted }}
                                  >
                                    -
                                  </button>
                                  <div
                                    className="w-10 text-center text-xs font-medium"
                                    style={{ color: t.accent }}
                                  >
                                    {stat.value}
                                  </div>
                                  <button
                                    onClick={() => adjustStat(stat.value, stat.setter, 5)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-xs"
                                    style={{
                                      background: remainingPoints > 0 ? t.surface3 : t.surface2,
                                      color: remainingPoints > 0 ? t.textMuted : t.border,
                                    }}
                                    disabled={remainingPoints <= 0}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              <div
                                className="h-1 rounded-full overflow-hidden"
                                style={{ background: t.surface3 }}
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${stat.value}%` }}
                                  className="h-full rounded-full"
                                  style={{ background: `linear-gradient(90deg, ${t.accent}60, ${t.accent})` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Tool Selection */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-3" style={{ color: t.textMuted }}>
                            Tools & Capabilities *
                          </label>
                          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                            {AVAILABLE_TOOLS.map(tool => {
                              const isSelected = selectedTools.includes(tool);
                              return (
                                <button
                                  key={tool}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedTools(t => t.filter(x => x !== tool));
                                    } else {
                                      setSelectedTools(t => [...t, tool]);
                                    }
                                    setErrors(e => ({ ...e, tools: '' }));
                                  }}
                                  className="text-left px-3 py-2 rounded-lg text-xs transition-all"
                                  style={{
                                    background: isSelected ? `${t.accent}18` : t.surface2,
                                    border: `1px solid ${isSelected ? `${t.accent}40` : t.border}`,
                                    color: isSelected ? t.accent : t.textMuted,
                                  }}
                                >
                                  {isSelected && <Check size={10} className="inline mr-1" />}
                                  {tool}
                                </button>
                              );
                            })}
                          </div>
                          {errors.tools && <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{errors.tools}</p>}
                          <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
                            {selectedTools.length} tools selected
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* ─────────── MEMORY TAB ─────────── */}
                    {currentTab === 'memory' && (
                      <motion.div
                        key="memory"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div>
                          <h4 className="text-base font-medium mb-1" style={{ color: t.text }}>
                            Memory & Behavior
                          </h4>
                          <p className="text-xs" style={{ color: t.textMuted }}>
                            Configure how your agent learns and responds
                          </p>
                        </div>

                        {/* Memory Mode */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-3" style={{ color: t.textMuted }}>
                            Memory Mode
                          </label>
                          {[
                            {
                              id: 'always_on' as const,
                              label: 'Always On',
                              desc: 'Continuously learns from every interaction',
                            },
                            {
                              id: 'session_only' as const,
                              label: 'Session Only',
                              desc: 'Remembers within session, resets after',
                            },
                            {
                              id: 'manual' as const,
                              label: 'Manual Save',
                              desc: 'Only saves when explicitly triggered',
                            },
                          ].map(mode => (
                            <button
                              key={mode.id}
                              onClick={() => setMemoryMode(mode.id)}
                              className="w-full text-left p-4 rounded-xl mb-2 transition-all"
                              style={{
                                background: memoryMode === mode.id ? `${t.accent}15` : t.surface2,
                                border: `1px solid ${memoryMode === mode.id ? `${t.accent}40` : t.border}`,
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium" style={{ color: t.text }}>
                                  {mode.label}
                                </span>
                                {memoryMode === mode.id && <Check size={14} style={{ color: t.accent }} />}
                              </div>
                              <p className="text-xs" style={{ color: t.textMuted }}>
                                {mode.desc}
                              </p>
                            </button>
                          ))}
                        </div>

                        {/* Response Style */}
                        <div>
                          <label className="text-xs uppercase tracking-wider block mb-3" style={{ color: t.textMuted }}>
                            Response Style
                          </label>
                          {[
                            {
                              id: 'detailed' as const,
                              label: 'Detailed',
                              desc: 'Comprehensive, thorough responses',
                            },
                            {
                              id: 'concise' as const,
                              label: 'Concise',
                              desc: 'Brief, to-the-point answers',
                            },
                            {
                              id: 'adaptive' as const,
                              label: 'Adaptive',
                              desc: 'Adjusts based on context and user preference',
                            },
                          ].map(style => (
                            <button
                              key={style.id}
                              onClick={() => setResponseStyle(style.id)}
                              className="w-full text-left p-4 rounded-xl mb-2 transition-all"
                              style={{
                                background: responseStyle === style.id ? `${t.accent}15` : t.surface2,
                                border: `1px solid ${responseStyle === style.id ? `${t.accent}40` : t.border}`,
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium" style={{ color: t.text }}>
                                  {style.label}
                                </span>
                                {responseStyle === style.id && <Check size={14} style={{ color: t.accent }} />}
                              </div>
                              <p className="text-xs" style={{ color: t.textMuted }}>
                                {style.desc}
                              </p>
                            </button>
                          ))}
                        </div>

                        {/* Advanced Settings */}
                        <div
                          className="p-4 rounded-xl"
                          style={{ background: t.surface2, border: `1px solid ${t.border}` }}
                        >
                          <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                            Advanced Settings
                          </div>
                          {[
                            ['Protocol Version', '01P v3.0'],
                            ['Verification', 'Auto-verified'],
                            ['Serial Number', '1/1 Unique'],
                            ['Online Status', 'Always Online'],
                          ].map(([key, val]) => (
                            <div key={key} className="flex justify-between py-2 text-xs">
                              <span style={{ color: t.textMuted }}>{key}</span>
                              <span style={{ color: t.accent }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Navigation Footer */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ borderTop: `1px solid ${t.border}` }}
                >
                  <button
                    onClick={() => {
                      const tabOrder: Tab[] = ['template', 'identity', 'appearance', 'personality', 'capabilities', 'memory'];
                      const idx = tabOrder.indexOf(currentTab);
                      if (idx > 0) setCurrentTab(tabOrder[idx - 1]);
                    }}
                    disabled={currentTab === 'template'}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all"
                    style={{
                      background: currentTab === 'template' ? t.surface2 : t.surface3,
                      color: currentTab === 'template' ? t.border : t.textMuted,
                      cursor: currentTab === 'template' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronLeft size={12} />
                    Previous
                  </button>

                  <div className="text-[10px]" style={{ color: t.textMuted }}>
                    {tabs.findIndex(t => t.id === currentTab) + 1} / {tabs.length}
                  </div>

                  <button
                    onClick={() => {
                      const tabOrder: Tab[] = ['template', 'identity', 'appearance', 'personality', 'capabilities', 'memory'];
                      const idx = tabOrder.indexOf(currentTab);
                      if (idx < tabOrder.length - 1) setCurrentTab(tabOrder[idx + 1]);
                    }}
                    disabled={currentTab === 'memory'}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all"
                    style={{
                      background: currentTab === 'memory' ? t.surface2 : t.surface3,
                      color: currentTab === 'memory' ? t.border : t.textMuted,
                      cursor: currentTab === 'memory' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/*  GENERATING SCREEN                                  */}
          {/* ═══════════════════════════════════════════════════ */}
          {screen === 'generating' && (
            <div className="w-full flex flex-col items-center justify-center p-12">
              {/* Spinner */}
              <div className="relative mb-8">
                <motion.div
                  className="w-24 h-24 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${t.accent}25, transparent)`,
                    border: `1px solid ${t.border}`,
                  }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `2px solid ${t.border}`, borderTopColor: t.accent }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cpu size={28} style={{ color: t.accent }} />
                </div>
              </div>

              <h3 className="text-lg font-medium mb-2" style={{ color: t.text }}>
                Generating {agentName.toUpperCase()}
              </h3>
              <p className="text-xs mb-8" style={{ color: t.textMuted }}>
                Building your 01 Protocol agent...
              </p>

              {/* Steps */}
              <div className="w-full max-w-md space-y-2">
                {GEN_STEPS.map((step, i) => {
                  const done = genStep > i;
                  const active = genStep === i;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg"
                      style={{
                        background: done || active ? `${t.accent}10` : t.surface2,
                        border: `1px solid ${done || active ? `${t.accent}30` : t.border}`,
                        opacity: done || active ? 1 : 0.5,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: done ? `${t.accent}30` : active ? `${t.accent}20` : t.surface3,
                          border: `1px solid ${done || active ? t.accent : t.border}`,
                        }}
                      >
                        {done && <Check size={11} style={{ color: t.accent }} />}
                        {active && (
                          <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ background: t.accent }}
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                          />
                        )}
                      </div>
                      <span className="text-xs" style={{ color: done || active ? t.text : t.textMuted }}>
                        {step.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/*  SUCCESS SCREEN                                     */}
          {/* ═══════════════════════════════════════════════════ */}
          {screen === 'success' && createdAgent && (
            <div className="w-full flex flex-col items-center text-center p-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)' }}
              >
                <Check size={32} style={{ color: '#22c55e' }} />
              </motion.div>

              <h3 className="text-xl font-medium mb-2" style={{ color: t.text }}>
                {createdAgent.name} is live!
              </h3>
              <p className="text-xs mb-8" style={{ color: t.textMuted }}>
                Your agent has been created and is ready to use
              </p>

              {/* Agent Card */}
              <div
                className="w-full max-w-sm p-4 rounded-2xl flex items-center gap-4 mb-8"
                style={{ background: t.surface2, border: `1px solid ${t.border}` }}
              >
                <div
                  className="w-16 h-22 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ border: `1px solid ${t.border}` }}
                >
                  <img src={createdAgent.portrait} alt={createdAgent.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium mb-0.5" style={{ color: t.text }}>
                    {createdAgent.name}
                  </div>
                  <div className="text-xs mb-1" style={{ color: t.textMuted }}>
                    {createdAgent.role}
                  </div>
                  <div className="text-[10px]" style={{ color: t.textMuted }}>
                    {createdAgent.protocolId}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 w-full max-w-sm">
                <motion.button
                  onClick={handleOpenAgent}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
                  style={{
                    background: `${t.accent}20`,
                    border: `1px solid ${t.accent}50`,
                    color: t.text,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MessageSquare size={14} />
                  Open Agent
                </motion.button>
                <motion.button
                  onClick={handleClose}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
                  style={{
                    background: t.surface2,
                    border: `1px solid ${t.border}`,
                    color: t.textMuted,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Eye size={14} />
                  View Collection
                </motion.button>
              </div>

              <button
                onClick={() => { setCreatedAgent(null); reset(); setScreen('creator'); }}
                className="mt-4 text-xs flex items-center gap-1"
                style={{ color: t.textMuted }}
              >
                <Zap size={11} />
                Create Another Agent
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
