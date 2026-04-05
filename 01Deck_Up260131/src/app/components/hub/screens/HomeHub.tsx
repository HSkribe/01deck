import React, { useRef } from 'react';
import { motion } from 'motion/react';
import {
  Gamepad2, BookOpen, PlusSquare, Flame, Star,
  ChevronRight, Clock, Play, Trophy, Zap, TrendingUp,
  ArrowRight, Calendar,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useHub } from '../../../context/HubContext';
import {
  games, courses, tests, howTos, achievements, userStats,
  arcadeCategories,
} from '../../../data/hubData';

// ─── Shared mini card components ─────────────────────────

function ProgressRing({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={3}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (circ * pct) / 100 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        strokeDasharray={circ}
      />
    </svg>
  );
}

function StatPill({ icon: Icon, value, label, color }: any) {
  const { currentTheme: t } = useApp();
  return (
    <div
      className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl"
      style={{ background: t.surface2, border: `1px solid ${t.border}` }}
    >
      <Icon size={16} style={{ color }} />
      <span className="text-lg" style={{ color: t.text }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>{label}</span>
    </div>
  );
}

function SectionHeader({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  const { currentTheme: t } = useApp();
  return (
    <div className="flex items-center justify-between mb-4 px-6">
      <h2 className="text-sm uppercase tracking-[0.12em]" style={{ color: t.text }}>{label}</h2>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-xs transition-all hover:gap-2"
          style={{ color: t.textMuted }}
        >
          {action} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Continue Card ────────────────────────────────────────

function ContinueCard({ item }: { item: typeof games[0] }) {
  const { currentTheme: t } = useApp();
  const { setCurrentView, setSelectedGame } = useHub();
  const isGame = 'players' in item;
  const accent = isGame ? '#a855f7' : '#06b6d4';
  const progress = item.progress ?? 0;

  return (
    <motion.div
      onClick={() => { if (isGame) { setSelectedGame(item as any); setCurrentView('arcade'); } else { setCurrentView('learn'); } }}
      className="flex-shrink-0 relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        width: 260,
        background: t.surface2,
        border: `1px solid ${t.border}`,
      }}
      whileHover={{ scale: 1.02, borderColor: accent + '60' }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ height: 120 }}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: isGame
                ? 'linear-gradient(135deg, #2d1b6e, #1a0d40)'
                : 'linear-gradient(135deg, #0c3d5a, #062030)',
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}
        />
        <div
          className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider"
          style={{ background: `${accent}25`, border: `1px solid ${accent}50`, color: accent }}
        >
          {isGame ? 'ARCADE' : 'LEARN'}
        </div>
      </div>
      {/* Content */}
      <div className="p-3">
        <p className="text-sm truncate mb-2" style={{ color: t.text }}>{item.title}</p>
        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: t.surface3 }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ background: accent }}
            />
          </div>
          <span className="text-[10px]" style={{ color: t.textMuted }}>{progress}%</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
            {isGame ? (item as any).duration : (item as any).totalDuration || (item as any).duration}
          </span>
          <motion.div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: accent, color: '#000' }}
            whileHover={{ scale: 1.15 }}
          >
            <Play size={9} fill="currentColor" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Arcade Quick Card ────────────────────────────────────

