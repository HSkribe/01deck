import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ArrowRight, Cpu, Check, RefreshCw, Sliders,
  ChevronDown, ChevronUp, Zap, MessageSquare, Eye,
  Download, FolderDown, HardDrive, ShieldAlert
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useApp } from '../context/AppContext';
import { Agent } from '../data/agents';
import { ProceduralAvatar } from './ProceduralAvatar';
import { generateAvatarDataUrl, AvatarStyle } from '../utils/avatarUtils';
import { createDeckProtocolPayload } from '../utils/protocol';
import { ensureAgentMemoryVault } from '../services/memoryVault';

const GEN_STEPS = [
  { label: 'Initializing 01 Protocol v3.0', duration: 500 },
  { label: 'Generating identity hash', duration: 600 },
  { label: 'Creating .01ai identity file', duration: 700 },
  { label: 'Building .01bundle container', duration: 600 },
  { label: 'Rendering visual identity', duration: 900 },
];

const PALETTES = [
  { label: 'Void Blue', hue: 210 },
  { label: 'Solar Gold', hue: 40 },
  { label: 'Neon Violet', hue: 270 },
  { label: 'Emerald', hue: 150 },
  { label: 'Crimson', hue: 0 },
  { label: 'Arctic', hue: 190 },
];

const STYLES: { id: AvatarStyle; label: string }[] = [
  { id: 'futuristic', label: 'Futuristic' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'neon', label: 'Neon' },
  { id: 'minimal', label: 'Minimal' },
];

// Category options for custom agents
const CATEGORIES = [
  { id: 'research', label: '🔬 Research' },
  { id: 'creative', label: '🎨 Creative' },
  { id: 'code', label: '💻 Engineering' },
  { id: 'strategy', label: '🧭 Strategy' },
  { id: 'comms', label: '💬 Comms' },
  { id: 'finance', label: '⚖️ Finance & Legal' },
  { id: 'data', label: '📊 Data & Analytics' },
];

type Screen = 'form' | 'generating' | 'preview' | 'success';

