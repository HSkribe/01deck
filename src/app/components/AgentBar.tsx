import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';
import { Clock, Dna, MessageSquare, Play, ShieldAlert, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
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

// forwardRef because AgentBar is rendered directly inside an
// <AnimatePresence mode="popLayout"> in AgentList.tsx — popLayout needs a
// real DOM ref on each item to measure it during exit animations. Without
// forwardRef, React/Framer Motion try to attach that ref to this function
// component and log "Function components cannot be given refs". The ref
// itself is merged with react-dnd's `drag` ref below, since both need the
// same root node.
export const AgentBar = React.forwardRef<HTMLDivElement, AgentBarProps>(function AgentBar(
  { agent, index },
  forwardedRef,
) {
  const { currentTheme: t, densityMode, setActiveAgent, setIsCardVisible, setChatAgent, setShowEvolutionLab, isPluginEnabled, addToVST, removeAgent } = useApp();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const [isHeld, setIsHeld] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const config = rarityConfig[agent.rarity];
  const evolutionPluginEnabled = isPluginEnabled('01evolve-experience');
  const maestroPluginEnabled = isPluginEnabled('01maestro');

  const [{ isDragging }, drag] = useDrag({
    type: 'AGENT',
    item: { agent },
    end: (_item, monitor) => {
      if (maestroPluginEnabled && monitor.didDrop()) {
        addToVST(agent);
      }
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      drag(node);
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [drag, forwardedRef],
  );

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

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return; // let buttons inside handle their own keys
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setActiveAgent(agent);
      setIsCardVisible(true);
    }
  };

  // Drag-and-drop (react-dnd) is pointer-only by nature — there's no
  // keyboard equivalent for "drag this onto the VST rack". The Chat button
  // below is the keyboard-reachable equivalent for starting a conversation
  // without dragging; it's kept visible whenever the row is hovered OR
  // focused (not hover-only) so Tab users can reach it.
  const showRowActions = isHovered || isFocused;

  const handleDeleteAgent = (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    handleMouseUp();

    if (!agent.isUserCreated) return;

    const shouldDelete = window.confirm(`Delete ${agent.name} from your agent library? This removes its local memory and saved copy from this device.`);
    if (!shouldDelete) return;

    removeAgent(agent.id);
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
      ref={setRefs}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: isDragging ? 0.4 : 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); handleMouseUp(); }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={() => setIsFocused(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
      onKeyDown={handleRowKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${agent.name}, ${agent.role}. Press Enter to view this agent's card.`}
      className="relative flex items-center rounded-xl cursor-grab active:cursor-grabbing select-none overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
        outlineColor: config.borderColor,
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
      }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      title="Click to view card • Hold to expand • Drag to chat • Enter/Space to view"
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
            alt=""
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
          {/* Self-consistent but not owner-bound — must read as distinct
              from VERIFIED, not silently upgraded to it. */}
          {!agent.isVerified && agent.verification?.status === 'unbound' && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none"
              style={{
                background: 'rgba(234,179,8,0.12)',
                border: '1px solid rgba(234,179,8,0.35)',
                color: '#eab308',
              }}
            >
              <ShieldAlert size={8} />
              SELF-SIGNED
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

      {/* Action buttons — visible on hover AND on keyboard focus, so Tab
          users (and the row's own aria-label) have a non-drag way to reach
          every action a mouse user gets via hover + drag. */}
      {showRowActions && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5 ml-2"
        >
          <motion.button
            type="button"
            onClick={e => { e.stopPropagation(); setChatAgent(agent); }}
            aria-label={`Chat with ${agent.name}`}
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
            type="button"
            onClick={e => { e.stopPropagation(); setActiveAgent(agent); setIsCardVisible(true); }}
            aria-label={`View ${agent.name}'s card`}
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
              type="button"
              onClick={e => { e.stopPropagation(); setShowEvolutionLab(true); }}
              aria-label={`Open Evolution Lab for ${agent.name}`}
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
          {agent.isUserCreated ? (
            <motion.button
              type="button"
              onClick={handleDeleteAgent}
              aria-label={`Delete ${agent.name}`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.28)',
                color: '#f87171',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Delete this user-created agent"
            >
              <Trash2 size={11} />
              <span>Delete</span>
            </motion.button>
          ) : null}
        </motion.div>
      )}
    </motion.div>
  );
});
