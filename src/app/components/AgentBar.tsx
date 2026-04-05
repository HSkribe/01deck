import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { Clock, Dna, MessageSquare, Play, ShieldCheck, Sparkles } from 'lucide-react';
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

export function AgentBar({ agent, index }: AgentBarProps) {
  const { currentTheme: t, densityMode, setActiveAgent, setIsCardVisible, setChatAgent, setShowEvolutionLab, isPluginEnabled, maestroEnabled, addToVST } = useApp();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const [isHeld, setIsHeld] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const config = rarityConfig[agent.rarity];
  const evolutionPluginEnabled = isPluginEnabled('01evolve-experience');

  const [{ isDragging }, drag] = useDrag({
    type: 'AGENT',
    item: { agent },
    end: (_item, monitor) => {
      if (maestroEnabled && monitor.didDrop()) {
        addToVST(agent);
      }
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const handleMouseDown = () => {
    holdTimerRef.current = setTimeout(() => {
      setIsHeld(true);
      setActiveAgent(agent);
      setIsCardVisible(true);
    }, 450);
  };

  const handleMouseUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHeld(false);
  };

  const handleClick = () => {
    if (suppressClickRef.current || isDragging) {
      suppressClickRef.current = false;
      return;
    }
    setActiveAgent(agent);
    setIsCardVisible(true);
  };

  const isRare = agent.rarity === 'rare' || agent.rarity === 'epic' || agent.rarity === 'legend' || agent.rarity === 'mythic';

  useEffect(() => {
    setImageFailed(false);
  }, [agent.id, agent.portrait]);

  useEffect(() => {
    if (!isDragging) return;
    suppressClickRef.current = true;
    handleMouseUp();
  }, [isDragging]);

  const densityStyles = {
    compact: { paddingX: '12px', paddingY: '10px', marginX: '12px', marginBottom: '4px' },
    default: { paddingX: '16px', paddingY: '12px', marginX: '16px', marginBottom: '6px' },
    relaxed: { paddingX: '18px', paddingY: '16px', marginX: '16px', marginBottom: '8px' },
  } as const;
  const density = densityStyles[densityMode];

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
      className="relative flex items-center rounded-xl cursor-grab active:cursor-grabbing select-none overflow-hidden"
      style={{
        paddingLeft: density.paddingX,
        paddingRight: density.paddingX,
        paddingTop: density.paddingY,
        paddingBottom: density.paddingY,
        marginLeft: density.marginX,
        marginRight: density.marginX,
        marginBottom: density.marginBottom,
        background: isHovered
          ? `linear-gradient(135deg, ${t.surface2} 0%, ${t.surface3} 100%)`
          : t.surface1,
        border: `1px solid ${isHovered ? (isRare ? config.borderColor : t.border) : t.border}`,
        boxShadow: isHovered ? `0 4px 24px ${config.glowColor}, 0 0 0 1px ${config.borderColor}22` : 'none',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
      }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      title="Click to view card • Hold to expand • Drag to chat"
    >
      {/* Shimmer overlay on hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.glowColor}, transparent)`,
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      )}

      {/* Legend/Mythic animated border */}
      {(agent.rarity === 'legend' || agent.rarity === 'mythic') && isHovered && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: agent.rarity === 'legend'
              ? 'linear-gradient(135deg, rgba(255,107,107,0.05), rgba(255,215,0,0.05), rgba(0,255,136,0.05))'
              : 'rgba(59,130,246,0.05)',
          }}
        />
      )}

      {/* Left rarity accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r"
        style={{
          background: agent.rarity === 'legend'
            ? 'linear-gradient(180deg, #ff6b6b, #ffd700, #00ff88)'
            : config.color,
        }}
      />

      {/* Portrait */}
      <div
        className="w-10 h-10 rounded-lg overflow-hidden mr-3 flex-shrink-0"
        style={{
          border: `1.5px solid ${config.borderColor}`,
          boxShadow: isHovered ? `0 0 8px ${config.glowColor}` : 'none',
        }}
      >
        {imageFailed ? (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${config.color}40, ${config.borderColor}20)` }}
          >
            <span className="text-sm" style={{ color: config.textColor, fontWeight: 700 }}>
              {agent.name[0]}
            </span>
          </div>
        ) : (
          <img
            src={agent.portrait}
            alt={agent.name}
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      {/* Name & Role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: t.text }}>{agent.name}</span>
          {/* Online indicator */}
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: agent.online ? '#22c55e' : '#6b7280' }}
          />
          {/* User-created badge */}
          {agent.isUserCreated && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none"
              style={{
                background: 'rgba(99,132,255,0.12)',
                border: '1px solid rgba(99,132,255,0.3)',
                color: '#6384ff',
              }}
            >
              <Sparkles size={8} />
              CREATED
            </span>
          )}
          {agent.isVerified && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none"
              style={{
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.35)',
                color: '#22c55e',
              }}
            >
              <ShieldCheck size={8} />
              VERIFIED
            </span>
          )}
          {evolutionPluginEnabled && agent.hasEvolution && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none"
              style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399',
              }}
            >
              <Dna size={8} />
              EVOLVE
            </span>
          )}
          {agent.maestroEnabled && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none"
              style={{
                background: 'rgba(255,77,166,0.12)',
                border: '1px solid rgba(255,77,166,0.3)',
                color: '#ff4da6',
              }}
            >
              <Sparkles size={8} />
              MAESTRO
            </span>
          )}
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
        <span className="text-xs" style={{ color: t.textMuted }}>
          {formatLastUsed(agent.lastUsed)}
        </span>
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
            onClick={e => { e.stopPropagation(); setChatAgent(agent); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            style={{
              background: `${t.accent}15`,
              border: `1px solid ${t.border}`,
              color: t.textMuted,
            }}
            whileHover={{ scale: 1.05, color: t.accent }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageSquare size={11} />
            <span>Chat</span>
          </motion.button>
          <motion.button
            onClick={e => { e.stopPropagation(); setActiveAgent(agent); setIsCardVisible(true); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            style={{
              background: `${config.color}18`,
              border: `1px solid ${config.borderColor}`,
              color: config.textColor,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play size={11} />
            <span>View</span>
          </motion.button>
          {evolutionPluginEnabled && agent.hasEvolution ? (
            <motion.button
              onClick={e => { e.stopPropagation(); setShowEvolutionLab(true); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
              style={{
                background: 'rgba(16,185,129,0.14)',
                border: '1px solid rgba(16,185,129,0.32)',
                color: '#34d399',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Dna size={11} />
              <span>Evolve</span>
            </motion.button>
          ) : null}
        </motion.div>
      )}
    </motion.div>
  );
}
