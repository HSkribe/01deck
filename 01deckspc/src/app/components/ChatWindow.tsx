import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrop } from 'react-dnd';
import { X, Send, Bot, GripVertical, Minimize2, Maximize2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent, rarityConfig } from '../data/agents';

export function ChatWindow() {
  const {
    isChatOpen, setIsChatOpen,
    chatAgent, setChatAgent,
    chatMessages, sendMessage,
    currentTheme: t,
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
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

            <div className="flex items-center gap-1 ml-2">
              <motion.button
                onClick={() => setIsMinimized(m => !m)}
                className="p-1 rounded"
                style={{ color: t.textMuted }}
                whileHover={{ color: t.text, scale: 1.1 }}
              >
                {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
              </motion.button>
              <motion.button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded"
                style={{ color: t.textMuted }}
                whileHover={{ color: '#ef4444', scale: 1.1 }}
              >
                <X size={12} />
              </motion.button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
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
                  placeholder={chatAgent ? `Message ${chatAgent.name}...` : 'Drop an agent to begin...'}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!chatAgent}
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: t.text }}
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!chatAgent || !inputText.trim()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: inputText.trim() && chatAgent ? t.accent : t.surface3,
                    color: inputText.trim() && chatAgent ? t.bg : t.textMuted,
                    opacity: inputText.trim() && chatAgent ? 1 : 0.5,
                  }}
                  whileHover={{ scale: inputText.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={13} />
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
