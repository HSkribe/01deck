import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Atom,
  BadgeDollarSign,
  BarChart3,
  Braces,
  ChevronRight,
  MessageCircle,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { categories } from '../data/categories';
import { useApp } from '../context/AppContext';

const categoryIcons: Record<string, React.ElementType> = {
  research: Atom,
  creative: WandSparkles,
  code: Braces,
  strategy: Sparkles,
  comms: MessageCircle,
  finance: BadgeDollarSign,
  data: BarChart3,
};

function withAlpha(hexColor: string, alpha: string) {
  if (!hexColor.startsWith('#') || hexColor.length !== 7) return hexColor;
  return `${hexColor}${alpha}`;
}

function PrismFlash({ accent }: { accent: string }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-xl pointer-events-none"
      style={{
        background: `linear-gradient(110deg, transparent 0%, ${withAlpha(accent, '00')} 32%, ${withAlpha(accent, 'AA')} 50%, ${withAlpha(accent, '00')} 68%, transparent 100%)`,
      }}
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 30, opacity: [0, 1, 0] }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    />
  );
}

export function LeftRail() {
  const {
    currentTheme: t,
    selectedCategory,
    setSelectedCategory,
    selectedRole,
    setSelectedRole,
    iconPack,
    setIconPack,
    allAgents,
  } = useApp();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);

  const isMono = iconPack === 'mono';
  const iconColor = isMono ? (t.isDark ? '#ffffff' : '#0a0a0a') : t.accent;

  const getAgentCount = (categoryId: string, role?: string) => {
    return allAgents.filter(a => {
      if (role) return a.category === categoryId && a.role === role;
      return a.category === categoryId;
    }).length;
  };

  const railButtonStyle = (active: boolean) => ({
    background: active ? `${t.accent}18` : 'transparent',
    border: `1px solid ${active ? t.accent : 'transparent'}`,
  });

  const skillsMenuBg = t.isDark ? 'rgba(8, 10, 16, 0.70)' : 'rgba(255, 255, 255, 0.70)';

  return (
    <div className="fixed left-0 top-14 bottom-0 z-40 flex" style={{ width: hoveredCategory ? 'auto' : 64 }}>
      <div
        className="flex flex-col items-center py-4 gap-1 relative z-10"
        style={{
          width: 64,
          background: t.surface1,
          borderRight: `1px solid ${t.border}`,
        }}
      >
        <motion.button
          onClick={() => {
            setSelectedCategory(null);
            setSelectedRole(null);
            setClickedId('all');
            setTimeout(() => setClickedId(null), 380);
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
          style={railButtonStyle(selectedCategory === null)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          title="All Agents"
        >
          <Sparkles size={18} color={iconColor} />
          {clickedId === 'all' && <PrismFlash accent={t.accent} />}
          {selectedCategory === null && (
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
              style={{ background: t.accent }}
              layoutId="railIndicator"
            />
          )}
        </motion.button>

        <div className="w-8 h-px my-1" style={{ background: t.border }} />

        {categories.map(cat => {
          const IconComp = categoryIcons[cat.id] ?? Sparkles;
          const isSelected = selectedCategory === cat.id;
          return (
            <div key={cat.id} className="relative">
              <motion.button
                onMouseEnter={() => setHoveredCategory(cat.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedRole(null);
                  setClickedId(cat.id);
                  setTimeout(() => setClickedId(null), 380);
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
                style={railButtonStyle(isSelected)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                title={cat.label}
              >
                <IconComp size={18} color={iconColor} />
                {clickedId === cat.id && <PrismFlash accent={t.accent} />}
                {isSelected && (
                  <motion.div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: t.accent }}
                    layoutId="railIndicator"
                  />
                )}
                <div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                  style={{
                    background: t.surface3,
                    border: `1px solid ${t.border}`,
                    color: t.textMuted,
                  }}
                >
                  {getAgentCount(cat.id)}
                </div>
              </motion.button>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {hoveredCategory && (
          <motion.div
            key={hoveredCategory}
            initial={{ x: -18, opacity: 0, scaleX: 0.95 }}
            animate={{ x: 0, opacity: 1, scaleX: 1 }}
            exit={{ x: -10, opacity: 0, scaleX: 0.97 }}
            transition={{ duration: 0.16 }}
            className="h-full py-4 overflow-y-auto"
            style={{
              width: 248,
              background: skillsMenuBg,
              borderRight: `1px solid ${t.border}`,
              transformOrigin: 'left center',
              boxShadow: '4px 0 24px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(14px)',
            }}
            onMouseEnter={() => setHoveredCategory(hoveredCategory)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            {(() => {
              const cat = categories.find(c => c.id === hoveredCategory);
              if (!cat) return null;
              const HeaderIcon = categoryIcons[cat.id] ?? Sparkles;
              return (
                <>
                  <div className="px-4 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <HeaderIcon size={16} color={iconColor} />
                      <span className="text-sm" style={{ color: t.text }}>{cat.label}</span>
                    </div>
                    <div className="text-xs" style={{ color: t.textMuted }}>
                      {getAgentCount(cat.id)} agents available
                    </div>
                  </div>
                  <div className="w-full h-px mb-2" style={{ background: t.border }} />

                  {cat.roles.map((role, idx) => {
                    const count = getAgentCount(cat.id, role);
                    const isSelected = selectedCategory === cat.id && selectedRole === role;
                    return (
                      <motion.button
                        key={role}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSelectedRole(role);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                        style={{
                          background: isSelected ? `${t.accent}1A` : 'transparent',
                          borderLeft: isSelected ? `2px solid ${t.accent}` : '2px solid transparent',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.12, delay: idx * 0.02 }}
                        whileHover={{
                          background: `${t.accent}0F`,
                          x: 2,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight size={12} style={{ color: isSelected ? t.accent : t.textMuted }} />
                          <span className="text-sm" style={{ color: isSelected ? t.text : t.textMuted }}>
                            {role}
                          </span>
                        </div>
                        {count > 0 && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              background: t.surface3,
                              color: t.textMuted,
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}

                  <div className="px-4 mt-4 pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>
                      Icon Pack
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIconPack('classic')}
                        className="px-2 py-2 rounded-lg text-xs"
                        style={{
                          background: iconPack === 'classic' ? `${t.accent}1A` : t.surface1,
                          border: `1px solid ${iconPack === 'classic' ? t.accent : t.border}`,
                          color: iconPack === 'classic' ? t.text : t.textMuted,
                        }}
                      >
                        Accent
                      </button>
                      <button
                        onClick={() => setIconPack('mono')}
                        className="px-2 py-2 rounded-lg text-xs"
                        style={{
                          background: iconPack === 'mono' ? `${t.accent}1A` : t.surface1,
                          border: `1px solid ${iconPack === 'mono' ? t.accent : t.border}`,
                          color: iconPack === 'mono' ? t.text : t.textMuted,
                        }}
                      >
                        Black/White
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
