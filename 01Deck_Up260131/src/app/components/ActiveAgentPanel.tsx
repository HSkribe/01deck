import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrop } from 'react-dnd';
import { QRCodeCanvas } from 'qrcode.react';
import {
  X, Send, Bot, Minimize2, Maximize2, Share2,
  ChevronLeft, Gamepad2, BookOpen, Library,
  Copy, Check, Zap, GripVertical, Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent, rarityConfig } from '../data/agents';
import logoMark from 'figma:asset/2806ffa57bf19ee58103436cb23492abbee29bfd.png';

const PANEL_W = 360;
const PANEL_H = 520;
const FAB_SIZE = 56;
const FAB_MARGIN = 24;

// ─── QR back face ─────────────────────────────────────────
function QRFace({ agent }: { agent: Agent }) {
  const { currentTheme: t } = useApp();
  const config = rarityConfig[agent.rarity];
  const [copied, setCopied] = useState(false);
  const qrUrl = `https://01ai.ai/agent/${agent.protocolId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="text-center mb-5">
        <p className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: config.textColor }}>
          Share Agent Card
        </p>
        <p className="text-base" style={{ color: 'rgba(255,255,255,0.9)' }}>{agent.name}</p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.role}</p>
      </div>

      {/* QR with 01AI brand center */}
      <div
        className="relative p-4 rounded-2xl mb-5"
        style={{
          background: 'rgba(255,255,255,0.97)',
          boxShadow: `0 0 32px ${config.glowColor}, 0 0 8px rgba(0,0,0,0.3)`,
          border: `2px solid ${config.borderColor}`,
        }}
      >
        {agent.hasEvolution && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
            style={{ background: 'linear-gradient(90deg, #ff0080, #a855f7, #00cfff, #00ff88, #ff0080)' }}
            animate={{ backgroundPosition: ['0%', '200%'] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />
        )}
        <QRCodeCanvas
          value={qrUrl}
          size={180}
          level="H"
          fgColor="#0d0d14"
          bgColor="rgba(255,255,255,0)"
          imageSettings={{ src: logoMark, height: 34, width: 34, excavate: true }}
        />
      </div>

      {/* URL row */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl w-full mb-4"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <code className="flex-1 text-[10px] truncate font-mono" style={{ color: config.textColor }}>
          {qrUrl}
        </code>
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] flex-shrink-0"
          style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', color: copied ? '#10b981' : 'rgba(255,255,255,0.5)' }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Copied!' : 'Copy'}
        </motion.button>
      </div>

      <p className="text-[9px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Scan to view this agent on 01ai.ai
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────
export function ActiveAgentPanel() {
  const {
    isChatOpen, setIsChatOpen,
    chatAgent, setChatAgent,
    chatMessages, sendMessage,
    currentTheme: t,
    setIsArcadeOpen,
    setShowHub, setHubInitialView,
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - PANEL_W - FAB_MARGIN,
    y: window.innerHeight - PANEL_H - FAB_MARGIN - FAB_SIZE - 10,
  });
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const config = chatAgent ? rarityConfig[chatAgent.rarity] : null;

  // ── Shared drop handler ──────────────────────────────────
  const handleAgentDrop = useCallback((item: { agent: Agent }) => {
    setChatAgent(item.agent); // AppContext setChatAgent already calls setIsChatOpen(true)
  }, [setChatAgent]);

  // ── Drop target 1: The FAB (always in DOM) ──────────────
  const [{ isOverFab }, fabDrop] = useDrop({
    accept: 'AGENT',
    drop: handleAgentDrop,
    collect: monitor => ({ isOverFab: monitor.isOver() }),
  });

  // ── Drop target 2: The open panel ───────────────────────
  const [{ isOverPanel }, panelDrop] = useDrop({
    accept: 'AGENT',
    drop: handleAgentDrop,
    collect: monitor => ({ isOverPanel: monitor.isOver() }),
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Reset flip/minimize when panel closes
  useEffect(() => {
    if (!isChatOpen) { setIsFlipped(false); setIsMinimized(false); }
  }, [isChatOpen]);

  // Window drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingWindow(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingWindow) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - PANEL_W, e.clientX - dragOffset.current.x)),
        y: Math.max(58, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => setIsDraggingWindow(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDraggingWindow]);

  const handleSend = () => {
    if (!inputText.trim() || !chatAgent) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const navTo = (section: string | null) => {
    setHubInitialView(section);
    setShowHub(true);
  };

  const isActive = isOverFab || isOverPanel;

  return (
    <>
      {/* ──────────────────────────────────────────────────────
          FLOATING PANEL (chat + QR flip)
      ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            ref={panelDrop as unknown as React.Ref<HTMLDivElement>}
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed z-[200] rounded-2xl"
            style={{
              left: position.x,
              top: position.y,
              width: PANEL_W,
              height: isMinimized ? 'auto' : PANEL_H,
              perspective: 1200,
              // No overflow:hidden here — it blocks DnD hit-testing
            }}
          >
            {/* Drop-over highlight ring */}
            {isOverPanel && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 rounded-2xl pointer-events-none z-[10]"
                style={{ border: `2px dashed ${config?.borderColor ?? t.accent}`, background: 'rgba(255,255,255,0.03)' }}
              />
            )}

            {/* Card flip container */}
            <motion.div
              className="relative w-full h-full"
              style={{ transformStyle: 'preserve-3d', borderRadius: 16 }}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.55, ease: [0.43, 0.13, 0.23, 0.96] }}
            >

              {/* ── FRONT: Chat ──────────────────────────── */}
              <div
                className="absolute inset-0 flex flex-col rounded-2xl overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  background: t.surface1,
                  border: `1px solid ${isOverPanel ? (config?.borderColor ?? t.accent) : (config?.borderColor ?? t.border)}`,
                  boxShadow: `0 24px 64px rgba(0,0,0,0.65)${config ? `, 0 0 30px ${config.glowColor}` : ''}`,
                }}
              >
                {/* Rarity top edge */}
                {config && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 z-10"
                    style={{ background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` }} />
                )}

                {/* Drop overlay label */}
                {isOverPanel && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl pointer-events-none"
                    style={{ background: 'rgba(0,0,0,0.45)' }}
                  >
                    <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: t.surface2, border: `1px solid ${t.accent}`, color: t.text }}>
                      Drop to activate agent
                    </div>
                  </motion.div>
                )}

                {/* Title bar (draggable) */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-move select-none flex-shrink-0"
                  style={{ background: t.surface2, borderBottom: `1px solid ${t.border}` }}
                  onMouseDown={handleDragStart}
                >
                  <GripVertical size={12} style={{ color: t.textMuted, flexShrink: 0 }} />

                  {chatAgent ? (
                    <>
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                        style={{ border: `1.5px solid ${config?.borderColor ?? t.border}`, boxShadow: `0 0 8px ${config?.glowColor}` }}>
                        <img src={chatAgent.portrait} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs" style={{ color: t.text }}>{chatAgent.name}</div>
                        <div className="text-[9px]" style={{ color: config?.textColor ?? t.textMuted }}>{chatAgent.role}</div>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: chatAgent.online ? '#22c55e' : '#6b7280' }} />
                    </>
                  ) : (
                    <>
                      <Bot size={13} style={{ color: t.textMuted }} />
                      <span className="flex-1 text-xs" style={{ color: t.textMuted }}>
                        Active Agent · Drag an agent here
                      </span>
                    </>
                  )}

                  <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                    {chatAgent && (
                      <motion.button onClick={() => setIsFlipped(true)} title="Share QR"
                        className="p-1.5 rounded-lg" style={{ color: t.textMuted }}
                        whileHover={{ scale: 1.1, color: config?.textColor ?? t.accent }} whileTap={{ scale: 0.9 }}>
                        <Share2 size={11} />
                      </motion.button>
                    )}
                    <motion.button onClick={() => setIsMinimized(m => !m)}
                      className="p-1.5 rounded-lg" style={{ color: t.textMuted }}
                      whileHover={{ scale: 1.1, color: t.text }} whileTap={{ scale: 0.9 }}>
                      {isMinimized ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
                    </motion.button>
                    <motion.button onClick={() => setIsChatOpen(false)}
                      className="p-1.5 rounded-lg" style={{ color: t.textMuted }}
                      whileHover={{ scale: 1.1, color: '#ef4444' }} whileTap={{ scale: 0.9 }}>
                      <X size={11} />
                    </motion.button>
                  </div>
                </div>

                {/* Chat body */}
                {!isMinimized && (
                  <>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                      {!chatAgent ? (
                        <div className="flex flex-col items-center justify-center h-full py-10">
                          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                            <Bot size={32} style={{ color: t.textMuted, opacity: 0.35 }} />
                          </motion.div>
                          <p className="text-xs mt-3 text-center max-w-[220px] leading-relaxed" style={{ color: t.textMuted }}>
                            Click <strong style={{ color: t.text }}>Chat</strong> on any agent, or drag an agent card and drop it here
                          </p>
                          <motion.div
                            className="mt-5 w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ border: `1.5px dashed ${t.border}` }}
                            animate={{ borderColor: [t.border, t.accent, t.border], scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 2.5 }}
                          >
                            <Zap size={18} style={{ color: t.textMuted, opacity: 0.4 }} />
                          </motion.div>
                        </div>
                      ) : (
                        <>
                          {chatMessages.map(msg => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              {msg.role === 'agent' && (
                                <div className="w-5 h-5 rounded-full overflow-hidden mr-1.5 flex-shrink-0 mt-0.5"
                                  style={{ border: `1px solid ${config?.borderColor ?? t.border}` }}>
                                  <img src={chatAgent.portrait} className="w-full h-full object-cover" alt="" />
                                </div>
                              )}
                              <div
                                className="max-w-[76%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                                style={{
                                  background: msg.role === 'user' ? `${t.accent}18` : t.surface2,
                                  border: `1px solid ${t.border}`,
                                  color: t.text,
                                }}
                              >
                                {msg.content}
                              </div>
                            </motion.div>
                          ))}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
                      style={{ borderTop: `1px solid ${t.border}`, background: t.surface2 }}>
                      <input
                        type="text"
                        placeholder={chatAgent ? `Message ${chatAgent.name}...` : 'Activate an agent first...'}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKey}
                        disabled={!chatAgent}
                        className="flex-1 bg-transparent outline-none text-xs"
                        style={{ color: t.text }}
                      />
                      <motion.button
                        onClick={handleSend}
                        disabled={!chatAgent || !inputText.trim()}
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: inputText.trim() && chatAgent ? (config?.color ?? t.accent) : t.surface3,
                          color: 'rgba(255,255,255,0.9)',
                          opacity: inputText.trim() && chatAgent ? 1 : 0.4,
                        }}
                        whileHover={{ scale: inputText.trim() && chatAgent ? 1.08 : 1 }}
                        whileTap={{ scale: 0.93 }}
                      >
                        <Send size={11} />
                      </motion.button>
                    </div>

                    {/* Bottom nav shortcuts */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0"
                      style={{ borderTop: `1px solid ${t.border}`, background: t.surface1 }}
                    >
                      <span className="text-[9px] uppercase tracking-wider mr-1 flex-shrink-0" style={{ color: t.textMuted }}>
                        Go to:
                      </span>
                      {[
                        { icon: Gamepad2, label: 'Arcade', color: '#a855f7', action: () => setIsArcadeOpen(true) },
                        { icon: BookOpen, label: 'Learn', color: '#06b6d4', action: () => navTo('learn') },
                        { icon: Library, label: 'Library', color: '#10b981', action: () => navTo('library') },
                        { icon: Users, label: 'Hub', color: '#a855f7', action: () => navTo(null) },
                      ].map(({ icon: Icon, label, color, action }) => (
                        <motion.button
                          key={label}
                          onClick={action}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] flex-1"
                          style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
                          whileHover={{ scale: 1.04, color, borderColor: `${color}50`, background: `${color}0d` }}
                          whileTap={{ scale: 0.96 }}
                        >
                          <Icon size={10} />
                          <span>{label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ── BACK: QR code ──────────────────────────── */}
              <div
                className="absolute inset-0 flex flex-col rounded-2xl overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: config ? config.cardBg : 'linear-gradient(160deg,#1a1f2e,#0f1318)',
                  border: `1px solid ${config?.borderColor ?? t.border}`,
                  boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 40px ${config?.glowColor ?? 'rgba(0,0,0,0.2)'}`,
                }}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
                  style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <motion.button
                    onClick={() => setIsFlipped(false)}
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                    whileHover={{ color: 'rgba(255,255,255,0.9)' }}
                  >
                    <ChevronLeft size={14} /> Back
                  </motion.button>
                  <div className="flex-1" />
                  <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: config?.textColor ?? 'rgba(255,255,255,0.4)' }}>
                    01AI.AI · Agent QR
                  </span>
                </div>
                {chatAgent && <QRFace agent={chatAgent} />}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────
          FAB — always visible, always a drop target
      ────────────────────────────────────────────────────── */}
      <div
        ref={fabDrop as unknown as React.Ref<HTMLDivElement>}
        className="fixed"
        style={{
          right: FAB_MARGIN,
          bottom: FAB_MARGIN,
          width: FAB_SIZE,
          height: FAB_SIZE,
          zIndex: 9990,
          pointerEvents: 'all',
        }}
      >
        <button
          onClick={() => setIsChatOpen(c => !c)}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 16,
            overflow: 'hidden',
            cursor: 'pointer',
            background: isOverFab
              ? `rgba(255,255,255,0.15)`
              : chatAgent
                ? `linear-gradient(135deg, ${config!.color}30, ${config!.color}12)`
                : `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))`,
            border: isOverFab
              ? `2px dashed ${config?.borderColor ?? t.accent}`
              : `1.5px solid ${chatAgent ? config!.borderColor : 'rgba(255,255,255,0.2)'}`,
            boxShadow: isOverFab
              ? `0 0 28px ${config?.glowColor ?? 'rgba(255,255,255,0.2)'}`
              : chatAgent
                ? `0 8px 32px ${config!.glowColor}, 0 0 0 1px ${config!.borderColor}30`
                : `0 8px 28px rgba(0,0,0,0.45)`,
            backdropFilter: 'blur(12px)',
            transition: 'border 0.15s, background 0.15s, box-shadow 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isOverFab ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              <Zap size={22} style={{ color: config?.textColor ?? t.accent }} />
            </motion.div>
          ) : chatAgent ? (
            <>
              <img src={chatAgent.portrait} alt={chatAgent.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
              {/* Rarity glow inner ring */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none',
                boxShadow: `inset 0 0 12px ${config!.glowColor}`,
              }} />
              {/* Status dot */}
              <div style={{
                position: 'absolute', bottom: 2, right: 2, width: 14, height: 14,
                borderRadius: '50%', background: t.surface1, border: `1.5px solid ${t.bg}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: isChatOpen ? t.accent : (chatAgent.online ? '#22c55e' : '#6b7280'),
                }} />
              </div>
            </>
          ) : (
            <>
              <Bot size={22} style={{ color: 'rgba(255,255,255,0.45)' }} />
              <motion.div
                style={{
                  position: 'absolute', inset: 0, borderRadius: 16,
                  border: '1.5px dashed rgba(255,255,255,0.18)', pointerEvents: 'none',
                }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </>
          )}
        </button>

        {/* "Drop here" tooltip during drag */}
        <AnimatePresence>
          {isOverFab && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              style={{
                position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
                padding: '6px 10px', borderRadius: 12, whiteSpace: 'nowrap', fontSize: 10,
                background: t.surface2, border: `1px solid ${config?.borderColor ?? t.accent}`,
                color: t.text, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
              }}
            >
              Drop to activate agent
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}