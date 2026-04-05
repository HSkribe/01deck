import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Download, Upload, AlertCircle } from 'lucide-react';
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

const ACCENT_COLORS = [
  { hex: '#ffffff', label: 'White' },
  { hex: '#6384ff', label: 'Electric Blue' },
  { hex: '#c864ff', label: 'Holo Purple' },
  { hex: '#f59e0b', label: 'Solar Gold' },
  { hex: '#22c55e', label: 'Matrix Green' },
  { hex: '#ef4444', label: 'Critical Red' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#ff4da6', label: 'Maestro Pink' },
];

const CARD_FRAMES = [
  { id: 'sharp', label: 'Sharp', radius: '4px', preview: '■' },
  { id: 'rounded', label: 'Rounded', radius: '12px', preview: '▢' },
  { id: 'holo', label: 'Holo', radius: '16px', preview: '◈' },
  { id: 'minimal', label: 'Minimal', radius: '8px', preview: '□' },
  { id: 'metal', label: 'Metal', radius: '6px', preview: '◧' },
  { id: 'glass', label: 'Glass', radius: '20px', preview: '○' },
];

const DENSITY_OPTIONS = [
  { id: 'compact', label: 'Compact', desc: 'More agents visible', icon: '▤' },
  { id: 'default', label: 'Default', desc: 'Balanced layout', icon: '▥' },
  { id: 'relaxed', label: 'Relaxed', desc: 'Spacious & airy', icon: '▦' },
];

export function ThemePickerPanel() {
  const { isThemeOpen, setIsThemeOpen, currentTheme, setThemeId } = useApp();
  const t = currentTheme;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFrame, setSelectedFrame] = useState('rounded');
  const [selectedDensity, setSelectedDensity] = useState('default');
  const [selectedAccent, setSelectedAccent] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  // ── Export theme ────────────────────────────────────────
  const handleExport = () => {
    const exportData = {
      meta: { version: '1.0', app: '01deck', exported: new Date().toISOString() },
      themeId: currentTheme.id,
      accentOverride: selectedAccent,
      cardFrame: selectedFrame,
      density: selectedDensity,
      themeConfig: currentTheme,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `01deck-theme-${currentTheme.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  // ── Import theme ────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.meta || data.meta.app !== '01deck') {
          setImportError('Invalid 01deck theme file.');
          return;
        }
        if (data.themeId && themes[data.themeId as ThemeId]) {
          setThemeId(data.themeId as ThemeId);
        }
        if (data.cardFrame) setSelectedFrame(data.cardFrame);
        if (data.density) setSelectedDensity(data.density);
        if (data.accentOverride) setSelectedAccent(data.accentOverride);
      } catch {
        setImportError('Could not parse theme file.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isThemeOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 70 }}
            onClick={() => setIsThemeOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.34, 1.1, 0.64, 1] }}
            className="fixed right-0 bottom-0 overflow-y-auto"
            style={{
              top: 56,
              width: 360,
              background: t.surface1,
              borderLeft: `1px solid ${t.border}`,
              boxShadow: '-24px 0 64px rgba(0,0,0,0.4)',
              zIndex: 80,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 sticky top-0"
              style={{ background: t.surface1, borderBottom: `1px solid ${t.border}`, zIndex: 2 }}
            >
              <div>
                <h2 className="text-sm" style={{ color: t.text }}>Skin & Theme</h2>
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                  Customize your 01deck experience
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

            <div className="px-6 py-5 space-y-7">

              {/* ── Theme Skins ─────────────────────────────── */}
              <div>
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Base Skin
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
                          background: isActive ? `${t.accent}10` : t.surface2,
                          border: `1.5px solid ${isActive ? t.accent : t.border}`,
                        }}
                        whileHover={{ scale: 1.01, background: `${t.accent}08` }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex gap-1 flex-shrink-0">
                          {preview.map((p, i) => (
                            <div key={i} className="w-5 h-10 rounded-md overflow-hidden flex flex-col justify-between p-0.5"
                              style={{ background: p.bg }}>
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

              {/* ── Accent Color ─────────────────────────────── */}
              <div>
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Accent Color Override
                </div>
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_COLORS.map(({ hex, label }) => {
                    const isActive = selectedAccent === hex;
                    return (
                      <motion.button
                        key={hex}
                        title={label}
                        onClick={() => setSelectedAccent(isActive ? null : hex)}
                        className="relative w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          background: hex,
                          border: `3px solid ${isActive ? t.text : 'transparent'}`,
                          boxShadow: isActive ? `0 0 12px ${hex}80` : 'none',
                        }}
                        whileHover={{ scale: 1.18 }}
                        whileTap={{ scale: 0.88 }}
                      >
                        {isActive && (
                          <Check size={12} style={{ color: hex === '#ffffff' ? '#000' : '#fff', strokeWidth: 3 }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                {selectedAccent && (
                  <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
                    Accent override active — affects buttons & highlights
                  </p>
                )}
              </div>

              {/* ── Card Frame Style ─────────────────────────── */}
              <div>
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Card Frame Style
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CARD_FRAMES.map(frame => {
                    const isActive = selectedFrame === frame.id;
                    return (
                      <motion.button
                        key={frame.id}
                        onClick={() => setSelectedFrame(frame.id)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl"
                        style={{
                          background: isActive ? `${t.accent}12` : t.surface2,
                          border: `1.5px solid ${isActive ? t.accent : t.border}`,
                        }}
                        whileHover={{ scale: 1.04, background: `${t.accent}08` }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {/* Mini card preview */}
                        <div
                          className="w-8 h-6 flex items-center justify-center"
                          style={{
                            background: t.surface3,
                            border: `1px solid ${isActive ? t.accent : t.border}`,
                            borderRadius: frame.radius,
                          }}
                        >
                          {isActive && <Check size={10} style={{ color: t.accent }} />}
                        </div>
                        <span className="text-[10px]" style={{ color: isActive ? t.text : t.textMuted }}>
                          {frame.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* ── Density ──────────────────────────────────── */}
              <div>
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  List Density
                </div>
                <div className="flex gap-2">
                  {DENSITY_OPTIONS.map(opt => {
                    const isActive = selectedDensity === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        onClick={() => setSelectedDensity(opt.id)}
                        className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl"
                        style={{
                          background: isActive ? `${t.accent}12` : t.surface2,
                          border: `1.5px solid ${isActive ? t.accent : t.border}`,
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        {/* Density visual */}
                        <div className="flex flex-col gap-0.5 w-6">
                          {opt.id === 'compact' && [3, 3, 3, 3].map((_, i) => (
                            <div key={i} className="w-full h-0.5 rounded" style={{ background: isActive ? t.accent : t.textMuted, opacity: isActive ? 0.8 : 0.35 }} />
                          ))}
                          {opt.id === 'default' && [3, 3, 3].map((_, i) => (
                            <div key={i} className="w-full h-1 rounded" style={{ background: isActive ? t.accent : t.textMuted, opacity: isActive ? 0.8 : 0.35 }} />
                          ))}
                          {opt.id === 'relaxed' && [3, 3].map((_, i) => (
                            <div key={i} className="w-full h-1.5 rounded" style={{ background: isActive ? t.accent : t.textMuted, opacity: isActive ? 0.8 : 0.35 }} />
                          ))}
                        </div>
                        <span className="text-[10px]" style={{ color: isActive ? t.text : t.textMuted }}>{opt.label}</span>
                        <span className="text-[8px] text-center" style={{ color: t.textMuted }}>{opt.desc}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* ── Import / Export ──────────────────────────── */}
              <div>
                <div className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>
                  Theme Import / Export
                </div>

                {importError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-xs"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                  >
                    <AlertCircle size={12} />
                    {importError}
                  </motion.div>
                )}

                <div className="flex gap-2">
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs"
                    style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
                    whileHover={{ scale: 1.02, color: t.text, borderColor: t.accent }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Upload size={13} /> Import Theme
                  </motion.button>

                  <motion.button
                    onClick={handleExport}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs"
                    style={{
                      background: exportSuccess ? 'rgba(16,185,129,0.12)' : t.surface2,
                      border: `1px solid ${exportSuccess ? '#10b981' : t.border}`,
                      color: exportSuccess ? '#10b981' : t.textMuted,
                    }}
                    whileHover={{ scale: 1.02, color: t.text, borderColor: t.accent }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {exportSuccess ? <Check size={13} /> : <Download size={13} />}
                    {exportSuccess ? 'Exported!' : 'Export Theme'}
                  </motion.button>
                </div>

                <p className="text-[10px] mt-2 text-center" style={{ color: t.textMuted }}>
                  Exports .json with skin, accent, frame & density settings
                </p>
              </div>

              {/* ── Active summary ───────────────────────────── */}
              <div
                className="p-3 rounded-xl text-xs space-y-1"
                style={{ background: t.surface2, border: `1px solid ${t.border}` }}
              >
                <div className="flex justify-between">
                  <span style={{ color: t.textMuted }}>Skin</span>
                  <span style={{ color: t.text }}>{currentTheme.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: t.textMuted }}>Frame</span>
                  <span style={{ color: t.text }}>{CARD_FRAMES.find(f => f.id === selectedFrame)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: t.textMuted }}>Density</span>
                  <span style={{ color: t.text }}>{DENSITY_OPTIONS.find(d => d.id === selectedDensity)?.label}</span>
                </div>
                {selectedAccent && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: t.textMuted }}>Accent</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: selectedAccent }} />
                      <span style={{ color: t.text }}>{selectedAccent}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
