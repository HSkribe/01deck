import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Wifi, WifiOff, RefreshCw, Palette, Gamepad2,
  MessageSquare, Instagram, Twitter, Youtube, Mail,
  Facebook, Send, Radio, Plus, Music,
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

export function TopBar() {
  const {
    currentTheme,
    isOnline, setIsOnline,
    searchQuery, setSearchQuery,
    setIsThemeOpen, setIsArcadeOpen,
    isChatOpen, setIsChatOpen,
    setShowCreator,
    maestroEnabled, setMaestroEnabled,
    setMaestroOpen,
  } = useApp();

  const [showSocials, setShowSocials] = useState(false);

  const t = currentTheme;
  const maestroAccent = '#ff4da6'; // Pink/magenta accent for maestro

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-14"
      style={{
        background: t.surface1,
        borderBottom: `1px solid ${t.border}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <img
          src={logoImg}
          alt="01AI.ai"
          className="h-7 object-contain"
          style={{ filter: t.isDark ? 'invert(0)' : 'invert(1)' }}
        />
        <div
          className="h-4 w-px"
          style={{ background: t.border }}
        />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: t.textMuted }}>
          Agent Viewer
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-6">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: t.surface2,
            border: `1px solid ${t.border}`,
          }}
        >
          <Search size={14} style={{ color: t.textMuted }} />
          <input
            type="text"
            placeholder="Search agents, roles, capabilities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: t.text }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs px-1 rounded"
              style={{ color: t.textMuted }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Center spacer */}
      <div className="flex-1" />

      {/* Create Agent Button */}
      <motion.button
        onClick={() => setShowCreator(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mr-2"
        style={{
          background: `${t.accent}15`,
          border: `1px solid ${t.accent}40`,
          color: t.accent,
        }}
        whileHover={{ scale: 1.04, background: `${t.accent}25` }}
        whileTap={{ scale: 0.97 }}
      >
        <Plus size={13} />
        <span>Create</span>
      </motion.button>

      {/* Social Links */}
      <div className="relative mr-2">
        <motion.button
          onClick={() => setShowSocials(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: showSocials ? t.surface3 : 'transparent',
            border: `1px solid ${showSocials ? t.accent : t.border}`,
            color: t.textMuted,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>Connect</span>
        </motion.button>

        <AnimatePresence>
          {showSocials && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 p-3 rounded-xl z-50"
              style={{
                background: t.surface2,
                border: `1px solid ${t.border}`,
                boxShadow: `0 16px 48px rgba(0,0,0,0.4)`,
              }}
            >
              <div className="text-xs mb-2 px-1" style={{ color: t.textMuted }}>
                Follow & Connect
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {socialLinks.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    title={s.label}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all"
                    style={{ color: t.textMuted }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = s.color;
                      (e.currentTarget as HTMLElement).style.background = `${s.color}15`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = t.textMuted;
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <s.icon size={16} />
                    <span className="text-[10px]">{s.label.split(' ')[0]}</span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Online/Offline Toggle */}
      <motion.button
        onClick={() => setIsOnline(!isOnline)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mr-2"
        style={{
          background: isOnline ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: isOnline ? '#22c55e' : '#ef4444',
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
        {!isOnline && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            <RefreshCw size={11} />
          </motion.span>
        )}
      </motion.button>

      {/* Sync indicator */}
      {isOnline && (
        <div className="flex items-center gap-1.5 mr-3 px-2 py-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#22c55e' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span className="text-xs" style={{ color: t.textMuted }}>Synced</span>
        </div>
      )}

      {/* Chat button */}
      <motion.button
        onClick={() => setIsChatOpen(c => !c)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mr-2"
        style={{
          background: isChatOpen ? `${t.accent}15` : 'transparent',
          border: `1px solid ${isChatOpen ? t.accent : t.border}`,
          color: isChatOpen ? t.accent : t.textMuted,
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <MessageSquare size={13} />
        <span>Chat</span>
      </motion.button>

      {/* Arcade */}
      <motion.button
        onClick={() => setIsArcadeOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mr-2"
        style={{
          background: 'transparent',
          border: `1px solid ${t.border}`,
          color: t.textMuted,
        }}
        whileHover={{
          scale: 1.03,
          color: '#a855f7',
          borderColor: 'rgba(168,85,247,0.5)',
        }}
        whileTap={{ scale: 0.97 }}
      >
        <Gamepad2 size={13} />
        <span>Arcade</span>
      </motion.button>

      {/* Maestro Extension Toggle */}
      <motion.button
        onClick={() => {
          const newState = !maestroEnabled;
          setMaestroEnabled(newState);
          if (newState) {
            setMaestroOpen(true);
          }
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mr-2"
        style={{
          background: maestroEnabled ? `${maestroAccent}15` : 'transparent',
          border: `1px solid ${maestroEnabled ? maestroAccent : t.border}`,
          color: maestroEnabled ? maestroAccent : t.textMuted,
        }}
        whileHover={{
          scale: 1.03,
          color: maestroAccent,
          borderColor: maestroAccent,
        }}
        whileTap={{ scale: 0.97 }}
      >
        <Music size={13} />
        <span>01maestro</span>
        {maestroEnabled && (
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: maestroAccent }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.button>

      {/* Theme picker */}
      <motion.button
        onClick={() => setIsThemeOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
        style={{
          background: 'transparent',
          border: `1px solid ${t.border}`,
          color: t.textMuted,
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Palette size={13} />
        <span>Skin</span>
      </motion.button>
    </div>
  );
}