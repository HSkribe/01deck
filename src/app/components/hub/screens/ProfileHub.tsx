import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Flame,
  Gamepad2,
  KeyRound,
  Settings2,
  Sparkles,
  TestTube2,
  Trophy,
  User,
  Zap,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { achievements, userStats } from '../../../data/hubData';
import {
  ensureApiKeysLoaded,
  getStoredApiKeysSync,
  setApiKey as persistApiKey,
  removeApiKey as deleteStoredApiKey,
  type ApiKeyStore,
} from '../../../utils/secureApiKeyStore';

type ProfileView = 'overview' | 'options' | 'api';
type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'grok' | 'mistral';

// Keys are encrypted at rest — see src/app/utils/secureApiKeyStore.ts.
type StoredApiKeys = ApiKeyStore<ProviderId>;

const providerOptions: Array<{
  id: ProviderId;
  label: string;
  description: string;
  portalLabel: string;
  portalUrl: string;
}> = [
  {
    id: 'openai',
    label: 'ChatGPT / OpenAI',
    description: 'Use OpenAI platform keys for GPT models and related APIs.',
    portalLabel: 'OpenAI Platform',
    portalUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude API keys from the Anthropic console.',
    portalLabel: 'Anthropic Console',
    portalUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Google AI Studio or Gemini API credentials.',
    portalLabel: 'Google AI Studio',
    portalUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Unified access to multiple providers through one API layer.',
    portalLabel: 'OpenRouter Keys',
    portalUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'grok',
    label: 'Grok / xAI',
    description: 'xAI developer platform keys for Grok models.',
    portalLabel: 'xAI Console',
    portalUrl: 'https://console.x.ai/',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    description: 'Mistral AI platform API credentials.',
    portalLabel: 'Mistral Console',
    portalUrl: 'https://console.mistral.ai/api-keys/',
  },
];

function maskApiKey(value: string) {
  if (!value) return 'Not set';
  if (value.length <= 8) return `${value.slice(0, 2)}...${value.slice(-2)}`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

function ProgressRing({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (circ * pct) / 100 }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
        strokeDasharray={circ}
      />
    </svg>
  );
}

function Surface({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { currentTheme: t } = useApp();

  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: t.surface2, border: `1px solid ${t.border}` }}
    >
      {children}
    </div>
  );
}

