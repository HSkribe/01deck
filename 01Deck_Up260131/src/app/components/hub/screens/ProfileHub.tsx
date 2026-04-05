import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Flame, Zap, Star, TrendingUp, Clock, Award, Shield, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { achievements, userStats } from '../../../data/hubData';

const PROFILE_COLOR = '#94a3b8';

function ProgressRing({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (circ * pct) / 100 }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
        strokeDasharray={circ}
      />
    </svg>
  );
}

export function ProfileHub() {
  const { currentTheme: t } = useApp();

  const xpPct = Math.round((userStats.xp / userStats.xpToNext) * 100);
  const earnedAch = achievements.filter(a => a.earned);
  const lockedAch = achievements.filter(a => !a.earned);

  const rarityColor: Record<string, string> = {
    common: '#64748b', rare: '#f59e0b', epic: '#a855f7', legend: '#d4af37',
  };

  return (
    <div className="h-full overflow-y-auto pb-20 md:pb-6">
      {/* Hero header */}
      <div
        className="relative px-6 pt-8 pb-10 mb-6"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(148,163,184,0.06), transparent)' }}
        />
        <div className="relative z-10">
          {/* Avatar */}
          <div className="flex items-start gap-6 mb-6">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(6,182,212,0.2))',
                  border: '2px solid rgba(168,85,247,0.4)',
                }}
              >
                🤖
              </div>
              {/* Level ring */}
              <div className="absolute -inset-1.5">
                <ProgressRing pct={xpPct} color="#a855f7" size={96} />
              </div>
              {/* Level badge */}
              <div
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{ background: '#a855f7', color: '#000', border: `2px solid ${t.bg}` }}
              >
                {userStats.level}
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-xl mb-1" style={{ color: t.text }}>Protocol Agent</h1>
              <p className="text-xs mb-3" style={{ color: t.textMuted }}>{userStats.rank}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Flame, value: `${userStats.streak}d`, label: 'streak', color: '#f59e0b' },
                  { icon: Zap, value: `${userStats.xp.toLocaleString()}`, label: 'XP', color: '#a855f7' },
                  { icon: Trophy, value: earnedAch.length, label: 'badges', color: '#d4af37' },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                    style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}25` }}
                  >
                    <stat.icon size={12} style={{ color: stat.color }} />
                    <span className="text-sm" style={{ color: t.text }}>{stat.value}</span>
                    <span className="text-[10px]" style={{ color: t.textMuted }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* XP progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2 text-xs">
              <span style={{ color: t.textMuted }}>Level {userStats.level}</span>
              <span style={{ color: '#a855f7' }}>{userStats.xp.toLocaleString()} / {userStats.xpToNext.toLocaleString()} XP</span>
              <span style={{ color: t.textMuted }}>Level {userStats.level + 1}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                style={{ background: 'linear-gradient(90deg, #a855f7, #06b6d4)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-6 mb-8">
        <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>All-Time Stats</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '🎮', label: 'Games Played', value: userStats.gamesPlayed, color: '#a855f7' },
            { icon: '📚', label: 'Courses Done', value: userStats.coursesCompleted, color: '#10b981' },
            { icon: '🧪', label: 'Tests Taken', value: userStats.testsCompleted, color: '#06b6d4' },
            { icon: '⏱', label: 'Time Played', value: userStats.totalPlayTime, color: '#f59e0b' },
          ].map(stat => (
            <div
              key={stat.label}
              className="p-4 rounded-2xl text-center"
              style={{ background: t.surface2, border: `1px solid ${t.border}` }}
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-lg mb-0.5" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[10px]" style={{ color: t.textMuted }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements earned */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>Achievements Earned</p>
          <span className="text-[10px]" style={{ color: t.textMuted }}>{earnedAch.length} / {achievements.length}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {earnedAch.map(a => (
            <motion.div
              key={a.id}
              className="p-4 rounded-2xl text-center"
              style={{ background: `${rarityColor[a.rarity]}10`, border: `1px solid ${rarityColor[a.rarity]}30` }}
              whileHover={{ scale: 1.03 }}
            >
              <div className="text-3xl mb-2">{a.icon}</div>
              <p className="text-xs mb-0.5" style={{ color: t.text }}>{a.title}</p>
              <p className="text-[10px] mb-2" style={{ color: t.textMuted }}>{a.description}</p>
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 size={10} style={{ color: '#10b981' }} />
                <span className="text-[9px]" style={{ color: '#10b981' }}>{a.earnedDate}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Locked achievements */}
      <div className="px-6 mb-8">
        <p className="text-[10px] uppercase tracking-wider mb-4" style={{ color: t.textMuted }}>In Progress</p>
        <div className="space-y-3">
          {lockedAch.map(a => {
            const pct = a.goal ? Math.round(((a.progress ?? 0) / a.goal) * 100) : 0;
            const rc = rarityColor[a.rarity] ?? '#64748b';
            return (
              <div
                key={a.id}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: t.surface2, border: `1px solid ${t.border}`, opacity: 0.8 }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${rc}10`, border: `1px solid ${rc}20`, filter: 'grayscale(0.4)' }}
                >
                  {a.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs" style={{ color: t.text }}>{a.title}</p>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                      style={{ background: `${rc}15`, color: rc }}
                    >
                      {a.rarity}
                    </span>
                  </div>
                  <p className="text-[10px] mb-2" style={{ color: t.textMuted }}>{a.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: rc }} />
                    </div>
                    <span className="text-[9px]" style={{ color: t.textMuted }}>{a.progress}/{a.goal}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Creator identity */}
      <div className="px-6 mb-8">
        <p className="text-[10px] uppercase tracking-wider mb-4" style={{ color: t.textMuted }}>Creator Identity</p>
        <div
          className="p-5 rounded-2xl"
          style={{ background: t.surface2, border: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Star size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: t.text }}>Your creator profile</p>
              <p className="text-xs" style={{ color: t.textMuted }}>Publish your first piece to unlock</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]" style={{ color: t.textMuted }}>
            {[['0', 'Published'], ['0', 'Total Plays'], ['—', 'Avg Rating']].map(([v, l]) => (
              <div key={l} className="py-2 rounded-lg" style={{ background: t.surface3 }}>
                <div className="text-sm mb-0.5" style={{ color: t.text }}>{v}</div>
                {l}
              </div>
            ))}
          </div>
          <motion.button
            className="w-full mt-4 py-3 rounded-xl text-xs"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
            whileHover={{ scale: 1.01, background: 'rgba(245,158,11,0.18)' }}
          >
            Start Creating →
          </motion.button>
        </div>
      </div>
    </div>
  );
}
