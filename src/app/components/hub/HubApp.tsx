import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ChevronLeft, Zap, Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HubProvider, useHub } from '../../context/HubContext';
import { HubNav, SECTION_ACCENT } from './HubNav';
import { HomeHub } from './screens/HomeHub';
import { ArcadeHub } from './screens/ArcadeHub';
import { LearnHub } from './screens/LearnHub';
import { CreateHub } from './screens/CreateHub';
import { LibraryHub } from './screens/LibraryHub';
import { ProfileHub } from './screens/ProfileHub';
import { ForumHub } from './screens/ForumHub';
import { ChatHub } from './screens/ChatHub';
import { MessagesHub } from './screens/MessagesHub';

// ─── Hub Top Bar ──────────────────────────────────────────

function HubTopBar({ onClose }: { onClose: () => void }) {
  const { currentTheme: t } = useApp();
  const { currentView, hubSearch, setHubSearch } = useHub();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const accent = SECTION_ACCENT[currentView];

  const viewLabels: Record<string, string> = {
    home: 'Hub', arcade: 'Arcade', learn: 'Learn', create: 'Create', library: 'Library', profile: 'Profile',
    forum: 'Forum', chat: 'Chat', messages: 'Messages',
  };

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  return (
    <div
      className="flex items-center px-4 h-14 flex-shrink-0 relative z-30"
      style={{
        background: t.surface1,
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      {/* Back button */}
      <motion.button
        onClick={onClose}
        className="flex items-center gap-1.5 mr-4 text-xs flex-shrink-0"
        style={{ color: t.textMuted }}
        whileHover={{ color: t.text, x: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">01deck</span>
      </motion.button>

      {/* Brand + section */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <motion.div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}
          animate={{ boxShadow: `0 0 8px ${accent}30` }}
          transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
        >
          <Zap size={11} style={{ color: accent }} />
        </motion.div>
        <div className="h-3.5 w-px" style={{ background: t.border }} />
        <AnimatePresence mode="wait">
          <motion.span
            key={currentView}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-xs uppercase tracking-[0.15em]"
            style={{ color: accent }}
          >
            {viewLabels[currentView]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Center spacer */}
      <div className="flex-1" />

      {/* Search */}
      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg mr-2 overflow-hidden"
            style={{ background: t.surface2, border: `1px solid ${t.border}` }}
          >
            <Search size={12} style={{ color: t.textMuted }} />
            <input
              ref={searchRef}
              value={hubSearch}
              onChange={e => setHubSearch(e.target.value)}
              placeholder="Search games, courses, guides..."
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: t.text }}
            />
            {hubSearch && (
              <button onClick={() => setHubSearch('')} style={{ color: t.textMuted }}>
                <X size={11} />
              </button>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        onClick={() => setSearchOpen(s => !s)}
        className="w-8 h-8 rounded-lg flex items-center justify-center mr-2"
        style={{ background: searchOpen ? `${accent}15` : 'transparent', color: searchOpen ? accent : t.textMuted, border: `1px solid ${searchOpen ? accent + '40' : 'transparent'}` }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
      >
        <Search size={14} />
      </motion.button>

      {/* Notification */}
      <motion.button
        className="w-8 h-8 rounded-lg flex items-center justify-center relative"
        style={{ color: t.textMuted }}
        whileHover={{ scale: 1.08, color: t.text }}
        whileTap={{ scale: 0.94 }}
      >
        <Bell size={14} />
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
      </motion.button>
    </div>
  );
}

// ─── View Router ──────────────────────────────────────────

function HubContent() {
  const { currentView } = useHub();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex-1 overflow-hidden relative"
      >
        {currentView === 'home' && <HomeHub />}
        {currentView === 'arcade' && <ArcadeHub />}
        {currentView === 'learn' && <LearnHub />}
        {currentView === 'create' && <CreateHub />}
        {currentView === 'library' && <LibraryHub />}
        {currentView === 'profile' && <ProfileHub />}
        {currentView === 'forum' && <ForumHub />}
        {currentView === 'chat' && <ChatHub />}
        {currentView === 'messages' && <MessagesHub />}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Inner layout (needs context) ────────────────────────

function HubLayout({ onClose, initialView }: { onClose: () => void; initialView?: string }) {
  const { currentTheme: t } = useApp();
  const { setCurrentView } = useHub();

  React.useEffect(() => {
    if (initialView === 'learn') setCurrentView('learn');
    else if (initialView === 'library') setCurrentView('library');
    else if (initialView === 'arcade') setCurrentView('arcade');
  }, [initialView]);

  return (
    <div className="flex flex-col h-full" style={{ background: t.bg }}>
      <HubTopBar onClose={onClose} />
      <div className="flex flex-1 overflow-hidden">
        <HubNav onClose={onClose} isExpanded={false} />
        <HubContent />
      </div>
    </div>
  );
}

// ─── Main HubApp (exported) ───────────────────────────────

interface HubAppProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'home' | 'arcade' | 'learn' | 'library' | 'create' | 'profile';
}

export function HubApp({ isOpen, onClose, initialView }: HubAppProps) {
  const { currentTheme: t } = useApp();

  return (
    <AnimatePresence>
      {isOpen && (
        <HubProvider>
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-[150]"
            style={{ background: t.bg }}
          >
            <HubLayout onClose={onClose} initialView={initialView} />
          </motion.div>
        </HubProvider>
      )}
    </AnimatePresence>
  );
}