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
  HelpCircle,
} from 'lucide-react';
import { useApp, type WorkspaceSectionId } from '../context/AppContext';
import logoImg from '../assets/logo-wordmark.svg';
import { appPluginCatalog } from '../plugins/registry';
import { evolutionExperiencePluginManifest } from '../plugins/01evolve/manifest';
import { IS_DECK_PRODUCT, SERIOUS_PRODUCT_MODE } from '../utils/productMode';
import { ProfileModal } from './ProfileModal';
import { useDismissableMenu } from '../hooks/useDismissableMenu';

const navItems: Array<{ id: WorkspaceSectionId; label: string; icon: typeof Search }> = SERIOUS_PRODUCT_MODE
  ? [{ id: 'foundry', label: '01FOUNDRY', icon: ShieldCheck }]
  : [
      { id: 'deck', label: 'Deck', icon: Search },
      { id: 'deploy', label: 'Deploy', icon: Globe },
      { id: 'arcade', label: 'Arcade', icon: Gamepad2 },
      { id: 'learn', label: 'Learn', icon: BookOpen },
      { id: 'create', label: 'Create', icon: Plus },
      { id: 'library', label: 'Library', icon: Library },
    ];

const sectionBlurb: Record<WorkspaceSectionId, string> = {
  foundry: 'Tier-1 SaaS support optimization, evaluation, lineage, and benchmark reporting.',
  deck: 'Search agents, roles, and capabilities.',
  deploy: 'Select a team and stage a universal deployment payload.',
  arcade: 'Browse playable sessions, prototypes, and the new game shelf.',
  learn: 'Explore tests, classes, and how-to content with agent support.',
  create: 'Design games, tests, classes, and how-to guides from templates.',
  library: 'Saved content, in-progress sessions, and published work will collect here.',
  profile: 'Identity, streaks, creator stats, and attached agents will live here.',
};

const pageContextBySection: Record<WorkspaceSectionId, { title: string; subtitle: string }> = {
  foundry: { title: '01FOUNDRY', subtitle: 'Customer-support agent optimization' },
  deck: { title: '01DECK', subtitle: 'Agent workspace active' },
  deploy: { title: 'DEPLOY', subtitle: 'Universal team handoff staging' },
  arcade: { title: 'ARCADE', subtitle: 'Playable sessions and prototypes' },
  learn: { title: 'LEARN', subtitle: 'Classes, tests, and guided practice' },
  create: { title: 'CREATE', subtitle: 'Publishing and creator tools' },
  library: { title: 'LIBRARY', subtitle: 'Saved, in progress, and published' },
  profile: { title: 'PROFILE', subtitle: 'Identity, stats, and attached agents' },
};

function ProfileAvatarButton() {
  const { currentTheme: t, userAvatarUrl } = useApp();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setShowProfile(true)}
        aria-label="Open your profile"
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
      
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}

