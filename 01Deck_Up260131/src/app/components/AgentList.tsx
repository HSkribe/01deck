import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Inbox, Filter, Search, X, Dna } from 'lucide-react';
import { AgentBar } from './AgentBar';
import { useApp } from '../context/AppContext';
import { categories } from '../data/categories';

export function AgentList() {
  const {
    agentList, currentTheme: t,
    selectedCategory, selectedRole,
    searchQuery, setSearchQuery,
    setShowEvolutionLab,
  } = useApp();

  const getCategoryLabel = () => {
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (selectedRole) return `${cat?.label} / ${selectedRole}`;
      return cat?.label;
    }
    return 'All Agents';
  };

  const evolutionCount = agentList.filter(a => a.hasEvolution).length;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header row ──────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 z-10 gap-3"
        style={{ background: t.bg }}
      >
        {/* Left: category label + count */}
        <div className="flex-shrink-0">
          <h2 className="text-sm" style={{ color: t.text }}>
            {getCategoryLabel()}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            {agentList.length} agent{agentList.length !== 1 ? 's' : ''} · sorted by last used
            {searchQuery && ` · "${searchQuery}"`}
          </p>
        </div>

        {/* Center: Search bar */}
        <div className="flex-1 max-w-md">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: t.surface2, border: `1px solid ${t.border}` }}
          >
            <Search size={13} style={{ color: t.textMuted }} />
            <input
              type="text"
              placeholder="Search agents, roles, capabilities..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: t.text }}
            />
            {searchQuery && (
              <motion.button
                onClick={() => setSearchQuery('')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{ color: t.textMuted }}
              >
                <X size={12} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Right: filters + evolution indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {evolutionCount > 0 && (
            <motion.button
              onClick={() => setShowEvolutionLab(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(168,85,247,0.08))',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#10b981',
              }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 14px rgba(16,185,129,0.3)' }}
              whileTap={{ scale: 0.96 }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.2), rgba(6,182,212,0.2), rgba(16,185,129,0.2), transparent)' }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              />
              <Dna size={11} />
              <span>{evolutionCount} Evolvable</span>
            </motion.button>
          )}

          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer"
            style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.textMuted }}
          >
            <Filter size={11} />
            <span>Last Used</span>
          </div>
        </div>
      </div>

      {/* ── Column legend ────────────────────────────────── */}
      <div
        className="flex items-center gap-6 px-4 pb-2 text-xs border-b mx-4 mb-2"
        style={{ color: t.textMuted, borderColor: t.border }}
      >
        <span className="w-10 flex-shrink-0">Avatar</span>
        <span className="flex-1">Name · Role · Description</span>
        <span className="hidden lg:block w-24">Protocol</span>
        <span className="w-20">Last Used</span>
        <span className="w-28">Rarity</span>
        <span className="w-4" />
      </div>

      {/* ── Agent list ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="popLayout">
          {agentList.length === 0 ? (
            <EmptyState t={t} searchQuery={searchQuery} />
          ) : (
            agentList.map((agent, index) => (
              <AgentBar key={agent.id} agent={agent} index={index} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState({ t, searchQuery }: { t: ReturnType<typeof useApp>['currentTheme']; searchQuery: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 px-8"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="mb-6"
      >
        <Inbox size={48} style={{ color: t.textMuted, opacity: 0.4 }} />
      </motion.div>
      <h3 className="text-base mb-2" style={{ color: t.text }}>
        {searchQuery ? 'No agents found' : 'No agents in this role'}
      </h3>
      <p className="text-sm text-center max-w-xs" style={{ color: t.textMuted }}>
        {searchQuery
          ? `No agents match "${searchQuery}". Try a different search term.`
          : 'This role category is empty. Agents can be added via the 01Protocol registry.'}
      </p>
      <div
        className="mt-6 px-4 py-2 rounded-lg text-xs"
        style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.textMuted }}
      >
        01Protocol Registry · Browse Available Agents
      </div>
    </motion.div>
  );
}
