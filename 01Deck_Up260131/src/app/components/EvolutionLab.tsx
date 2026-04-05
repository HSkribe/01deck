import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Dna, Zap, ArrowRight, Check, ChevronRight,
  Share2, Copy, RefreshCw, Shield, Star, Sparkles,
  Users, Lock, Unlock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { agents, Agent, rarityConfig } from '../data/agents';

// ─── Constants ────────────────────────────────────────────

const STAGE_LABELS = ['Base', 'Awakened', 'Ascended', 'Transcendent'];
const STAGE_COLORS = ['#64748b', '#10b981', '#a855f7', '#f59e0b'];
const EVO_AGENTS = agents.filter(a => a.hasEvolution);

// ─── Compatibility scoring ────────────────────────────────

function computeCompatibility(a: Agent, b: Agent): number {
  if (!a || !b) return 0;
  let score = 0;
  // Direct compatibility list
  if (a.evolutionCompatibility?.includes(b.id)) score += 40;
  if (b.evolutionCompatibility?.includes(a.id)) score += 40;
  // Stage synergy
  const stageDiff = Math.abs((a.evolutionStage ?? 0) - (b.evolutionStage ?? 0));
  score += Math.max(0, 20 - stageDiff * 5);
  // Category diversity bonus
  if (a.category !== b.category) score += 10;
  // Rarity bonus
  const rarityWeight: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legend: 5, mythic: 6 };
  const avgRarity = ((rarityWeight[a.rarity] ?? 1) + (rarityWeight[b.rarity] ?? 1)) / 2;
  score += Math.round(avgRarity * 2);
  return Math.min(100, score);
}

function compatibilityLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Perfect Match', color: '#10b981' };
  if (score >= 60) return { label: 'Strong Synergy', color: '#a855f7' };
  if (score >= 40) return { label: 'Moderate Fit', color: '#f59e0b' };
  if (score >= 20) return { label: 'Weak Link', color: '#ef4444' };
  return { label: 'Incompatible', color: '#6b7280' };
}

// ─── Predicted offspring rarity ───────────────────────────

function predictOffspringRarity(a: Agent, b: Agent): { rarity: string; color: string } {
  const rarityWeight: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legend: 4, mythic: 5 };
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legend', 'mythic'];
  const avg = ((rarityWeight[a.rarity] ?? 0) + (rarityWeight[b.rarity] ?? 0)) / 2;
  const resultIdx = Math.min(5, Math.floor(avg + 0.6));
  const result = rarities[resultIdx];
  const colors: Record<string, string> = { common: '#64748b', uncommon: '#94a3b8', rare: '#f59e0b', epic: '#a855f7', legend: '#d4af37', mythic: '#3b82f6' };
  return { rarity: result, color: colors[result] ?? '#64748b' };
}

// ─── Sub-components ───────────────────────────────────────