export function ProfileHub() {
  const { currentTheme: t, userAvatarUrl, setUserAvatarUrl, setShowCreator } = useApp();
  const { user } = useAuth();
  const [view, setView] = React.useState<ProfileView>('overview');
  const [apiKeys, setApiKeys] = React.useState<StoredApiKeys>({});
  const [selectedProvider, setSelectedProvider] = React.useState<ProviderId>('openai');
  const [draftApiKey, setDraftApiKey] = React.useState('');
  const [showProviderHelp, setShowProviderHelp] = React.useState(false);
  const [saveNotice, setSaveNotice] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Real user data from auth — fall back to hubData for non-auth fields
  const currentXp = user?.xp ?? userStats.xp;
  const currentLevel = user?.level ?? userStats.level;
  const XP_PER_LEVEL = 500;
  const xpIntoLevel = currentXp % XP_PER_LEVEL;
  const xpPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);
  const earnedAch = achievements.filter(a => a.earned);
  const lockedAch = achievements.filter(a => !a.earned);
  const configuredProviders = providerOptions.filter(provider => apiKeys[provider.id]?.key);

  const rarityColor: Record<string, string> = {
    common: '#64748b',
    rare: '#f59e0b',
    epic: '#a855f7',
    legend: '#d4af37',
  };

  // Keys are encrypted at rest, so the initial load is async — decrypt once
  // on mount and hydrate local state from it. Saves/removals below write
  // through the store directly rather than via a persistence effect, so
  // this state is a read-through cache, not the source of truth.
  React.useEffect(() => {
    let cancelled = false;
    void ensureApiKeysLoaded().then(() => {
      if (!cancelled) setApiKeys(getStoredApiKeysSync<ProviderId>());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!saveNotice) return;
    const timeout = window.setTimeout(() => setSaveNotice(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [saveNotice]);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = loadEvent => {
      setUserAvatarUrl((loadEvent.target?.result as string) ?? null);
      setSaveNotice('Profile photo updated.');
    };
    reader.readAsDataURL(file);
  };

  const saveApiKey = () => {
    const trimmed = draftApiKey.trim();
    if (!trimmed) return;

    void persistApiKey(selectedProvider, trimmed).then(next => setApiKeys(next));
    setDraftApiKey('');
    setSaveNotice(`${providerOptions.find(provider => provider.id === selectedProvider)?.label ?? 'Provider'} key saved locally (encrypted at rest).`);
  };

  const removeApiKey = (providerId: ProviderId) => {
    void deleteStoredApiKey(providerId).then(next => setApiKeys(next));
    setSaveNotice(`${providerOptions.find(provider => provider.id === providerId)?.label ?? 'Provider'} key removed.`);
  };

  return (
    <div className="h-full overflow-y-auto pb-20 md:pb-6">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      <div className="relative px-6 pt-8 pb-10 mb-6" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(148,163,184,0.06), transparent)' }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center"
                  style={{
                    background: userAvatarUrl
                      ? t.surface3
                      : 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(6,182,212,0.2))',
                    border: '2px solid rgba(168,85,247,0.4)',
                  }}
                >
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="Profile avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={34} style={{ color: t.text }} />
                  )}
                </div>
                <div className="absolute -inset-1.5">
                  <ProgressRing pct={xpPct} color="#a855f7" size={96} />
                </div>
                <div
                  className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                  style={{ background: '#a855f7', color: '#000', border: `2px solid ${t.bg}` }}
                >
                  {currentLevel}
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-xl mb-1" style={{ color: t.text }}>
                  {user?.displayName ?? 'Protocol Agent'}
                </h1>
                <p className="text-xs mb-3" style={{ color: t.textMuted }}>
                  {user ? `@${user.username}` : userStats.rank}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: Flame, value: `${userStats.streak}d`, label: 'streak', color: '#f59e0b' },
                    { icon: Zap, value: currentXp.toLocaleString(), label: 'XP', color: '#a855f7' },
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

            <div className="flex flex-wrap justify-end gap-2">
              <motion.button
                onClick={() => fileRef.current?.click()}
                className="px-3 py-2 rounded-xl text-xs"
                style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {userAvatarUrl ? 'Change Avatar' : 'Add Avatar'}
              </motion.button>
              <motion.button
                onClick={() => setView('options')}
                className="px-3 py-2 rounded-xl text-xs flex items-center gap-2"
                style={{ background: `${PROFILE_COLOR}12`, border: `1px solid ${PROFILE_COLOR}30`, color: PROFILE_COLOR }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings2 size={13} />
                <span>Options</span>
              </motion.button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 text-xs">
              <span style={{ color: t.textMuted }}>Level {currentLevel}</span>
              <span style={{ color: '#a855f7' }}>{xpIntoLevel.toLocaleString()} / {XP_PER_LEVEL.toLocaleString()} XP</span>
              <span style={{ color: t.textMuted }}>Level {currentLevel + 1}</span>
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

      {saveNotice ? (
        <div className="px-6 mb-4">
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', color: '#6ee7b7' }}
          >
            {saveNotice}
          </div>
        </div>
      ) : null}

      {view === 'overview' ? (
        <>
          <div className="px-6 mb-8">
            <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>All-Time Stats</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Gamepad2, label: 'Games Played', value: userStats.gamesPlayed, color: '#a855f7' },
                { icon: BookOpen, label: 'Courses Done', value: userStats.coursesCompleted, color: '#10b981' },
                { icon: TestTube2, label: 'Tests Taken', value: userStats.testsCompleted, color: '#06b6d4' },
                { icon: Zap, label: 'Time Played', value: userStats.totalPlayTime, color: '#f59e0b' },
              ].map(stat => (
                <Surface key={stat.label} className="p-4 text-center">
                  <div className="flex justify-center mb-2">
                    <stat.icon size={22} style={{ color: stat.color }} />
                  </div>
                  <div className="text-lg mb-0.5" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px]" style={{ color: t.textMuted }}>{stat.label}</div>
                </Surface>
              ))}
            </div>
          </div>

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

          <div className="px-6 mb-8">
            <p className="text-[10px] uppercase tracking-wider mb-4" style={{ color: t.textMuted }}>In Progress</p>
            <div className="space-y-3">
              {lockedAch.map(a => {
                const pct = a.goal ? Math.round(((a.progress ?? 0) / a.goal) * 100) : 0;
                const rc = rarityColor[a.rarity] ?? '#64748b';
                return (
                  <Surface key={a.id} className="flex items-center gap-4 p-4 opacity-80">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${rc}10`, border: `1px solid ${rc}20`, filter: 'grayscale(0.4)' }}
                    >
                      {a.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs" style={{ color: t.text }}>{a.title}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: `${rc}15`, color: rc }}>
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
                  </Surface>
                );
              })}
            </div>
          </div>

          <div className="px-6 mb-8">
            <p className="text-[10px] uppercase tracking-wider mb-4" style={{ color: t.textMuted }}>Creator Identity</p>
            <Surface className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
                >
                  <Sparkles size={18} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: t.text }}>Your creator profile</p>
                  <p className="text-xs" style={{ color: t.textMuted }}>Publish your first piece to unlock</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]" style={{ color: t.textMuted }}>
                {[['0', 'Published'], ['0', 'Total Plays'], ['-', 'Avg Rating']].map(([value, label]) => (
                  <div key={label} className="py-2 rounded-lg" style={{ background: t.surface3 }}>
                    <div className="text-sm mb-0.5" style={{ color: t.text }}>{value}</div>
                    {label}
                  </div>
                ))}
              </div>
              <motion.button
                onClick={() => setShowCreator(true)}
                className="w-full mt-4 py-3 rounded-xl text-xs"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
                whileHover={{ scale: 1.01, background: 'rgba(245,158,11,0.18)' }}
              >
                Start Creating {'->'}
              </motion.button>
            </Surface>
          </div>
        </>
      ) : null}

      {view === 'options' ? (
        <div className="px-6 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <motion.button
              onClick={() => setView('overview')}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <ArrowLeft size={15} />
            </motion.button>
            <div>
              <div className="text-sm" style={{ color: t.text }}>Options</div>
              <div className="text-xs" style={{ color: t.textMuted }}>Profile controls, identity, and account-level settings.</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Surface className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${PROFILE_COLOR}12`, border: `1px solid ${PROFILE_COLOR}30` }}>
                  <KeyRound size={18} style={{ color: PROFILE_COLOR }} />
                </div>
                <div>
                  <div className="text-sm" style={{ color: t.text }}>API</div>
                  <div className="text-xs" style={{ color: t.textMuted }}>Manage provider keys and see what is configured right now.</div>
                </div>
              </div>
              <div className="text-xs mb-4" style={{ color: t.textMuted }}>
                {configuredProviders.length > 0
                  ? `${configuredProviders.length} provider key${configuredProviders.length === 1 ? '' : 's'} configured in this browser.`
                  : 'No local provider keys configured yet.'}
              </div>
              <motion.button
                onClick={() => setView('api')}
                className="w-full py-3 rounded-xl text-xs"
                style={{ background: `${PROFILE_COLOR}12`, border: `1px solid ${PROFILE_COLOR}30`, color: PROFILE_COLOR }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                Open API Settings
              </motion.button>
            </Surface>

            <Surface className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.24)' }}>
                  <User size={18} style={{ color: '#22d3ee' }} />
                </div>
                <div>
                  <div className="text-sm" style={{ color: t.text }}>Avatar</div>
                  <div className="text-xs" style={{ color: t.textMuted }}>Your uploaded profile photo now appears here again.</div>
                </div>
              </div>
              <div className="text-xs mb-4" style={{ color: t.textMuted }}>
                {userAvatarUrl ? 'A profile image is currently active.' : 'No custom profile image is set yet.'}
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 py-3 rounded-xl text-xs"
                  style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.text }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {userAvatarUrl ? 'Change Avatar' : 'Upload Avatar'}
                </motion.button>
                {userAvatarUrl ? (
                  <motion.button
                    onClick={() => {
                      setUserAvatarUrl(null);
                      setSaveNotice('Profile photo removed.');
                    }}
                    className="px-3 py-3 rounded-xl text-xs"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Remove
                  </motion.button>
                ) : null}
              </div>
            </Surface>
          </div>
        </div>
      ) : null}

      {view === 'api' ? (
        <div className="px-6 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <motion.button
              onClick={() => setView('options')}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <ArrowLeft size={15} />
            </motion.button>
            <div>
              <div className="text-sm" style={{ color: t.text }}>API Settings</div>
              <div className="text-xs" style={{ color: t.textMuted }}>
                This page shows the provider keys currently configured in this browser for 01Deck.
              </div>
            </div>
          </div>

          <Surface className="p-5 mb-4">
            <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Keys In Use</div>
            {configuredProviders.length > 0 ? (
              <div className="space-y-3">
                {configuredProviders.map(provider => {
                  const record = apiKeys[provider.id];
                  if (!record) return null;

                  return (
                    <div
                      key={provider.id}
                      className="rounded-xl p-4 flex items-center justify-between gap-4"
                      style={{ background: t.surface3, border: `1px solid ${t.border}` }}
                    >
                      <div>
                        <div className="text-sm" style={{ color: t.text }}>{provider.label}</div>
                        <div className="text-xs mt-1" style={{ color: t.textMuted }}>
                          Key: <span style={{ color: t.text }}>{maskApiKey(record.key)}</span>
                        </div>
                        <div className="text-xs mt-1" style={{ color: t.textMuted }}>
                          Saved: {formatUpdatedAt(record.updatedAt)}
                        </div>
                      </div>
                      <motion.button
                        onClick={() => removeApiKey(provider.id)}
                        className="px-3 py-2 rounded-xl text-xs flex items-center gap-2"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Trash2 size={12} />
                        <span>Remove</span>
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl p-4 text-sm" style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}>
                No provider keys are currently configured in this browser.
              </div>
            )}
          </Surface>

          <Surface className="p-5 mb-4">
            <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Set API Keys</div>
            <div className="grid gap-3 md:grid-cols-[1.2fr_1.8fr]">
              <label className="text-xs" style={{ color: t.textMuted }}>
                Provider
                <select
                  value={selectedProvider}
                  onChange={event => setSelectedProvider(event.target.value as ProviderId)}
                  className="w-full mt-2 px-3 py-3 rounded-xl outline-none"
                  style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.text }}
                >
                  {providerOptions.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs" style={{ color: t.textMuted }}>
                API Key
                <textarea
                  value={draftApiKey}
                  onChange={event => setDraftApiKey(event.target.value)}
                  placeholder="Paste or type your provider API key here..."
                  rows={4}
                  className="w-full mt-2 px-3 py-3 rounded-xl outline-none resize-none"
                  style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.text }}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <motion.button
                onClick={saveApiKey}
                disabled={!draftApiKey.trim()}
                className="px-4 py-3 rounded-xl text-xs"
                style={{
                  background: draftApiKey.trim() ? `${PROFILE_COLOR}12` : t.surface3,
                  border: `1px solid ${draftApiKey.trim() ? `${PROFILE_COLOR}30` : t.border}`,
                  color: draftApiKey.trim() ? PROFILE_COLOR : t.textMuted,
                }}
                whileHover={{ scale: draftApiKey.trim() ? 1.01 : 1 }}
                whileTap={{ scale: draftApiKey.trim() ? 0.98 : 1 }}
              >
                Save API Key
              </motion.button>

              <motion.button
                onClick={() => setShowProviderHelp(open => !open)}
                className="px-4 py-3 rounded-xl text-xs"
                style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.text }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                Why do I need an API key?
              </motion.button>
            </div>
          </Surface>

          {showProviderHelp ? (
            <Surface className="p-5">
              <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                Why 01Deck Needs Your API Key
              </div>
              <div
                className="rounded-xl p-4 mb-4 text-sm"
                style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted, lineHeight: 1.7 }}
              >
                01Deck can connect to outside AI providers for live model access, but those providers require an API key to know
                which account is making requests and how usage should be billed. Adding your key lets 01Deck connect your workspace
                to the model provider you choose. Without a provider key, 01Deck can still show local UI and some fallback behavior,
                but it cannot make authenticated live requests to services like ChatGPT, Anthropic, Gemini, or OpenRouter.
              </div>
              <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Get A Key</div>
              <div className="grid gap-3 md:grid-cols-2">
                {providerOptions.map(provider => (
                  <a
                    key={provider.id}
                    href={provider.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl p-4 block transition-transform"
                    style={{ background: t.surface3, border: `1px solid ${t.border}` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm" style={{ color: t.text }}>{provider.label}</div>
                        <div className="text-xs mt-1" style={{ color: t.textMuted }}>{provider.description}</div>
                      </div>
                      <ExternalLink size={14} style={{ color: PROFILE_COLOR }} />
                    </div>
                    <div className="text-xs mt-3" style={{ color: PROFILE_COLOR }}>
                      {provider.portalLabel}
                    </div>
                  </a>
                ))}
              </div>
            </Surface>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const PROFILE_COLOR = '#94a3b8';
