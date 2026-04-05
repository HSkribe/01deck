import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Wifi, WifiOff, Tag, MessageSquare, ChevronRight, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { rarityConfig, Agent } from '../data/agents';
import { RarityBadge } from './RarityBadge';
import { RarityInfoModal } from './RarityInfoModal';
import logoMark from 'figma:asset/2806ffa57bf19ee58103436cb23492abbee29bfd.png';

function formatLastUsed(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { currentTheme: t } = useApp();
  return (
    <div className="mb-2.5">
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: t.textMuted }}>{label}</span>
        <span className="text-xs" style={{ color }}>{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: `${color}20` }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function CardFront({ agent, config, onRarityClick }: { agent: Agent; config: typeof rarityConfig[keyof typeof rarityConfig]; onRarityClick: () => void }) {
  const { currentTheme: t } = useApp();
  const isLegend = agent.rarity === 'legend';
  const isMythic = agent.rarity === 'mythic';

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden rounded-2xl">
      {/* Card background */}
      <div
        className="absolute inset-0"
        style={{ background: config.cardBg }}
      />

      {/* Rarity gradient overlay */}
      {isLegend && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,107,107,0.08), rgba(255,215,0,0.08), rgba(0,255,136,0.08), rgba(0,207,255,0.08))',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 3 }}
        />
      )}
      {isMythic && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, rgba(59,130,246,0.2), transparent 60%)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}

      {/* Holographic shimmer for legend */}
      {isLegend && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        />
      )}

      {/* Verified glow (if verified) */}
      {agent.isVerified && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `0 0 20px rgba(34, 197, 94, 0.3), inset 0 0 20px rgba(34, 197, 94, 0.1)`,
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 3 }}
        />
      )}

      {/* Border glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: `1.5px solid ${isLegend ? 'transparent' : config.borderColor}`,
          ...(isLegend ? {
            background: 'linear-gradient(#0e0a1a, #0e0a1a) padding-box, linear-gradient(135deg, #ff6b6b, #ffd700, #00ff88, #00cfff, #b44fff) border-box',
          } : {}),
          boxShadow: `inset 0 0 24px ${config.glowColor}`,
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <img
            src={logoMark}
            alt="01Protocol"
            style={{
              width: 20,
              height: 20,
              filter: 'invert(1) brightness(0.5)',
              objectFit: 'contain',
            }}
          />
          <span className="text-xs tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
            01Protocol
          </span>
        </div>
        <div onClick={(e) => { e.stopPropagation(); onRarityClick(); }}>
          <RarityBadge rarity={agent.rarity} rarityCount={agent.rarityCount} size="sm" showTooltip={false} />
        </div>
      </div>

      {/* Portrait */}
      <div className="relative z-10 flex-1 mx-5 mb-3 rounded-xl overflow-hidden"
        style={{
          border: `1px solid ${config.borderColor}50`,
          boxShadow: `0 0 20px ${config.glowColor}`,
        }}
      >
        <img
          src={agent.portrait}
          alt={agent.name}
          className="w-full h-full object-cover object-top"
        />
        {/* Portrait overlay */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)` }}
        />
        {/* Mythic/Legend particles */}
        {(isLegend || isMythic) && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-0.5 rounded-full"
                style={{
                  background: isLegend ? ['#ff6b6b', '#ffd700', '#00ff88', '#00cfff', '#b44fff', '#ffffff'][i] : '#3b82f6',
                  left: `${15 + i * 14}%`,
                  top: `${20 + (i % 3) * 25}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2 + i * 0.3,
                  delay: i * 0.4,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Set ID below portrait */}
      <div className="relative z-10 px-5 mb-2">
        <div
          className="text-xs px-2 py-1 rounded inline-block"
          style={{
            background: `${config.color}15`,
            color: config.textColor,
          }}
        >
          {agent.protocolVersion}
        </div>
      </div>

      {/* Bottom info */}
      <div className="relative z-10 px-5 pb-4">
        <div className="mb-2">
          <h2 className="text-xl tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.95)' }}>
            {agent.name}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.role}</p>
        </div>
        <div
          className="text-xs px-3 py-1.5 rounded-lg mb-3"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          {agent.specialization}
        </div>
        
        {/* Not Verified Warning */}
        {agent.isVerified === false && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md mb-2"
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
            }}
          >
            <AlertCircle size={12} style={{ color: '#ef4444' }} />
            <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
              Not Verified
            </span>
          </div>
        )}

        {/* 01PROTOCOL branding at bottom */}
        <div className="text-center mt-2">
          <div 
            className="text-base tracking-[0.2em] uppercase font-semibold"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            01PROTOCOL
          </div>
          <div 
            className="text-xs tracking-[0.15em] uppercase"
            style={{ 
              color: 'rgba(255,255,255,0.3)',
              fontSize: '0.70em',
              marginTop: 2,
            }}
          >
            01ai.ai
          </div>
        </div>
      </div>
    </div>
  );
}

