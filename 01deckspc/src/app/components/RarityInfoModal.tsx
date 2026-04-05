import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Hash, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent } from '../data/agents';

interface RarityInfoModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}

export function RarityInfoModal({ agent, isOpen, onClose }: RarityInfoModalProps) {
  const { currentTheme: t } = useApp();

  if (!isOpen) return null;

  // Extract serial and total from rarityCount if available (e.g., "3/10")
  const [serial, total] = agent.rarityCount.includes('/')
    ? agent.rarityCount.split('/').map(s => s.trim())
    : [agent.serial?.toString() || '?', agent.totalSupply?.toString() || '?'];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[110] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative rounded-xl shadow-2xl overflow-hidden"
          style={{
            background: t.surface1,
            border: `2px solid ${t.border}`,
            width: 400,
          }}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: t.border, background: t.surface2 }}
          >
            <h3 className="font-semibold" style={{ color: t.text }}>
              Agent Rarity Info
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full transition-all hover:bg-white/10"
              style={{ color: t.textMuted }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Unique Identifier */}
            <div
              className="p-4 rounded-lg"
              style={{
                background: t.surface2,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Hash size={16} style={{ color: t.accent }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Unique Identifier
                </span>
              </div>
              <div className="font-mono text-lg" style={{ color: t.text }}>
                {agent.protocolId}
              </div>
            </div>

            {/* Edition Number */}
            <div
              className="p-4 rounded-lg"
              style={{
                background: t.surface2,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} style={{ color: t.accent }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>
                  Edition Number
                </span>
              </div>
              <div className="text-3xl font-bold" style={{ color: t.text }}>
                {serial} <span className="text-lg" style={{ color: t.textMuted }}>/ {total}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: t.textMuted }}>
                {total === 'Unlimited' 
                  ? 'Unlimited edition'
                  : `This is agent #${serial} out of ${total} total created`}
              </div>
            </div>

            {/* Rarity Details */}
            <div
              className="p-4 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${t.accent}10, ${t.surface2})`,
                border: `1px solid ${t.accent}30`,
              }}
            >
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
                Rarity Tier
              </div>
              <div className="text-xl font-semibold capitalize" style={{ color: t.accent }}>
                {agent.rarity}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 border-t flex justify-end"
            style={{ borderColor: t.border, background: t.surface2 }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{
                background: t.accent,
                color: t.isDark ? '#000' : '#fff',
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
