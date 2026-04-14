import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';

const HS_KEY = 'voidpulse_hs';

interface Pulse {
  id: number;
  x: number;      // px from left edge
  y: number;      // px from top edge
  spawnedAt: number;
  duration: number; // ms to fully fade
}

type GameState = 'idle' | 'playing' | 'gameover';

function getLevel(score: number): number {
  return Math.floor(score / 5) + 1;
}

function getFadeDuration(score: number): number {
  const level = getLevel(score);
  return Math.max(800, 2000 - (level - 1) * 200);
}

function getSpawnInterval(score: number): number {
  const level = getLevel(score);
  return Math.max(600, 1800 - (level - 1) * 200);
}

function getMaxPulses(score: number): number {
  const level = getLevel(score);
  return Math.min(3, 1 + Math.floor((level - 1) / 2));
}

let nextId = 0;

export function VoidPulse() {
  const { currentTheme: t, chatAgent } = useApp();

  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(HS_KEY) || '0', 10); } catch { return 0; }
  });
  const [pulses, setPulses] = useState<Pulse[]>([]);

  const arenaRef = useRef<HTMLDivElement>(null);
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const gameStateRef = useRef<GameState>('idle');

  // Keep refs in sync
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const stopAll = useCallback(() => {
    if (spawnIntervalRef.current) { clearInterval(spawnIntervalRef.current); spawnIntervalRef.current = null; }
    if (tickIntervalRef.current) { clearInterval(tickIntervalRef.current); tickIntervalRef.current = null; }
  }, []);

  const endGame = useCallback((finalScore: number) => {
    stopAll();
    setGameState('gameover');
    setHighScore(prev => {
      const hs = Math.max(prev, finalScore);
      try { localStorage.setItem(HS_KEY, String(hs)); } catch {}
      return hs;
    });
    setPulses([]);
  }, [stopAll]);

  const spawnPulse = useCallback(() => {
    if (!arenaRef.current) return;
    const { width, height } = arenaRef.current.getBoundingClientRect();
    const padding = 60;
    const x = padding + Math.random() * (width - padding * 2);
    const y = padding + Math.random() * (height - padding * 2);
    const duration = getFadeDuration(scoreRef.current);

    const maxPulses = getMaxPulses(scoreRef.current);

    setPulses(prev => {
      if (prev.length >= maxPulses) return prev;
      return [...prev, { id: nextId++, x, y, spawnedAt: Date.now(), duration }];
    });
  }, []);

  const startGame = useCallback(() => {
    stopAll();
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setPulses([]);
    setGameState('playing');
    gameStateRef.current = 'playing';

    // Initial pulse after short delay
    setTimeout(() => spawnPulse(), 300);

    spawnIntervalRef.current = setInterval(() => {
      if (gameStateRef.current !== 'playing') return;
      spawnPulse();
    }, getSpawnInterval(0));

    // Tick: check for expired pulses every 100ms
    tickIntervalRef.current = setInterval(() => {
      if (gameStateRef.current !== 'playing') return;
      const now = Date.now();
      setPulses(prev => {
        const expired = prev.filter(p => now - p.spawnedAt >= p.duration);
        if (expired.length > 0) {
          const newLives = livesRef.current - expired.length;
          livesRef.current = Math.max(0, newLives);
          if (newLives <= 0) {
            endGame(scoreRef.current);
            return [];
          }
          // setLives is called outside for batching
          return prev.filter(p => now - p.spawnedAt < p.duration);
        }
        return prev;
      });
      setLives(livesRef.current);
    }, 100);
  }, [stopAll, spawnPulse, endGame]);

  // Rebuild spawn interval when score changes (to update interval timing)
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    spawnIntervalRef.current = setInterval(() => {
      if (gameStateRef.current !== 'playing') return;
      spawnPulse();
    }, getSpawnInterval(score));
  }, [score, gameState, spawnPulse]);

  useEffect(() => () => stopAll(), [stopAll]);

  const handlePulseClick = useCallback((id: number) => {
    if (gameStateRef.current !== 'playing') return;
    setPulses(prev => prev.filter(p => p.id !== id));
    setScore(prev => {
      scoreRef.current = prev + 1;
      return prev + 1;
    });
  }, []);

  const level = getLevel(score);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        border: `1px solid ${t.border}`,
        boxShadow: `0 8px 32px ${t.glow}`,
        background: t.bg,
        minHeight: 560,
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, background: t.surface1 }}
      >
        <div className="flex items-center gap-5">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: t.textMuted }}>Score</div>
            <div className="text-xl font-bold tabular-nums" style={{ color: t.text }}>{score}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: t.textMuted }}>Best</div>
            <div className="text-xl font-bold tabular-nums" style={{ color: t.accent }}>{highScore}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: t.textMuted }}>Level</div>
            <div className="text-xl font-bold tabular-nums" style={{ color: t.text }}>{level}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xl">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} style={{ opacity: i < lives ? 1 : 0.15 }}>❤️</span>
          ))}
        </div>
      </div>

      {/* Arena */}
      <div
        ref={arenaRef}
        className="relative flex-1 select-none overflow-hidden"
        style={{ background: t.surface1, minHeight: 460, cursor: gameState === 'playing' ? 'crosshair' : 'default' }}
      >
        {/* Idle screen */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <div>
              <div className="text-3xl font-bold text-center" style={{ color: t.text }}>Void Pulse</div>
              <div className="text-sm text-center mt-2" style={{ color: t.textMuted }}>
                Click the pulses before they vanish
              </div>
            </div>
            <button
              type="button"
              onClick={startGame}
              className="px-8 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: t.accent, color: t.bg }}
            >
              Start
            </button>
            {highScore > 0 && (
              <div className="text-xs" style={{ color: t.textMuted }}>Personal best: {highScore}</div>
            )}
          </div>
        )}

        {/* Game over screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20" style={{ background: `${t.bg}cc` }}>
            <div>
              <div className="text-2xl font-bold text-center" style={{ color: t.text }}>Game Over</div>
              <div className="text-4xl font-bold text-center mt-2 tabular-nums" style={{ color: t.accent }}>{score}</div>
              <div className="text-sm text-center mt-1" style={{ color: t.textMuted }}>
                {score >= highScore && score > 0 ? 'New high score!' : `Best: ${highScore}`}
              </div>
            </div>
            <button
              type="button"
              onClick={startGame}
              className="px-8 py-3 rounded-xl text-sm font-semibold"
              style={{ background: t.accent, color: t.bg }}
            >
              Play Again
            </button>
          </div>
        )}

        {/* Agent label */}
        {chatAgent && gameState === 'playing' && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs pointer-events-none z-10"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${t.accent}`,
              color: t.accent,
              backdropFilter: 'blur(4px)',
            }}
          >
            {chatAgent.name} is watching
          </div>
        )}

        {/* Active pulses */}
        <AnimatePresence>
          {pulses.map(pulse => {
            return (
              <PulseTarget
                key={pulse.id}
                pulse={pulse}
                accent={t.accent}
                onClick={() => handlePulseClick(pulse.id)}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---- Pulse target sub-component ----

interface PulseTargetProps {
  pulse: Pulse;
  accent: string;
  onClick: () => void;
}

function PulseTarget({ pulse, accent, onClick }: PulseTargetProps) {
  const SIZE_START = 20;
  const SIZE_END = 80;
  const durationSec = pulse.duration / 1000;

  return (
    <motion.div
      initial={{ opacity: 1, width: SIZE_START, height: SIZE_START, x: '-50%', y: '-50%' }}
      animate={{ opacity: 0, width: SIZE_END, height: SIZE_END }}
      transition={{ duration: durationSec, ease: 'linear' }}
      exit={{ opacity: 0, scale: 1.4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="absolute rounded-full cursor-pointer"
      style={{
        left: pulse.x,
        top: pulse.y,
        translateX: '-50%',
        translateY: '-50%',
        background: `radial-gradient(circle, ${accent}cc 0%, ${accent}33 60%, transparent 100%)`,
        boxShadow: `0 0 20px ${accent}66, 0 0 40px ${accent}33`,
        border: `2px solid ${accent}aa`,
      }}
    >
      {/* Inner ring pulse */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
        transition={{ duration: durationSec * 0.5, repeat: Infinity, ease: 'easeOut' }}
        style={{ border: `1px solid ${accent}88` }}
      />
    </motion.div>
  );
}
