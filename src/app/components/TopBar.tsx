import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Camera,
  Dna,
  FileText,
  Gamepad2,
  Globe,
  Library,
  Mail,
  MessageSquare,
  Music,
  FolderOpen,
  Package2,
  Palette,
  Plus,
  Search,
  ShieldCheck,
  UserCircle2,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useApp, type WorkspaceSectionId } from '../context/AppContext';
import logoImg from '../assets/logo-wordmark.svg';
import { appPluginCatalog } from '../plugins/registry';
import { evolutionExperiencePluginManifest } from '../plugins/01evolve/manifest';
import { IS_DECK_PRODUCT, SERIOUS_PRODUCT_MODE } from '../utils/productMode';

const socialLinks = [
  { icon: Globe, label: '01AI Website', href: 'https://01ai.ai', color: '#6384ff' },
  { icon: FileText, label: '01AI Updates', href: 'https://01ai.ai', color: '#22c55e' },
  { icon: Mail, label: 'Email', href: 'mailto:info@01ai.ai', color: '#94a3b8' },
];

const navItems: Array<{ id: WorkspaceSectionId; label: string; icon: typeof Search }> = SERIOUS_PRODUCT_MODE
  ? [{ id: 'foundry', label: '01FOUNDRY', icon: ShieldCheck }]
  : [
      { id: 'deck', label: 'Deck', icon: Search },
      { id: 'arcade', label: 'Arcade', icon: Gamepad2 },
      { id: 'learn', label: 'Learn', icon: BookOpen },
      { id: 'create', label: 'Create', icon: Plus },
      { id: 'library', label: 'Library', icon: Library },
      { id: 'profile', label: 'Profile', icon: UserCircle2 },
    ];

const sectionBlurb: Record<WorkspaceSectionId, string> = {
  foundry: 'Tier-1 SaaS support optimization, evaluation, lineage, and benchmark reporting.',
  deck: 'Search agents, roles, and capabilities.',
  arcade: 'Browse playable sessions, prototypes, and the new game shelf.',
  learn: 'Explore tests, classes, and how-to content with agent support.',
  create: 'Design games, tests, classes, and how-to guides from templates.',
  library: 'Saved content, in-progress sessions, and published work will collect here.',
  profile: 'Identity, streaks, creator stats, and attached agents will live here.',
};

const pageContextBySection: Record<WorkspaceSectionId, { title: string; subtitle: string }> = {
  foundry: { title: '01FOUNDRY', subtitle: 'Customer-support agent optimization' },
  deck: { title: '01DECK', subtitle: 'Agent workspace active' },
  arcade: { title: 'ARCADE', subtitle: 'Playable sessions and prototypes' },
  learn: { title: 'LEARN', subtitle: 'Classes, tests, and guided practice' },
  create: { title: 'CREATE', subtitle: 'Publishing and creator tools' },
  library: { title: 'LIBRARY', subtitle: 'Saved, in progress, and published' },
  profile: { title: 'PROFILE', subtitle: 'Identity, stats, and attached agents' },
};

