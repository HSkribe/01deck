import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { Clock, MessageSquare, Play, Sparkles, Music } from 'lucide-react';
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
  const { currentTheme: t, setActiveAgent, setIsCardVisible, setChatAgent, addToVST, maestroEnabled } = useApp();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHeld, setIsHeld] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const config = rarityConfig[agent.rarity];

  const [{ isDragging }, drag] = useDrag({
    type: 'AGENT',
    item: { agent },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult() as { agent: Agent } | null;
      if (dropResult && maestroEnabled) {
        // Agent was dropped into VST
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
          {/* Maestro music agent badge */}
          {agent.maestroEnabled && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none"
              style={{
                background: 'rgba(255,77,166,0.12)',
                border: '1px solid rgba(255,77,166,0.3)',
                color: '#ff4da6',
              }}
            >
              <Music size={8} />
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
        </motion.div>
      )}
    </motion.div>
  );
}