import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Trophy, RefreshCw, Star } from 'lucide-react';

const SYMBOLS = ['⊕', '⊗', '∞', 'Ω', 'Δ', 'Σ', '∫', 'π'];
const SYMBOL_COLORS = [
  '#ff6b6b', '#ffd700', '#00ff88', '#00cfff',
  '#b44fff', '#ff9f40', '#4fc3f7', '#f06292',
];

interface CardTile {
  id: number;
  symbol: string;
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function createBoard(): CardTile[] {
  const pairs = SYMBOLS.map((s, i) => [
    { id: i * 2, symbol: s, color: SYMBOL_COLORS[i], isFlipped: false, isMatched: false },
    { id: i * 2 + 1, symbol: s, color: SYMBOL_COLORS[i], isFlipped: false, isMatched: false },
  ]).flat();
  // Shuffle
  return pairs.sort(() => Math.random() - 0.5);
}

export function ProtocolMatch() {
  const { currentTheme: t } = useApp();
  const [board, setBoard] = useState<CardTile[]>(createBoard);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);

  // Timer
  useEffect(() => {
    if (!running || won) return;
    const interval = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [running, won]);

  const handleCardClick = useCallback((id: number) => {
    const card = board.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched || selected.length >= 2) return;
    if (!running) setRunning(true);

    const newSelected = [...selected, id];
    setBoard(prev => prev.map(c => c.id === id ? { ...c, isFlipped: true } : c));
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newSelected.map(sid => board.find(c => c.id === sid)!);
      if (first.symbol === second.symbol) {
        // Match!
        setTimeout(() => {
          setBoard(prev => prev.map(c =>
            c.id === first.id || c.id === second.id ? { ...c, isMatched: true } : c
          ));
          setSelected([]);
          // Check win
          const totalMatched = board.filter(c => c.isMatched).length + 2;
          if (totalMatched === board.length) {
            setWon(true);
            setRunning(false);
            setScore(Math.max(0, 500 - time * 5 - moves * 3));
          }
        }, 400);
      } else {
        // No match - flip back
        setTimeout(() => {
          setBoard(prev => prev.map(c =>
            c.id === first.id || c.id === second.id ? { ...c, isFlipped: false } : c
          ));
          setSelected([]);
        }, 800);
      }
    }
  }, [board, selected, running, time, moves]);

  const handleReset = () => {
    setBoard(createBoard());
    setSelected([]);
    setMoves(0);
    setTime(0);
    setRunning(false);
    setWon(false);
    setScore(0);
  };

  const matched = board.filter(c => c.isMatched).length / 2;

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-4 px-1">
        <div>
          <div className="text-sm" style={{ color: t.text }}>Protocol Match</div>
          <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            {matched}/8 matched · {moves} moves · {time}s
          </div>
        </div>
        <motion.button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: t.surface3,
            border: `1px solid ${t.border}`,
            color: t.textMuted,
          }}
          whileHover={{ scale: 1.05, color: t.text }}
        >
          <RefreshCw size={12} />
          Reset
        </motion.button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full mb-4 overflow-hidden" style={{ background: t.surface3 }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #00ff88, #00cfff)' }}
          animate={{ width: `${(matched / 8) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Board */}
      <div className="grid grid-cols-4 gap-2">
        {board.map(card => (
          <motion.button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl relative overflow-hidden"
            style={{
              background: card.isFlipped || card.isMatched ? `${card.color}18` : t.surface2,
              border: `1.5px solid ${card.isMatched ? card.color : card.isFlipped ? card.color + '80' : t.border}`,
              boxShadow: card.isMatched ? `0 0 12px ${card.color}50` : 'none',
              cursor: card.isMatched ? 'default' : 'pointer',
            }}
            whileHover={!card.isFlipped && !card.isMatched ? { scale: 1.05 } : {}}
            whileTap={!card.isFlipped && !card.isMatched ? { scale: 0.95 } : {}}
          >
            <AnimatePresence mode="wait">
              {card.isFlipped || card.isMatched ? (
                <motion.span
                  key="symbol"
                  initial={{ rotateY: -90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  style={{ color: card.color }}
                >
                  {card.symbol}
                </motion.span>
              ) : (
                <motion.div
                  key="back"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-mono"
                  style={{ color: t.textMuted }}
                >
                  01
                </motion.div>
              )}
            </AnimatePresence>
            {card.isMatched && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ background: `${card.color}10` }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Win state */}
      <AnimatePresence>
        {won && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mt-6 p-4 rounded-xl text-center w-full"
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,207,255,0.1))',
              border: '1px solid rgba(0,255,136,0.3)',
            }}
          >
            <Trophy size={24} className="mx-auto mb-2" style={{ color: '#ffd700' }} />
            <div className="text-sm" style={{ color: t.text }}>Protocol Matched!</div>
            <div className="text-xs mt-1" style={{ color: t.textMuted }}>
              Score: <span style={{ color: '#ffd700' }}>{score}</span> · {moves} moves · {time}s
            </div>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(Math.min(5, Math.ceil(score / 100)))].map((_, i) => (
                <Star key={i} size={14} fill="#ffd700" style={{ color: '#ffd700' }} />
              ))}
            </div>
            <div className="text-xs mt-2" style={{ color: 'rgba(0,255,136,0.7)' }}>
              +Cosmetic border unlocked!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
