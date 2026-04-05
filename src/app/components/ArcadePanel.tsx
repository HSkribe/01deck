import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrop } from 'react-dnd';
import { X, Gamepad2, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProtocolMatch } from './games/ProtocolMatch';
import { AgentChess } from './games/AgentChess';
import { AgentChoice } from './games/AgentChoice';
import { Agent } from '../data/agents';

type GameTab = 'menu' | 'protocol-match' | 'chess' | 'agent-choice';

const GAMES = [
  {
    id: 'protocol-match' as const,
    icon: '⊕',
    name: 'Protocol Match',
    description: 'Match 01Protocol symbols in under 30 seconds. Unlock cosmetic borders.',
    difficulty: 'Easy',
    time: '30s',
    reward: 'Border skin',
  },
  {
    id: 'chess' as const,
    icon: '♟',
    name: 'Agent Chess',
    description: 'Challenge your agent to a game of chess. Classic rules apply.',
    difficulty: 'Medium',
    time: 'Open',
    reward: 'XP boost',
  },
  {
    id: 'agent-choice' as const,
    icon: '🧩',
    name: 'Agent Choice',
    description: 'Let your agent design the game. Save favorites for future play and sharing.',
    difficulty: 'Varies',
    time: 'Varies',
    reward: 'Custom game',
  },
];

export function ArcadePanel() {
  const { isArcadeOpen, setIsArcadeOpen, currentTheme: t, chatAgent, setChatAgent } = useApp();
  const [activeGame, setActiveGame] = useState<GameTab>('menu');
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'AGENT',
    drop: (item: { agent: Agent }) => {
      setChatAgent(item.agent);
      if (activeGame === 'menu') {
        setActiveGame('agent-choice');
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleClose = () => {
    setIsArcadeOpen(false);
    setTimeout(() => setActiveGame('menu'), 300);
  };

  return (
    <AnimatePresence>
      {isArcadeOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            ref={drop as unknown as React.Ref<HTMLDivElement>}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.34, 1.1, 0.64, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: t.surface1,
              borderTop: `1px solid ${t.border}`,
              maxHeight: '85vh',
            }}
            onClick={e => e.stopPropagation()}
          >
            {isOver && canDrop && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
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
                  Drop agent to play in Arcade
                </div>
              </motion.div>
            )}
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 rounded-full" style={{ background: t.surface3 }} />
            </div>

            {/* Header */}
            <div
              className="flex items-center justify-between px-6 pb-4"
              style={{ borderBottom: `1px solid ${t.border}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))',
                    border: '1px solid rgba(168,85,247,0.3)',
                  }}
                >
                  <Gamepad2 size={18} style={{ color: '#a855f7' }} />
                </div>
                <div>
                  <h2 className="text-sm" style={{ color: t.text }}>Arcade Lab</h2>
                  <p className="text-xs" style={{ color: t.textMuted }}>
                    {chatAgent ? `Playing with ${chatAgent.name}` : 'Solo play · Drop an agent into chat to play together'}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
                whileHover={{ scale: 1.05, color: t.text }}
              >
                <X size={14} />
              </motion.button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 100px)' }}>
              <AnimatePresence mode="wait">
                {activeGame === 'menu' ? (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-6"
                  >
                    {/* Game grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {GAMES.map((game, idx) => (
                        <motion.button
                          key={game.id}
                          onClick={() => setActiveGame(game.id)}
                          className="p-5 rounded-2xl text-left relative overflow-hidden"
                          style={{
                            background: t.surface2,
                            border: `1px solid ${t.border}`,
                          }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          whileHover={{
                            scale: 1.02,
                            borderColor: t.accent,
                            boxShadow: `0 8px 32px ${t.glow}`,
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* Background decoration */}
                          <div
                            className="absolute top-2 right-3 text-5xl opacity-[0.07] pointer-events-none select-none"
                            style={{ fontFamily: 'system-ui' }}
                          >
                            {game.icon}
                          </div>

                          <div className="text-3xl mb-3">{game.icon}</div>
                          <h3 className="text-sm mb-1" style={{ color: t.text }}>{game.name}</h3>
                          <p className="text-xs mb-3" style={{ color: t.textMuted, lineHeight: 1.5 }}>
                            {game.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                background: t.surface3,
                                color: t.textMuted,
                              }}
                            >
                              {game.difficulty}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                background: t.surface3,
                                color: t.textMuted,
                              }}
                            >
                              ⏱ {game.time}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                              style={{
                                background: 'rgba(250,204,21,0.1)',
                                color: '#facc15',
                              }}
                            >
                              <Star size={9} />
                              {game.reward}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    {/* External games section */}
                    <div
                      className="mt-6 p-4 rounded-xl"
                      style={{
                        background: t.surface2,
                        border: `1px dashed ${t.border}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: t.textMuted }} />
                        <span className="text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>
                          External Game Slots
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: t.textMuted, lineHeight: 1.6 }}>
                        Connect to the 01Protocol game registry to load additional games developed by the community. Plug-and-play compatible.
                      </p>
                      <motion.button
                        className="mt-3 text-xs px-3 py-1.5 rounded-lg"
                        style={{
                          background: t.surface3,
                          border: `1px solid ${t.border}`,
                          color: t.textMuted,
                        }}
                        whileHover={{ color: t.text }}
                      >
                        Browse Registry →
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeGame}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="p-6"
                  >
                    {/* Back button */}
                    <motion.button
                      onClick={() => setActiveGame('menu')}
                      className="flex items-center gap-1.5 mb-4 text-xs"
                      style={{ color: t.textMuted }}
                      whileHover={{ color: t.text, x: -2 }}
                    >
                      ← Back to Arcade
                    </motion.button>

                    {activeGame === 'protocol-match' && <ProtocolMatch />}
                    {activeGame === 'chess' && <AgentChess />}
                    {activeGame === 'agent-choice' && <AgentChoice />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
