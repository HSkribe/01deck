import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Inbox, Filter } from 'lucide-react';
import { AgentBar } from './AgentBar';
import { useApp } from '../context/AppContext';
import { categories } from '../data/categories';

export function AgentList() {
  const { agentList, currentTheme: t, selectedCategory, selectedRole, searchQuery, setShowEvolutionLab, isPluginEnabled } = useApp();
  const evolutionPluginEnabled = isPluginEnabled('01evolve-experience');
  const evolvableCount = agentList.filter(agent => agent.hasEvolution).length;

  const getCategoryLabel = () => {
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (selectedRole) return `${cat?.label} / ${selectedRole}`;
      return cat?.label;
    }
    return 'All Agents';
  };

  return (
    <div className="flex flex-col h-full">
      {/* List header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 z-10"
        style={{ background: t.bg }}
      >
        <div>
          <h2 className="text-sm" style={{ color: t.text }}>
            {getCategoryLabel()}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            {agentList.length} agent{agentList.length !== 1 ? 's' : ''} · sorted by last used
            {searchQuery && ` · filtered by "${searchQuery}"`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {evolutionPluginEnabled && evolvableCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowEvolutionLab(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs"
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.28)',
                color: '#34d399',
              }}
            >
              <span>{evolvableCount} Evolvable</span>
            </button>
          ) : null}
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs"
            style={{
              background: t.surface1,
              border: `1px solid ${t.border}`,
              color: t.textMuted,
            }}
          >
            <Filter size={11} />
            <span>Last Used</span>
          </div>
        </div>
      </div>

      {/* Legend */}
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

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto pb-4">
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
        style={{
          background: t.surface1,
          border: `1px solid ${t.border}`,
          color: t.textMuted,
        }}
      >
        01Protocol Registry · Browse Available Agents
      </div>
    </motion.div>
  );
}
