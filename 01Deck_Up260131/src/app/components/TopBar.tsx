import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wifi, WifiOff, RefreshCw, Palette, Gamepad2,
  Instagram, Twitter, Youtube, Mail, BookOpen,
  Facebook, Send, Radio, Plus, Music, Users,
  Library, Dna, User, Camera,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import logoImg from 'figma:asset/6e76ff0f78bfb8a16abd5cd9a03efe103b83cc74.png';

const socialLinks = [
  { icon: Instagram, label: 'Instagram', href: '#', color: '#E1306C' },
  { icon: Twitter, label: 'X / Twitter', href: '#', color: '#1DA1F2' },
  { icon: Facebook, label: 'Facebook', href: '#', color: '#4267B2' },
  { icon: Send, label: 'Telegram', href: '#', color: '#0088cc' },
  { icon: Youtube, label: 'TikTok', href: '#', color: '#ff0050' },
  { icon: Radio, label: 'Discord', href: '#', color: '#7289DA' },
  { icon: Mail, label: 'Email', href: '#', color: '#94a3b8' },
];

// ─── Profile Avatar ────────────────────────────────────────
function ProfileAvatarButton() {
  const { currentTheme: t, userAvatarUrl, setUserAvatarUrl } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setUserAvatarUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    setShowMenu(false);
  };

  return (
    <div className="relative flex-shrink-0">
      <motion.button
        onClick={() => setShowMenu(s => !s)}
        className="relative w-8 h-8 rounded-full overflow-hidden"
        style={{
          border: '1.5px solid rgba(168,85,247,0.45)',
          boxShadow: '0 0 8px rgba(168,85,247,0.18)',
          background: userAvatarUrl ? 'transparent' : 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(6,182,212,0.2))',
        }}
        whileHover={{ scale: 1.08, boxShadow: '0 0 16px rgba(168,85,247,0.35)' }}
        whileTap={{ scale: 0.94 }}
      >
        {userAvatarUrl ? (
          <img src={userAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User size={13} style={{ color: '#a855f7' }} />
          </div>
        )}
        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full" style={{ background: '#22c55e', border: `1.5px solid ${t.surface1}` }} />
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 p-1.5 rounded-xl min-w-[140px]"
            style={{ background: t.surface2, border: `1px solid ${t.border}`, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', zIndex: 9999 }}
          >
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-all"
              style={{ color: t.textMuted }}
              onMouseEnter={e => (e.currentTarget.style.background = t.surface3)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Camera size={11} /> Upload Photo
            </button>
            {userAvatarUrl && (
              <button
                onClick={() => { setUserAvatarUrl(null); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs"
                style={{ color: '#ef4444' }}
                onMouseEnter={e => (e.currentTarget.style.background = t.surface3)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Remove
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

// ─── Compact nav button (all center shortcuts same style) ──
function NavBtn({
  icon: Icon, label, onClick, accent, active,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  accent?: string;
  active?: boolean;
}) {
  const { currentTheme: t } = useApp();
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap"
      style={{
        background: 'transparent',
        border: `1px solid ${active ? (accent ?? t.accent) : t.border}`,
        color: active ? (accent ?? t.accent) : t.textMuted,
      }}
      whileHover={{
        scale: 1.04,
        color: accent ?? t.accent,
        borderColor: accent ? `${accent}70` : `${t.accent}70`,
        background: accent ? `${accent}10` : `${t.accent}10`,
      }}
      whileTap={{ scale: 0.97 }}
    >
      <Icon size={12} />
      <span>{label}</span>
    </motion.button>
  );
}

// ─── Main TopBar ───────────────────────────────────────────
export function TopBar() {
  const {
    currentTheme: t,
    isOnline, setIsOnline,
    setIsThemeOpen, setIsArcadeOpen,
    setShowCreator,
    maestroEnabled, setMaestroEnabled,
    setMaestroOpen,
    setShowHub,
    setHubInitialView,
    setShowEvolutionLab,
    pageContext,
  } = useApp();

  const [showSocials, setShowSocials] = useState(false);
  const maestroAccent = '#ff4da6';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center px-3 h-14 gap-1.5"
      style={{
        background: t.surface1,
        borderBottom: `1px solid ${t.border}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* ── LEFT: Logo + dynamic page context ─────────── */}
      <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: 0 }}>
        <img
          src={logoImg}
          alt="01AI"
          className="h-6 object-contain flex-shrink-0"
          style={{ filter: t.isDark ? 'invert(0)' : 'invert(1)' }}
        />
        <div className="h-3.5 w-px flex-shrink-0" style={{ background: t.border }} />
        <AnimatePresence mode="wait">
          <motion.div
            key={pageContext.title}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col"
            style={{ minWidth: 0 }}
          >
            <span className="text-[9px] tracking-[0.18em] uppercase leading-none whitespace-nowrap" style={{ color: t.text }}>
              {pageContext.title}
            </span>
            <span className="text-[7px] tracking-wider mt-0.5 uppercase whitespace-nowrap" style={{ color: t.textMuted }}>
              {pageContext.subtitle}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── CENTER: Nav shortcuts (flex, wraps naturally) ─── */}
      <div className="flex items-center gap-1 flex-1 justify-center min-w-0 overflow-hidden">
        <NavBtn icon={Gamepad2} label="Arcade" onClick={() => setIsArcadeOpen(true)} accent="#a855f7" />
        <NavBtn icon={BookOpen} label="Learn" onClick={() => { setHubInitialView('learn'); setShowHub(true); }} accent="#06b6d4" />
        <NavBtn icon={Library} label="Library" onClick={() => { setHubInitialView('library'); setShowHub(true); }} accent="#10b981" />
        <NavBtn icon={Users} label="Hub" onClick={() => { setHubInitialView(null); setShowHub(true); }} accent="#a855f7" />

        {/* Evo Lab — slightly special (has prism shimmer) */}
        <motion.button
          onClick={() => setShowEvolutionLab(true)}
          className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs overflow-hidden whitespace-nowrap"
          style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted }}
          whileHover={{ scale: 1.04, color: '#10b981', borderColor: 'rgba(16,185,129,0.6)', background: 'rgba(16,185,129,0.08)' }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.12), rgba(6,182,212,0.12), transparent)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          />
          <Dna size={12} />
          <span>Evo Lab</span>
        </motion.button>
      </div>

      {/* ── RIGHT: Utilities (icon-first, compressed) ─────── */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Create */}
        <motion.button
          onClick={() => setShowCreator(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap"
          style={{ background: `${t.accent}15`, border: `1px solid ${t.accent}35`, color: t.accent }}
          whileHover={{ scale: 1.04, background: `${t.accent}22` }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={12} />
          <span className="hidden lg:inline">Create</span>
        </motion.button>

        {/* Social dropdown */}
        <div className="relative">
          <motion.button
            onClick={() => setShowSocials(s => !s)}
            className="px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap"
            style={{ background: 'transparent', border: `1px solid ${showSocials ? t.accent : t.border}`, color: t.textMuted }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Connect
          </motion.button>
          <AnimatePresence>
            {showSocials && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.13 }}
                className="absolute top-full right-0 mt-1.5 p-2.5 rounded-xl"
                style={{ background: t.surface2, border: `1px solid ${t.border}`, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', zIndex: 9999 }}
              >
                <div className="text-[9px] mb-2 px-1 uppercase tracking-wider" style={{ color: t.textMuted }}>Follow & Connect</div>
                <div className="grid grid-cols-4 gap-1">
                  {socialLinks.map(s => (
                    <a key={s.label} href={s.href} title={s.label}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all"
                      style={{ color: t.textMuted }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = s.color; (e.currentTarget as HTMLElement).style.background = `${s.color}15`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <s.icon size={14} />
                      <span className="text-[9px]">{s.label.split(' ')[0]}</span>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Online/offline — icon only with color */}
        <motion.button
          onClick={() => setIsOnline(!isOnline)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
          style={{ background: isOnline ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: isOnline ? '#22c55e' : '#ef4444' }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
        >
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {!isOnline && <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}><RefreshCw size={10} /></motion.span>}
        </motion.button>

        {/* Sync dot */}
        {isOnline && (
          <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
        )}

        {/* Maestro — icon only */}
        <motion.button
          onClick={() => { const n = !maestroEnabled; setMaestroEnabled(n); if (n) setMaestroOpen(true); }}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
          style={{ background: maestroEnabled ? `${maestroAccent}15` : 'transparent', border: `1px solid ${maestroEnabled ? maestroAccent : t.border}`, color: maestroEnabled ? maestroAccent : t.textMuted }}
          whileHover={{ scale: 1.04, color: maestroAccent, borderColor: maestroAccent }} whileTap={{ scale: 0.97 }}
        >
          <Music size={12} />
          {maestroEnabled && <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: maestroAccent }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />}
        </motion.button>

        {/* Theme — icon only */}
        <motion.button
          onClick={() => setIsThemeOpen(true)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg"
          style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted }}
          whileHover={{ scale: 1.04, color: t.accent }} whileTap={{ scale: 0.97 }}
        >
          <Palette size={12} />
        </motion.button>

        {/* Profile avatar — rightmost */}
        <ProfileAvatarButton />
      </div>
    </div>
  );
}