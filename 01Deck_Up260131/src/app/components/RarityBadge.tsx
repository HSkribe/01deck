import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rarity, rarityConfig } from '../data/agents';
import { useApp } from '../context/AppContext';
import logoMark from 'figma:asset/2806ffa57bf19ee58103436cb23492abbee29bfd.png';

interface RarityBadgeProps {
  rarity: Rarity;
  rarityCount: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  onClick?: () => void; // New prop for click handler
}

export function RarityBadge({ rarity, rarityCount, size = 'md', showTooltip = true, onClick }: RarityBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { currentTheme: t } = useApp();
  const config = rarityConfig[rarity];

  const sizes = {
    sm: { badge: 20, text: '9px', dot: 5 },
    md: { badge: 26, text: '10px', dot: 6 },
    lg: { badge: 32, text: '11px', dot: 8 },
  };
  const s = sizes[size];

  const isLegend = rarity === 'legend';
  const isMythic = rarity === 'mythic';

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {/* Protocol badge */}
      <motion.div
        className="relative flex items-center justify-center rounded-full cursor-pointer"
        style={{
          width: s.badge,
          height: s.badge,
          background: t.surface2,
          border: `1.5px solid ${isLegend ? 'transparent' : config.borderColor}`,
          ...(isLegend ? {
            background: 'linear-gradient(#1a1a2e, #1a1a2e) padding-box, linear-gradient(135deg, #ff6b6b, #ffd700, #00ff88, #00cfff, #b44fff) border-box',
          } : {}),
        }}
        whileHover={{ scale: 1.15 }}
        onClick={() => {
          if (onClick) {
            onClick();
          } else {
            setTooltipOpen(v => !v);
          }
        }}
      >
        <img
          src={logoMark}
          alt="01Protocol"
          style={{
            width: s.badge * 0.6,
            height: s.badge * 0.6,
            objectFit: 'contain',
            filter: t.isDark ? 'invert(1) brightness(0.7)' : 'invert(0)',
            opacity: 0.7,
          }}
        />
        {/* Rarity dot */}
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-2"
          style={{
            width: s.dot,
            height: s.dot,
            background: isLegend
              ? 'linear-gradient(135deg, #ff6b6b, #ffd700, #00ff88)'
              : config.color,
            borderColor: t.surface1,
          }}
        />
        {/* Mythic pulse */}
        {isMythic && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `1px solid ${config.color}` }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
        {/* Legend shimmer */}
        {isLegend && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(255,107,107,0.3), rgba(255,215,0,0.3), rgba(0,255,136,0.3))',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.div>

      {/* Rarity label */}
      <span
        className="uppercase tracking-wider"
        style={{
          fontSize: s.text,
          color: isLegend ? 'transparent' : config.color,
          backgroundClip: isLegend ? 'text' : undefined,
          WebkitBackgroundClip: isLegend ? 'text' : undefined,
          backgroundImage: isLegend ? 'linear-gradient(90deg, #ff6b6b, #ffd700, #00ff88, #00cfff)' : undefined,
        }}
      >
        {config.label}
      </span>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipOpen && showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            className="absolute bottom-full left-0 mb-2 z-50 p-3 rounded-xl min-w-[160px]"
            style={{
              background: t.surface3,
              border: `1px solid ${config.borderColor || t.border}`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 12px ${config.glowColor}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: isLegend ? 'linear-gradient(135deg, #ff6b6b, #ffd700, #00ff88)' : config.color }}
              />
              <span className="text-xs uppercase tracking-wider" style={{ color: t.text }}>
                {config.label}
              </span>
            </div>
            <div className="text-sm font-mono" style={{ color: config.textColor }}>
              {rarityCount === 'Unlimited' ? '∞ Common' : `#${rarityCount}`}
            </div>
            <div className="text-xs mt-1" style={{ color: t.textMuted }}>
              {rarity === 'legend' && 'One of a kind. Cannot be replicated.'}
              {rarity === 'mythic' && 'Extraordinarily rare. 10 in existence.'}
              {rarity === 'epic' && 'Highly rare. Limited to 250.'}
              {rarity === 'rare' && 'Rare. Only 10 issued.'}
              {rarity === 'uncommon' && 'Uncommon. Select availability.'}
              {rarity === 'common' && 'Common. Widely available.'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}