export function TopBar() {
  const {
    currentTheme: t,
    chatResponseSource,
    searchQuery, setSearchQuery,
    isChatOpen, setIsChatOpen,
    setIsThemeOpen,
    workspaceSection, setWorkspaceSection,
    pageContext,
    setPageContext,
    showEvolutionLab,
    setShowEvolutionLab,
    isPluginEnabled,
    setPluginEnabled,
    setMaestroOpen,
    setIsOpsOpen,
    setShowCreateImport,
  } = useApp();

  const [showPlugins, setShowPlugins] = useState(false);
  const [showPluginInfo, setShowPluginInfo] = useState(false);
  const closePluginPanels = React.useCallback(() => {
    setShowPluginInfo(false);
    setShowPlugins(false);
  }, []);
  const pluginMenuRef = useDismissableMenu<HTMLDivElement>(showPlugins || showPluginInfo, closePluginPanels);
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
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-14 gap-2"
      style={{
        background: t.surface1,
        borderBottom: `1px solid ${t.border}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-3 min-w-[200px]">
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

      {/* Nav Items - Directly on TopBar */}
      {!SERIOUS_PRODUCT_MODE && (
        <div className="hidden lg:flex items-center gap-1.5 ml-2">
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
              whileHover={{ scale: 1.03, background: workspaceSection === item.id ? `${t.accent}20` : t.surface2 }}
              whileTap={{ scale: 0.97 }}
            >
              <item.icon size={13} />
              <span>{item.label}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex-1 max-w-[300px] mx-2">
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
              placeholder="Search agents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: t.text }}
            />
          </div>
        ) : (
          <div
            className="px-3 py-1.5 rounded-lg text-xs truncate"
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

      {/* Trailing action cluster: scrolls horizontally instead of being
          clipped or squeezed illegible at narrower viewports (1280x720,
          1440x900) — every item here, including Skin, stays reachable both
          by mouse (drag/scroll) and by keyboard (Tab auto-scrolls the
          focused button into view), rather than shrinking text to fit. */}
      <div className="flex items-center gap-2 overflow-x-auto flex-shrink min-w-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">
      {IS_DECK_PRODUCT ? (
        <motion.button
          onClick={() => setShowCreateImport(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
          style={{
            background: `${t.accent}15`,
            border: `1px solid ${t.accent}40`,
            color: t.accent,
          }}
          whileHover={{ scale: 1.04, background: `${t.accent}25` }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={13} />
          <span>Create/Import</span>
        </motion.button>
      ) : null}

      {IS_DECK_PRODUCT && evolutionPluginEnabled ? (
        <motion.button
          onClick={() => setShowEvolutionLab(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs relative overflow-hidden flex-shrink-0"
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
          <Dna size={13} />
          <span>Evolve</span>
        </motion.button>
      ) : null}

      {IS_DECK_PRODUCT ? (
        <div className="relative flex-shrink-0" ref={pluginMenuRef}>
          <motion.button
            type="button"
            onClick={() => setShowPlugins(open => !open)}
            aria-haspopup="true"
            aria-expanded={showPlugins}
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
                role="menu"
                aria-label="Available plugins"
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-[320px] rounded-2xl p-4 z-50 flex flex-col gap-3"
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.border}`,
                  boxShadow: `0 24px 64px rgba(0,0,0,0.5)`,
                }}
              >
                <div className="text-[10px] uppercase tracking-widest opacity-50 px-1" style={{ color: t.text }}>
                  Available Plugins
                </div>
                
                <div className="space-y-2">
                  {appPluginCatalog.map(plugin => {
                    const enabled = isPluginEnabled(plugin.pluginId as any);
                    const isMaestro = plugin.pluginId === '01maestro';
                    const accentColor = isMaestro ? '#ff4da6' : t.accent;
                    const PluginIcon = isMaestro ? Music : Package2;
                    return (
                      <div
                        key={plugin.pluginId}
                        className="rounded-xl p-3 flex items-center justify-between"
                        style={{ background: t.surface1, border: `1px solid ${t.border}`, opacity: enabled ? 1 : 0.6 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: enabled ? `${accentColor}15` : t.surface3 }}>
                            <PluginIcon size={16} style={{ color: enabled ? accentColor : t.textMuted }} />
                          </div>
                          <div>
                            <div className="text-xs font-medium" style={{ color: enabled ? t.text : t.textMuted }}>{plugin.name}</div>
                            <div className="text-[10px] truncate max-w-[140px]" style={{ color: t.textMuted }}>{plugin.description}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !enabled;
                            setPluginEnabled(plugin.pluginId as any, next);
                            if (isMaestro && next) setMaestroOpen(true);
                          }}
                          aria-pressed={enabled}
                          aria-label={`${enabled ? 'Deactivate' : 'Load'} ${plugin.name} plugin`}
                          className="px-2 py-1 rounded-lg text-[10px] transition-all"
                          style={{
                            background: enabled ? `${accentColor}15` : t.surface3,
                            border: `1px solid ${enabled ? accentColor : t.border}`,
                            color: enabled ? accentColor : t.textMuted,
                          }}
                        >
                          {enabled ? 'Active' : 'Load'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t" style={{ borderColor: t.border }}>
                  <button
                    type="button"
                    onClick={() => setShowPluginInfo(true)}
                    aria-haspopup="true"
                    aria-expanded={showPluginInfo}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] tracking-wider uppercase transition-colors hover:bg-white/5"
                    style={{ background: t.surface3, color: t.textMuted }}
                  >
                    <HelpCircle size={12} />
                    What's This?
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {showPluginInfo && (
              <motion.div
                role="region"
                aria-label="01Deck Plugin System info"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-[320px] rounded-2xl p-6 z-[60]"
                style={{
                  background: t.surface1,
                  border: `1px solid ${t.accent}44`,
                  boxShadow: `0 32px 80px rgba(0,0,0,0.7)`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium" style={{ color: t.text }}>01Deck Plugin System</h4>
                  <button type="button" onClick={() => setShowPluginInfo(false)} aria-label="Close" style={{ color: t.textMuted }}><X size={14} /></button>
                </div>
                <div className="space-y-3 text-xs leading-relaxed" style={{ color: t.textMuted }}>
                  <p>
                    Plugins are optional experience layers that extend the capabilities of your deck. They can add new UI panels, agent tools, or spatial audio effects.
                  </p>
                  <p>
                    Some plugins require a local backend connection, while others run entirely in your browser. Click <span style={{ color: t.accent }}>Load</span> to initialize a plugin's assets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPluginInfo(false)}
                  className="mt-6 w-full py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: `${t.accent}15`, border: `1px solid ${t.accent}30`, color: t.accent }}
                >
                  Understood
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : null}

      <motion.button
        onClick={() => setIsOpsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
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
        <span>Hub</span>
      </motion.button>

      {/* Was a manual "Cloud/Local" toggle that didn't connect to anything —
          clicking it just hid a disclaimer banner, regardless of whether
          chat was actually live. Now it's a real, read-only status: whether
          the next chat message will get a live model reply or a simulated
          one, and it opens Chat (with settings expanded) so the user can
          act on it instead of just flipping a cosmetic flag. */}
      <motion.button
        type="button"
        onClick={() => setIsChatOpen(true)}
        aria-label={
          chatResponseSource === 'local'
            ? 'Chat is running in simulated mode — open chat to connect a live model'
            : 'Chat is connected to a live model — open chat'
        }
        title={
          chatResponseSource === 'local'
            ? 'No live model connected — chat replies are simulated'
            : chatResponseSource === 'direct-key'
              ? 'Live via your configured provider key'
              : 'Live via the connected backend'
        }
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
        style={{
          background: chatResponseSource === 'local' ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${chatResponseSource === 'local' ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
          color: chatResponseSource === 'local' ? '#eab308' : '#22c55e',
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {chatResponseSource === 'local' ? <WifiOff size={13} /> : <Wifi size={13} />}
        <span>{chatResponseSource === 'local' ? 'Simulated' : 'Live'}</span>
      </motion.button>

      {IS_DECK_PRODUCT ? (
        <motion.button
          onClick={() => setIsChatOpen(c => !c)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
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
      ) : null}

      <motion.button
        onClick={() => setIsThemeOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
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

      <ProfileAvatarButton />
    </div>
  );
}
