import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, Play, Bookmark, FileEdit, TrendingUp } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useHub, LibraryTab } from '../../../context/HubContext';
import { games, courses, tests, howTos } from '../../../data/hubData';

const LIBRARY_COLOR = '#10b981';

const TABS: { id: LibraryTab; label: string; icon: string; count: number }[] = [
  { id: 'in-progress', label: 'In Progress', icon: '▶', count: 0 },
  { id: 'saved', label: 'Saved', icon: '🔖', count: 0 },
  { id: 'completed', label: 'Completed', icon: '✓', count: 0 },
  { id: 'drafts', label: 'Drafts', icon: '✏️', count: 0 },
];

function LibraryItem({ item, type }: { item: any; type: string }) {
  const { currentTheme: t } = useApp();
  const { setCurrentView, setSelectedGame, setSelectedCourse, setLearnTab } = useHub();

  const colorMap: Record<string, string> = {
    game: '#a855f7', test: '#06b6d4', course: '#10b981', 'how-to': '#f59e0b',
  };
  const iconMap: Record<string, string> = { game: '🎮', test: '🧪', course: '📚', 'how-to': '🔧' };
  const color = colorMap[type] ?? LIBRARY_COLOR;
  const progress = item.progress ?? (item.status === 'completed' ? 100 : 0);

  const handleClick = () => {
    if (type === 'game') { setSelectedGame(item); setCurrentView('arcade'); }
    else if (type === 'course') { setSelectedCourse(item); setCurrentView('learn'); }
    else if (type === 'test') { setLearnTab('tests'); setCurrentView('learn'); }
    else { setLearnTab('how-to'); setCurrentView('learn'); }
  };

  return (
    <motion.div
      onClick={handleClick}
      className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer"
      style={{ background: t.surface2, border: `1px solid ${t.border}` }}
      whileHover={{ borderColor: color + '40', x: 3, boxShadow: `0 4px 20px ${color}12` }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
        style={{ background: `${color}12`, border: `1px solid ${color}25` }}
      >
        {iconMap[type]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm truncate" style={{ color: t.text }}>{item.title}</p>
          {item.isNew && <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>New</span>}
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: t.textMuted }}>
          <span className="capitalize" style={{ color }}>{type}</span>
          <span className="flex items-center gap-0.5">
            <Clock size={9} />
            {item.duration || item.totalDuration || '—'}
          </span>
          {item.agentName && <span>with {item.agentName}</span>}
        </div>
        {/* Progress bar */}
        {progress > 0 && progress < 100 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: color }} />
            </div>
            <span className="text-[9px]" style={{ color }}>{progress}%</span>
          </div>
        )}
        {item.status === 'completed' && (
          <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: '#10b981' }}>
            <CheckCircle2 size={10} /> Completed
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex-shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          {item.status === 'completed'
            ? <TrendingUp size={13} style={{ color }} />
            : <Play size={11} style={{ color }} fill="currentColor" />
          }
        </div>
      </div>
    </motion.div>
  );
}

export function LibraryHub() {
  const { currentTheme: t } = useApp();
  const { libraryTab, setLibraryTab } = useHub();

  // Aggregate all content by status
  const allItems = [
    ...games.filter(g => g.status).map(g => ({ ...g, _type: 'game' })),
    ...courses.filter(c => c.status).map(c => ({ ...c, _type: 'course' })),
    ...tests.filter(t => t.status).map(t => ({ ...t, _type: 'test' })),
    ...howTos.filter(h => h.status).map(h => ({ ...h, _type: 'how-to' })),
  ];

  const filtered = allItems.filter(item => {
    if (libraryTab === 'in-progress') return item.status === 'in-progress';
    if (libraryTab === 'saved') return item.status === 'saved';
    if (libraryTab === 'completed') return item.status === 'completed';
    if (libraryTab === 'drafts') return item.status === 'draft';
    return true;
  });

  const tabCounts: Record<LibraryTab, number> = {
    'in-progress': allItems.filter(i => i.status === 'in-progress').length,
    'saved': allItems.filter(i => i.status === 'saved').length,
    'completed': allItems.filter(i => i.status === 'completed').length,
    'drafts': allItems.filter(i => i.status === 'draft').length,
  };

  return (
    <div className="h-full overflow-y-auto pb-20 md:pb-6">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${LIBRARY_COLOR}15`, border: `1px solid ${LIBRARY_COLOR}30` }}>
            <Bookmark size={15} style={{ color: LIBRARY_COLOR }} />
          </div>
          <h1 className="text-lg uppercase tracking-[0.1em]" style={{ color: t.text }}>Library</h1>
        </div>
        <p className="text-xs" style={{ color: t.textMuted }}>
          Everything you're playing, learning, and building
        </p>
      </div>

      {/* Stats row */}
      <div className="overflow-x-auto px-6 mb-6">
        <div className="flex gap-3" style={{ width: 'max-content' }}>
          {[
            { label: 'In Progress', value: tabCounts['in-progress'], color: '#a855f7', icon: '▶' },
            { label: 'Saved', value: tabCounts['saved'], color: '#06b6d4', icon: '🔖' },
            { label: 'Completed', value: tabCounts['completed'], color: '#10b981', icon: '✓' },
            { label: 'Drafts', value: tabCounts['drafts'], color: '#f59e0b', icon: '✏️' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl"
              style={{ background: t.surface2, border: `1px solid ${t.border}`, minWidth: 80 }}>
              <span className="text-lg" style={{ color: s.color }}>{s.icon}</span>
              <span className="text-xl" style={{ color: t.text }}>{s.value}</span>
              <span className="text-[10px] text-center" style={{ color: t.textMuted }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto px-6 mb-6">
        <div className="flex gap-2" style={{ width: 'max-content' }}>
          {TABS.map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => setLibraryTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
              style={{
                background: libraryTab === tab.id ? `${LIBRARY_COLOR}18` : t.surface2,
                border: `1px solid ${libraryTab === tab.id ? LIBRARY_COLOR + '50' : t.border}`,
                color: libraryTab === tab.id ? LIBRARY_COLOR : t.textMuted,
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px]"
                style={{ background: libraryTab === tab.id ? `${LIBRARY_COLOR}25` : t.surface3, color: libraryTab === tab.id ? LIBRARY_COLOR : t.textMuted }}
              >
                {tabCounts[tab.id]}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={libraryTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="px-6 space-y-3"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="text-5xl mb-4 opacity-30">
                {libraryTab === 'in-progress' ? '▶' : libraryTab === 'saved' ? '🔖' : libraryTab === 'completed' ? '✓' : '✏️'}
              </div>
              <p className="text-sm mb-1" style={{ color: t.text }}>
                Nothing {libraryTab === 'in-progress' ? 'in progress' : libraryTab === 'saved' ? 'saved' : libraryTab === 'completed' ? 'completed' : 'in drafts'} yet
              </p>
              <p className="text-xs max-w-xs" style={{ color: t.textMuted }}>
                {libraryTab === 'drafts'
                  ? 'Your created content drafts will appear here'
                  : 'Go explore Arcade and Learn to fill this up'}
              </p>
            </div>
          ) : (
            filtered.map(item => (
              <LibraryItem key={item.id} item={item} type={(item as any)._type} />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
