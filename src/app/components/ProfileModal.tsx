import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, AtSign, Shield, Zap, Sparkles, Trophy, Calendar, KeyRound, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { ModalPortal } from './ui/ModalPortal';

const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  x: 'X (Twitter)',
  discord: 'Discord',
  instagram: 'Instagram',
  facebook: 'Facebook',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

// The subset of socialConnections (see AppContext) worth surfacing in the
// compact profile panel — the rest are still reachable in full from the
// Hub's Social tab.
const FEATURED_SOCIAL_PLATFORMS = ['x', 'discord', 'instagram'];

function formatJoinedDate(joinedAt: number): string {
  return new Date(joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentTheme: t, userAvatarUrl, allAgents, ownerIdentity, socialConnections, toggleSocialConnection } = useApp();
  const { user, logout } = useAuth();
  const boundAgentCount = allAgents.filter(a => a.ownerDelegationRecord).length;

  const handleSignOut = () => {
    onClose();
    logout();
  };

  const panelRef = useModalA11y<HTMLDivElement>({ isOpen, onClose });

  if (!user) return null;

  // Every stat here is backed by real state (AppContext / AuthContext) —
  // nothing here is fabricated. There's no streak, rank, or uptime tracked
  // anywhere in the app, so those don't appear rather than being invented.
  const stats = [
    { label: 'Agents Created', value: allAgents.filter(a => a.isUserCreated).length, icon: User },
    { label: 'Level', value: user.level, icon: Trophy },
    { label: 'XP', value: user.xp, icon: Zap },
    { label: 'Protocol-Bound', value: boundAgentCount, icon: KeyRound },
  ];

  return (
    <ModalPortal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-modal-title"
              tabIndex={-1}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl rounded-3xl overflow-hidden focus:outline-none"
              style={{
                background: t.surface1,
                border: `1px solid ${t.border}`,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header/Banner */}
              <div className="h-32 w-full relative" style={{ background: `linear-gradient(135deg, ${t.accent}40, ${t.surface3})` }}>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close profile"
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-black/20 text-white hover:bg-black/40 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-8 pb-8 -mt-12 relative">
                {/* Avatar */}
                <div
                  className="w-24 h-24 rounded-3xl overflow-hidden border-4 flex items-center justify-center shadow-xl mb-6"
                  style={{ borderColor: t.surface1, background: t.surface2 }}
                >
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} style={{ color: t.textMuted }} />
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left Side: Info */}
                  <div className="flex-1">
                    <h2 id="profile-modal-title" className="text-2xl font-bold mb-1" style={{ color: t.text }}>{user.displayName}</h2>
                    <div className="flex items-center gap-2 text-xs mb-6" style={{ color: t.textMuted }}>
                      <AtSign size={12} />
                      <span>{user.username}</span>
                      <div className="w-1 h-1 rounded-full bg-current opacity-30" />
                      <Sparkles size={12} />
                      <span>Level {user.level}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      {stats.map(s => (
                        <div key={s.label} className="p-4 rounded-2xl" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                          <div className="flex items-center gap-2 mb-1" style={{ color: t.textMuted }}>
                            <s.icon size={14} />
                            <span className="text-[10px] uppercase tracking-wider">{s.label}</span>
                          </div>
                          <div className="text-lg font-medium" style={{ color: t.text }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wider mb-2 opacity-50" style={{ color: t.text }}>01Protocol Identity</div>
                      {ownerIdentity ? (
                        <div className="p-3 rounded-xl text-xs" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                          <div className="flex items-center gap-2 mb-1.5" style={{ color: t.text }}>
                            <KeyRound size={12} style={{ color: t.accent }} />
                            <span>Owner identity active</span>
                          </div>
                          <div className="font-mono text-[10px] mb-1.5 break-all" style={{ color: t.textMuted }}>
                            {ownerIdentity.identity.instanceId}
                          </div>
                          <div style={{ color: t.textMuted }}>
                            {boundAgentCount} agent{boundAgentCount !== 1 ? 's' : ''} delegation-bound to this identity
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl text-xs" style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}>
                          No owner identity yet — one is created automatically the first time you create an agent, and every agent you create afterward is bound to it.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Connections */}
                  <div className="w-full md:w-64">
                    <div className="text-[10px] uppercase tracking-wider mb-4 opacity-50" style={{ color: t.text }}>Linked Accounts</div>
                    <div className="space-y-2">
                      {FEATURED_SOCIAL_PLATFORMS.map(platform => {
                        const connected = Boolean(socialConnections[platform]);
                        return (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => toggleSocialConnection(platform)}
                            className="w-full p-3 rounded-xl flex items-center justify-between text-xs transition-all"
                            style={{
                              background: t.surface2,
                              border: `1px solid ${t.border}`,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span style={{ color: t.text }}>{SOCIAL_PLATFORM_LABELS[platform] ?? platform}</span>
                            </div>
                            <div className="flex items-center gap-1" style={{ color: connected ? '#22c55e' : t.textMuted }}>
                              <span className="text-[10px]">{connected ? 'Connected' : 'Connect'}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-8 p-4 rounded-2xl text-center" style={{ background: `${t.accent}08`, border: `1px dashed ${t.border}` }}>
                      <Calendar size={20} className="mx-auto mb-2 opacity-30" style={{ color: t.accent }} />
                      <div className="text-[10px] leading-relaxed" style={{ color: t.textMuted }}>
                        Member since {formatJoinedDate(user.joinedAt)}.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full mt-3 p-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: '#fca5a5',
                      }}
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