function AgentSlot({
  agent, label, onSelect, onClear, isOwn,
}: {
  agent: Agent | null;
  label: string;
  onSelect: () => void;
  onClear: () => void;
  isOwn?: boolean;
}) {
  const { currentTheme: t } = useApp();
  const config = agent ? rarityConfig[agent.rarity] : null;

  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: isOwn ? '#10b981' : '#a855f7' }}
        />
        <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>{label}</span>
        {isOwn && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>Your Agent</span>}
        {!isOwn && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>Partner Agent</span>}
      </div>

      {agent ? (
        <motion.div
          className="relative rounded-2xl overflow-hidden p-4"
          style={{ background: `${config!.color}10`, border: `1px solid ${config!.borderColor}50` }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {/* Prism edge for evolution */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, #ff0080, #a855f7, #00cfff, #00ff88, #ff0080)' }}
            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
              style={{ border: `1.5px solid ${config!.borderColor}`, boxShadow: `0 0 12px ${config!.glowColor}` }}
            >
              <img src={agent.portrait} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm" style={{ color: '#fff' }}>{agent.name}</p>
              <p className="text-[10px] truncate" style={{ color: config!.textColor }}>{agent.role}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Dna size={9} style={{ color: '#10b981' }} />
                <span className="text-[9px]" style={{ color: '#10b981' }}>
                  Stage {agent.evolutionStage ?? 0} · {STAGE_LABELS[agent.evolutionStage ?? 0]}
                </span>
              </div>
            </div>
            <button
              onClick={onClear}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
            >
              <X size={11} />
            </button>
          </div>
          {/* Traits */}
          {agent.evolutionTraits && (
            <div className="flex flex-wrap gap-1">
              {agent.evolutionTraits.slice(0, 3).map(trait => (
                <span key={trait} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${config!.color}15`, color: config!.textColor, border: `1px solid ${config!.borderColor}30` }}>
                  {trait}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.button
          onClick={onSelect}
          className="w-full rounded-2xl border-dashed flex flex-col items-center justify-center py-10"
          style={{ border: `1.5px dashed ${isOwn ? 'rgba(16,185,129,0.3)' : 'rgba(168,85,247,0.3)'}`, color: isOwn ? 'rgba(16,185,129,0.5)' : 'rgba(168,85,247,0.5)', background: isOwn ? 'rgba(16,185,129,0.03)' : 'rgba(168,85,247,0.03)' }}
          whileHover={{ scale: 1.02, borderColor: isOwn ? 'rgba(16,185,129,0.6)' : 'rgba(168,85,247,0.6)' }}
          whileTap={{ scale: 0.98 }}
        >
          <Dna size={24} className="mb-2" style={{ opacity: 0.5 }} />
          <span className="text-xs">Select Evolution Agent</span>
          <span className="text-[10px] mt-1" style={{ opacity: 0.5 }}>
            {isOwn ? 'Choose from your roster' : 'Choose partner\'s agent'}
          </span>
        </motion.button>
      )}
    </div>
  );
}

// ─── Agent picker modal ───────────────────────────────────

function AgentPicker({ onSelect, onClose }: { onSelect: (a: Agent) => void; onClose: () => void }) {
  const { currentTheme: t } = useApp();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col rounded-2xl overflow-hidden"
      style={{ background: t.bg }}
    >
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.border}` }}>
        <h3 className="text-sm" style={{ color: t.text }}>Select Evolution Agent</h3>
        <button onClick={onClose} style={{ color: t.textMuted }}><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {EVO_AGENTS.map(agent => {
          const config = rarityConfig[agent.rarity];
          return (
            <motion.button
              key={agent.id}
              onClick={() => { onSelect(agent); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
              style={{ background: t.surface2, border: `1px solid ${t.border}` }}
              whileHover={{ borderColor: config.borderColor, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ border: `1px solid ${config.borderColor}` }}>
                <img src={agent.portrait} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: t.text }}>{agent.name}</p>
                <p className="text-[10px]" style={{ color: t.textMuted }}>{agent.role}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px]" style={{ color: config.textColor }}>{agent.rarity.toUpperCase()}</span>
                <span className="text-[9px]" style={{ color: '#10b981' }}>
                  <Dna size={9} className="inline mr-0.5" />
                  Stage {agent.evolutionStage ?? 0}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Recombination result ─────────────────────────────────

function RecombinationResult({ agentA, agentB, onReset }: { agentA: Agent; agentB: Agent; onReset: () => void }) {
  const { currentTheme: t } = useApp();
  const compat = computeCompatibility(agentA, agentB);
  const offspring = predictOffspringRarity(agentA, agentB);
  const allTraits = [
    ...(agentA.evolutionTraits ?? []),
    ...(agentB.evolutionTraits ?? []),
  ].filter((tr, i, arr) => arr.indexOf(tr) === i);
  const inheritedTraits = allTraits.slice(0, 4);
  const newTrait = `${agentA.name.slice(0, 3)}-${agentB.name.slice(0, 3)} Fusion Core`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center"
    >
      {/* Offspring card */}
      <div
        className="relative w-full rounded-2xl overflow-hidden p-6 mb-6"
        style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(6,182,212,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(168,85,247,0.3)' }}
      >
        {/* Rainbow top edge */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, #ff0080, #a855f7, #00cfff, #00ff88, #f59e0b, #ff0080)' }}
          animate={{ backgroundPosition: ['0%', '200%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        />
        <div className="flex items-center gap-4 mb-4">
          {/* Parent avatars */}
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ border: `2px solid ${rarityConfig[agentA.rarity].borderColor}`, zIndex: 2 }}>
              <img src={agentA.portrait} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ border: `2px solid ${rarityConfig[agentB.rarity].borderColor}`, zIndex: 1 }}>
              <img src={agentB.portrait} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
          <ArrowRight size={16} style={{ color: t.textMuted }} />
          {/* Offspring placeholder */}
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `${offspring.color}20`, border: `2px solid ${offspring.color}60` }}
            animate={{ boxShadow: [`0 0 20px ${offspring.color}40`, `0 0 40px ${offspring.color}70`, `0 0 20px ${offspring.color}40`] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {/* Prismatic shimmer */}
            <motion.div
              className="text-2xl relative"
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            >
              🧬
            </motion.div>
          </motion.div>
          <div>
            <div className="text-sm mb-0.5" style={{ color: t.text }}>
              {agentA.name.slice(0, 2)}{agentB.name.slice(0, 2)}-GEN
            </div>
            <span className="text-[10px] uppercase" style={{ color: offspring.color }}>{offspring.rarity}</span>
          </div>
        </div>

        {/* Inherited traits */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Inherited Traits</p>
          <div className="flex flex-wrap gap-1.5">
            {inheritedTraits.map(trait => (
              <span key={trait} className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(168,85,247,0.12)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.25)' }}>
                {trait}
              </span>
            ))}
            <span className="text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Sparkles size={8} /> {newTrait}
            </span>
          </div>
        </div>

        {/* Compatibility score */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${compat}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ background: `linear-gradient(90deg, ${compatibilityLabel(compat).color}, ${offspring.color})` }}
            />
          </div>
          <span className="text-xs" style={{ color: compatibilityLabel(compat).color }}>
            {compat}% · {compatibilityLabel(compat).label}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full">
        <motion.button
          onClick={onReset}
          className="flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
          whileHover={{ scale: 1.01 }}
        >
          <RefreshCw size={13} /> Try Again
        </motion.button>
        <motion.button
          className="flex-[2] py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(6,182,212,0.15))', border: '1px solid rgba(168,85,247,0.5)', color: '#fff' }}
          whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(168,85,247,0.3)' }}
          whileTap={{ scale: 0.98 }}
        >
          <Zap size={14} style={{ color: '#f59e0b' }} /> Confirm Recombination
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Share / Invite panel ─────────────────────────────────

function InvitePartner({ inviteCode }: { inviteCode: string }) {
  const { currentTheme: t } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`01deck://evo-lab/join/${inviteCode}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-2xl p-4 mb-6"
      style={{ background: t.surface2, border: `1px solid ${t.border}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users size={14} style={{ color: '#a855f7' }} />
        <span className="text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>Invite Your Partner</span>
      </div>
      <p className="text-[11px] mb-3 leading-relaxed" style={{ color: t.textMuted }}>
        Share this code with a partner. They select their evolution agent and join your session to begin recombination.
      </p>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: t.surface1, border: `1px solid ${t.border}` }}
      >
        <code className="flex-1 text-xs font-mono" style={{ color: '#a855f7' }}>
          01DECK://EVO/{inviteCode.toUpperCase()}
        </code>
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
          style={{ background: copied ? 'rgba(16,185,129,0.15)' : t.surface3, color: copied ? '#10b981' : t.textMuted }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </motion.button>
      </div>
      <div className="flex gap-2 mt-3">
        <motion.button
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}
          whileHover={{ scale: 1.02 }}
        >
          <Share2 size={11} /> Share Link
        </motion.button>
        <motion.button
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs"
          style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.textMuted }}
          whileHover={{ scale: 1.02 }}
        >
          <Lock size={11} /> Private Session
        </motion.button>
      </div>
    </div>
  );
}

// ─── Main EvolutionLab ────────────────────────────────────

type LabPhase = 'setup' | 'analysis' | 'recombinate';

export function EvolutionLab() {
  const { currentTheme: t, showEvolutionLab, setShowEvolutionLab, setPageContext } = useApp();
  const [agentA, setAgentA] = useState<Agent | null>(null);
  const [agentB, setAgentB] = useState<Agent | null>(null);
  const [picking, setPicking] = useState<'A' | 'B' | null>(null);
  const [phase, setPhase] = useState<LabPhase>('setup');
  const [inviteCode] = useState(() => Math.random().toString(36).substr(2, 8));

  React.useEffect(() => {
    if (showEvolutionLab) {
      setPageContext({ title: 'EVOLUTION LAB', subtitle: 'Test · Recombinate · Evolve' });
    } else {
      setPageContext({ title: 'AGENT VIEWER', subtitle: '01Deck Active Protocol' });
    }
  }, [showEvolutionLab, setPageContext]);

  const compat = agentA && agentB ? computeCompatibility(agentA, agentB) : 0;
  const compatInfo = compatibilityLabel(compat);
  const canRecombinate = agentA && agentB && compat >= 20;

  const handleClose = () => {
    setShowEvolutionLab(false);
    setPhase('setup');
  };

  return (
    <AnimatePresence>
      {showEvolutionLab && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-[160] flex flex-col"
          style={{ background: t.bg }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderBottom: `1px solid ${t.border}` }}
          >
            <div className="flex items-center gap-3">
              {/* Animated DNA icon */}
              <motion.div
                className="w-8 h-8 rounded-xl flex items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(16,185,129,0.35)' }}
              >
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.2), rgba(6,182,212,0.2), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                />
                <Dna size={15} style={{ color: '#10b981' }} />
              </motion.div>
              <div>
                <h1 className="text-sm uppercase tracking-[0.18em]" style={{ color: t.text }}>Evolution Lab</h1>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>Test · Recombinate · Evolve</p>
              </div>
            </div>
            <motion.button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
              whileHover={{ scale: 1.1, color: t.text }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={15} />
            </motion.button>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
            {/* Phase tabs */}
            <div className="flex gap-2 mb-8">
              {(['setup', 'analysis', 'recombinate'] as LabPhase[]).map((p, i) => {
                const labels = ['Setup', 'Compatibility Test', 'Recombinate'];
                const isActive = phase === p;
                const isDone = (['setup', 'analysis', 'recombinate'] as LabPhase[]).indexOf(phase) > i;
                const canAccess = p === 'setup' || (p === 'analysis' && agentA && agentB) || (p === 'recombinate' && canRecombinate);
                return (
                  <motion.button
                    key={p}
                    onClick={() => canAccess && setPhase(p)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
                    style={{
                      background: isActive ? 'rgba(168,85,247,0.15)' : isDone ? 'rgba(16,185,129,0.08)' : t.surface2,
                      border: `1px solid ${isActive ? 'rgba(168,85,247,0.5)' : isDone ? 'rgba(16,185,129,0.3)' : t.border}`,
                      color: isActive ? '#a855f7' : isDone ? '#10b981' : t.textMuted,
                      cursor: canAccess ? 'pointer' : 'not-allowed',
                      opacity: canAccess ? 1 : 0.5,
                    }}
                    whileHover={canAccess ? { scale: 1.03 } : {}}
                    whileTap={canAccess ? { scale: 0.97 } : {}}
                  >
                    {isDone && <Check size={11} />}
                    {!isDone && !isActive && !canAccess && <Lock size={10} />}
                    {isActive && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#a855f7' }} />}
                    {labels[i]}
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {/* SETUP PHASE */}
              {phase === 'setup' && (
                <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {/* Introduction */}
                  <div
                    className="relative rounded-2xl p-5 mb-8 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(168,85,247,0.06))', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(168,85,247,0.06), transparent 70%)' }} />
                    <h2 className="text-base mb-2" style={{ color: t.text }}>What is Recombination?</h2>
                    <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
                      Two evolution-capable agents can share their genetic traits, capabilities, and specializations to produce a new hybrid agent. 
                      The offspring inherits the best traits from both parents, plus a unique emergent trait that neither parent possesses alone. 
                      Higher compatibility and rarity yield more powerful offspring.
                    </p>
                    <div className="flex gap-4 mt-4">
                      {[
                        { icon: Dna, label: 'Trait Inheritance', desc: 'Up to 4 traits pass forward' },
                        { icon: Star, label: 'Rarity Boost', desc: 'Offspring gains elevated rarity' },
                        { icon: Sparkles, label: 'Emergent Trait', desc: 'A unique new trait is born' },
                      ].map(item => (
                        <div key={item.label} className="flex-1 flex items-start gap-2">
                          <item.icon size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <p className="text-[10px]" style={{ color: t.text }}>{item.label}</p>
                            <p className="text-[9px]" style={{ color: t.textMuted }}>{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Agent slots */}
                  <div className="flex gap-6 mb-6">
                    <AgentSlot agent={agentA} label="Agent Slot A" onSelect={() => setPicking('A')} onClear={() => setAgentA(null)} isOwn />
                    <div className="flex flex-col items-center justify-center flex-shrink-0">
                      <motion.div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}
                        animate={{ rotate: [0, 360] }}
                        transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                      >
                        <Dna size={20} style={{ color: '#a855f7' }} />
                      </motion.div>
                      <div className="mt-2 flex flex-col items-center gap-1">
                        <div className="w-px h-8" style={{ background: `linear-gradient(to bottom, rgba(168,85,247,0.5), transparent)` }} />
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#a855f7' }} />
                        <div className="w-px h-8" style={{ background: `linear-gradient(to bottom, transparent, rgba(16,185,129,0.5))` }} />
                      </div>
                    </div>
                    <AgentSlot agent={agentB} label="Agent Slot B" onSelect={() => setPicking('B')} onClear={() => setAgentB(null)} isOwn={false} />
                  </div>

                  {/* Partner invite */}
                  <InvitePartner inviteCode={inviteCode} />

                  {/* Next button */}
                  <motion.button
                    onClick={() => agentA && agentB && setPhase('analysis')}
                    disabled={!agentA || !agentB}
                    className="w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-3"
                    style={{
                      background: agentA && agentB ? 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(16,185,129,0.15))' : t.surface2,
                      border: `1px solid ${agentA && agentB ? 'rgba(168,85,247,0.4)' : t.border}`,
                      color: agentA && agentB ? '#fff' : t.textMuted,
                      cursor: agentA && agentB ? 'pointer' : 'not-allowed',
                    }}
                    whileHover={agentA && agentB ? { scale: 1.02, boxShadow: '0 0 32px rgba(168,85,247,0.25)' } : {}}
                    whileTap={agentA && agentB ? { scale: 0.98 } : {}}
                  >
                    <Zap size={16} style={{ color: agentA && agentB ? '#f59e0b' : t.textMuted }} />
                    Run Compatibility Test
                    <ChevronRight size={16} />
                  </motion.button>
                </motion.div>
              )}

              {/* ANALYSIS PHASE */}
              {phase === 'analysis' && agentA && agentB && (
                <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-base mb-6" style={{ color: t.text }}>Compatibility Analysis</h2>

                  {/* Big score */}
                  <div
                    className="flex flex-col items-center py-10 mb-6 rounded-2xl relative overflow-hidden"
                    style={{ background: `${compatInfo.color}08`, border: `1px solid ${compatInfo.color}25` }}
                  >
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at 50% 30%, ${compatInfo.color}10, transparent 70%)` }}
                    />
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 160, damping: 12, delay: 0.2 }}
                      className="text-7xl mb-3"
                      style={{ color: compatInfo.color }}
                    >
                      {compat}
                    </motion.div>
                    <div className="text-sm mb-1" style={{ color: compatInfo.color }}>{compatInfo.label}</div>
                    <p className="text-xs" style={{ color: t.textMuted }}>Compatibility Score</p>
                    {/* Score bar */}
                    <div className="w-48 h-2 rounded-full overflow-hidden mt-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${compat}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                        style={{ background: `linear-gradient(90deg, ${compatInfo.color}, #f59e0b)` }}
                      />
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { label: 'Stage Synergy', value: Math.max(0, 20 - Math.abs((agentA.evolutionStage ?? 0) - (agentB.evolutionStage ?? 0)) * 5), max: 20, color: '#10b981' },
                      { label: 'Trait Overlap', value: agentA.evolutionCompatibility?.includes(agentB.id) ? 40 : 10, max: 40, color: '#a855f7' },
                      { label: 'Category Diversity', value: agentA.category !== agentB.category ? 10 : 0, max: 10, color: '#06b6d4' },
                      { label: 'Rarity Bonus', value: Math.round(((Object.keys(rarityConfig).indexOf(agentA.rarity) + Object.keys(rarityConfig).indexOf(agentB.rarity)) / 2) * 2 + 2), max: 14, color: '#f59e0b' },
                    ].map(metric => (
                      <div key={metric.label} className="p-4 rounded-xl" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>{metric.label}</span>
                          <span className="text-xs" style={{ color: metric.color }}>{metric.value}/{metric.max}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(metric.value / metric.max) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                            style={{ background: metric.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Predicted offspring */}
                  <div className="p-4 rounded-2xl mb-6" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                    <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Predicted Offspring</p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${predictOffspringRarity(agentA, agentB).color}15`, border: `1px solid ${predictOffspringRarity(agentA, agentB).color}30` }}>
                        🧬
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: t.text }}>
                          {agentA.name.slice(0, 2)}{agentB.name.slice(0, 2)}-GEN Hybrid
                        </p>
                        <p className="text-[10px]" style={{ color: predictOffspringRarity(agentA, agentB).color }}>
                          {predictOffspringRarity(agentA, agentB).rarity.toUpperCase()} · {(agentA.evolutionTraits?.length ?? 0) + (agentB.evolutionTraits?.length ?? 0)} traits possible
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setPhase('setup')}
                      className="flex-1 py-3 rounded-xl text-sm"
                      style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
                      whileHover={{ scale: 1.01 }}
                    >
                      Back to Setup
                    </motion.button>
                    <motion.button
                      onClick={() => canRecombinate && setPhase('recombinate')}
                      disabled={!canRecombinate}
                      className="flex-[2] py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                      style={{
                        background: canRecombinate ? 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(6,182,212,0.15))' : t.surface3,
                        border: `1px solid ${canRecombinate ? 'rgba(168,85,247,0.5)' : t.border}`,
                        color: canRecombinate ? '#fff' : t.textMuted,
                        cursor: canRecombinate ? 'pointer' : 'not-allowed',
                      }}
                      whileHover={canRecombinate ? { scale: 1.02 } : {}}
                      whileTap={canRecombinate ? { scale: 0.98 } : {}}
                    >
                      <Dna size={14} style={{ color: canRecombinate ? '#a855f7' : t.textMuted }} />
                      {canRecombinate ? 'Begin Recombination' : `Score too low (min 20%)`}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* RECOMBINATE PHASE */}
              {phase === 'recombinate' && agentA && agentB && (
                <motion.div key="recombinate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-base mb-6" style={{ color: t.text }}>Recombination Result</h2>
                  <RecombinationResult agentA={agentA} agentB={agentB} onReset={() => { setPhase('setup'); setAgentA(null); setAgentB(null); }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Agent picker overlay */}
          <AnimatePresence>
            {picking && (
              <AgentPicker
                onSelect={agent => { if (picking === 'A') setAgentA(agent); else setAgentB(agent); }}
                onClose={() => setPicking(null)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
