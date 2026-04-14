import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star, Clock, Users, Zap, Play, X, ChevronLeft,
  TrendingUp, Shield, BookOpen, ArrowRight, Lock,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useHub } from '../../../context/HubContext';
import {
  games, arcadeCategories, ArcadeCategory, Game, LiveStatus,
} from '../../../data/hubData';
import { AgentChess } from '../../games/AgentChess';
import { AgentChoice } from '../../games/AgentChoice';
import { RiddleRace } from '../../games/RiddleRace';
import { TriviaQuizzes } from '../../games/TriviaQuizzes';
import { TwentyQuestionsRemix } from '../../games/TwentyQuestionsRemix';
import { VoidPulse } from '../../games/VoidPulse';
import { ProtocolMatch } from '../../games/ProtocolMatch';

// ─── Status badge ─────────────────────────────────────────

const STATUS_CONFIG: Record<LiveStatus, { label: string; color: string; bg: string; dot?: boolean }> = {
  live:           { label: 'Live Now',       color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   dot: true },
  mvp:            { label: 'Interactive MVP', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  'content-ready':{ label: 'Content Ready',  color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  planned:        { label: 'Planned',         color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

function StatusBadge({ status }: { status?: LiveStatus }) {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
    >
      {cfg.dot && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{ background: cfg.color }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      )}
      {cfg.label}
    </span>
  );
}

// ─── Difficulty pips ─────────────────────────────────────

function DifficultyPips({ level }: { level: string }) {
  const map: Record<string, number> = { easy: 1, medium: 2, hard: 3, expert: 4 };
  const filled = map[level] ?? 1;
  const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444'];
  return (
    <div className="flex gap-0.5 items-center">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="rounded-full"
          style={{ width: 5, height: 5, background: i < filled ? colors[filled - 1] : 'rgba(255,255,255,0.12)' }}
        />
      ))}
    </div>
  );
}

// ─── Game Card ─────────────────────────────────────────────

