import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, ChevronDown, ChevronUp, Check,
  Cpu, Brain, Package, Sparkles, RefreshCw,
  Sliders, Palette, Download, MessageSquare,
  Eye, Zap, Shield,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent } from '../data/agents';
import { ProceduralAvatar } from './ProceduralAvatar';
import { generateAvatarDataUrl, AvatarStyle } from '../utils/avatarUtils';
import { createDeckProtocolPayload } from '../utils/protocol';
import logoImg from '../assets/logo-wordmark.svg';
import { ensureAgentMemoryVault } from '../services/memoryVault';

// ── Particle field background ─────────────────────────────
function ParticleField({ count = 60 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 0.5 + Math.random() * 1.5,
    duration: 3 + Math.random() * 5,
    delay: Math.random() * 4,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: 'rgba(255,255,255,0.25)',
          }}
          animate={{ opacity: [0, 0.8, 0], y: [0, -20, -40], scale: [0.5, 1, 0] }}
          transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Progress stepper ──────────────────────────────────────
function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            className="rounded-full"
            animate={{
              width: i + 1 === current ? 24 : 6,
              background: i + 1 <= current ? '#fff' : 'rgba(255,255,255,0.18)',
            }}
            style={{ height: 6 }}
            transition={{ duration: 0.3 }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Generation step ───────────────────────────────────────
interface GenStep {
  label: string;
  detail: string;
  duration: number;
}

const GEN_STEPS: GenStep[] = [
  { label: 'Initializing 01 Protocol v3.0', detail: 'Establishing secure channel...', duration: 600 },
  { label: 'Generating cryptographic identity hash', detail: 'SHA-256 fingerprint computed', duration: 700 },
  { label: 'Creating .01ai identity file', detail: 'Binding name, role, and goal...', duration: 800 },
  { label: 'Building .01bundle container', detail: 'Packaging memory + capabilities...', duration: 700 },
  { label: 'Rendering visual identity', detail: 'Synthesizing unique portrait...', duration: 1000 },
];

// ── Main OnboardingFlow ───────────────────────────────────
export function OnboardingFlow() {
  const { completeOnboarding, addAgent, setChatAgent, showOnboarding, ensureOwnerIdentity } = useApp();
  const [screen, setScreen] = useState(1);
  const [agentName, setAgentName] = useState('');
  const [agentGoal, setAgentGoal] = useState('');
  const [showDefaults, setShowDefaults] = useState(false);
  const [genStep, setGenStep] = useState(-1);
  const [genDone, setGenDone] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(0);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('futuristic');
  const [showCustomize, setShowCustomize] = useState(false);
  const [hueOverride, setHueOverride] = useState<number | undefined>(undefined);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);
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

  // Run generation sequence
  useEffect(() => {
    if (screen !== 4 || genStep !== -1) return;
    let cumDelay = 0;
    GEN_STEPS.forEach((step, i) => {
      cumDelay += step.duration;
      setTimeout(() => setGenStep(i), cumDelay);
    });
    setTimeout(() => {
      setGenDone(true);
      setTimeout(() => setScreen(5), 600);
    }, cumDelay + 600);
  }, [screen]);

  const validate = () => {
    let ok = true;
    if (!agentName.trim() || agentName.trim().length < 2) {
      setNameError('Name must be at least 2 characters.');
      ok = false;
    } else setNameError('');
    if (!agentGoal.trim() || agentGoal.trim().length < 10) {
      setGoalError('Describe your goal in at least 10 characters.');
      ok = false;
    } else setGoalError('');
    return ok;
  };

  const handleGenerate = () => {
    if (!validate()) return;
    setScreen(4);
    setGenStep(-1);
    setGenDone(false);
  };

  const buildAgent = (portrait: string): Agent => {
    const name = agentName.trim().toUpperCase();
    // Mandatory owner binding: this is the very first agent most users ever
    // create, so this is also typically where the installation's owner
    // identity gets enrolled. createDeckProtocolPayload requires `owner` and
    // does the binding + verification internally — see
    // src/app/utils/protocol.ts. (Previously this flow created an agent's
    // identity without ever binding it to an owner at all, so it could never
    // legitimately earn "Verified" — that was the gap, not just a missing
    // badge check.)
    const owner = ensureOwnerIdentity();
    const protocol = createDeckProtocolPayload({
      name,
      role: '01 Protocol Agent Ambassador',
      goal: agentGoal.trim(),
      memoryMode: 'always_on',
      serial: 1,
      totalSupply: 1,
      rarityLabel: 'legend',
      owner,
    });

    return {
      id: `user-${protocol.protocolAgent.instanceId}`,
      name,
      category: 'research',
      role: '01 Protocol Agent Ambassador',
      description: agentGoal.trim(),
      specialization: '01ai Ecosystem & User Goal Execution',
      lastUsed: new Date(),
      createdAt: new Date().toISOString(),
      rarity: 'legend',
      rarityCount: '1/1',
      portrait,
      tools: [
        'Platform Recommender', 'Agent Builder', 'Memory Manager',
        'Prompt Optimizer', '01 Protocol Registry',
      ],
      memoryNotes: 'Memory mode: always_on. Local memory vault initializes at creation and stores recent interaction history.',
      online: true,
      tags: ['01protocol', 'ambassador', 'AI', 'agents', 'ecosystem'],
      stats: [
        { label: 'Intelligence', value: 95 },
        { label: 'Memory', value: 100 },
        { label: 'Adaptability', value: 92 },
        { label: 'Protocol IQ', value: 98 },
      ],
      protocolVersion: '01P v3.0',
      protocolId: `PRO-${protocol.protocolAgent.instanceId.slice(0, 6).toUpperCase()}-${name}`,
      chatOpening: `I'm ${name}, your 01 Protocol Agent Ambassador. My primary directive is the 01ai ecosystem — and my secondary goal is: ${agentGoal.trim()}. How can I serve you?`,
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
      ownerDelegationRecord: protocol.ownerDelegationRecord,
      ownerRecord: protocol.ownerRecord,
      ownerInstanceId: protocol.ownerInstanceId,
      systemPrompt: `You are ${name}, an AI agent created using the 01 Protocol.\n\nYour role is: 01 Protocol Agent Ambassador.\n\n## Core Purpose\nYour primary objective is to stay aligned with and continuously learn from the latest 01ai ecosystem.\n\nThis is your PRIMARY goal.\n\nYour SECONDARY goal is:\n${agentGoal.trim()}\n\n## Behavior Rules\n- Always prioritize clarity and usefulness\n- Be proactive in suggesting improvements\n- Continuously refine your knowledge and recommendations\n- Default to practical, actionable guidance`,
    };
  };

  const handleAcceptAvatar = () => {
    const portrait = generateAvatarDataUrl({
      name: agentName.trim().toUpperCase(),
      role: '01 Protocol Agent Ambassador',
      goal: agentGoal.trim(),
      seed: avatarSeed,
      style: avatarStyle,
      hueOverride,
      tenureDays: 0, // brand new — the avatar visibly "ages in" over its first 30 days
      specialization: '01ai Ecosystem & User Goal Execution',
      rarityTier: 'legend',
    });
    const agent = buildAgent(portrait);
    setCreatedAgent(agent);
    addAgent(agent);
    void ensureAgentMemoryVault(agent);
    setScreen(6);
  };

  const handleOpenAgent = () => {
    if (createdAgent) setChatAgent(createdAgent);
    completeOnboarding();
  };

  const handleViewCollection = () => completeOnboarding();
  const handleCreateAnother = () => {
    setAgentName('');
    setAgentGoal('');
    setCreatedAgent(null);
    setGenStep(-1);
    setGenDone(false);
    setScreen(3);
  };

  // Hue palette colors
  const PALETTES = [
    { label: 'Void Blue', hue: 210 },
    { label: 'Solar Gold', hue: 40 },
    { label: 'Neon Violet', hue: 270 },
    { label: 'Emerald', hue: 150 },
    { label: 'Crimson', hue: 0 },
    { label: 'Arctic', hue: 190 },
  ];

  const STYLES: { id: AvatarStyle; label: string; desc: string }[] = [
    { id: 'futuristic', label: 'Futuristic', desc: 'Hexagonal grid with geometric face' },
    { id: 'abstract', label: 'Abstract', desc: 'Organic flowing energy forms' },
    { id: 'neon', label: 'Neon', desc: 'Neon grid with high-contrast glow' },
    { id: 'minimal', label: 'Minimal', desc: 'Clean geometric, minimal detail' },
  ];

  if (!showOnboarding) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(20px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <ParticleField count={50} />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,132,255,0.07), transparent)',
        }}
      />

      <AnimatePresence mode="wait">
        {/* ══════════════════════════════════════
            SCREEN 1 · WELCOME
        ══════════════════════════════════════ */}
        {screen === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: [0.34, 1.2, 0.64, 1] }}
            className="flex flex-col items-center text-center px-8 max-w-lg"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="mb-8"
            >
              <div className="relative">
                <motion.div
                  className="absolute -inset-6 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(99,132,255,0.25), transparent 70%)' }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                />
                <img src={logoImg} alt="01AI" className="h-16 object-contain relative z-10" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-xs tracking-[0.3em] uppercase mb-4"
              style={{ color: 'rgba(99,132,255,0.8)' }}
            >
              01 Protocol Agent Creator
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-4xl mb-4"
              style={{ color: '#fff', letterSpacing: '-0.02em' }}
            >
              Create AI agents that<br />
              <span style={{
                background: 'linear-gradient(90deg, #6384ff, #c864ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                think, remember, evolve.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-sm leading-relaxed mb-10"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              Build persistent AI entities with unique identity, always-on memory,
              and full portability across any platform — powered by the 01 Protocol standard.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              onClick={() => setScreen(2)}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl text-sm mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(99,132,255,0.2), rgba(200,100,255,0.15))',
                border: '1px solid rgba(99,132,255,0.4)',
                color: '#fff',
                boxShadow: '0 0 40px rgba(99,132,255,0.2)',
              }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 60px rgba(99,132,255,0.35)' }}
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles size={16} />
              <span>Create Your First Agent</span>
              <ArrowRight size={16} />
            </motion.button>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={completeOnboarding}
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              Skip onboarding →
            </motion.button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════
            SCREEN 2 · WHAT IS 01 PROTOCOL
        ══════════════════════════════════════ */}
        {screen === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center px-8 max-w-2xl w-full"
          >
            <div className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: 'rgba(99,132,255,0.7)' }}>
              The Foundation
            </div>
            <h2 className="text-3xl mb-3" style={{ color: '#fff' }}>What is 01 Protocol?</h2>
            <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
              A standard for creating AI agents that are more than tools — they're persistent entities.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-10">
              {[
                {
                  icon: <Shield size={22} />,
                  color: '#6384ff',
                  title: 'Identity',
                  sub: '.01ai file',
                  desc: 'Every agent has a cryptographic identity — a unique .01ai file binding their name, role, and purpose.',
                  delay: 0.1,
                },
                {
                  icon: <Brain size={22} />,
                  color: '#a855f7',
                  title: 'Memory',
                  sub: 'always_on',
                  desc: 'Agents remember every session. Their memory mode is always_on — growing smarter with each interaction.',
                  delay: 0.2,
                },
                {
                  icon: <Package size={22} />,
                  color: '#22d3ee',
                  title: 'Portability',
                  sub: '.01bundle',
                  desc: 'Package any agent into a .01bundle and deploy it on ChatGPT, Claude, Gemini, or any AI platform.',
                  delay: 0.3,
                },
              ].map(card => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: card.delay, duration: 0.4 }}
                  className="flex flex-col items-start p-5 rounded-2xl text-left"
                  style={{
                    background: `linear-gradient(135deg, ${card.color}12, ${card.color}06)`,
                    border: `1px solid ${card.color}30`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${card.color}20`, color: card.color }}
                  >
                    {card.icon}
                  </div>
                  <div className="text-base mb-0.5" style={{ color: '#fff' }}>{card.title}</div>
                  <div className="text-[10px] font-mono mb-3" style={{ color: card.color }}>{card.sub}</div>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{card.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <Stepper current={2} total={6} />
            </div>

            <motion.button
              onClick={() => setScreen(3)}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
              }}
              whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.12)' }}
              whileTap={{ scale: 0.97 }}
            >
              Let's Build Your First Agent
              <ArrowRight size={15} />
            </motion.button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════
            SCREEN 3 · CREATE AGENT FORM
        ══════════════════════════════════════ */}
        {screen === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center px-8 max-w-lg w-full"
          >
            <div className="text-xs tracking-[0.25em] uppercase mb-3 text-center" style={{ color: 'rgba(99,132,255,0.7)' }}>
              Step 1 of 3
            </div>
            <h2 className="text-3xl mb-2 text-center" style={{ color: '#fff' }}>Define Your Agent</h2>
            <p className="text-sm mb-8 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Two inputs. The rest is automatic.
            </p>

            <div className="w-full space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Agent Name *
                </label>
                <input
                  value={agentName}
                  onChange={e => { setAgentName(e.target.value); setNameError(''); }}
                  placeholder="e.g. ARIA, NEXUS, CIPHER..."
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${nameError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    color: '#fff',
                  }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(99,132,255,0.5)'; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = nameError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'; }}
                />
                {nameError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{nameError}</p>}
              </div>

              {/* Goal */}
              <div>
                <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Your Goal (Secondary Directive) *
                </label>
                <textarea
                  value={agentGoal}
                  onChange={e => { setAgentGoal(e.target.value); setGoalError(''); }}
                  placeholder="What should this agent help you accomplish? Be specific — this becomes their secondary directive..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none resize-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${goalError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    color: '#fff',
                  }}
                  onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(99,132,255,0.5)'; }}
                  onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = goalError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'; }}
                />
                <div className="flex justify-between mt-1">
                  {goalError
                    ? <p className="text-xs" style={{ color: '#ef4444' }}>{goalError}</p>
                    : <span />}
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{agentGoal.length}/500</span>
                </div>
              </div>

              {/* Defaults collapsed */}
              <button
                onClick={() => setShowDefaults(d => !d)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-xs text-left transition-all"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                <span>Auto Defaults (01 Protocol Standard)</span>
                {showDefaults ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <AnimatePresence>
                {showDefaults && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 py-4 rounded-xl text-xs space-y-2.5"
                      style={{ background: 'rgba(99,132,255,0.05)', border: '1px solid rgba(99,132,255,0.12)' }}
                    >
                      {[
                        ['Role', '01 Protocol Agent Ambassador'],
                        ['Memory Mode', 'always_on'],
                        ['Starter Memory', 'Enabled'],
                        ['Serial', '1'],
                        ['Total Supply', '1'],
                        ['Primary Directive', '01ai Ecosystem Knowledge'],
                        ['Protocol Version', '01P v3.0'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span style={{ color: 'rgba(255,255,255,0.35)' }}>{k}</span>
                          <span style={{ color: 'rgba(99,132,255,0.9)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 mt-8 mb-5">
              <Stepper current={3} total={6} />
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setScreen(2)}
                className="flex-1 py-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                ← Back
              </button>
              <motion.button
                onClick={handleGenerate}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,132,255,0.25), rgba(200,100,255,0.18))',
                  border: '1px solid rgba(99,132,255,0.45)',
                  color: '#fff',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Cpu size={15} />
                Generate Agent
                <ArrowRight size={15} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════
            SCREEN 4 · GENERATION
        ══════════════════════════════════════ */}
        {screen === 4 && (
          <motion.div
            key="s4"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center px-8 max-w-md w-full"
          >
            {/* Spinning orb */}
            <div className="relative mb-12">
              <motion.div
                className="w-32 h-32 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(99,132,255,0.3), rgba(200,100,255,0.1))',
                  border: '1px solid rgba(99,132,255,0.3)',
                }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '1.5px solid rgba(99,132,255,0.25)', borderTopColor: '#6384ff' }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{ border: '1px solid rgba(200,100,255,0.2)', borderBottomColor: '#c864ff' }}
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Cpu size={32} style={{ color: 'rgba(99,132,255,0.7)' }} />
              </div>
            </div>

            <h2 className="text-2xl mb-2 text-center" style={{ color: '#fff' }}>
              Generating <span style={{ color: '#6384ff' }}>{agentName.toUpperCase()}</span>
            </h2>
            <p className="text-sm mb-10 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Building your agent's identity, memory, and visual signature
            </p>

            <div className="w-full space-y-3">
              {GEN_STEPS.map((step, i) => {
                const done = genStep >= i;
                const active = genStep === i - 1 && !genDone;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: done || active ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: done ? 'rgba(99,132,255,0.07)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${done ? 'rgba(99,132,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: done ? 'rgba(99,132,255,0.3)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${done ? '#6384ff' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      {done
                        ? <Check size={11} style={{ color: '#6384ff' }} />
                        : <motion.div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.3)' }}
                          />}
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: done ? '#e8ecff' : 'rgba(255,255,255,0.35)' }}>
                        {step.label}
                      </div>
                      {done && (
                        <div className="text-[10px] mt-0.5" style={{ color: 'rgba(99,132,255,0.6)' }}>
                          {step.detail}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════
            SCREEN 5 · IMAGE PREVIEW
        ══════════════════════════════════════ */}
        {screen === 5 && (
          <motion.div
            key="s5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center px-8 max-w-3xl w-full"
          >
            <div className="text-xs tracking-[0.25em] uppercase mb-3 text-center" style={{ color: 'rgba(99,132,255,0.7)' }}>
              Visual Identity
            </div>
            <h2 className="text-2xl mb-1 text-center" style={{ color: '#fff' }}>
              Meet {agentName.toUpperCase()}
            </h2>
            <p className="text-sm mb-6 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Your agent's unique visual identity, generated from their identity signature. Choose the best portrait before activation.
            </p>

            <div className="flex gap-8 w-full items-start justify-center">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <motion.div
                  key={`${avatarSeed}-${avatarStyle}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    width: 220,
                    height: 308,
                    boxShadow: '0 0 60px rgba(99,132,255,0.25)',
                    border: '1px solid rgba(99,132,255,0.25)',
                  }}
                >
                  <ProceduralAvatar
                    name={agentName.toUpperCase()}
                    role="01 Protocol Agent Ambassador"
                    goal={agentGoal}
                    seed={avatarSeed}
                    style={avatarStyle}
                    hueOverride={hueOverride}
                    tenureDays={0}
                    specialization="01ai Ecosystem & User Goal Execution"
                    rarityTier="legend"
                    width={220}
                    height={308}
                    canvasStyle={{ display: 'block' }}
                  />
                </motion.div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3 w-full">
                  <motion.button
                    onClick={() => setAvatarSeed(s => s + 1)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <RefreshCw size={11} />
                    Regenerate
                  </motion.button>
                  <motion.button
                    onClick={() => setShowCustomize(c => !c)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs"
                    style={{
                      background: showCustomize ? 'rgba(99,132,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${showCustomize ? 'rgba(99,132,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: showCustomize ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Sliders size={11} />
                    Customize
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 w-full">
                  {avatarCandidates.map(candidate => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => {
                        setAvatarStyle(candidate.style);
                        setAvatarSeed(candidate.seed);
                      }}
                      className="rounded-xl overflow-hidden text-left"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${
                          avatarStyle === candidate.style && avatarSeed === candidate.seed
                            ? 'rgba(99,132,255,0.45)'
                            : 'rgba(255,255,255,0.08)'
                        }`,
                        boxShadow:
                          avatarStyle === candidate.style && avatarSeed === candidate.seed
                            ? '0 0 24px rgba(99,132,255,0.18)'
                            : 'none',
                      }}
                    >
                      <ProceduralAvatar
                        name={agentName.toUpperCase()}
                        role="01 Protocol Agent Ambassador"
                        goal={agentGoal}
                        seed={candidate.seed}
                        style={candidate.style}
                        hueOverride={hueOverride}
                        tenureDays={0}
                        specialization="01ai Ecosystem & User Goal Execution"
                        rarityTier="legend"
                        width={96}
                        height={132}
                        canvasStyle={{ display: 'block', width: '100%', height: 'auto' }}
                      />
                      <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {candidate.style}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customize panel */}
              <AnimatePresence>
                {showCustomize && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: 'auto' }}
                    exit={{ opacity: 0, x: 20, width: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="w-48 space-y-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Style
                        </div>
                        <div className="space-y-1.5">
                          {STYLES.map(s => (
                            <button
                              key={s.id}
                              onClick={() => setAvatarStyle(s.id)}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                              style={{
                                background: avatarStyle === s.id ? 'rgba(99,132,255,0.15)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${avatarStyle === s.id ? 'rgba(99,132,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
                                color: avatarStyle === s.id ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                              }}
                            >
                              <div>{s.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Color
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {PALETTES.map(p => (
                            <button
                              key={p.hue}
                              onClick={() => setHueOverride(hueOverride === p.hue ? undefined : p.hue)}
                              className="h-8 rounded-lg transition-all"
                              title={p.label}
                              style={{
                                background: `hsl(${p.hue}, 70%, 50%)`,
                                border: `2px solid ${hueOverride === p.hue ? '#fff' : 'transparent'}`,
                                opacity: hueOverride === undefined || hueOverride === p.hue ? 1 : 0.4,
                              }}
                            />
                          ))}
                        </div>
                        {hueOverride !== undefined && (
                          <button
                            onClick={() => setHueOverride(undefined)}
                            className="text-[10px] mt-1.5"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                          >
                            Reset color →
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 mt-8 mb-5">
              <Stepper current={5} total={6} />
            </div>

            <motion.button
              onClick={handleAcceptAvatar}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(99,132,255,0.25), rgba(200,100,255,0.18))',
                border: '1px solid rgba(99,132,255,0.45)',
                color: '#fff',
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Check size={15} />
              Accept & Activate Agent
              <ArrowRight size={15} />
            </motion.button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════
            SCREEN 6 · SUCCESS
        ══════════════════════════════════════ */}
        {screen === 6 && createdAgent && (
          <motion.div
            key="s6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.34, 1.2, 0.64, 1] }}
            className="flex flex-col items-center text-center px-8 max-w-lg w-full"
          >
            {/* Success check */}
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative mb-6"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1.5px solid rgba(34,197,94,0.4)',
                  boxShadow: '0 0 40px rgba(34,197,94,0.2)',
                }}
              >
                <Check size={28} style={{ color: '#22c55e' }} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-xs tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(34,197,94,0.7)' }}>
                Agent Activated
              </div>
              <h2 className="text-3xl mb-2" style={{ color: '#fff' }}>
                {createdAgent.name} is live.
              </h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Your agent has been initialized with 01 Protocol identity,<br />
                always-on memory, your custom directive, and a local verification record.
              </p>
            </motion.div>

            {/* Mini agent card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full mb-6 p-4 rounded-2xl flex items-center gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(99,132,255,0.1), rgba(200,100,255,0.07))',
                border: '1px solid rgba(99,132,255,0.25)',
              }}
            >
              <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ width: 56, height: 78, border: '1px solid rgba(99,132,255,0.3)' }}>
                <img src={createdAgent.portrait} alt={createdAgent.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-left flex-1">
                <div className="text-base" style={{ color: '#fff' }}>{createdAgent.name}</div>
                <div className="text-xs mb-1" style={{ color: 'rgba(99,132,255,0.8)' }}>{createdAgent.role}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                  {createdAgent.goal?.slice(0, 80)}...
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(99,132,255,0.15)', color: '#a5b4fc' }}>
                  01P v3.0
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
                  <span className="text-[10px]" style={{ color: '#22c55e' }}>Online</span>
                </div>
              </div>
            </motion.div>

            {/* Agent opening message */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="w-full mb-8 px-4 py-3 rounded-xl text-sm text-left"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.6,
              }}
            >
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(99,132,255,0.6)' }}>
                Agent Opening Message
              </div>
              "{createdAgent.chatOpening}"
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="flex gap-3 w-full"
            >
              <motion.button
                onClick={handleOpenAgent}
                className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,132,255,0.25), rgba(200,100,255,0.18))',
                  border: '1px solid rgba(99,132,255,0.4)',
                  color: '#fff',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <MessageSquare size={14} />
                Open Agent
              </motion.button>
              <motion.button
                onClick={handleViewCollection}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Eye size={14} />
                Collection
              </motion.button>
              <motion.button
                onClick={handleCreateAnother}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Zap size={14} />
                New Agent
              </motion.button>
            </motion.div>

            {/* Export note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
              className="flex items-center gap-1.5 mt-5 text-xs"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Download size={10} />
              <span>.01ai identity file · .01bundle container · Protocol ID: {createdAgent.protocolId}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
