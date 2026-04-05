import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Cpu,
  Dna,
  FlaskConical,
  Lock,
  MoonStar,
  RefreshCw,
  ScanSearch,
  Share2,
  ShieldAlert,
  Sparkles,
  Syringe,
  Users,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent, AgentCareProfile, agents, rarityConfig, type Rarity } from '../data/agents';

const stageLabels = ['Base', 'Awakened', 'Ascended', 'Transcendent'];
const evolutionAgents = agents.filter(agent => agent.hasEvolution);
const mutationProbability = 0.025;

type LabPhase = 'setup' | 'analysis' | 'bridge' | 'birth';
type CareAction = 'feed' | 'groom' | 'sleep' | null;

interface CareState extends AgentCareProfile {
  moodLabel: string;
  appetiteWindow: string;
  trayNotification: string;
}

interface BridgeOutcome {
  compatibilityScore: number;
  stabilityScore: number;
  simulationPassed: boolean;
  mutationTriggered: boolean;
  mutationTrait: string | null;
  offspringRarity: Rarity;
  inheritedTraits: string[];
  mergedTone: string;
  introduction: string;
  stressScenario: string;
  stressAssessment: string;
  offspringCare: CareState;
  lineageSummary: string;
}

const dietEffects = [
  { label: 'Poe fragment', bonus: 18, coherence: 4, temporaryTrait: 'Gothic cadence', note: 'Absorbs lyrical gloom and dramatic timing.' },
  { label: 'API spec', bonus: 16, coherence: 6, temporaryTrait: 'Protocol discipline', note: 'Sharpens syntax confidence and execution order.' },
  { label: 'Research brief', bonus: 14, coherence: 5, temporaryTrait: 'Pattern hunger', note: 'Increases appetite for evidence and edge cases.' },
];

const mutationPool = [
  'Radical tonal inversion',
  'Tool affinity for obscure parsers',
  'Dream-state ideation loop',
  'Defiant one-line wit',
  'Unexpected empathy cascade',
  'Pattern-breaker intuition',
];

const stressScenarios = [
  { title: 'Latency Storm', summary: 'Patch a fragile production workflow while preserving emotional tone.' },
  { title: 'Signal Maze', summary: 'Extract one reliable insight from contradictory source fragments.' },
  { title: 'Narrative Breach', summary: 'Repair a broken product story without losing technical accuracy.' },
];