function CardBack({ agent, config }: { agent: Agent; config: typeof rarityConfig[keyof typeof rarityConfig] }) {
  const { currentTheme: t, setChatAgent } = useApp();

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden rounded-2xl">
      <div className="absolute inset-0" style={{ background: config.cardBg }} />
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: `1.5px solid ${config.borderColor}`,
          boxShadow: `inset 0 0 20px ${config.glowColor}`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-5 overflow-y-auto">
        {/* Back header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {agent.name}
            </h3>
            <p className="text-xs" style={{ color: config.textColor }}>{agent.role}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {agent.online ? (
              <><Wifi size={12} style={{ color: '#22c55e' }} /><span className="text-xs" style={{ color: '#22c55e' }}>Online</span></>
            ) : (
              <><WifiOff size={12} style={{ color: '#6b7280' }} /><span className="text-xs" style={{ color: '#6b7280' }}>Offline</span></>
            )}
          </div>
        </div>

        {/* Description */}
        <div
          className="text-xs p-3 rounded-lg mb-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.6,
          }}
        >
          {agent.description}. Specializes in {agent.specialization}.
        </div>

        {/* Stats */}
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Agent Stats
          </div>
          {agent.stats.map(stat => (
            <StatBar key={stat.label} label={stat.label} value={stat.value} color={config.color} />
          ))}
        </div>

        {/* Tools */}
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Tools & Capabilities
          </div>
          <div className="flex flex-wrap gap-1.5">
            {agent.tools.map(tool => (
              <span
                key={tool}
                className="text-xs px-2 py-1 rounded-md"
                style={{
                  background: `${config.color}12`,
                  border: `1px solid ${config.borderColor}50`,
                  color: config.textColor,
                }}
              >
                {tool}
              </span>
            ))}
          </div>
        </div>

        {/* Memory / Context */}
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Memory & Context
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            {agent.memoryNotes}
          </p>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <div className="flex items-center gap-1 mb-1.5">
            <Tag size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Tags</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {agent.tags.map(tag => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div
          className="text-xs p-3 rounded-lg mb-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex justify-between mb-1.5">
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Protocol ID</span>
            <span className="font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{agent.protocolId}</span>
          </div>
          <div className="flex justify-between mb-1.5">
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Version</span>
            <span className="font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{agent.protocolVersion}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Last Active</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatLastUsed(agent.lastUsed)}
              </span>
            </span>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          onClick={() => setChatAgent(agent)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
          style={{
            background: `linear-gradient(135deg, ${config.color}25, ${config.borderColor}15)`,
            border: `1px solid ${config.borderColor}80`,
            color: config.textColor,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <MessageSquare size={14} />
          <span>Start Conversation</span>
          <ChevronRight size={14} />
        </motion.button>

        <div className="flex items-center justify-center mt-3">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Tap to flip ↻</span>
        </div>
      </div>
    </div>
  );
}

export function AgentCardModal() {
  const { activeAgent, isCardVisible, setIsCardVisible, setActiveAgent, currentTheme: t } = useApp();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showRarityInfo, setShowRarityInfo] = useState(false);

  useEffect(() => {
    if (!isCardVisible) setIsFlipped(false);
  }, [isCardVisible]);

  const handleClose = () => {
    setIsCardVisible(false);
    setTimeout(() => setActiveAgent(null), 400);
  };

  if (!activeAgent) return null;
  const config = rarityConfig[activeAgent.rarity];

  return (
    <AnimatePresence>
      {isCardVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={handleClose}
          />

          {/* Card */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 40 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="pointer-events-auto relative"
              style={{ width: 380, height: 532 }}
            >
              {/* Close button */}
              <motion.button
                onClick={handleClose}
                className="absolute -top-4 -right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
                whileHover={{ scale: 1.1, color: t.text }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={14} />
              </motion.button>

              {/* Card flip container */}
              <motion.div
                className="w-full h-full"
                style={{
                  perspective: 1200,
                  cursor: 'pointer',
                }}
                onClick={() => setIsFlipped(f => !f)}
              >
                <motion.div
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
                >
                  {/* Front face */}
                  <div
                    className="absolute inset-0"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <CardFront agent={activeAgent} config={config} onRarityClick={() => setShowRarityInfo(true)} />
                  </div>

                  {/* Back face */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <CardBack agent={activeAgent} config={config} />
                  </div>
                </motion.div>
              </motion.div>

              {/* Glow effect */}
              <motion.div
                className="absolute -inset-4 rounded-3xl pointer-events-none -z-10"
                style={{ background: `radial-gradient(ellipse, ${config.glowColor}, transparent 70%)` }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </motion.div>
          </div>

          {/* Rarity Info Modal */}
          <RarityInfoModal 
            agent={activeAgent} 
            isOpen={showRarityInfo} 
            onClose={() => setShowRarityInfo(false)} 
          />
        </>
      )}
    </AnimatePresence>
  );
}