function GameCard({ game, onSelect }: { game: Game; onSelect: (g: Game) => void }) {
  const { currentTheme: t } = useApp();
  const cat = arcadeCategories.find(c => c.id === game.category);
  const color = cat?.color ?? '#a855f7';
  const [hovered, setHovered] = useState(false);
  const isPlanned = game.liveStatus === 'planned';

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(game)}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: t.surface2,
        border: `1px solid ${hovered && !isPlanned ? color + '50' : t.border}`,
        opacity: isPlanned ? 0.72 : 1,
      }}
      whileHover={{ scale: isPlanned ? 1.01 : 1.02, boxShadow: isPlanned ? 'none' : `0 8px 40px ${color}25` }}
      whileTap={{ scale: 0.97 }}
      layout
    >
      {/* Thumbnail / gradient header */}
      <div className="relative overflow-hidden" style={{ height: 140 }}>
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}
          >
            <span style={{ fontSize: 52, opacity: isPlanned ? 0.4 : 0.8 }}>{cat?.icon ?? '🎮'}</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${t.surface2}ee 0%, transparent 55%)` }} />

        {/* Badges row */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <StatusBadge status={game.liveStatus} />
          {game.featured && !isPlanned && (
            <span className="text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: 'rgba(245,158,11,0.25)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}>
              Featured
            </span>
          )}
          {game.isNew && !isPlanned && (
            <span className="text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: 'rgba(16,185,129,0.25)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)' }}>
              New
            </span>
          )}
        </div>

        {/* Planned lock icon */}
        {isPlanned && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Lock size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>
        )}

        {/* Progress bar */}
        {game.status === 'in-progress' && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider" style={{ color }}>In Progress</span>
              <span className="text-[9px]" style={{ color }}>{game.progress}%</span>
            </div>
            <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${game.progress}%`, background: color }} />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color }}>{cat?.label}</span>
        </div>
        <h3 className="text-sm mb-1" style={{ color: t.text }}>{game.title}</h3>
        <p className="text-[11px] mb-3 leading-relaxed line-clamp-2" style={{ color: t.textMuted }}>{game.tagline}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock size={10} style={{ color: t.textMuted }} />
              <span className="text-[10px]" style={{ color: t.textMuted }}>{game.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={10} style={{ color: t.textMuted }} />
              <span className="text-[10px]" style={{ color: t.textMuted }}>{game.players}</span>
            </div>
            <DifficultyPips level={game.difficulty} />
          </div>
          {game.rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star size={10} style={{ color: '#f59e0b' }} fill="#f59e0b" />
              <span className="text-[10px]" style={{ color: t.textMuted }}>{game.rating}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover CTA (only for non-planned) */}
      <AnimatePresence>
        {hovered && !isPlanned && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-4 right-4"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs" style={{ background: color, color: '#000' }}>
              <Play size={11} fill="currentColor" /> Play Now
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Game Detail Panel ─────────────────────────────────────

function GameDetailPanel({
  game,
  onClose,
  onLaunch,
  onSelectRelated,
}: {
  game: Game;
  onClose: () => void;
  onLaunch: () => void;
  onSelectRelated: (g: Game) => void;
}) {
  const { currentTheme: t } = useApp();
  const cat = arcadeCategories.find(c => c.id === game.category);
  const color = cat?.color ?? '#a855f7';
  const related = games.filter(g => g.category === game.category && g.id !== game.id).slice(0, 3);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.34, 1.05, 0.64, 1] }}
      className="absolute inset-0 overflow-y-auto z-20"
      style={{ background: t.bg }}
    >
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: 280 }}>
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}30, ${color}08)` }}
          >
            <span style={{ fontSize: 80, opacity: 0.6 }}>{cat?.icon ?? '🎮'}</span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${t.bg}ff 0%, ${t.bg}88 40%, transparent 70%)` }}
        />
        {/* Close */}
        <motion.button
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center z-10"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft size={18} />
        </motion.button>
        {/* Agent badge */}
        <div
          className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="w-4 h-4 rounded-full" style={{ background: color }} />
          <span className="text-xs text-white">{game.agentName}</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-8">
        {/* Category + badges */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
            {cat?.label}
          </span>
          {game.isNew && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>New</span>
          )}
        </div>

        <h1 className="text-2xl mb-2" style={{ color: t.text }}>{game.title}</h1>
        <p className="text-sm mb-6" style={{ color: t.textMuted }}>{game.tagline}</p>

        {/* Stat pills */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { icon: Users, label: 'Players', value: game.players },
            { icon: Clock, label: 'Duration', value: game.duration },
            { icon: Shield, label: 'Difficulty', value: game.difficulty },
            { icon: Star, label: 'Rating', value: `${game.rating}/5` },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1 p-3 rounded-xl" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
              <s.icon size={14} style={{ color }} />
              <span className="text-xs" style={{ color: t.text }}>{s.value}</span>
              <span className="text-[9px] uppercase tracking-wide" style={{ color: t.textMuted }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>About</h3>
          <p className="text-sm leading-relaxed" style={{ color: t.text }}>{game.description}</p>
        </div>

        {/* How to play */}
        <div className="mb-8">
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>How to Play</h3>
          <div
            className="p-4 rounded-xl text-sm leading-relaxed"
            style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
          >
            {game.howToPlay}
          </div>
        </div>

        {/* Play button */}
        <motion.button
          onClick={onLaunch}
          className="w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-3 mb-8"
          style={{
            background: `linear-gradient(135deg, ${color}30, ${color}15)`,
            border: `1px solid ${color}50`,
            color: t.text,
          }}
          whileHover={{ scale: 1.02, boxShadow: `0 0 32px ${color}30` }}
          whileTap={{ scale: 0.98 }}
        >
          <Play size={18} style={{ color }} />
          Start Playing · +{Math.round(game.rating * 20)} XP
          <Zap size={14} style={{ color: '#f59e0b' }} />
        </motion.button>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {game.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.textMuted }}>
              #{tag}
            </span>
          ))}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>More Like This</h3>
            <div className="space-y-2">
              {related.map(r => {
                const rcat = arcadeCategories.find(c => c.id === r.category);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                    style={{ background: t.surface1, border: `1px solid ${t.border}` }}
                    onClick={() => onSelectRelated(r)}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${rcat?.color ?? '#a855f7'}15` }}>
                      <span>{rcat?.icon ?? '🎮'}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs" style={{ color: t.text }}>{r.title}</p>
                      <p className="text-[10px]" style={{ color: t.textMuted }}>{r.duration} · {r.difficulty}</p>
                    </div>
                    <ArrowRight size={14} style={{ color: t.textMuted }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Game ID → Component map ──────────────────────────────

const GAME_COMPONENT_MAP: Record<string, React.ComponentType> = {
  'g-ac':  AgentChess,
  'g-ach': AgentChoice,
  'g003':  RiddleRace,
  'g-tq':  TriviaQuizzes,
  'g001':  TwentyQuestionsRemix,
  'g-vp':  VoidPulse,
  'g-pm':  ProtocolMatch,
};

// ─── Game Launch Modal ────────────────────────────────────

function GameLaunchModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const { currentTheme: t } = useApp();
  const cat = arcadeCategories.find(c => c.id === game.category);
  const color = cat?.color ?? '#a855f7';
  const GameComponent = GAME_COMPONENT_MAP[game.id] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.28, ease: [0.34, 1.05, 0.64, 1] }}
      className="fixed inset-0 z-[250] flex flex-col"
      style={{ background: t.bg }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: 56,
          borderBottom: `1px solid ${t.border}`,
          background: t.surface1,
        }}
      >
        <motion.button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.text }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft size={18} />
        </motion.button>

        <span className="text-sm font-medium truncate max-w-[55%] text-center" style={{ color }}>
          {game.title}
        </span>

        <div className="w-9 h-9 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
        </div>
      </div>

      {/* Game content area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {GameComponent ? (
          <GameComponent />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <span style={{ fontSize: 72, opacity: 0.5 }}>{cat?.icon ?? '🎮'}</span>
            <p className="text-base" style={{ color: t.text }}>Coming Soon</p>
            <p className="text-sm" style={{ color: t.textMuted }}>{game.title} is not yet available to play.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Category Hero ────────────────────────────────────────

function CategoryHero({ category }: { category: typeof arcadeCategories[0] }) {
  const { currentTheme: t } = useApp();
  const catGames = games.filter(g => g.category === category.id);

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden mx-6 mb-6 p-6"
      style={{
        background: `linear-gradient(135deg, ${category.color}18, ${category.color}06)`,
        border: `1px solid ${category.color}30`,
        minHeight: 120,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 90% 50%, ${category.glow}, transparent 70%)` }} />
      <div className="relative z-10 flex items-center gap-4">
        <span style={{ fontSize: 48 }}>{category.icon}</span>
        <div>
          <h2 className="text-lg mb-1" style={{ color: t.text }}>{category.label}</h2>
          <p className="text-xs mb-2" style={{ color: t.textMuted }}>{category.description}</p>
          <span className="text-[10px]" style={{ color: category.color }}>{catGames.length} games available</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ArcadeHub ───────────────────────────────────────

export function ArcadeHub() {
  const { currentTheme: t } = useApp();
  const { arcadeCategory, setArcadeCategory, selectedGame, setSelectedGame } = useHub();
  const [isLaunched, setIsLaunched] = useState(false);

  const handleSelectGame = useCallback((game: Game) => {
    setSelectedGame(game);
    setIsLaunched(false);
  }, [setSelectedGame]);

  const handleCloseDetail = useCallback(() => {
    setSelectedGame(null);
    setIsLaunched(false);
  }, [setSelectedGame]);

  const liveGames = games.filter(g => g.liveStatus === 'live' && (!arcadeCategory || g.category === arcadeCategory));
  const mvpGames = games.filter(g => g.liveStatus === 'mvp' && (!arcadeCategory || g.category === arcadeCategory));
  const plannedGames = games.filter(g => g.liveStatus === 'planned' && (!arcadeCategory || g.category === arcadeCategory));
  const filteredGames = arcadeCategory ? games.filter(g => g.category === arcadeCategory) : games;

  const selectedCatDef = arcadeCategory ? arcadeCategories.find(c => c.id === arcadeCategory) : null;

  return (
    <div className="relative h-full overflow-hidden">
      <div className="h-full overflow-y-auto pb-20 md:pb-6">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}
            >
              <span>🎮</span>
            </div>
            <h1 className="text-lg uppercase tracking-[0.1em]" style={{ color: t.text }}>Arcade</h1>
          </div>
          <p className="text-xs" style={{ color: t.textMuted }}>
            {games.filter(g => g.liveStatus === 'live').length} live · {games.filter(g => g.liveStatus === 'planned').length} planned · AI-powered · Multiplayer ready
          </p>
        </div>

        {/* Category pills */}
        <div className="overflow-x-auto px-6 mb-6">
          <div className="flex gap-2" style={{ width: 'max-content' }}>
            <motion.button
              onClick={() => setArcadeCategory(null)}
              className="px-4 py-2 rounded-full text-xs"
              style={{
                background: !arcadeCategory ? 'rgba(168,85,247,0.2)' : t.surface2,
                border: `1px solid ${!arcadeCategory ? 'rgba(168,85,247,0.5)' : t.border}`,
                color: !arcadeCategory ? '#a855f7' : t.textMuted,
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              All Games
            </motion.button>
            {arcadeCategories.map(cat => (
              <motion.button
                key={cat.id}
                onClick={() => setArcadeCategory(cat.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs"
                style={{
                  background: arcadeCategory === cat.id ? `${cat.color}20` : t.surface2,
                  border: `1px solid ${arcadeCategory === cat.id ? cat.color + '60' : t.border}`,
                  color: arcadeCategory === cat.id ? cat.color : t.textMuted,
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Category hero */}
        <AnimatePresence mode="wait">
          {selectedCatDef && <CategoryHero key={selectedCatDef.id} category={selectedCatDef} />}
        </AnimatePresence>

        {/* Category quick-select (no filter) */}
        {!arcadeCategory && (
          <div className="px-6 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {arcadeCategories.map(cat => (
                <motion.button key={cat.id} onClick={() => setArcadeCategory(cat.id)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl"
                  style={{ background: `${cat.color}08`, border: `1px solid ${cat.color}20` }}
                  whileHover={{ scale: 1.05, background: `${cat.color}15` }} whileTap={{ scale: 0.95 }}>
                  <span style={{ fontSize: 28 }}>{cat.icon}</span>
                  <span className="text-[10px] text-center leading-tight" style={{ color: cat.color }}>{cat.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── LIVE NOW section ─────────────────────────────── */}
        {liveGames.length > 0 && (
          <div className="px-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <motion.div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }}
                animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
              <span className="text-xs uppercase tracking-wider" style={{ color: '#22c55e' }}>Live Now</span>
              <span className="text-xs" style={{ color: t.textMuted }}>— open and playable today</span>
            </div>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {liveGames.map(game => (
                  <motion.div key={game.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                    <GameCard game={game} onSelect={handleSelectGame} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* ── PLANNED NEXT section ─────────────────────────── */}
        {plannedGames.length > 0 && (
          <div className="px-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={12} style={{ color: t.textMuted }} />
              <span className="text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>Planned Next</span>
              <span className="text-xs" style={{ color: t.textMuted }}>— coming soon</span>
            </div>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {plannedGames.map(game => (
                  <motion.div key={game.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                    <GameCard game={game} onSelect={handleSelectGame} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </div>

      {/* Game detail panel */}
      <AnimatePresence>
        {selectedGame && (
          <GameDetailPanel
            game={selectedGame}
            onClose={handleCloseDetail}
            onLaunch={() => setIsLaunched(true)}
            onSelectRelated={handleSelectGame}
          />
        )}
      </AnimatePresence>

      {/* Game launch modal */}
      <AnimatePresence>
        {isLaunched && selectedGame && (
          <GameLaunchModal
            game={selectedGame}
            onClose={() => setIsLaunched(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}