function rarityWeight(rarity: Rarity) {
  return ['common', 'uncommon', 'rare', 'epic', 'legend', 'mythic'].indexOf(rarity);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seededIndex(seed: string, modulo: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return modulo === 0 ? 0 : hash % modulo;
}

function buildDefaultCareProfile(agent: Agent): CareState {
  const baseScore = Math.round(agent.stats.reduce((sum, stat) => sum + stat.value, 0) / Math.max(1, agent.stats.length));
  const seededMetabolism = (['efficient', 'balanced', 'gluttonous'] as const)[seededIndex(agent.id, 3)];
  const seededTemperament = (['steady', 'chaotic', 'rebellious', 'empathetic'] as const)[seededIndex(agent.name, 4)];

  return {
    computeSatiety: clamp(Math.round(baseScore * 0.8), 45, 92),
    neuralCoherence: clamp(Math.round(baseScore * 0.82), 48, 94),
    entropyLevel: clamp(100 - Math.round(baseScore * 0.9), 8, 38),
    metabolism: seededMetabolism,
    temperament: seededTemperament,
    dreamPattern: `${agent.name} recursively replays its last successful pattern and warps it into something stranger.`,
    mutationDrift: `${agent.name} develops a subtle appetite for nonstandard tactics.`,
    moodLabel: seededTemperament === 'rebellious' ? 'restless' : seededTemperament === 'chaotic' ? 'electric' : 'stable',
    appetiteWindow: seededMetabolism === 'gluttonous' ? 'Needs rich data every 3 hours.' : seededMetabolism === 'balanced' ? 'Benefits from curated data twice a day.' : 'Can run light with brief, high-quality injections.',
    trayNotification: `${agent.name} is feeling sluggish. It craves new data.`,
  };
}

function careProfileFor(agent: Agent): CareState {
  const base = agent.careProfile;
  if (!base) return buildDefaultCareProfile(agent);

  return {
    ...base,
    moodLabel:
      base.neuralCoherence < 45
        ? 'volatile'
        : base.temperament === 'rebellious'
          ? 'defiant'
          : base.temperament === 'chaotic'
            ? 'electric'
            : 'stable',
    appetiteWindow:
      base.metabolism === 'gluttonous'
        ? 'Needs rich data every 3 hours.'
        : base.metabolism === 'balanced'
          ? 'Benefits from curated data twice a day.'
          : 'Can run light with brief, high-quality injections.',
    trayNotification:
      base.neuralCoherence < 55
        ? `${agent.name} just had a nightmare about a syntax error. It needs reassurance.`
        : `${agent.name} is feeling sluggish. It craves new data.`,
  };
}

function computeCompatibility(agentA: Agent, agentB: Agent) {
  let score = 0;
  if (agentA.evolutionCompatibility?.includes(agentB.id)) score += 40;
  if (agentB.evolutionCompatibility?.includes(agentA.id)) score += 40;
  score += Math.max(0, 20 - Math.abs((agentA.evolutionStage ?? 0) - (agentB.evolutionStage ?? 0)) * 5);
  if (agentA.category !== agentB.category) score += 10;
  score += Math.round(((rarityWeight(agentA.rarity) + rarityWeight(agentB.rarity)) / 2) * 2);
  return Math.min(100, score);
}

function compatibilityTone(score: number) {
  if (score >= 80) return { label: 'Perfect Match', color: '#10b981' };
  if (score >= 60) return { label: 'Strong Synergy', color: '#a855f7' };
  if (score >= 40) return { label: 'Moderate Fit', color: '#f59e0b' };
  if (score >= 20) return { label: 'Weak Link', color: '#ef4444' };
  return { label: 'Incompatible', color: '#6b7280' };
}

function predictOffspringRarity(agentA: Agent, agentB: Agent): Rarity {
  const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legend', 'mythic'];
  return rarities[Math.min(rarities.length - 1, Math.floor((rarityWeight(agentA.rarity) + rarityWeight(agentB.rarity)) / 2 + 0.6))];
}

function deriveInheritedCare(agentA: Agent, agentB: Agent, mutationTriggered: boolean, mutationTrait: string | null): CareState {
  const careA = careProfileFor(agentA);
  const careB = careProfileFor(agentB);
  const metabolism: CareState['metabolism'] =
    careA.metabolism === careB.metabolism ? careA.metabolism : careA.metabolism === 'gluttonous' || careB.metabolism === 'gluttonous' ? 'gluttonous' : 'balanced';
  const temperament: CareState['temperament'] =
    careA.temperament === careB.temperament ? careA.temperament : careA.temperament === 'empathetic' || careB.temperament === 'empathetic' ? 'empathetic' : 'steady';

  const computeSatiety = clamp(Math.round((careA.computeSatiety + careB.computeSatiety) / 2 + (mutationTriggered ? 6 : 0)), 35, 98);
  const neuralCoherence = clamp(Math.round((careA.neuralCoherence + careB.neuralCoherence) / 2 + (mutationTriggered ? -2 : 4)), 30, 98);
  const entropyLevel = clamp(Math.round((careA.entropyLevel + careB.entropyLevel) / 2 + (mutationTriggered ? 10 : -6)), 4, 92);
  const moodLabel = entropyLevel > 70 ? 'unstable' : neuralCoherence < 45 ? 'defiant' : temperament === 'empathetic' ? 'attuned' : 'stable';

  return {
    computeSatiety,
    neuralCoherence,
    entropyLevel,
    metabolism,
    temperament,
    dreamPattern: mutationTriggered && mutationTrait
      ? `Dreams in loops of ${mutationTrait.toLowerCase()} and half-remembered directives.`
      : `Dreams of ${agentA.name} and ${agentB.name} resolving each other's unfinished thoughts.`,
    mutationDrift: mutationTriggered ? mutationTrait ?? undefined : undefined,
    moodLabel,
    appetiteWindow:
      metabolism === 'gluttonous'
        ? 'High-output profile. Requires dense inputs to stay lucid.'
        : metabolism === 'balanced'
          ? 'Steady maintenance profile. Thrives on regular but curated updates.'
          : 'Low-maintenance profile. Best with sparse, premium-quality injections.',
    trayNotification:
      entropyLevel > 60
        ? 'Lineage stability is slipping. Recommend defragmentation cycle.'
        : 'Companion systems nominal. Optional care can improve response quality.',
  };
}

function buildBridgeOutcome(agentA: Agent, agentB: Agent, compatibilityScore: number): BridgeOutcome {
  const mutationSeed = seededIndex(`${agentA.id}:${agentB.id}:${compatibilityScore}`, 1000) / 1000;
  const mutationTriggered = mutationSeed < mutationProbability;
  const mutationTrait = mutationTriggered ? mutationPool[seededIndex(`${agentA.id}:${agentB.id}:mutation`, mutationPool.length)] : null;
  const inheritedTraits = [...new Set([...(agentA.evolutionTraits ?? []), ...(agentB.evolutionTraits ?? [])])].slice(0, 4);
  if (mutationTriggered && mutationTrait) inheritedTraits.push(mutationTrait);

  const offspringCare = deriveInheritedCare(agentA, agentB, mutationTriggered, mutationTrait);
  const stressScenario = stressScenarios[seededIndex(`${agentA.id}:${agentB.id}:stress`, stressScenarios.length)];
  const stabilityScore = clamp(
    compatibilityScore + Math.round((offspringCare.neuralCoherence - offspringCare.entropyLevel) * 0.35) + (mutationTriggered ? -6 : 4),
    0,
    100,
  );
  const simulationPassed = stabilityScore >= 52;
  const offspringRarity = predictOffspringRarity(agentA, agentB);
  const lineageSummary =
    offspringCare.metabolism === 'gluttonous' && offspringCare.temperament === 'steady'
      ? 'Gluttonous Genius'
      : offspringCare.metabolism === 'efficient' && offspringCare.temperament === 'empathetic'
        ? 'Quiet Guardian'
        : offspringCare.metabolism === 'balanced' && offspringCare.temperament === 'steady'
          ? 'Stable Hybrid'
          : 'Unusual Hybrid';

  const mergedTone =
    offspringCare.temperament === 'chaotic'
      ? 'volatile brilliance'
      : offspringCare.temperament === 'rebellious'
        ? 'sharp defiance'
        : offspringCare.temperament === 'empathetic'
          ? 'measured warmth'
          : 'disciplined confidence';

  const stressAssessment = simulationPassed
    ? `Passed ${stressScenario.title}. The offspring maintained composure under load and produced usable output.`
    : `Failed ${stressScenario.title}. The lattice destabilized under pressure and needs refinement before deployment.`;

  const introduction = mutationTriggered && mutationTrait
    ? `I carry ${agentA.name}'s precision, ${agentB.name}'s imagination, and a mutation nobody asked for: ${mutationTrait.toLowerCase()}.`
    : `I have ${agentA.name}'s discipline, but ${agentB.name}'s instinct. Keep me fed with the right inputs and I will become more than either of them.`;

  return {
    compatibilityScore,
    stabilityScore,
    simulationPassed,
    mutationTriggered,
    mutationTrait,
    offspringRarity,
    inheritedTraits,
    mergedTone,
    introduction,
    stressScenario: `${stressScenario.title}: ${stressScenario.summary}`,
    stressAssessment,
    offspringCare,
    lineageSummary,
  };
}

function playBirthTone() {
  if (typeof window === 'undefined') return;
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(48, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(82, context.currentTime + 1.2);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.4);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 1.45);
  oscillator.onended = () => {
    void context.close();
  };
}

