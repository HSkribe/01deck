import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { categories } from '../data/categories';
import { useApp } from '../context/AppContext';
import { agents } from '../data/agents';

export function LeftRail() {
  const { currentTheme: t, selectedCategory, setSelectedCategory, selectedRole, setSelectedRole } = useApp();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const getAgentCount = (categoryId: string, role?: string) => {
    return agents.filter(a => {
      if (role) return a.category === categoryId && a.role === role;
      return a.category === categoryId;
    }).length;
  };

  return (
    <div
      className="fixed left-0 top-14 bottom-0 z-40 flex"
      style={{ width: hoveredCategory ? 'auto' : 64 }}
    >
      {/* Icon rail */}
      <div
        className="flex flex-col items-center py-4 gap-1 relative z-10"
        style={{
          width: 64,
          background: t.surface1,
          borderRight: `1px solid ${t.border}`,
        }}
      >
        {/* All agents button */}
        <motion.button
          onClick={() => { setSelectedCategory(null); setSelectedRole(null); }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl relative group"
          style={{
            background: selectedCategory === null ? `${t.accent}18` : 'transparent',
            border: `1px solid ${selectedCategory === null ? t.accent : 'transparent'}`,
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          title="All Agents"
        >
          <span>⚡</span>
          {selectedCategory === null && (
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
              style={{ background: t.accent }}
              layoutId="railIndicator"
            />
          )}
        </motion.button>

        <div className="w-8 h-px my-1" style={{ background: t.border }} />

        {categories.map(cat => (
          <div key={cat.id} className="relative">
            <motion.button
              onMouseEnter={() => setHoveredCategory(cat.id)}
              onMouseLeave={() => setHoveredCategory(null)}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedRole(null);
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl relative"
              style={{
                background: selectedCategory === cat.id ? `${t.accent}18` : 'transparent',
                border: `1px solid ${selectedCategory === cat.id ? t.accent : 'transparent'}`,
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              title={cat.label}
            >
              <span>{cat.icon}</span>
              {selectedCategory === cat.id && (
                <motion.div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: t.accent }}
                  layoutId="railIndicator"
                />
              )}
              {/* Agent count badge */}
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
        ))}
      </div>

      {/* Slide-out submenu */}
      <AnimatePresence>
        {hoveredCategory && (
          <motion.div
            key={hoveredCategory}
            initial={{ x: -20, opacity: 0, scaleX: 0.92 }}
            animate={{ x: 0, opacity: 1, scaleX: 1 }}
            exit={{ x: -10, opacity: 0, scaleX: 0.95 }}
            transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            className="h-full py-4 overflow-y-auto"
            style={{
              width: 220,
              background: t.surface2,
              borderRight: `1px solid ${t.border}`,
              transformOrigin: 'left center',
              boxShadow: `4px 0 24px rgba(0,0,0,0.3)`,
            }}
            onMouseEnter={() => setHoveredCategory(hoveredCategory)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            {(() => {
              const cat = categories.find(c => c.id === hoveredCategory);
              if (!cat) return null;
              return (
                <>
                  {/* Category header */}
                  <div className="px-4 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-sm" style={{ color: t.text }}>{cat.label}</span>
                    </div>
                    <div className="text-xs" style={{ color: t.textMuted }}>
                      {getAgentCount(cat.id)} agents available
                    </div>
                  </div>
                  <div className="w-full h-px mb-2" style={{ background: t.border }} />

                  {cat.roles.map(role => {
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
                          background: isSelected ? `${t.accent}15` : 'transparent',
                          borderLeft: isSelected ? `2px solid ${t.accent}` : '2px solid transparent',
                        }}
                        whileHover={{
                          background: `${t.accent}0a`,
                          x: 2,
                        }}
                        transition={{ duration: 0.1 }}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight
                            size={12}
                            style={{
                              color: isSelected ? t.accent : t.textMuted,
                              opacity: isSelected ? 1 : 0.5,
                            }}
                          />
                          <span
                            className="text-sm"
                            style={{ color: isSelected ? t.text : t.textMuted }}
                          >
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
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