export function AgentCreatorModal() {
  const { showCreator, setShowCreator, currentTheme: t, addAgent, setChatAgent } = useApp();

  const [screen, setScreen] = useState<Screen>('form');
  const [agentName, setAgentName] = useState('');
  const [agentGoal, setAgentGoal] = useState('');
  const [agentRole, setAgentRole] = useState('01 Protocol Agent Ambassador');
  const [agentCategory, setAgentCategory] = useState('research');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [genStep, setGenStep] = useState(-1);
  const [genDone, setGenDone] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(0);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('futuristic');
  const [hueOverride, setHueOverride] = useState<number | undefined>();
  const [showCustomize, setShowCustomize] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);
  const [createdAgentPrivKey, setCreatedAgentPrivKey] = useState<string>('');
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success'>('idle');
  const [nameError, setNameError] = useState('');
  const [goalError, setGoalError] = useState('');
  const avatarCandidates = useMemo(
    () => {
      const styles: AvatarStyle[] = [avatarStyle, 'futuristic', 'neon', 'abstract'];
      return styles.map((style, index) => ({
        id: `${style}-${avatarSeed + index}`,
        style,
        seed: avatarSeed + index,
      }));
    },
    [avatarSeed, avatarStyle],
  );

  const reset = () => {
    setScreen('form');
    setAgentName('');
    setAgentGoal('');
    setAgentRole('01 Protocol Agent Ambassador');
    setAgentCategory('research');
    setGenStep(-1);
    setGenDone(false);
    setAvatarSeed(0);
    setAvatarStyle('futuristic');
    setHueOverride(undefined);
    setShowCustomize(false);
    setCreatedAgent(null);
    setCreatedAgentPrivKey('');
    setDeployStatus('idle');
    setNameError('');
    setGoalError('');
  };

  const handleClose = () => {
    setShowCreator(false);
    setTimeout(reset, 400);
  };

  // Run generation
  useEffect(() => {
    if (screen !== 'generating' || genStep !== -1) return;
    let cumDelay = 0;
    GEN_STEPS.forEach((step, i) => {
      cumDelay += step.duration;
      setTimeout(() => setGenStep(i), cumDelay);
    });
    setTimeout(() => {
      setGenDone(true);
      setTimeout(() => setScreen('preview'), 500);
    }, cumDelay + 500);
  }, [screen]);

  const validate = () => {
    let ok = true;
    if (!agentName.trim() || agentName.trim().length < 2) {
      setNameError('Name required (min 2 chars)');
      ok = false;
    } else setNameError('');
    if (!agentGoal.trim() || agentGoal.trim().length < 8) {
      setGoalError('Goal required (min 8 chars)');
      ok = false;
    } else setGoalError('');
    return ok;
  };

  const handleGenerate = () => {
    if (!validate()) return;
    setScreen('generating');
    setGenStep(-1);
    setGenDone(false);
  };

  const buildAgent = (portrait: string): { agent: Agent; privateKeyHex: string } => {
    const name = agentName.trim().toUpperCase();
    const serial = Date.now();
    const protocol = createDeckProtocolPayload({
      name,
      role: agentRole || '01 Protocol Agent Ambassador',
      goal: agentGoal.trim(),
      memoryMode: 'always_on',
      serial: 1,
      totalSupply: 1,
      rarityLabel: 'common',
    });

    return {
      privateKeyHex: protocol.privateKeyHex || '',
      agent: {
        id: `user-${serial}`,
        name,
        category: agentCategory,
        role: agentRole || '01 Protocol Agent Ambassador',
        description: agentGoal.trim(),
        specialization: `${agentRole} · 01ai Ecosystem`,
        lastUsed: new Date(),
        rarity: 'common',
        rarityCount: '1/1',
        portrait,
        tools: ['Platform Recommender', 'Agent Builder', 'Memory Manager', '01 Protocol Registry'],
        memoryNotes: 'Memory mode: always_on. Local memory vault initializes at creation and stores recent interaction history.',
        online: true,
        tags: ['01protocol', agentCategory, 'custom', 'agent'],
        stats: [
          { label: 'Intelligence', value: 88 + Math.floor(Math.random() * 10) },
          { label: 'Memory', value: 100 },
          { label: 'Adaptability', value: 85 + Math.floor(Math.random() * 10) },
          { label: 'Protocol IQ', value: 92 + Math.floor(Math.random() * 7) },
        ],
        protocolVersion: '01P v3.0',
        protocolId: `PRO-${protocol.protocolAgent.instanceId.slice(0, 6).toUpperCase()}-${name}`,
        chatOpening: `I'm ${name}. My directive is: ${agentGoal.trim()}. How can I help you today?`,
        isUserCreated: true,
        goal: agentGoal.trim(),
        memoryMode: 'always_on',
        memoryVaultId: `vault-${protocol.protocolAgent.instanceId}`,
        memoryEntryCount: 0,
        serial: 1,
        totalSupply: 1,
        isVerified: protocol.verification.status === 'verified',
        identityRecord: protocol.identityRecord,
        bundleRecord: protocol.bundleRecord,
        verification: protocol.verification,
        systemPrompt: `You are ${name}. Your role is ${agentRole || '01 Protocol Agent Ambassador'}. Your goal is: ${agentGoal.trim()}.`,
      }
    };
  };

  const handleAccept = () => {
    const portrait = generateAvatarDataUrl({
      name: agentName.trim().toUpperCase(),
      role: agentRole,
      goal: agentGoal.trim(),
      seed: avatarSeed,
      style: avatarStyle,
      hueOverride,
    });
    const result = buildAgent(portrait);
    setCreatedAgent(result.agent);
    setCreatedAgentPrivKey(result.privateKeyHex);
    addAgent(result.agent);
    void ensureAgentMemoryVault(result.agent);
    setScreen('success');
  };

  const handleDownloadArchive = async () => {
    if (!createdAgent) return;
    const zip = new JSZip();
    const vaultFolder = zip.folder(`${createdAgent.name.toLowerCase().replace(/\s+/g, '_')}_vault`);
    if (!vaultFolder) return;
    
    // Core Identity Artifacts
    const agentsFolder = vaultFolder.folder('agents');
    if (createdAgent.bundleRecord) {
      agentsFolder?.file(`${createdAgent.name.toLowerCase().replace(/\s+/g, '_')}.01bundle`, createdAgent.bundleRecord);
    } else if (createdAgent.identityRecord) {
      agentsFolder?.file(`${createdAgent.name.toLowerCase().replace(/\s+/g, '_')}.01ai`, createdAgent.identityRecord);
    }

    // Private Key
    const keysFolder = vaultFolder.folder('keys');
    keysFolder?.file(`${createdAgent.name.toLowerCase().replace(/\s+/g, '_')}.pem`, `-----BEGIN PRIVATE KEY-----\n${createdAgentPrivKey}\n-----END PRIVATE KEY-----`);
    
    // Recommended Directory Structures
    const memoryFolder = vaultFolder.folder('memory');
    memoryFolder?.folder('persistent');
    memoryFolder?.folder('operational');
    
    const logsFolder = vaultFolder.folder('logs');
    logsFolder?.file('README.md', 'This directory is intended for chronological interaction and time-tracking logs.');

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${createdAgent.name.toLowerCase()}_01protocol_vault.zip`);
  };

  const handleQuickDeploy = () => {
    // In a full desktop/backend implementation, this would trigger an IPC or backend API call.
    // For the web interface, we mock the UI flow to demonstrate the UX.
    setDeployStatus('deploying');
    setTimeout(() => {
      setDeployStatus('success');
    }, 1500);
  };

  const handleOpenAgent = () => {
    if (createdAgent) setChatAgent(createdAgent);
    handleClose();
  };

  if (!showCreator) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="creator-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          key="creator-panel"
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.35, ease: [0.34, 1.2, 0.64, 1] }}
          className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden"
          style={{
            background: t.surface1,
            border: `1px solid ${t.border}`,
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
            style={{
              background: t.surface1,
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <div>
              <h3 className="text-sm" style={{ color: t.text }}>
                {screen === 'form' && 'Create New Agent'}
                {screen === 'generating' && `Generating ${agentName.toUpperCase()}...`}
                {screen === 'preview' && 'Visual Identity'}
                {screen === 'success' && 'Agent Activated'}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                01 Protocol v3.0
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: t.surface3, color: t.textMuted }}
            >
              <X size={14} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* ── FORM ──────────────────────────── */}
            {screen === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4"
              >
                {/* Name */}
                <div>
                  <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: t.textMuted }}>
                    Agent Name *
                  </label>
                  <input
                    value={agentName}
                    onChange={e => { setAgentName(e.target.value); setNameError(''); }}
                    placeholder="e.g. ARIA, NEXUS..."
                    maxLength={20}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-transparent outline-none"
                    style={{
                      background: t.surface2,
                      border: `1px solid ${nameError ? '#ef4444' : t.border}`,
                      color: t.text,
                    }}
                  />
                  {nameError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{nameError}</p>}
                </div>

                {/* Goal */}
                <div>
                  <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: t.textMuted }}>
                    Directive / Goal *
                  </label>
                  <textarea
                    value={agentGoal}
                    onChange={e => { setAgentGoal(e.target.value); setGoalError(''); }}
                    placeholder="What should this agent accomplish?"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-transparent outline-none resize-none"
                    style={{
                      background: t.surface2,
                      border: `1px solid ${goalError ? '#ef4444' : t.border}`,
                      color: t.text,
                    }}
                  />
                  {goalError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{goalError}</p>}
                </div>

                {/* Advanced */}
                <button
                  onClick={() => setShowAdvanced(v => !v)}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs"
                  style={{
                    background: t.surface2,
                    border: `1px solid ${t.border}`,
                    color: t.textMuted,
                  }}
                >
                  <span>Advanced Config</span>
                  {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3"
                    >
                      {/* Role */}
                      <div>
                        <label className="text-xs block mb-1.5" style={{ color: t.textMuted }}>Custom Role</label>
                        <input
                          value={agentRole}
                          onChange={e => setAgentRole(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-xs bg-transparent outline-none"
                          style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
                        />
                      </div>
                      {/* Category */}
                      <div>
                        <label className="text-xs block mb-1.5" style={{ color: t.textMuted }}>Category</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {CATEGORIES.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setAgentCategory(c.id)}
                              className="text-left px-3 py-1.5 rounded-lg text-xs transition-all"
                              style={{
                                background: agentCategory === c.id ? `${t.accent}18` : t.surface2,
                                border: `1px solid ${agentCategory === c.id ? t.accent : t.border}`,
                                color: agentCategory === c.id ? t.accent : t.textMuted,
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Defaults */}
                      <div
                        className="px-4 py-3 rounded-xl text-xs space-y-1.5"
                        style={{ background: t.surface2, border: `1px solid ${t.border}` }}
                      >
                        {[
                          ['Memory Mode', 'always_on'],
                          ['Serial', '1/1'],
                          ['Protocol', '01P v3.0'],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span style={{ color: t.textMuted }}>{k}</span>
                            <span style={{ color: t.accent }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={handleGenerate}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
                  style={{
                    background: `${t.accent}18`,
                    border: `1px solid ${t.accent}40`,
                    color: t.text,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Cpu size={14} />
                  Generate Agent
                  <ArrowRight size={14} />
                </motion.button>
              </motion.div>
            )}

            {/* ── GENERATING ────────────────────── */}
            {screen === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 flex flex-col items-center"
              >
                {/* Spinner */}
                <div className="relative my-8">
                  <motion.div
                    className="w-20 h-20 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${t.accent}20, transparent)`,
                      border: `1px solid ${t.border}`,
                    }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: `1.5px solid ${t.border}`, borderTopColor: t.accent }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Cpu size={22} style={{ color: t.accent }} />
                  </div>
                </div>

                <div className="w-full space-y-2">
                  {GEN_STEPS.map((step, i) => {
                    const done = genStep >= i;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                        style={{
                          background: done ? `${t.accent}08` : t.surface2,
                          border: `1px solid ${done ? `${t.accent}20` : t.border}`,
                          opacity: done ? 1 : 0.4,
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: done ? `${t.accent}25` : t.surface3,
                            border: `1px solid ${done ? t.accent : t.border}`,
                          }}
                        >
                          {done && <Check size={9} style={{ color: t.accent }} />}
                        </div>
                        <span className="text-xs" style={{ color: done ? t.text : t.textMuted }}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── PREVIEW ───────────────────────── */}
            {screen === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 flex flex-col items-center"
              >
                <p className="text-xs mb-4 text-center" style={{ color: t.textMuted }}>
                  Unique visual identity generated from your agent's signature. Pick the strongest portrait before activation.
                </p>

                {/* Avatar */}
                <motion.div
                  key={`${avatarSeed}-${avatarStyle}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl overflow-hidden mb-4"
                  style={{
                    width: 200,
                    height: 280,
                    border: `1px solid ${t.border}`,
                    boxShadow: `0 0 40px ${t.glow}`,
                  }}
                >
                  <ProceduralAvatar
                    name={agentName.toUpperCase()}
                    role={agentRole}
                    goal={agentGoal}
                    seed={avatarSeed}
                    style={avatarStyle}
                    hueOverride={hueOverride}
                    width={200}
                    height={280}
                    canvasStyle={{ display: 'block' }}
                  />
                </motion.div>

                <div className="grid grid-cols-2 gap-3 mb-4 w-full max-w-xs">
                  {avatarCandidates.map(candidate => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => {
                        setAvatarStyle(candidate.style);
                        setAvatarSeed(candidate.seed);
                      }}
                      className="rounded-xl overflow-hidden text-left transition-all"
                      style={{
                        background: t.surface2,
                        border: `1px solid ${
                          avatarStyle === candidate.style && avatarSeed === candidate.seed ? `${t.accent}55` : t.border
                        }`,
                        boxShadow:
                          avatarStyle === candidate.style && avatarSeed === candidate.seed ? `0 0 24px ${t.glow}` : 'none',
                      }}
                    >
                      <ProceduralAvatar
                        name={agentName.toUpperCase()}
                        role={agentRole}
                        goal={agentGoal}
                        seed={candidate.seed}
                        style={candidate.style}
                        hueOverride={hueOverride}
                        width={96}
                        height={132}
                        canvasStyle={{ display: 'block', width: '100%', height: 'auto' }}
                      />
                      <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                        {candidate.style}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Regen / Customize */}
                <div className="flex gap-2 mb-4 w-full max-w-xs">
                  <button
                    onClick={() => setAvatarSeed(s => s + 1)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs"
                    style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
                  >
                    <RefreshCw size={10} /> Regenerate
                  </button>
                  <button
                    onClick={() => setShowCustomize(c => !c)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs"
                    style={{
                      background: showCustomize ? `${t.accent}15` : t.surface2,
                      border: `1px solid ${showCustomize ? `${t.accent}40` : t.border}`,
                      color: showCustomize ? t.accent : t.textMuted,
                    }}
                  >
                    <Sliders size={10} /> Customize
                  </button>
                </div>

                {/* Customize panel */}
                <AnimatePresence>
                  {showCustomize && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden w-full max-w-xs mb-4"
                    >
                      <div className="space-y-3 pt-2">
                        {/* Style */}
                        <div>
                          <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Style</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {STYLES.map(s => (
                              <button
                                key={s.id}
                                onClick={() => setAvatarStyle(s.id)}
                                className="py-1.5 rounded-lg text-xs"
                                style={{
                                  background: avatarStyle === s.id ? `${t.accent}18` : t.surface2,
                                  border: `1px solid ${avatarStyle === s.id ? `${t.accent}40` : t.border}`,
                                  color: avatarStyle === s.id ? t.accent : t.textMuted,
                                }}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Color */}
                        <div>
                          <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Color</div>
                          <div className="grid grid-cols-6 gap-1.5">
                            {PALETTES.map(p => (
                              <button
                                key={p.hue}
                                onClick={() => setHueOverride(hueOverride === p.hue ? undefined : p.hue)}
                                className="h-6 rounded-md"
                                title={p.label}
                                style={{
                                  background: `hsl(${p.hue}, 70%, 50%)`,
                                  border: `2px solid ${hueOverride === p.hue ? '#fff' : 'transparent'}`,
                                  opacity: hueOverride === undefined || hueOverride === p.hue ? 1 : 0.4,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={handleAccept}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
                  style={{
                    background: `${t.accent}18`,
                    border: `1px solid ${t.accent}40`,
                    color: t.text,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Check size={14} />
                  Accept & Activate
                </motion.button>
              </motion.div>
            )}

            {/* ── SUCCESS ───────────────────────── */}
            {screen === 'success' && createdAgent && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)' }}
                >
                  <Check size={22} style={{ color: '#22c55e' }} />
                </motion.div>

                <h3 className="text-xl mb-1" style={{ color: t.text }}>{createdAgent.name} is live.</h3>
                <p className="text-xs mb-5" style={{ color: t.textMuted }}>
                  Agent initialized · memory_mode: always_on · verification: pass
                </p>

                <div
                  className="w-full p-3 rounded-xl flex items-center gap-3 mb-5 text-left"
                  style={{ background: t.surface2, border: `1px solid ${t.border}` }}
                >
                  <div
                    className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ border: `1px solid ${t.border}` }}
                  >
                    <img src={createdAgent.portrait} alt={createdAgent.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: t.text }}>{createdAgent.name}</div>
                    <div className="text-xs mb-1" style={{ color: t.textMuted }}>{createdAgent.role}</div>
                    <div className="text-xs" style={{ color: t.textMuted }}>
                      {createdAgent.protocolId}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full mb-6">
                  <motion.button
                    onClick={handleDownloadArchive}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl text-xs"
                    style={{
                      background: t.surface2,
                      border: `1px solid ${t.border}`,
                      color: t.text,
                    }}
                    whileHover={{ scale: 1.02, borderColor: t.accent }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FolderDown size={20} style={{ color: t.accent }} />
                    <span className="font-medium">Download Archive (.zip)</span>
                    <span className="text-[10px] opacity-70">Includes keys, memory, and logs folders</span>
                  </motion.button>
                  <motion.button
                    onClick={deployStatus === 'idle' ? handleQuickDeploy : undefined}
                    disabled={deployStatus !== 'idle'}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl text-xs"
                    style={{
                      background: deployStatus === 'success' ? 'rgba(34,197,94,0.15)' : t.surface2,
                      border: `1px solid ${deployStatus === 'success' ? 'rgba(34,197,94,0.3)' : t.border}`,
                      color: deployStatus === 'success' ? '#22c55e' : t.text,
                      cursor: deployStatus === 'idle' ? 'pointer' : 'default',
                    }}
                    whileHover={deployStatus === 'idle' ? { scale: 1.02, borderColor: t.accent } : {}}
                    whileTap={deployStatus === 'idle' ? { scale: 0.98 } : {}}
                  >
                    {deployStatus === 'deploying' ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : deployStatus === 'success' ? (
                      <Check size={20} />
                    ) : (
                      <HardDrive size={20} style={{ color: t.text }} />
                    )}
                    <span className="font-medium">
                      {deployStatus === 'deploying' ? 'Deploying...' : deployStatus === 'success' ? 'Deployed to ~/.01protocol' : 'Local Quick Deploy'}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {deployStatus === 'success' ? 'Files are ready.' : 'Auto-save to system directories'}
                    </span>
                  </motion.button>
                </div>

                <div className="p-3 rounded-xl mb-6 w-full flex items-start gap-3 text-left" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
                  <div className="text-xs leading-relaxed">
                    <strong>Critical:</strong> The downloaded archive or local deployment contains this agent's private key. Do not share or commit this key. If lost, the identity cannot be evolved or modified.
                  </div>
                </div>

                <div className="flex gap-2 w-full pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
                  <motion.button
                    onClick={handleOpenAgent}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium"
                    style={{
                      background: `${t.accent}15`,
                      border: `1px solid ${t.accent}35`,
                      color: t.accent,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MessageSquare size={12} />
                    Launch Session
                  </motion.button>
                  <motion.button
                    onClick={handleClose}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs"
                    style={{
                      background: t.surface2,
                      border: `1px solid ${t.border}`,
                      color: t.textMuted,
                    }}
                    whileHover={{ scale: 1.02, color: t.text }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Eye size={12} />
                    View Collection
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