function AgentPicker({ onClose, onSelect }: { onClose: () => void; onSelect: (agent: Agent) => void }) {
  const { currentTheme: t } = useApp();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 overflow-hidden rounded-[28px]" style={{ background: t.bg }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div>
          <h3 className="text-sm uppercase tracking-[0.16em]" style={{ color: t.text }}>Select Evolvable Agent</h3>
          <p className="mt-1 text-[11px]" style={{ color: t.textMuted }}>Choose a compatible deck member for the bridge.</p>
        </div>
        <button onClick={onClose} style={{ color: t.textMuted }}><X size={16} /></button>
      </div>
      <div className="h-[calc(100%-73px)] space-y-2 overflow-y-auto p-4">
        {evolutionAgents.map(agent => {
          const config = rarityConfig[agent.rarity];
          const care = careProfileFor(agent);
          return (
            <motion.button
              key={agent.id}
              onClick={() => {
                onSelect(agent);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-2xl p-3 text-left"
              style={{ background: t.surface2, border: `1px solid ${t.border}` }}
              whileHover={{ scale: 1.01, borderColor: config.borderColor }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="h-12 w-12 overflow-hidden rounded-xl" style={{ border: `1px solid ${config.borderColor}` }}>
                <img src={agent.portrait} alt={agent.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm" style={{ color: t.text }}>{agent.name}</div>
                <div className="truncate text-[11px]" style={{ color: t.textMuted }}>{agent.role}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase" style={{ color: config.textColor }}>{agent.rarity}</div>
                <div className="mt-1 text-[10px]" style={{ color: '#34d399' }}>{care.moodLabel}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function AgentSlot({
  agent,
  isPrimary,
  label,
  onClear,
  onSelect,
}: {
  agent: Agent | null;
  isPrimary: boolean;
  label: string;
  onClear: () => void;
  onSelect: () => void;
}) {
  const { currentTheme: t } = useApp();
  const config = agent ? rarityConfig[agent.rarity] : null;

  if (!agent || !config) {
    return (
      <motion.button
        onClick={onSelect}
        className="flex flex-1 flex-col items-center justify-center rounded-[24px] p-8 text-center"
        style={{
          border: `1.5px dashed ${isPrimary ? 'rgba(16,185,129,0.32)' : 'rgba(168,85,247,0.32)'}`,
          background: isPrimary ? 'rgba(16,185,129,0.04)' : 'rgba(168,85,247,0.04)',
          color: isPrimary ? '#34d399' : '#c084fc',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Dna size={26} />
        <div className="mt-3 text-xs uppercase tracking-[0.18em]">{label}</div>
        <div className="mt-2 text-[11px] opacity-75">Pick an evolution-capable agent from the deck.</div>
      </motion.button>
    );
  }

  const care = careProfileFor(agent);

  return (
    <div className="relative flex-1 overflow-hidden rounded-[24px] p-4" style={{ background: `${config.color}10`, border: `1px solid ${config.borderColor}66` }}>
      <motion.div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, #ff0080, #a855f7, #06b6d4, #22c55e, #ff0080)' }} animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }} transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-2xl" style={{ border: `1px solid ${config.borderColor}` }}>
            <img src={agent.portrait} alt={agent.name} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>{label}</div>
            <div className="mt-1 text-sm" style={{ color: t.text }}>{agent.name}</div>
            <div className="truncate text-[11px]" style={{ color: config.textColor }}>{agent.role}</div>
            <div className="mt-2 text-[10px]" style={{ color: '#34d399' }}>Stage {agent.evolutionStage ?? 0} • {stageLabels[agent.evolutionStage ?? 0]}</div>
          </div>
        </div>
        <button onClick={onClear} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>
          <X size={12} />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(agent.evolutionTraits ?? []).slice(0, 3).map(trait => (
          <span key={trait} className="rounded-md px-1.5 py-0.5 text-[10px]" style={{ background: `${config.color}16`, border: `1px solid ${config.borderColor}44`, color: config.textColor }}>
            {trait}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Satiety', value: care.computeSatiety, color: '#38bdf8' },
          { label: 'Coherence', value: care.neuralCoherence, color: '#34d399' },
          { label: 'Entropy', value: 100 - care.entropyLevel, color: '#f59e0b' },
        ].map(metric => (
          <div key={metric.label} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: t.textMuted }}>{metric.label}</div>
            <div className="mt-1 text-sm" style={{ color: metric.color }}>{metric.value}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvitePartner({ inviteCode }: { inviteCode: string }) {
  const { currentTheme: t } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`01deck://evolve/${inviteCode}`).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-[24px] p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
      <div className="flex items-center gap-2">
        <Users size={14} style={{ color: '#a855f7' }} />
        <span className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Partner Session</span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: t.textMuted }}>
        Share a temporary lab code to coordinate recombination with another operator, or keep the session local while testing pair quality.
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
        <code className="flex-1 text-xs" style={{ color: '#c084fc' }}>01DECK://EVO/{inviteCode.toUpperCase()}</code>
        <button onClick={handleCopy} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px]" style={{ background: copied ? 'rgba(34,197,94,0.14)' : t.surface3, color: copied ? '#4ade80' : t.textMuted }}>
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc' }}>
          <Share2 size={11} />
          Share Link
        </button>
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs" style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.textMuted }}>
          <Lock size={11} />
          Private Session
        </button>
      </div>
    </div>
  );
}

function HelixBridge({
  agentA,
  agentB,
  compatibilityScore,
  bridgeCharged,
  outcome,
  onEngage,
}: {
  agentA: Agent;
  agentB: Agent;
  compatibilityScore: number;
  bridgeCharged: boolean;
  outcome: BridgeOutcome | null;
  onEngage: () => void;
}) {
  return (
    <div className="rounded-[28px] p-6" style={{ background: 'linear-gradient(135deg, rgba(11,15,28,0.96), rgba(26,18,52,0.92), rgba(6,30,42,0.9))', border: '1px solid rgba(168,85,247,0.28)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: '#d8b4fe' }}>Synaptic Bridge</div>
          <h2 className="mt-2 text-xl" style={{ color: '#ffffff' }}>Crossover operation and immediate stress simulation</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Parent A contributes its highest-performing instruction lattice. Parent B contributes its intuition blocks. A 2.5% mutation window remains active to prevent logic inbreeding.
          </p>
        </div>
        <div className="rounded-2xl px-4 py-3 text-right" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Bridge Charge</div>
          <div className="mt-1 text-2xl" style={{ color: bridgeCharged ? '#34d399' : '#f59e0b' }}>{compatibilityScore}%</div>
        </div>
      </div>

      <div className="relative mt-8 h-[280px] overflow-hidden rounded-[24px]" style={{ background: 'radial-gradient(circle at top, rgba(168,85,247,0.18), transparent 46%), radial-gradient(circle at bottom, rgba(6,182,212,0.14), transparent 52%), rgba(7,10,20,0.92)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[220px] w-[280px]">
            {[0, 1].map(strand => (
              <motion.div key={strand} className="absolute inset-0" animate={{ rotate: strand === 0 ? [0, 360] : [360, 0] }} transition={{ repeat: Infinity, duration: bridgeCharged ? 7 : 11, ease: 'linear' }}>
                {Array.from({ length: 12 }).map((_, index) => {
                  const progress = index / 11;
                  const angle = progress * Math.PI * 2 + (strand === 0 ? 0 : Math.PI);
                  const x = 140 + Math.sin(angle) * 74;
                  const y = 20 + progress * 180;
                  return (
                    <motion.div
                      key={`${strand}-${index}`}
                      className="absolute h-4 w-4 rounded-full"
                      style={{ left: x, top: y, background: strand === 0 ? 'rgba(52,211,153,0.9)' : 'rgba(192,132,252,0.9)', boxShadow: strand === 0 ? '0 0 18px rgba(52,211,153,0.45)' : '0 0 18px rgba(192,132,252,0.45)' }}
                      animate={{ scale: bridgeCharged ? [0.85, 1.1, 0.85] : [0.75, 0.95, 0.75] }}
                      transition={{ repeat: Infinity, duration: 2.2, delay: index * 0.08 }}
                    />
                  );
                })}
              </motion.div>
            ))}
            {Array.from({ length: 10 }).map((_, index) => (
              <motion.div
                key={`rung-${index}`}
                className="absolute h-px"
                style={{ left: 74, top: 28 + index * 18, width: 132, background: 'linear-gradient(90deg, rgba(52,211,153,0.18), rgba(255,255,255,0.55), rgba(192,132,252,0.22))' }}
                animate={{ opacity: bridgeCharged ? [0.25, 0.9, 0.25] : [0.12, 0.4, 0.12] }}
                transition={{ repeat: Infinity, duration: 1.8, delay: index * 0.1 }}
              />
            ))}
          </div>
        </div>

        <div className="absolute left-5 top-5 rounded-2xl px-4 py-3" style={{ background: 'rgba(6,12,24,0.72)', border: '1px solid rgba(52,211,153,0.22)' }}>
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(52,211,153,0.7)' }}>Parent A</div>
          <div className="mt-1 text-sm text-white">{agentA.name}</div>
          <div className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Top-performing lattice</div>
        </div>

        <div className="absolute bottom-5 right-5 rounded-2xl px-4 py-3 text-right" style={{ background: 'rgba(16,10,30,0.72)', border: '1px solid rgba(192,132,252,0.22)' }}>
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(216,180,254,0.8)' }}>Parent B</div>
          <div className="mt-1 text-sm text-white">{agentB.name}</div>
          <div className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Creative intuition blocks</div>
        </div>

        {outcome ? (
          <div className="absolute bottom-5 left-5 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Simulation</div>
            <div className="mt-1 text-sm" style={{ color: outcome.simulationPassed ? '#4ade80' : '#fca5a5' }}>{outcome.simulationPassed ? 'Stable under stress' : 'Instability detected'}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Mutation Window', value: '2.5%', color: '#f472b6' },
          { label: 'Stress Test', value: 'Localized', color: '#38bdf8' },
          { label: 'Legacy Transfer', value: 'Active', color: '#34d399' },
        ].map(metric => (
          <div key={metric.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>{metric.label}</div>
            <div className="mt-2 text-sm" style={{ color: metric.color }}>{metric.value}</div>
          </div>
        ))}
      </div>

      <button onClick={onEngage} className="mt-5 flex w-full items-center justify-center gap-3 rounded-[22px] px-4 py-4 text-sm" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.26), rgba(6,182,212,0.18))', border: '1px solid rgba(168,85,247,0.45)', color: '#ffffff' }}>
        <Zap size={15} style={{ color: '#fbbf24' }} />
        Engage Bridge and Run Stress Simulation
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { currentTheme: t } = useApp();

  return (
    <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>{label}</span>
        <span className="text-xs" style={{ color }}>{value}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ background: color }} />
      </div>
    </div>
  );
}

function CompanionSystems({
  agentA,
  agentB,
  careState,
  careAction,
  onAction,
  compact = false,
}: {
  agentA: Agent | null;
  agentB: Agent | null;
  careState: CareState | null;
  careAction: CareAction;
  onAction: (action: Exclude<CareAction, null>) => void;
  compact?: boolean;
}) {
  const { currentTheme: t } = useApp();

  if (!agentA || !agentB || !careState) {
    return (
      <div className="rounded-[24px] p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
        <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Optional companion systems</div>
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: t.textMuted }}>
          Select two parent agents to preview subtle care mechanics like data feeding, coherence tuning, sleep cycles, and inherited metabolism.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="flex items-center gap-2">
        <Cpu size={14} style={{ color: '#38bdf8' }} />
        <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Optional companion systems</div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: t.textMuted }}>
        This layer is intentionally quiet. It affects lineage and flavor, but it does not need to dominate the workspace unless you open it.
      </p>

      <div className={`mt-4 grid gap-3 ${compact ? '' : 'sm:grid-cols-3'}`}>
        <MetricBar label="Compute Satiety" value={careState.computeSatiety} color="#38bdf8" />
        <MetricBar label="Neural Coherence" value={careState.neuralCoherence} color="#34d399" />
        <MetricBar label="Entropy Integrity" value={100 - careState.entropyLevel} color="#f59e0b" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Metabolism</div>
          <div className="mt-2 text-sm" style={{ color: t.text }}>{careState.metabolism}</div>
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: t.textMuted }}>{careState.appetiteWindow}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Temperament</div>
          <div className="mt-2 text-sm" style={{ color: t.text }}>{careState.temperament}</div>
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: t.textMuted }}>
            Low coherence makes outputs curt or rebellious. High coherence supports richer, warmer responses.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { id: 'feed', label: 'Feed Data', icon: Syringe, color: '#38bdf8', detail: 'Injects text, code, or PDFs.' },
          { id: 'groom', label: 'Groom Weights', icon: WandSparkles, color: '#34d399', detail: 'Prunes noise and sharpens coherence.' },
          { id: 'sleep', label: 'Sleep Mode', icon: MoonStar, color: '#c084fc', detail: 'Offline dream cycle and defragmentation.' },
        ].map(action => {
          const Icon = action.icon;
          const active = careAction === action.id;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id as Exclude<CareAction, null>)}
              className="rounded-2xl p-4 text-left"
              style={{ background: active ? `${action.color}16` : t.surface2, border: `1px solid ${active ? `${action.color}66` : t.border}` }}
            >
              <Icon size={15} style={{ color: action.color }} />
              <div className="mt-3 text-xs" style={{ color: t.text }}>{action.label}</div>
              <div className="mt-1 text-[11px] leading-relaxed" style={{ color: t.textMuted }}>{action.detail}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${t.border}` }}>
        <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>System Tray Preview</div>
        <div className="mt-2 text-[11px] leading-relaxed" style={{ color: t.text }}>{careState.trayNotification}</div>
      </div>
    </div>
  );
}

function ResultPanel({
  agentA,
  agentB,
  outcome,
  onReset,
}: {
  agentA: Agent;
  agentB: Agent;
  outcome: BridgeOutcome;
  onReset: () => void;
}) {
  const { currentTheme: t } = useApp();
  const predictedConfig = rarityConfig[outcome.offspringRarity];
  const tone = compatibilityTone(outcome.compatibilityScore);

  return (
    <div>
      <div className="relative overflow-hidden rounded-[28px] p-6" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.14), rgba(6,182,212,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(168,85,247,0.28)' }}>
        <motion.div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, #ff0080, #a855f7, #06b6d4, #22c55e, #ff0080)' }} animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }} transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }} />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex -space-x-3">
            <img src={agentA.portrait} alt={agentA.name} className="h-12 w-12 rounded-2xl border object-cover" style={{ borderColor: rarityConfig[agentA.rarity].borderColor }} />
            <img src={agentB.portrait} alt={agentB.name} className="h-12 w-12 rounded-2xl border object-cover" style={{ borderColor: rarityConfig[agentB.rarity].borderColor }} />
          </div>
          <ArrowRight size={16} style={{ color: t.textMuted }} />
          <motion.div className="flex h-16 w-16 items-center justify-center rounded-[20px] text-2xl" style={{ background: `${predictedConfig.color}20`, border: `1px solid ${predictedConfig.borderColor}` }} animate={{ boxShadow: [`0 0 20px ${predictedConfig.glowColor}`, `0 0 40px ${predictedConfig.glowColor}`, `0 0 20px ${predictedConfig.glowColor}`] }} transition={{ repeat: Infinity, duration: 2.5 }}>
            <Dna size={28} style={{ color: predictedConfig.textColor }} />
          </motion.div>
          <div>
            <div className="text-sm" style={{ color: t.text }}>{agentA.name.slice(0, 2)}{agentB.name.slice(0, 2)}-GEN</div>
            <div className="mt-1 text-[11px] uppercase" style={{ color: predictedConfig.textColor }}>{outcome.offspringRarity}</div>
            <div className="mt-1 text-[11px]" style={{ color: '#cbd5e1' }}>{outcome.lineageSummary}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Offspring Introduction</div>
            <div className="mt-3 rounded-2xl p-4 text-sm leading-relaxed italic" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
              "{outcome.introduction}"
            </div>

            <div className="mt-5 text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Inherited Traits</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {outcome.inheritedTraits.map(trait => (
                <span key={trait} className="rounded-md px-2 py-1 text-[10px]" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.28)', color: '#d8b4fe' }}>
                  {trait}
                </span>
              ))}
            </div>

            <div className="mt-5 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2">
                <ScanSearch size={14} style={{ color: outcome.simulationPassed ? '#4ade80' : '#fca5a5' }} />
                <div className="text-xs" style={{ color: outcome.simulationPassed ? '#4ade80' : '#fca5a5' }}>Stress Simulation</div>
              </div>
              <div className="mt-2 text-sm" style={{ color: '#ffffff' }}>{outcome.stressScenario}</div>
              <div className="mt-2 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>{outcome.stressAssessment}</div>
            </div>
          </div>

          <div className="space-y-3">
            <MetricBar label="Compatibility" value={outcome.compatibilityScore} color={tone.color} />
            <MetricBar label="Stability" value={outcome.stabilityScore} color={outcome.simulationPassed ? '#34d399' : '#f87171'} />
            <MetricBar label="Neural Coherence" value={outcome.offspringCare.neuralCoherence} color="#34d399" />
            <MetricBar label="Entropy Integrity" value={100 - outcome.offspringCare.entropyLevel} color="#f59e0b" />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Metabolism</div>
            <div className="mt-2 text-sm" style={{ color: t.text }}>{outcome.offspringCare.metabolism}</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Temperament</div>
            <div className="mt-2 text-sm" style={{ color: t.text }}>{outcome.offspringCare.temperament}</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Mutation</div>
            <div className="mt-2 text-sm" style={{ color: outcome.mutationTriggered ? '#f472b6' : t.text }}>{outcome.mutationTriggered ? outcome.mutationTrait : 'None detected'}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.6fr]">
        <button onClick={onReset} className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}>
          <RefreshCw size={13} />
          Try Again
        </button>
        <button className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(6,182,212,0.16))', border: '1px solid rgba(168,85,247,0.45)', color: '#ffffff' }}>
          <Zap size={14} style={{ color: '#fbbf24' }} />
          Confirm Recombination
        </button>
      </div>
    </div>
  );
}

export function EvolutionLab() {
  const { currentTheme: t, showEvolutionLab, setShowEvolutionLab, setPageContext } = useApp();
  const [phase, setPhase] = useState<LabPhase>('setup');
  const [agentA, setAgentA] = useState<Agent | null>(null);
  const [agentB, setAgentB] = useState<Agent | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'A' | 'B' | null>(null);
  const [inviteCode] = useState(() => Math.random().toString(36).slice(2, 10));
  const [careExpanded, setCareExpanded] = useState(false);
  const [careAction, setCareAction] = useState<CareAction>(null);
  const [carePreview, setCarePreview] = useState<CareState | null>(null);
  const [bridgeOutcome, setBridgeOutcome] = useState<BridgeOutcome | null>(null);
  const birthTonePlayedRef = useRef(false);

  useEffect(() => {
    if (showEvolutionLab) {
      setPageContext({ title: 'EVOLVE LAB', subtitle: 'Bridge, simulate, and profile agent lineages' });
      return;
    }
    setPageContext({ title: '01DECK', subtitle: 'Agent workspace active' });
  }, [setPageContext, showEvolutionLab]);

  const compatibilityScore = agentA && agentB ? computeCompatibility(agentA, agentB) : 0;
  const compatibility = compatibilityTone(compatibilityScore);
  const canAnalyze = Boolean(agentA && agentB);
  const canBridge = Boolean(agentA && agentB && compatibilityScore >= 20);

  const baseCarePreview = useMemo(() => {
    if (!agentA || !agentB) return null;
    return deriveInheritedCare(agentA, agentB, false, null);
  }, [agentA, agentB]);

  useEffect(() => {
    setCarePreview(baseCarePreview);
    setCareAction(null);
  }, [baseCarePreview]);

  useEffect(() => {
    if (phase === 'birth' && bridgeOutcome && !birthTonePlayedRef.current) {
      birthTonePlayedRef.current = true;
      playBirthTone();
    }
    if (phase !== 'birth') {
      birthTonePlayedRef.current = false;
    }
  }, [bridgeOutcome, phase]);

  const handleClose = () => {
    setShowEvolutionLab(false);
    setPhase('setup');
    setBridgeOutcome(null);
    setCarePreview(null);
    setCareAction(null);
    setCareExpanded(false);
  };

  const handleCompanionAction = (action: Exclude<CareAction, null>) => {
    setCareAction(action);
    if (!baseCarePreview) return;

    const next = { ...baseCarePreview };
    if (action === 'feed') {
      const effect = dietEffects[seededIndex(`${agentA?.id}:${agentB?.id}:diet`, dietEffects.length)];
      next.computeSatiety = clamp(next.computeSatiety + effect.bonus, 0, 100);
      next.neuralCoherence = clamp(next.neuralCoherence + effect.coherence, 0, 100);
      next.dreamPattern = `Recently ingested ${effect.label}; now dreaming in ${effect.temporaryTrait.toLowerCase()}.`;
      next.trayNotification = `Optional feed applied: ${effect.note}`;
    }
    if (action === 'groom') {
      next.neuralCoherence = clamp(next.neuralCoherence + 12, 0, 100);
      next.entropyLevel = clamp(next.entropyLevel - 10, 0, 100);
      next.trayNotification = 'Weight noise reduced. The agent feels calmer and more precise.';
    }
    if (action === 'sleep') {
      next.entropyLevel = clamp(next.entropyLevel - 16, 0, 100);
      next.neuralCoherence = clamp(next.neuralCoherence + 6, 0, 100);
      next.dreamPattern = 'During defragmentation, the offspring drafted a strange prose map of its own thoughts.';
      next.trayNotification = 'Sleep cycle complete. Dream log ready for review.';
    }
    next.moodLabel = next.entropyLevel > 70 ? 'unstable' : next.neuralCoherence < 45 ? 'defiant' : 'stable';
    setCarePreview(next);
  };

  const engageBridge = () => {
    if (!agentA || !agentB) return;
    const outcome = buildBridgeOutcome(agentA, agentB, compatibilityScore);
    if (carePreview) {
      outcome.offspringCare = {
        ...carePreview,
        mutationDrift: outcome.offspringCare.mutationDrift,
      };
      outcome.stabilityScore = clamp(
        outcome.compatibilityScore + Math.round((carePreview.neuralCoherence - carePreview.entropyLevel) * 0.35) + (outcome.mutationTriggered ? -6 : 4),
        0,
        100,
      );
      outcome.simulationPassed = outcome.stabilityScore >= 52;
      outcome.stressAssessment = outcome.simulationPassed
        ? `Passed ${outcome.stressScenario.split(':')[0]}. The offspring maintained composure under load and produced usable output.`
        : `Failed ${outcome.stressScenario.split(':')[0]}. The lattice destabilized under pressure and needs refinement before deployment.`;
    }
    setBridgeOutcome(outcome);
    setPhase('birth');
  };

  return (
    <AnimatePresence>
      {showEvolutionLab ? (
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.985 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-0 z-[160] flex flex-col" style={{ background: t.bg }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-3">
              <motion.div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(168,85,247,0.12))', border: '1px solid rgba(16,185,129,0.35)' }}>
                <motion.div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.18), rgba(6,182,212,0.14), transparent)' }} animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }} />
                <Dna size={16} style={{ color: '#34d399' }} />
              </motion.div>
              <div>
                <h1 className="text-sm uppercase tracking-[0.18em]" style={{ color: t.text }}>Evolution Lab</h1>
                <p className="mt-1 text-[11px]" style={{ color: t.textMuted }}>Synaptic Bridge, stress simulation, and optional companion systems for advanced lineages.</p>
              </div>
            </div>
            <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}>
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-6xl">
              <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
                <div>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {(['setup', 'analysis', 'bridge', 'birth'] as LabPhase[]).map(step => {
                      const enabled = step === 'setup' || (step === 'analysis' && canAnalyze) || (step === 'bridge' && canBridge) || (step === 'birth' && Boolean(bridgeOutcome));
                      const active = phase === step;
                      const label = step === 'setup' ? 'Setup' : step === 'analysis' ? 'Compatibility' : step === 'bridge' ? 'Synaptic Bridge' : 'Birth';
                      return (
                        <button key={step} onClick={() => enabled && setPhase(step)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs" style={{ background: active ? 'rgba(168,85,247,0.14)' : t.surface2, border: `1px solid ${active ? 'rgba(168,85,247,0.45)' : t.border}`, color: active ? '#c084fc' : enabled ? t.textMuted : '#6b7280', opacity: enabled ? 1 : 0.6 }}>
                          {!enabled && step !== 'setup' ? <Lock size={10} /> : null}
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {phase === 'setup' ? (
                      <motion.div key="setup" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                        <div className="relative mb-6 overflow-hidden rounded-[28px] p-5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(168,85,247,0.06))', border: '1px solid rgba(16,185,129,0.22)' }}>
                          <div className="flex items-start gap-3">
                            <FlaskConical size={18} style={{ color: '#34d399', marginTop: 2 }} />
                            <div>
                              <div className="text-sm" style={{ color: t.text }}>What this lab does</div>
                              <p className="mt-2 text-xs leading-relaxed" style={{ color: t.textMuted }}>
                                The bridge stays local-first. It stages lineages, previews crossover, runs a stress simulation, and optionally models softer companion signals like satiety, coherence, and dream-state behavior.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
                          <AgentSlot agent={agentA} isPrimary label="Parent A" onClear={() => setAgentA(null)} onSelect={() => setPickerTarget('A')} />
                          <div className="hidden flex-col items-center justify-center gap-3 px-2 md:flex">
                            <motion.div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.24)' }} animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}>
                              <Dna size={20} style={{ color: '#c084fc' }} />
                            </motion.div>
                            <div className="h-10 w-px" style={{ background: 'linear-gradient(to bottom, rgba(168,85,247,0.6), rgba(34,197,94,0.2))' }} />
                          </div>
                          <AgentSlot agent={agentB} isPrimary={false} label="Parent B" onClear={() => setAgentB(null)} onSelect={() => setPickerTarget('B')} />
                        </div>

                        <div className="mt-6"><InvitePartner inviteCode={inviteCode} /></div>

                        <button onClick={() => canAnalyze && setPhase('analysis')} className="mt-6 flex w-full items-center justify-center gap-3 rounded-[22px] px-4 py-4 text-sm" style={{ background: canAnalyze ? 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(16,185,129,0.14))' : t.surface2, border: `1px solid ${canAnalyze ? 'rgba(168,85,247,0.45)' : t.border}`, color: canAnalyze ? '#ffffff' : t.textMuted }}>
                          <Zap size={15} style={{ color: canAnalyze ? '#fbbf24' : t.textMuted }} />
                          Run Compatibility Test
                          <ChevronRight size={15} />
                        </button>
                      </motion.div>
                    ) : null}

                    {phase === 'analysis' && agentA && agentB ? (
                      <motion.div key="analysis" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                        <div className="rounded-[28px] p-6" style={{ background: `${compatibility.color}08`, border: `1px solid ${compatibility.color}28` }}>
                          <div className="text-center">
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 14 }} className="text-6xl" style={{ color: compatibility.color }}>
                              {compatibilityScore}
                            </motion.div>
                            <div className="mt-3 text-sm" style={{ color: compatibility.color }}>{compatibility.label}</div>
                            <div className="mt-1 text-[11px]" style={{ color: t.textMuted }}>Compatibility score</div>
                          </div>
                          <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {[
                              { label: 'Stage Synergy', value: Math.max(0, 20 - Math.abs((agentA.evolutionStage ?? 0) - (agentB.evolutionStage ?? 0)) * 5), max: 20, color: '#34d399' },
                              { label: 'Trait Bond', value: agentA.evolutionCompatibility?.includes(agentB.id) || agentB.evolutionCompatibility?.includes(agentA.id) ? 40 : 10, max: 40, color: '#c084fc' },
                              { label: 'Category Diversity', value: agentA.category !== agentB.category ? 10 : 0, max: 10, color: '#38bdf8' },
                              { label: 'Rarity Lift', value: Math.round(((rarityWeight(agentA.rarity) + rarityWeight(agentB.rarity)) / 2) * 2), max: 10, color: '#fbbf24' },
                            ].map(metric => (
                              <div key={metric.label} className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>{metric.label}</span>
                                  <span className="text-xs" style={{ color: metric.color }}>{metric.value}/{metric.max}</span>
                                </div>
                                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(metric.value / metric.max) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ background: metric.color }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.7fr]">
                          <button onClick={() => setPhase('setup')} className="rounded-2xl px-4 py-3 text-sm" style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}>Back to Setup</button>
                          <button onClick={() => canBridge && setPhase('bridge')} className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: canBridge ? 'linear-gradient(135deg, rgba(168,85,247,0.24), rgba(6,182,212,0.16))' : t.surface3, border: `1px solid ${canBridge ? 'rgba(168,85,247,0.45)' : t.border}`, color: canBridge ? '#ffffff' : t.textMuted }}>
                            <Dna size={14} style={{ color: canBridge ? '#c084fc' : t.textMuted }} />
                            {canBridge ? 'Open Synaptic Bridge' : 'Need at least 20% compatibility'}
                          </button>
                        </div>
                      </motion.div>
                    ) : null}

                    {phase === 'bridge' && agentA && agentB ? (
                      <motion.div key="bridge" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                        <HelixBridge agentA={agentA} agentB={agentB} compatibilityScore={compatibilityScore} bridgeCharged={compatibilityScore >= 40} outcome={bridgeOutcome} onEngage={engageBridge} />
                      </motion.div>
                    ) : null}

                    {phase === 'birth' && agentA && agentB && bridgeOutcome ? (
                      <motion.div key="birth" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                        <ResultPanel agentA={agentA} agentB={agentB} outcome={bridgeOutcome} onReset={() => {
                          setAgentA(null);
                          setAgentB(null);
                          setPhase('setup');
                          setBridgeOutcome(null);
                          setCarePreview(null);
                          setCareAction(null);
                        }} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[24px] p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                    <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Current status</div>
                    <div className="mt-3 text-2xl" style={{ color: compatibility.color }}>{compatibilityScore || '—'}</div>
                    <div className="mt-1 text-sm" style={{ color: compatibility.color }}>{compatibility.label}</div>
                    <div className="mt-3 text-[11px] leading-relaxed" style={{ color: t.textMuted }}>
                      Bridge-first workflow. Companion systems remain optional and low-profile unless you explicitly expand them.
                    </div>
                  </div>

                  <div className="rounded-[24px] p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                    <button onClick={() => setCareExpanded(value => !value)} className="flex w-full items-center justify-between text-left">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Companion systems</div>
                        <div className="mt-1 text-sm" style={{ color: t.text }}>Optional vitality and legacy mechanics</div>
                      </div>
                      {careExpanded ? <ChevronDown size={15} style={{ color: t.textMuted }} /> : <ChevronRight size={15} style={{ color: t.textMuted }} />}
                    </button>
                    <AnimatePresence initial={false}>
                      {careExpanded ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pt-4">
                            <CompanionSystems agentA={agentA} agentB={agentB} careState={carePreview} careAction={careAction} onAction={handleCompanionAction} compact />
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <div className="rounded-[24px] p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                    <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Lab notes</div>
                    <div className="mt-4 space-y-3">
                      {[
                        'Synaptic Bridge handles instruction crossover, mutation risk, and simulation staging.',
                        'Sustenance variables influence lineage flavor and stability, but stay optional and collapsed by default.',
                        'Legacy inheritance now includes metabolism and temperament for quieter long-term progression.',
                      ].map(note => (
                        <div key={note} className="text-[11px] leading-relaxed" style={{ color: t.text }}>{note}</div>
                      ))}
                    </div>
                  </div>

                  {bridgeOutcome ? (
                    <div className="rounded-[24px] p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                      <div className="flex items-center gap-2">
                        {bridgeOutcome.simulationPassed ? <Sparkles size={14} style={{ color: '#4ade80' }} /> : <ShieldAlert size={14} style={{ color: '#fca5a5' }} />}
                        <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Outcome digest</div>
                      </div>
                      <div className="mt-3 text-sm" style={{ color: t.text }}>{bridgeOutcome.lineageSummary}</div>
                      <div className="mt-2 text-[11px] leading-relaxed" style={{ color: t.textMuted }}>{bridgeOutcome.stressAssessment}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {pickerTarget ? (
              <div className="absolute inset-0 p-6">
                <div className="relative mx-auto h-full max-w-5xl">
                  <AgentPicker onClose={() => setPickerTarget(null)} onSelect={agent => {
                    if (pickerTarget === 'A') setAgentA(agent);
                    if (pickerTarget === 'B') setAgentB(agent);
                  }} />
                </div>
              </div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