function ArcadeQuickCard({ game }: { game: typeof games[0] }) {
  const { currentTheme: t } = useApp();
  const { setCurrentView, setSelectedGame } = useHub();
  const cat = arcadeCategories.find(c => c.id === game.category);
  const color = cat?.color ?? '#a855f7';

  return (
    <motion.div
      onClick={() => { setSelectedGame(game); setCurrentView('arcade'); }}
      className="flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer relative"
      style={{ width: 220, background: t.surface2, border: `1px solid ${t.border}` }}
      whileHover={{ scale: 1.03, borderColor: color + '60', boxShadow: `0 8px 32px ${color}20` }}
      whileTap={{ scale: 0.97 }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ height: 100, background: `linear-gradient(135deg, ${color}20, ${color}08)` }}
      >
        <span style={{ fontSize: 40 }}>{cat?.icon ?? '🎮'}</span>
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at center, ${color}10, transparent 70%)` }}
        />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color }}>{cat?.label}</span>
        </div>
        <p className="text-xs mb-1 truncate" style={{ color: t.text }}>{game.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: t.textMuted }}>{game.duration}</span>
          <div className="flex items-center gap-0.5">
            <Star size={9} style={{ color: '#f59e0b' }} fill="#f59e0b" />
            <span className="text-[10px]" style={{ color: t.textMuted }}>{game.rating}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Learn Quick Card ────────────────────────────────────

function LearnQuickCard({ item, type }: { item: any; type: 'test' | 'course' | 'how-to' }) {
  const { currentTheme: t } = useApp();
  const { setCurrentView, setLearnTab } = useHub();
  const color = '#06b6d4';

  const handleClick = () => {
    setCurrentView('learn');
    if (type === 'test') setLearnTab('tests');
    else if (type === 'course') setLearnTab('class');
    else setLearnTab('how-to');
  };

  return (
    <motion.div
      onClick={handleClick}
      className="flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer relative"
      style={{ width: 220, background: t.surface2, border: `1px solid ${t.border}` }}
      whileHover={{ scale: 1.03, borderColor: color + '60', boxShadow: `0 8px 32px ${color}20` }}
      whileTap={{ scale: 0.97 }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ height: 100, background: `linear-gradient(135deg, ${color}20, ${color}06)` }}
      >
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover absolute inset-0" />
        ) : (
          <span style={{ fontSize: 36 }}>
            {type === 'test' ? '🧪' : type === 'course' ? '📚' : '🔧'}
          </span>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 60%)' }} />
        <div
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wide"
          style={{ background: `${color}25`, border: `1px solid ${color}50`, color }}
        >
          {type.toUpperCase()}
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs mb-1 truncate" style={{ color: t.text }}>{item.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: t.textMuted }}>
            {item.duration || item.totalDuration || '—'}
          </span>
          {item.difficulty && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: t.surface3, color: t.textMuted }}
            >
              {item.difficulty}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Daily Challenge ──────────────────────────────────────

function DailyChallenge() {
  const { currentTheme: t } = useApp();
  const { setCurrentView, setSelectedGame } = useHub();
  const challenge = games[2]; // Riddle Race

  return (
    <div className="px-6 mb-8">
      <SectionHeader label="Daily Challenge" />
      <motion.div
        onClick={() => { setSelectedGame(challenge); setCurrentView('arcade'); }}
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{ background: t.surface2, border: '1px solid rgba(245,158,11,0.3)' }}
        whileHover={{ scale: 1.01, boxShadow: '0 12px 48px rgba(245,158,11,0.15)' }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 50%, rgba(245,158,11,0.08), transparent 70%)' }}
        />
        <div className="relative z-10 flex items-center gap-6 p-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <span style={{ fontSize: 32 }}>🧩</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: '#f59e0b' }}>Today's Challenge</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                +200 XP
              </span>
            </div>
            <h3 className="text-base mb-1" style={{ color: t.text }}>{challenge.title}</h3>
            <p className="text-xs" style={{ color: t.textMuted }}>{challenge.tagline}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
              <Clock size={11} /> {challenge.duration}
            </div>
            <motion.div
              className="px-4 py-2 rounded-xl text-xs flex items-center gap-2"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}
              whileHover={{ background: 'rgba(245,158,11,0.3)' }}
            >
              <Zap size={12} /> Accept
            </motion.div>
          </div>
        </div>
        {/* Countdown */}
        <div
          className="relative z-10 flex items-center justify-between px-6 py-2"
          style={{ borderTop: '1px solid rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.04)' }}
        >
          <span className="text-[10px]" style={{ color: t.textMuted }}>Resets in</span>
          <span className="text-xs font-mono" style={{ color: '#f59e0b' }}>11:42:07</span>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: t.textMuted }}>
            <Flame size={10} style={{ color: '#f59e0b' }} /> 2,341 players today
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Achievement Nudge ────────────────────────────────────

function AchievementNudge() {
  const { currentTheme: t } = useApp();
  const { setCurrentView } = useHub();
  const inProgress = achievements.filter(a => !a.earned && (a.progress ?? 0) > 0).slice(0, 3);

  return (
    <div className="px-6 mb-8">
      <SectionHeader label="Achievements" action="View all" onAction={() => setCurrentView('profile')} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {inProgress.map(a => {
          const pct = a.goal ? Math.round(((a.progress ?? 0) / a.goal) * 100) : 0;
          const rarityColor = a.rarity === 'legend' ? '#d4af37' : a.rarity === 'epic' ? '#a855f7' : a.rarity === 'rare' ? '#f59e0b' : '#64748b';
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: t.surface2, border: `1px solid ${t.border}` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: `${rarityColor}15`, border: `1px solid ${rarityColor}30` }}
              >
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate mb-1" style={{ color: t.text }}>{a.title}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: t.surface3 }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: rarityColor }} />
                  </div>
                  <span className="text-[10px]" style={{ color: t.textMuted }}>{a.progress}/{a.goal}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Category Browse ──────────────────────────────────────

function CategoryBrowse() {
  const { currentTheme: t } = useApp();
  const { setCurrentView, setArcadeCategory, setLearnTab } = useHub();

  const sections = [
    { label: 'Arcade', color: '#a855f7', categories: arcadeCategories.map(c => ({ id: c.id, label: c.label, icon: c.icon, color: c.color })) },
    { label: 'Learn', color: '#06b6d4', categories: [
      { id: 'tests', label: 'Tests', icon: '🧪', color: '#06b6d4' },
      { id: 'class', label: 'Classes', icon: '📚', color: '#10b981' },
      { id: 'how-to', label: 'How-To', icon: '🔧', color: '#f59e0b' },
    ]},
  ];

  return (
    <div className="px-6 mb-8">
      <SectionHeader label="Browse by Category" />
      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.label}>
            <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>{section.label}</p>
            <div className="flex flex-wrap gap-2">
              {section.categories.map((cat: any) => (
                <motion.button
                  key={cat.id}
                  onClick={() => {
                    if (section.label === 'Arcade') {
                      setArcadeCategory(cat.id);
                      setCurrentView('arcade');
                    } else {
                      setLearnTab(cat.id as any);
                      setCurrentView('learn');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{
                    background: `${cat.color}10`,
                    border: `1px solid ${cat.color}30`,
                    color: cat.color,
                  }}
                  whileHover={{ scale: 1.04, background: `${cat.color}20` }}
                  whileTap={{ scale: 0.96 }}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main HomeHub ─────────────────────────────────────────

export function HomeHub() {
  const { currentTheme: t } = useApp();
  const { setCurrentView } = useHub();
  const scrollRef = useRef<HTMLDivElement>(null);

  const xp = userStats.xp;
  const xpToNext = userStats.xpToNext;
  const xpPct = Math.round((xp / xpToNext) * 100);

  const inProgressItems = [
    ...games.filter(g => g.status === 'in-progress'),
    ...courses.filter(c => c.status === 'in-progress'),
    ...tests.filter(t => t.status === 'in-progress'),
    ...howTos.filter(h => h.status === 'in-progress'),
  ].slice(0, 5);

  const featuredGames = games.filter(g => g.featured).slice(0, 3);
  const featuredCourses = courses.filter(c => c.featured).slice(0, 3);
  const popularGames = [...games].sort((a, b) => b.plays - a.plays).slice(0, 6);

  return (
    <div className="h-full overflow-y-auto pb-20 md:pb-6">
      {/* ── Hero / greeting ──────────────────────────────── */}
      <div
        className="relative px-6 pt-8 pb-10 mb-8"
        style={{ background: `linear-gradient(180deg, ${t.surface1} 0%, transparent 100%)` }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(168,85,247,0.05), transparent)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: t.textMuted }}>
            Welcome back
          </p>
          <h1 className="text-3xl mb-6" style={{ color: t.text }}>
            Ready to{' '}
            <span style={{ background: 'linear-gradient(90deg, #a855f7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              play, learn, create?
            </span>
          </h1>

          {/* Stats bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* XP bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-shrink-0"
              style={{ background: t.surface2, border: `1px solid ${t.border}` }}
            >
              <ProgressRing pct={xpPct} color="#a855f7" size={44} />
              <div>
                <p className="text-xs" style={{ color: t.text }}>Level {userStats.level}</p>
                <p className="text-[10px]" style={{ color: t.textMuted }}>{xp.toLocaleString()} / {xpToNext.toLocaleString()} XP</p>
              </div>
            </div>

            <StatPill icon={Flame} value={userStats.streak} label="day streak" color="#f59e0b" />
            <StatPill icon={Gamepad2} value={userStats.gamesPlayed} label="games" color="#a855f7" />
            <StatPill icon={BookOpen} value={userStats.coursesCompleted} label="courses" color="#06b6d4" />
            <StatPill icon={Trophy} value={achievements.filter(a => a.earned).length} label="earned" color="#d4af37" />
          </div>
        </motion.div>
      </div>

      {/* ── Continue where you left off ─────────────────── */}
      {inProgressItems.length > 0 && (
        <div className="mb-8">
          <SectionHeader label="Continue Where You Left Off" action="See all" onAction={() => setCurrentView('library')} />
          <div className="overflow-x-auto px-6">
            <div className="flex gap-3" style={{ width: 'max-content', paddingBottom: 8 }}>
              {inProgressItems.map(item => (
                <ContinueCard key={item.id} item={item as any} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Daily Challenge ──────────────────────────────── */}
      <DailyChallenge />

      {/* ── Arcade Quick Start ──────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-6">
          <div className="flex items-center gap-2">
            <Gamepad2 size={16} style={{ color: '#a855f7' }} />
            <h2 className="text-sm uppercase tracking-[0.12em]" style={{ color: t.text }}>Arcade</h2>
          </div>
          <button
            onClick={() => setCurrentView('arcade')}
            className="flex items-center gap-1 text-xs transition-all"
            style={{ color: '#a855f7' }}
          >
            Explore <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto px-6">
          <div className="flex gap-3" style={{ width: 'max-content', paddingBottom: 8 }}>
            {featuredGames.map(g => <ArcadeQuickCard key={g.id} game={g} />)}
          </div>
        </div>
      </div>

      {/* ── Learn Quick Start ────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-6">
          <div className="flex items-center gap-2">
            <BookOpen size={16} style={{ color: '#06b6d4' }} />
            <h2 className="text-sm uppercase tracking-[0.12em]" style={{ color: t.text }}>Learn</h2>
          </div>
          <button
            onClick={() => setCurrentView('learn')}
            className="flex items-center gap-1 text-xs"
            style={{ color: '#06b6d4' }}
          >
            Explore <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto px-6">
          <div className="flex gap-3" style={{ width: 'max-content', paddingBottom: 8 }}>
            {featuredCourses.map(c => <LearnQuickCard key={c.id} item={c} type="course" />)}
          </div>
        </div>
      </div>

      {/* ── Popular Right Now ────────────────────────────── */}
      <div className="px-6 mb-8">
        <SectionHeader label="Popular Right Now" action="All games" onAction={() => setCurrentView('arcade')} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {popularGames.slice(0, 6).map((game, idx) => {
            const cat = arcadeCategories.find(c => c.id === game.category);
            return (
              <motion.div
                key={game.id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                style={{ background: t.surface2, border: `1px solid ${t.border}` }}
                whileHover={{ borderColor: (cat?.color ?? '#a855f7') + '50', scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${cat?.color ?? '#a855f7'}15` }}
                >
                  <span style={{ fontSize: 18 }}>{cat?.icon ?? '🎮'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate" style={{ color: t.text }}>{game.title}</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={9} style={{ color: '#10b981' }} />
                    <span className="text-[10px]" style={{ color: t.textMuted }}>
                      {(game.plays / 1000).toFixed(1)}k plays
                    </span>
                  </div>
                </div>
                <span
                  className="text-[10px] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: t.surface3, color: t.textMuted }}
                >
                  {idx + 1}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Achievements ────────────────────────────────── */}
      <AchievementNudge />

      {/* ── Browse by Category ──────────────────────────── */}
      <CategoryBrowse />

      {/* ── Create CTA ──────────────────────────────────── */}
      <div className="px-6 mb-8">
        <motion.div
          onClick={() => setCurrentView('create')}
          className="relative rounded-2xl overflow-hidden cursor-pointer p-6"
          style={{ background: t.surface2, border: '1px solid rgba(245,158,11,0.25)' }}
          whileHover={{ scale: 1.01, boxShadow: '0 12px 48px rgba(245,158,11,0.1)' }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 90% 50%, rgba(245,158,11,0.06), transparent 70%)' }} />
          <div className="relative z-10 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <PlusSquare size={22} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-sm mb-0.5" style={{ color: t.text }}>Create something new</p>
              <p className="text-xs" style={{ color: t.textMuted }}>Games, tests, classes, how-tos — powered by your agent</p>
            </div>
            <ChevronRight size={18} style={{ color: t.textMuted, marginLeft: 'auto' }} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}