function ProfileAvatarButton() {
  const { currentTheme: t, userAvatarUrl, setUserAvatarUrl } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = loadEvent => {
      setUserAvatarUrl((loadEvent.target?.result as string) ?? null);
      setShowMenu(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowMenu(open => !open)}
        className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
        style={{
          border: `1px solid ${t.accent}66`,
          background: userAvatarUrl
            ? 'transparent'
            : `linear-gradient(135deg, ${t.accent}40, ${t.surface3})`,
          boxShadow: `0 0 16px ${t.glow}`,
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
      >
        {userAvatarUrl ? (
          <img src={userAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <User size={13} style={{ color: t.isDark ? '#ffffff' : t.text }} />
        )}
        <div
          className="absolute bottom-0 right-0 w-2 h-2 rounded-full"
          style={{ background: '#22c55e', border: `1px solid ${t.surface1}` }}
        />
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 p-1.5 rounded-xl min-w-[150px] z-[70]"
            style={{
              background: t.surface2,
              border: `1px solid ${t.border}`,
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
          >
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ color: t.textMuted }}
            >
              <Camera size={11} />
              <span>Upload photo</span>
            </button>
            {userAvatarUrl ? (
              <button
                onClick={() => {
                  setUserAvatarUrl(null);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ color: '#ef4444' }}
              >
                <span>Remove photo</span>
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

export function TopBar() {
  const {
    currentTheme: t,
    isOnline, setIsOnline,
    searchQuery, setSearchQuery,
    isChatOpen, setIsChatOpen,
    setShowCreator,
    setIsOpsOpen,
    setIsThemeOpen,
    workspaceSection, setWorkspaceSection,
    setShowHub,
    setHubInitialView,
    pageContext,
    setPageContext,
    showEvolutionLab,
    setShowEvolutionLab,
    isPluginEnabled,
    setPluginEnabled,
    maestroEnabled,
    setMaestroEnabled,
    setMaestroOpen,
    setShowAgentImport,
  } = useApp();

  const [showSocials, setShowSocials] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const evolutionPluginEnabled = isPluginEnabled('01evolve-experience');
  const displayContext = useMemo(
    () => (showEvolutionLab ? pageContext : pageContextBySection[workspaceSection]),
    [pageContext, showEvolutionLab, workspaceSection],
  );

  const handleNavSelect = (section: WorkspaceSectionId) => {
    if (section === 'foundry' && SERIOUS_PRODUCT_MODE) {
      setWorkspaceSection('foundry');
      return;
    }

    setWorkspaceSection(section);
  };

  React.useEffect(() => {
    if (showEvolutionLab) return;
    setPageContext(pageContextBySection[workspaceSection]);
  }, [setPageContext, showEvolutionLab, workspaceSection]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-14 gap-3"
      style={{
        background: t.surface1,
        borderBottom: `1px solid ${t.border}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-3 min-w-[220px]">
        <img
          src={logoImg}
          alt="01AI.ai"
          className="h-7 object-contain"
          style={{ filter: t.isDark ? 'invert(0)' : 'invert(1)' }}
        />
        <div className="h-4 w-px" style={{ background: t.border }} />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] tracking-[0.22em] uppercase leading-none" style={{ color: t.text }}>
            {displayContext.title}
          </span>
          <span className="text-[9px] tracking-[0.12em] uppercase truncate" style={{ color: t.textMuted }}>
            {displayContext.subtitle}
          </span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 overflow-x-auto">
        {navItems.map(item => (
          <motion.button
            key={item.id}
            onClick={() => handleNavSelect(item.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: workspaceSection === item.id ? `${t.accent}16` : 'transparent',
              border: `1px solid ${workspaceSection === item.id ? t.accent : t.border}`,
              color: workspaceSection === item.id ? t.text : t.textMuted,
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <item.icon size={13} />
            <span>{item.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="flex-1 max-w-md mx-2">
        {workspaceSection === 'deck' ? (
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
                x
              </button>
            )}
          </div>
        ) : (
          <div
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: t.surface2,
              border: `1px solid ${t.border}`,
              color: t.textMuted,
            }}
          >
            {sectionBlurb[workspaceSection]}
          </div>
        )}
      </div>

      {IS_DECK_PRODUCT ? (
        <motion.button
          onClick={() => handleNavSelect('create')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
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
      ) : null}

      {IS_DECK_PRODUCT && evolutionPluginEnabled ? (
        <motion.button
          onClick={() => setShowEvolutionLab(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs relative overflow-hidden"
          style={{
            background: showEvolutionLab ? 'rgba(16,185,129,0.14)' : 'transparent',
            border: `1px solid ${showEvolutionLab ? 'rgba(16,185,129,0.45)' : t.border}`,
            color: showEvolutionLab ? '#34d399' : t.textMuted,
          }}
          whileHover={{
            scale: 1.03,
            color: '#34d399',
            borderColor: 'rgba(16,185,129,0.45)',
            background: 'rgba(16,185,129,0.08)',
          }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.14), rgba(6,182,212,0.12), transparent)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut' }}
          />
          <Dna size={13} />
          <span>Evolve</span>
        </motion.button>
      ) : null}

      {IS_DECK_PRODUCT ? <motion.button
        onClick={() => {
          const next = !maestroEnabled;
          setMaestroEnabled(next);
          if (next) setMaestroOpen(true);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
        style={{
          background: maestroEnabled ? 'rgba(255,77,166,0.14)' : 'transparent',
          border: `1px solid ${maestroEnabled ? '#ff4da6' : t.border}`,
          color: maestroEnabled ? '#ff4da6' : t.textMuted,
        }}
        whileHover={{ scale: 1.03, color: '#ff4da6', borderColor: '#ff4da6' }}
        whileTap={{ scale: 0.97 }}
      >
        <Music size={13} />
        <span>Maestro</span>
      </motion.button> : null}

      {IS_DECK_PRODUCT ? <motion.button
        onClick={() => setShowAgentImport(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
        style={{
          background: 'transparent',
          border: `1px solid ${t.border}`,
          color: t.textMuted,
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <FolderOpen size={13} />
        <span>Import</span>
      </motion.button> : null}

      {IS_DECK_PRODUCT ? <div className="relative">
        <motion.button
          onClick={() => setShowPlugins(open => !open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: showPlugins ? t.surface3 : 'transparent',
            border: `1px solid ${showPlugins ? t.accent : t.border}`,
            color: t.textMuted,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Package2 size={13} />
          <span>Plugins</span>
        </motion.button>

        <AnimatePresence>
          {showPlugins ? (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-[300px] rounded-xl p-3 z-50"
              style={{
                background: t.surface2,
                border: `1px solid ${t.border}`,
                boxShadow: `0 16px 48px rgba(0,0,0,0.4)`,
              }}
            >
              <div className="text-xs mb-3 px-1" style={{ color: t.textMuted }}>
                Optional experience layers for the deck shell
              </div>
              <div className="space-y-2">
                {appPluginCatalog.map(plugin => {
                  const enabled = isPluginEnabled(plugin.pluginId as '01evolve-experience');
                  return (
                    <div
                      key={plugin.pluginId}
                      className="rounded-lg px-3 py-3"
                      style={{ background: t.surface1, border: `1px solid ${t.border}` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs" style={{ color: t.text }}>{plugin.name}</div>
                          <div className="mt-1 text-[11px] leading-relaxed" style={{ color: t.textMuted }}>
                            {plugin.description}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const nextEnabled = !enabled;
                            setPluginEnabled(plugin.pluginId as '01evolve-experience', nextEnabled);
                            if (plugin.pluginId === evolutionExperiencePluginManifest.pluginId && nextEnabled) {
                              setShowEvolutionLab(true);
                            }
                          }}
                          className="px-2 py-1 rounded-lg text-[10px]"
                          style={{
                            background: enabled ? 'rgba(16,185,129,0.14)' : t.surface3,
                            border: `1px solid ${enabled ? 'rgba(16,185,129,0.4)' : t.border}`,
                            color: enabled ? '#34d399' : t.textMuted,
                          }}
                        >
                          {enabled ? 'Enabled' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div> : null}

      {IS_DECK_PRODUCT ? <div className="relative">
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
          <span>Links</span>
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
                Official 01AI links
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {socialLinks.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
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
                    <span className="text-[10px] text-center leading-tight">{s.label}</span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div> : null}

      <motion.button
        onClick={() => setIsOnline(!isOnline)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
        style={{
          background: isOnline ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: isOnline ? '#22c55e' : '#ef4444',
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
        <span>{isOnline ? 'Cloud UI' : 'Local UI'}</span>
        {!isOnline && (
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
            <RefreshCw size={11} />
          </motion.span>
        )}
      </motion.button>

      {IS_DECK_PRODUCT ? <motion.button
        onClick={() => setIsChatOpen(c => !c)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
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
      </motion.button> : null}

      {IS_DECK_PRODUCT ? <motion.button
        onClick={() => setIsOpsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
        style={{
          background: 'transparent',
          border: `1px solid ${t.border}`,
          color: t.textMuted,
        }}
        whileHover={{
          scale: 1.03,
          color: '#22c55e',
          borderColor: 'rgba(34,197,94,0.45)',
        }}
        whileTap={{ scale: 0.97 }}
      >
        <ShieldCheck size={13} />
        <span>Ops Hub</span>
      </motion.button> : null}

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

      <ProfileAvatarButton />
    </div>
  );
}
