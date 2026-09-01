import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home, Gamepad2, BookOpen, PlusSquare, Library, User,
  ChevronLeft, Search, Zap, MessageSquare, Hash, Mail,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useHub, HubView } from '../../context/HubContext';

const NAV_ITEMS: {
  id: HubView;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
  glow: string;
}[] = [
  { id: 'home',     label: 'Home',     icon: Home,          color: '#ffffff',  glow: 'rgba(255,255,255,0.2)' },
  { id: 'arcade',   label: 'Arcade',   icon: Gamepad2,      color: '#a855f7',  glow: 'rgba(168,85,247,0.3)'  },
  { id: 'learn',    label: 'Learn',    icon: BookOpen,      color: '#06b6d4',  glow: 'rgba(6,182,212,0.3)'   },
  { id: 'create',   label: 'Create',   icon: PlusSquare,    color: '#f59e0b',  glow: 'rgba(245,158,11,0.3)'  },
  { id: 'library',  label: 'Library',  icon: Library,       color: '#10b981',  glow: 'rgba(16,185,129,0.3)'  },
  { id: 'forum',    label: 'Forum',    icon: MessageSquare, color: '#c084fc',  glow: 'rgba(192,132,252,0.3)' },
  { id: 'chat',     label: 'Chat',     icon: Hash,          color: '#22d3ee',  glow: 'rgba(34,211,238,0.3)'  },
  { id: 'messages', label: 'Messages', icon: Mail,          color: '#34d399',  glow: 'rgba(52,211,153,0.3)'  },
  { id: 'profile',  label: 'Profile',  icon: User,          color: '#94a3b8',  glow: 'rgba(148,163,184,0.2)' },
];

const SECTION_ACCENT: Record<HubView, string> = {
  home:     '#ffffff',
  arcade:   '#a855f7',
  learn:    '#06b6d4',
  create:   '#f59e0b',
  library:  '#10b981',
  forum:    '#c084fc',
  chat:     '#22d3ee',
  messages: '#34d399',
  profile:  '#94a3b8',
};

interface HubNavProps {
  onClose: () => void;
  isExpanded: boolean;
}

export function HubNav({ onClose, isExpanded }: HubNavProps) {
  const { currentTheme: t } = useApp();
  const { currentView, setCurrentView, hubSearch, setHubSearch } = useHub();
  const accent = SECTION_ACCENT[currentView];

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <div
        className="hidden md:flex flex-col h-full"
        style={{
          width: 72,
          background: t.surface1,
          borderRight: `1px solid ${t.border}`,
          flexShrink: 0,
        }}
      >
        {/* Brand mark */}
        <div
          className="flex items-center justify-center"
          style={{ height: 56, borderBottom: `1px solid ${t.border}` }}
        >
          <motion.div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accent}15`, border: `1px solid ${accent}40` }}
            animate={{ boxShadow: `0 0 12px ${accent}30` }}
            transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
          >
            <Zap size={14} style={{ color: accent }} />
          </motion.div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col items-center py-4 gap-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className="relative w-11 h-11 rounded-xl flex items-center justify-center group"
                style={{
                  background: isActive ? `${item.color}15` : 'transparent',
                  border: `1px solid ${isActive ? `${item.color}40` : 'transparent'}`,
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                title={item.label}
              >
                <Icon size={18} style={{ color: isActive ? item.color : t.textMuted }} />
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                    style={{ background: item.color }}
                    layoutId="navIndicator"
                  />
                )}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ boxShadow: `0 0 16px ${item.glow}` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
                {/* Tooltip */}
                <div
                  className="absolute left-full ml-2 px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity"
                  style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.text }}
                >
                  {item.label}
                </div>
              </motion.button>
            );
          })}
        </nav>

        {/* Back to 01deck */}
        <div style={{ borderTop: `1px solid ${t.border}`, padding: '12px 0' }} className="flex justify-center">
          <motion.button
            onClick={onClose}
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ color: t.textMuted }}
            whileHover={{ scale: 1.08, color: t.text }}
            whileTap={{ scale: 0.94 }}
            title="Back to 01deck"
          >
            <ChevronLeft size={18} />
          </motion.button>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          height: 60,
          background: t.surface1,
          borderTop: `1px solid ${t.border}`,
        }}
      >
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className="flex flex-col items-center gap-0.5 flex-1"
              whileTap={{ scale: 0.92 }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: isActive ? `${item.color}20` : 'transparent' }}
              >
                <Icon size={16} style={{ color: isActive ? item.color : t.textMuted }} />
              </div>
              <span
                className="text-[9px] tracking-wide"
                style={{ color: isActive ? item.color : t.textMuted }}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

export { SECTION_ACCENT };
