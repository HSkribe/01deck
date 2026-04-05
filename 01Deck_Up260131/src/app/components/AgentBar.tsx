import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrag } from 'react-dnd';
import { Clock, MessageSquare, Play, Sparkles, Music, Dna } from 'lucide-react';
import { Agent, rarityConfig } from '../data/agents';
import { RarityBadge } from './RarityBadge';
import { useApp } from '../context/AppContext';

interface AgentBarProps {
  agent: Agent;
  index: number;
}

function formatLastUsed(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Evolution stage labels
const EVOLUTION_STAGE_LABELS = ['Base', 'Awakened', 'Ascended', 'Transcendent'];
const EVOLUTION_STAGE_COLORS = ['#64748b', '#10b981', '#a855f7', '#f59e0b'];

// ─── Prism border glow overlay ────────────────────────────
function PrismGlow({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Rotating rainbow border */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'transparent',
              boxShadow:
                '0 0 0 1.5px transparent, 0 0 20px rgba(168,85,247,0.3), 0 0 40px rgba(6,182,212,0.15)',
            }}
          />
          {/* Animated rainbow gradient border */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.8, 1] }}
            exit={{ opacity: 0 }}
            style={{
              background: 'transparent',
              outline: '1.5px solid transparent',
            }}
          >
            {/* Top edge */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-px rounded-t-xl"
              style={{
                background: 'linear-gradient(90deg, #ff0080, #ff8c00, #ffed00, #00ff88, #00cfff, #a855f7, #ff0080)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
            />
            {/* Bottom edge */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-px rounded-b-xl"
              style={{
                background: 'linear-gradient(90deg, #a855f7, #00cfff, #00ff88, #ffed00, #ff8c00, #ff0080, #a855f7)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
            />
            {/* Left edge */}
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-px rounded-l-xl"
              style={{
                background: 'linear-gradient(180deg, #ff0080, #a855f7, #00cfff, #00ff88, #ff0080)',
                backgroundSize: '100% 200%',
              }}
              animate={{ backgroundPosition: ['0% 0%', '0% 200%'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
            />
            {/* Right edge */}
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-px rounded-r-xl"
              style={{
                background: 'linear-gradient(180deg, #00ff88, #00cfff, #a855f7, #ff0080, #00ff88)',
                backgroundSize: '100% 200%',
              }}
              animate={{ backgroundPosition: ['0% 0%', '0% 200%'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
            />
          </motion.div>
          {/* Prismatic shimmer sweep */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, transparent 30%, rgba(255,0,128,0.04) 40%, rgba(168,85,247,0.06) 48%, rgba(6,182,212,0.06) 52%, rgba(0,255,136,0.04) 60%, transparent 70%)',
              }}
              animate={{ x: ['-100%', '150%'] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut', repeatDelay: 0.6 }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Evolution badge ──────────────────────────────────────
function EvolutionBadge({ stage }: { stage: number }) {
  const color = EVOLUTION_STAGE_COLORS[stage] ?? '#10b981';
  const label = EVOLUTION_STAGE_LABELS[stage] ?? 'Base';
  return (
    <motion.span
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none relative overflow-hidden"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}50`,
        color,
      }}
      animate={{ borderColor: [`${color}50`, `${color}90`, `${color}50`] }}
      transition={{ repeat: Infinity, duration: 2.5 }}
    >
      {/* Tiny prism shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', repeatDelay: 1.5 }}
      />
      <Dna size={7} />
      <span>{label.toUpperCase()}</span>
    </motion.span>
  );
}

// ─── Main AgentBar ────────────────────────────────────────
export function AgentBar({ agent, index }: AgentBarProps) {
  const { currentTheme: t, setActiveAgent, setIsCardVisible, setChatAgent, addToVST, maestroEnabled, setIsChatOpen } = useApp();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHeld, setIsHeld] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const config = rarityConfig[agent.rarity];
  const hasEvo = !!agent.hasEvolution;
  const evoStage = agent.evolutionStage ?? 0;

  const [{ isDragging }, drag] = useDrag({
    type: 'AGENT',
    item: { agent },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult() as { agent: Agent } | null;
      if (dropResult && maestroEnabled) addToVST(agent);
    },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  const handleMouseDown = () => {
    holdTimerRef.current = setTimeout(() => {
      setIsHeld(true);
      setActiveAgent(agent);
      setIsCardVisible(true);
    }, 450);
  };

  const handleMouseUp = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    setIsHeld(false);
  };

  const handleClick = () => {
    setActiveAgent(agent);
    setIsCardVisible(true);
  };

  const isRare = agent.rarity === 'rare' || agent.rarity === 'epic' || agent.rarity === 'legend' || agent.rarity === 'mythic';

  return (
    <motion.div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: isDragging ? 0.4 : 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); handleMouseUp(); }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="relative flex items-center px-4 py-3 mx-4 mb-1.5 rounded-xl cursor-grab active:cursor-grabbing select-none overflow-hidden"
      style={{
        background: isHovered
          ? `linear-gradient(135deg, ${t.surface2} 0%, ${t.surface3} 100%)`
          : t.surface1,
        border: `1px solid ${isHovered ? (hasEvo && isHovered ? 'transparent' : (isRare ? config.borderColor : t.border)) : t.border}`,
        boxShadow: isHovered && !hasEvo ? `0 4px 24px ${config.glowColor}, 0 0 0 1px ${config.borderColor}22` : 'none',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
      }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      title={hasEvo ? `${agent.name} — Evolution ${EVOLUTION_STAGE_LABELS[evoStage]} · Click to view card` : 'Click to view card · Hold to expand · Drag to chat'}
    >
      {/* ── Prism glow for evolution agents ─────────── */}
      <PrismGlow visible={hasEvo && isHovered} />

      {/* Standard shimmer overlay on hover (non-evolution) */}
      {isHovered && !hasEvo && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${config.glowColor}, transparent)` }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      )}

      {/* Legend/Mythic animated bg */}
      {(agent.rarity === 'legend' || agent.rarity === 'mythic') && isHovered && !hasEvo && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ background: agent.rarity === 'legend' ? 'linear-gradient(135deg, rgba(255,107,107,0.05), rgba(255,215,0,0.05), rgba(0,255,136,0.05))' : 'rgba(59,130,246,0.05)' }}
        />
      )}

      {/* Left rarity accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r"
        style={{
          background: agent.rarity === 'legend'
            ? 'linear-gradient(180deg, #ff6b6b, #ffd700, #00ff88)'
            : hasEvo && isHovered
            ? `linear-gradient(180deg, #ff0080, #a855f7, #00cfff, #00ff88)`
            : config.color,
        }}
      />

      {/* Portrait */}
      <div
        className="w-10 h-10 rounded-lg overflow-hidden mr-3 flex-shrink-0 relative"
        style={{
          border: `1.5px solid ${hasEvo && isHovered ? 'transparent' : config.borderColor}`,
          boxShadow: isHovered ? (hasEvo ? '0 0 12px rgba(168,85,247,0.4), 0 0 24px rgba(6,182,212,0.2)' : `0 0 8px ${config.glowColor}`) : 'none',
        }}
      >
        <img
          src={agent.portrait}
          alt={agent.name}
          className="w-full h-full object-cover"
          onError={e => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = 'none';
            const parent = el.parentElement!;
            parent.style.background = `linear-gradient(135deg, ${config.color}40, ${config.borderColor}20)`;
            parent.style.display = 'flex';
            parent.style.alignItems = 'center';
            parent.style.justifyContent = 'center';
            parent.innerHTML = `<span style="color:${config.textColor};font-size:14px;font-weight:700">${agent.name[0]}</span>`;
          }}
        />
        {/* Evolution avatar overlay shimmer */}
        {hasEvo && isHovered && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(6,182,212,0.3), rgba(0,255,136,0.2))' }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Name & Role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm" style={{ color: t.text }}>{agent.name}</span>
          {/* Online indicator */}
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: agent.online ? '#22c55e' : '#6b7280' }} />
          {/* User-created badge */}
          {agent.isUserCreated && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none" style={{ background: 'rgba(99,132,255,0.12)', border: '1px solid rgba(99,132,255,0.3)', color: '#6384ff' }}>
              <Sparkles size={8} /> CREATED
            </span>
          )}
          {/* Maestro badge */}
          {agent.maestroEnabled && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none" style={{ background: 'rgba(255,77,166,0.12)', border: '1px solid rgba(255,77,166,0.3)', color: '#ff4da6' }}>
              <Music size={8} /> MAESTRO
            </span>
          )}
          {/* Evolution badge */}
          {hasEvo && <EvolutionBadge stage={evoStage} />}
        </div>
        <div className="text-xs mt-0.5 truncate" style={{ color: t.textMuted }}>
          {agent.role} · {agent.description}
        </div>
      </div>

      {/* Stats row */}
      <div className="hidden lg:flex items-center gap-4 mr-4">
        <div className="text-center">
          <div className="text-xs" style={{ color: t.textMuted }}>Protocol</div>
          <div className="text-xs" style={{ color: t.text }}>{agent.protocolVersion}</div>
        </div>
      </div>

      {/* Last used */}
      <div className="flex items-center gap-1 mr-4 flex-shrink-0">
        <Clock size={11} style={{ color: t.textMuted }} />
        <span className="text-xs" style={{ color: t.textMuted }}>{formatLastUsed(agent.lastUsed)}</span>
      </div>

      {/* Rarity badge */}
      <div className="mr-3 flex-shrink-0">
        <RarityBadge rarity={agent.rarity} rarityCount={agent.rarityCount} size="sm" />
      </div>

      {/* Action buttons on hover */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5 ml-2"
        >
          <motion.button
            onClick={e => { e.stopPropagation(); setChatAgent(agent); setIsChatOpen(true); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            style={{ background: `${t.accent}15`, border: `1px solid ${t.border}`, color: t.textMuted }}
            whileHover={{ scale: 1.05, color: t.accent }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageSquare size={11} />
            <span>Chat</span>
          </motion.button>
          <motion.button
            onClick={e => { e.stopPropagation(); setActiveAgent(agent); setIsCardVisible(true); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            style={{ background: hasEvo ? 'rgba(168,85,247,0.15)' : `${config.color}18`, border: `1px solid ${hasEvo ? 'rgba(168,85,247,0.4)' : config.borderColor}`, color: hasEvo ? '#d8b4fe' : config.textColor }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play size={11} />
            <span>View</span>
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}