import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrop } from 'react-dnd';
import { X, Send, Bot, GripVertical, Minimize2, Maximize2, KeyRound, LoaderCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent, rarityConfig } from '../data/agents';

function getInitialChatWindowPosition() {
  if (typeof window === 'undefined') {
    return { x: 24, y: 80 };
  }

  return { x: window.innerWidth - 420, y: 80 };
}

export function ChatWindow() {
  const {
    isChatOpen, setIsChatOpen,
    chatAgent, setChatAgent,
    chatMessages, sendMessage,
    llmModel, setLlmModel,
    backendStatus, chatResponseSource, refreshBackendStatus, authenticateBackend, logoutBackend,
    isChatStreaming,
    currentTheme: t,
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [betaToken, setBetaToken] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [position, setPosition] = useState(getInitialChatWindowPosition);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Drop zone for agent cards
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'AGENT',
    drop: (item: { agent: Agent }) => {
      setChatAgent(item.agent);
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Window drag
  const handleWindowMouseDown = (e: React.MouseEvent) => {
    setIsDraggingWindow(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingWindow) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 380, e.clientX - dragOffset.current.x)),
        y: Math.max(56, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y)),
      });
    };
    const handleMouseUp = () => setIsDraggingWindow(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWindow]);

  const config = chatAgent ? rarityConfig[chatAgent.rarity] : null;

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
          ref={drop as unknown as React.Ref<HTMLDivElement>}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed z-40 flex flex-col rounded-2xl overflow-hidden"
          style={{
            left: position.x,
            top: position.y,
            width: 380,
            height: isMinimized ? 'auto' : 520,
            background: t.surface1,
            border: `1px solid ${isOver ? (config?.borderColor || t.accent) : t.border}`,
            boxShadow: isOver
              ? `0 0 32px ${config?.glowColor || 'rgba(255,255,255,0.2)'}`
              : '0 24px 64px rgba(0,0,0,0.6)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          {/* Drag zone indicator */}
          {isOver && !chatAgent && (
            <motion.div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="px-4 py-2 rounded-xl text-sm"
                style={{
                  background: t.surface3,
                  border: `1px solid ${t.accent}`,
                  color: t.text,
                }}
              >
                Drop agent to start chat
              </div>
            </motion.div>
          )}

          {/* Title bar */}
          <div
            className="flex items-center gap-2 px-4 py-3 cursor-move select-none flex-shrink-0"
            style={{
              background: t.surface2,
              borderBottom: `1px solid ${t.border}`,
            }}
            onMouseDown={handleWindowMouseDown}
          >
            <GripVertical size={14} style={{ color: t.textMuted }} />

            {chatAgent ? (
              <>
                <div
                  className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                  style={{
                    border: `1.5px solid ${config?.borderColor || t.border}`,
                  }}
                >
                  <img src={chatAgent.portrait} alt={chatAgent.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs" style={{ color: t.text }}>{chatAgent.name}</div>
                  <div className="text-xs" style={{ color: t.textMuted }}>{chatAgent.role}</div>
                </div>
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: chatAgent.online ? '#22c55e' : '#6b7280' }}
                />
              </>
            ) : (
              <>
                <Bot size={14} style={{ color: t.textMuted }} />
                <span className="text-xs flex-1" style={{ color: t.textMuted }}>
                  Agent Chat · Drop an agent card here
                </span>
              </>
            )}

            {/* Honest source indicator: never let a simulated reply look
                like it came from a live model. */}
            <span
              className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={
                chatResponseSource === 'local'
                  ? { background: 'rgba(234,179,8,0.14)', border: '1px solid rgba(234,179,8,0.35)', color: '#facc15' }
                  : { background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80' }
              }
              title={
                chatResponseSource === 'local'
                  ? 'No live model connected — replies are simulated locally, not generated by an LLM.'
                  : chatResponseSource === 'direct-key'
                    ? 'Replies are generated live via your configured provider API key.'
                    : 'Replies are generated live via the connected backend.'
              }
            >
              {chatResponseSource === 'local' ? 'Simulated' : 'Live'}
            </span>

            <div className="flex items-center gap-1 ml-2">
              <motion.button
                type="button"
                onClick={() => setShowModelSettings(value => !value)}
                className="p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ color: backendStatus === 'ready' ? t.accent : t.textMuted }}
                whileHover={{ color: t.text, scale: 1.1 }}
                title={backendStatus === 'ready' ? 'Backend chat connected' : 'Connection settings'}
                aria-label={backendStatus === 'ready' ? 'Backend chat connected — open connection settings' : 'Open connection settings'}
                aria-expanded={showModelSettings}
              >
                <KeyRound size={12} />
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setIsMinimized(m => !m)}
                className="p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ color: t.textMuted }}
                whileHover={{ color: t.text, scale: 1.1 }}
                aria-label={isMinimized ? 'Expand chat window' : 'Minimize chat window'}
              >
                {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ color: t.textMuted }}
                whileHover={{ color: '#ef4444', scale: 1.1 }}
                aria-label="Close chat window"
              >
                <X size={12} />
              </motion.button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              {showModelSettings && (
                <div
                  className="px-4 py-3 space-y-2"
                  style={{
                    borderBottom: `1px solid ${t.border}`,
                    background: t.surface2,
                  }}
                >
                  <div className="text-[11px]" style={{ color: t.text }}>
                    Backend chat
                  </div>
                  <div className="text-[11px]" style={{ color: t.textMuted }}>
                    {chatResponseSource === 'local'
                      ? 'No live model is connected right now — chat replies are simulated locally, not generated by an LLM.'
                      : 'Server-backed chat keeps provider keys off the client. Without a beta session, chat falls back to the local responder.'}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 rounded-lg px-3 py-2 text-[11px]"
                      style={{
                        color:
                          backendStatus === 'ready' ? '#4ade80'
                          : backendStatus === 'unreachable' || backendStatus === 'error' ? '#f87171'
                          : t.textMuted,
                        border: `1px solid ${t.border}`,
                        background: t.surface1,
                      }}
                    >
                      {backendStatus === 'checking' && 'Checking backend...'}
                      {backendStatus === 'unreachable' && 'Backend unreachable — is it running?'}
                      {backendStatus === 'error' && 'Backend returned an unexpected error.'}
                      {backendStatus === 'not-configured' && 'Backend auth disabled for this environment.'}
                      {backendStatus === 'auth-required' && 'Beta session required.'}
                      {backendStatus === 'ready' && 'Beta session active.'}
                    </div>
                    {backendStatus === 'unreachable' || backendStatus === 'error' ? (
                      <button
                        type="button"
                        onClick={() => void refreshBackendStatus()}
                        className="rounded-lg px-3 py-2 text-[11px]"
                        style={{
                          color: t.text,
                          border: `1px solid ${t.border}`,
                          background: t.surface1,
                        }}
                      >
                        Retry
                      </button>
                    ) : null}
                    {backendStatus === 'ready' ? (
                      <button
                        type="button"
                        onClick={() => void logoutBackend()}
                        className="rounded-lg px-3 py-2 text-[11px]"
                        style={{
                          color: t.text,
                          border: `1px solid ${t.border}`,
                          background: t.surface1,
                        }}
                      >
                        Disconnect
                      </button>
                    ) : null}
                  </div>
                  {backendStatus === 'auth-required' ? (
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="password"
                        placeholder="Beta access token"
                        aria-label="Beta access token"
                        value={betaToken}
                        onChange={event => setBetaToken(event.target.value)}
                        className="bg-transparent outline-none text-xs rounded-lg px-3 py-2"
                        style={{
                          color: t.text,
                          border: `1px solid ${t.border}`,
                          background: t.surface1,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!betaToken.trim()) return;
                          void authenticateBackend(betaToken).then(ok => {
                            if (ok) setBetaToken('');
                          });
                        }}
                        className="rounded-lg px-3 py-2 text-[11px]"
                        style={{
                          color: t.text,
                          border: `1px solid ${t.border}`,
                          background: t.surface1,
                        }}
                      >
                        Connect
                      </button>
                    </div>
                  ) : null}
                  <input
                    type="text"
                    placeholder="Model"
                    aria-label="Model identifier"
                    value={llmModel}
                    onChange={event => setLlmModel(event.target.value)}
                    className="w-full bg-transparent outline-none text-xs rounded-lg px-3 py-2"
                    style={{
                      color: t.text,
                      border: `1px solid ${t.border}`,
                      background: t.surface1,
                    }}
                  />
                  {chatResponseSource !== 'direct-key' && (
                    <div className="text-[10px]" style={{ color: t.textMuted }}>
                      Prefer to use your own provider API key instead of the backend? That's supported (Gemini, OpenAI, Anthropic, OpenRouter, Groq, DeepSeek) but not yet exposed here — see "Chat Backend Configuration" in the README.
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!chatAgent ? (
                  <div className="flex flex-col items-center justify-center h-full py-8">
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Bot size={36} style={{ color: t.textMuted, opacity: 0.4 }} />
                    </motion.div>
                    <p className="text-xs mt-3 text-center max-w-[200px]" style={{ color: t.textMuted }}>
                      Drag an agent card from the list into this window to start a conversation
                    </p>
                  </div>
                ) : (
                  <>
                    {chatMessages.map(msg => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'agent' && (
                          <div
                            className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0 mt-0.5"
                            style={{ border: `1px solid ${config?.borderColor || t.border}` }}
                          >
                            <img src={chatAgent.portrait} className="w-full h-full object-cover" alt="" />
                          </div>
                        )}
                        <div
                          className="max-w-[75%] px-3 py-2 rounded-xl text-xs"
                          style={{
                            background: msg.role === 'user'
                              ? `${t.accent}18`
                              : t.surface2,
                            border: `1px solid ${msg.role === 'user' ? t.border : t.border}`,
                            color: t.text,
                            lineHeight: 1.5,
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
              <div
                className="flex items-center gap-2 p-3"
                style={{
                  borderTop: `1px solid ${t.border}`,
                  background: t.surface2,
                }}
              >
                <input
                  type="text"
                  placeholder={
                    chatAgent
                      ? isChatStreaming
                        ? `${chatAgent.name} is responding...`
                        : `Message ${chatAgent.name}...`
                      : 'Drop an agent to begin...'
                  }
                  aria-label={chatAgent ? `Message ${chatAgent.name}` : 'Chat message (select an agent first)'}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!chatAgent || isChatStreaming}
                  className="flex-1 bg-transparent outline-none text-xs disabled:cursor-not-allowed"
                  style={{ color: t.text }}
                />
                <motion.button
                  type="button"
                  onClick={handleSend}
                  disabled={!chatAgent || !inputText.trim() || isChatStreaming}
                  aria-label={isChatStreaming ? `Waiting for ${chatAgent?.name ?? 'agent'} to respond` : 'Send message'}
                  className="w-8 h-8 rounded-lg flex items-center justify-center disabled:cursor-not-allowed"
                  style={{
                    background: inputText.trim() && chatAgent && !isChatStreaming ? t.accent : t.surface3,
                    color: inputText.trim() && chatAgent && !isChatStreaming ? t.bg : t.textMuted,
                    opacity: inputText.trim() && chatAgent && !isChatStreaming ? 1 : 0.5,
                  }}
                  whileHover={{ scale: inputText.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isChatStreaming ? (
                    <LoaderCircle size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
