import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Download, Upload } from 'lucide-react';
import { useApp, themes, ThemeId } from '../context/AppContext';

const themeDescriptions: Record<ThemeId, string> = {
  core: 'The default 01.AI experience. Pure black, crisp white, maximum clarity.',
  midnight: 'Deep space blue-black with electric blue accents. Focus mode.',
  holo: 'Dark purple with holographic prismatic effects. For the rare collector.',
  clean: 'Light mode, minimal, enterprise-grade clarity. Maximum legibility.',
  solar: 'Deep amber and warm gold on near-black. High energy, premium warmth.',
};

const themePreviewCards: Record<ThemeId, { bg: string; bar: string; accent: string }[]> = {
  core: [
    { bg: '#111', bar: '#1a1a1a', accent: '#fff' },
    { bg: '#0a0a0a', bar: '#222', accent: '#aaa' },
    { bg: '#080808', bar: '#181818', accent: '#666' },
  ],
  midnight: [
    { bg: '#0d1124', bar: '#111829', accent: '#6384ff' },
    { bg: '#050814', bar: '#1a2540', accent: '#4a6aff' },
    { bg: '#0a1020', bar: '#161f38', accent: '#8099ff' },
  ],
  holo: [
    { bg: '#100d1e', bar: '#161225', accent: '#c864ff' },
    { bg: '#080510', bar: '#1e1830', accent: '#a044ff' },
    { bg: '#0d0a1a', bar: '#1a1428', accent: '#e080ff' },
  ],
  clean: [
    { bg: '#fff', bar: '#f0f0f0', accent: '#111' },
    { bg: '#f5f5f5', bar: '#e8e8e8', accent: '#333' },
    { bg: '#fafafa', bar: '#ebebeb', accent: '#555' },
  ],
  solar: [
    { bg: '#1a1200', bar: '#221800', accent: '#f59e0b' },
    { bg: '#0d0900', bar: '#2e2000', accent: '#d97706' },
    { bg: '#150e00', bar: '#261b00', accent: '#fbbf24' },
  ],
};

export function ThemePickerPanel() {
  const { isThemeOpen, setIsThemeOpen, currentTheme, setThemeId } = useApp();
  const t = currentTheme;

  return (
    <AnimatePresence>
      {isThemeOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setIsThemeOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.34, 1.1, 0.64, 1] }}
            className="fixed right-0 top-14 bottom-0 z-50 overflow-y-auto"
            style={{
              width: 360,
              background: t.surface1,
              borderLeft: `1px solid ${t.border}`,
              boxShadow: '-24px 0 64px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 sticky top-0"
              style={{
                background: t.surface1,
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <div>
                <h2 className="text-sm" style={{ color: t.text }}>Skin & Theme</h2>
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                  Fully customize your agent viewer
                </p>
              </div>
              <motion.button
                onClick={() => setIsThemeOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
                whileHover={{ scale: 1.05, color: t.text }}
              >
                <X size={14} />
              </motion.button>
            </div>

            <div className="px-6 py-4">
              {/* Theme picker */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Default Skins
                </div>
                <div className="space-y-2">
                  {(Object.entries(themes) as [ThemeId, typeof themes[ThemeId]][]).map(([id, theme]) => {
                    const isActive = currentTheme.id === id;
                    const preview = themePreviewCards[id];
                    return (
                      <motion.button
                        key={id}
                        onClick={() => setThemeId(id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                        style={{
                          background: isActive ? `${t.accent}12` : t.surface2,
                          border: `1px solid ${isActive ? t.accent : t.border}`,
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        {/* Preview swatches */}
                        <div className="flex gap-1 flex-shrink-0">
                          {preview.map((p, i) => (
                            <div
                              key={i}
                              className="w-5 h-10 rounded-md overflow-hidden flex flex-col justify-between p-0.5"
                              style={{ background: p.bg }}
                            >
                              <div className="w-full h-1 rounded" style={{ background: p.bar }} />
                              <div className="w-full h-1 rounded" style={{ background: p.accent, opacity: 0.8 }} />
                            </div>
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: t.text }}>{theme.name}</span>
                            {isActive && <Check size={12} style={{ color: t.accent }} />}
                          </div>
                          <p className="text-xs mt-0.5 truncate" style={{ color: t.textMuted }}>
                            {themeDescriptions[id]}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Import / Export */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Theme Import / Export
                </div>
                <div className="flex gap-2">
                  <motion.button
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs"
                    style={{
                      background: t.surface2,
                      border: `1px solid ${t.border}`,
                      color: t.textMuted,
                    }}
                    whileHover={{ scale: 1.02, color: t.text }}
                  >
                    <Upload size={13} />
                    Import Theme
                  </motion.button>
                  <motion.button
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs"
                    style={{
                      background: t.surface2,
                      border: `1px solid ${t.border}`,
                      color: t.textMuted,
                    }}
                    whileHover={{ scale: 1.02, color: t.text }}
                  >
                    <Download size={13} />
                    Export Theme
                  </motion.button>
                </div>
              </div>

              {/* Density modes */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Density
                </div>
                <div className="flex gap-2">
                  {['Compact', 'Default', 'Relaxed'].map(mode => (
                    <motion.button
                      key={mode}
                      className="flex-1 py-2 rounded-lg text-xs"
                      style={{
                        background: mode === 'Default' ? `${t.accent}15` : t.surface2,
                        border: `1px solid ${mode === 'Default' ? t.accent : t.border}`,
                        color: mode === 'Default' ? t.text : t.textMuted,
                      }}
                      whileHover={{ scale: 1.03 }}
                    >
                      {mode}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Color accents */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Accent Color
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['#ffffff', '#6384ff', '#c864ff', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4'].map(color => (
                    <motion.button
                      key={color}
                      className="w-7 h-7 rounded-full"
                      style={{
                        background: color,
                        border: `2px solid ${color === t.accent ? t.text : 'transparent'}`,
                      }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                    />
                  ))}
                </div>
              </div>

              {/* Card frames */}
              <div>
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Card Frame Style
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Sharp', 'Rounded', 'Holo', 'Minimal', 'Metal', 'Glass'].map(frame => (
                    <motion.button
                      key={frame}
                      className="py-2 rounded-lg text-xs text-center"
                      style={{
                        background: t.surface2,
                        border: `1px solid ${frame === 'Rounded' ? t.accent : t.border}`,
                        color: frame === 'Rounded' ? t.text : t.textMuted,
                      }}
                      whileHover={{ scale: 1.03 }}
                    >
                      {frame}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
