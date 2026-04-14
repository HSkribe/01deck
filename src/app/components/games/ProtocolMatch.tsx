import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';

// ---- Data ----

interface CardDef {
  id: string;
  pairId: string;        // shared key between agent + mission card
  kind: 'agent' | 'mission';
  label: string;
  icon: string;
}

const PAIRS: Array<{ pairId: string; agent: string; mission: string; icon: string }> = [
  { pairId: 'aria-analyze',  agent: 'ARIA',  mission: 'ANALYZE', icon: '📊' },
  { pairId: 'nova-recon',    agent: 'NOVA',  mission: 'RECON',   icon: '🔍' },
  { pairId: 'nexus-route',   agent: 'NEXUS', mission: 'ROUTE',   icon: '🗺️' },
  { pairId: 'orion-cipher',  agent: 'ORION', mission: 'CIPHER',  icon: '🔐' },
  { pairId: 'lyra-brief',    agent: 'LYRA',  mission: 'BRIEF',   icon: '📋' },
  { pairId: 'atlas-extract', agent: 'ATLAS', mission: 'EXTRACT', icon: '📤' },
  { pairId: 'echo-sync',     agent: 'ECHO',  mission: 'SYNC',    icon: '🔄' },
  { pairId: 'vega-defend',   agent: 'VEGA',  mission: 'DEFEND',  icon: '🛡️' },
];

function buildDeck(): CardDef[] {
  const cards: CardDef[] = [];
  for (const p of PAIRS) {
    cards.push({ id: `${p.pairId}-agent`,   pairId: p.pairId, kind: 'agent',   label: p.agent,   icon: '🤖' });
    cards.push({ id: `${p.pairId}-mission`, pairId: p.pairId, kind: 'mission', label: p.mission, icon: p.icon });
  }
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// ---- Timer hook ----

function useTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    if (startRef.current === null) startRef.current = Date.now() - elapsed * 1000;

    const tick = () => {
      setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setElapsed(0);
  }, []);

  return { elapsed, reset };
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ---- Component ----

export function ProtocolMatch() {
  const { currentTheme: t, chatAgent } = useApp();

  const [deck, setDeck] = useState<CardDef[]>(() => buildDeck());
  const [flipped, setFlipped] = useState<Set<string>>(new Set());   // card IDs currently face-up (not matched)
  const [matched, setMatched] = useState<Set<string>>(new Set());   // pairIds that are matched
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);

  const { elapsed, reset: resetTimer } = useTimer(!won && flipped.size > 0 || attempts > 0);

  const handleRestart = useCallback(() => {
    setDeck(buildDeck());
    setFlipped(new Set());
    setMatched(new Set());
    setAttempts(0);
    setLocked(false);
    setWon(false);
    resetTimer();
  }, [resetTimer]);

  const handleCardClick = useCallback((card: CardDef) => {
    if (locked) return;
    if (matched.has(card.pairId)) return;
    if (flipped.has(card.id)) return;

    const newFlipped = new Set(flipped).add(card.id);

    if (newFlipped.size === 1) {
      setFlipped(newFlipped);
      return;
    }

    // Two cards are flipped — check for match
    setFlipped(newFlipped);
    setAttempts(a => a + 1);
    setLocked(true);

    const [firstId] = [...flipped];
    const firstCard = deck.find(c => c.id === firstId)!;
    const isMatch = firstCard.pairId === card.pairId;

    if (isMatch) {
      const newMatched = new Set(matched).add(card.pairId);
      setTimeout(() => {
        setMatched(newMatched);
        setFlipped(new Set());
        setLocked(false);
        if (newMatched.size === PAIRS.length) {
          setWon(true);
        }
      }, 500);
    } else {
      setTimeout(() => {
        setFlipped(new Set());
        setLocked(false);
      }, 1000);
    }
  }, [locked, matched, flipped, deck]);

  const pairsFound = matched.size;

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
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, background: t.surface1 }}
      >
        <div className="flex items-center gap-5">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: t.textMuted }}>Attempts</div>
            <div className="text-xl font-bold tabular-nums" style={{ color: t.text }}>{attempts}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: t.textMuted }}>Pairs</div>
            <div className="text-xl font-bold tabular-nums" style={{ color: t.accent }}>
              {pairsFound}<span className="text-sm font-normal" style={{ color: t.textMuted }}>/8</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: t.textMuted }}>Time</div>
            <div className="text-xl font-bold tabular-nums" style={{ color: t.text }}>{formatTime(elapsed)}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRestart}
          className="px-4 py-1.5 rounded-lg text-xs"
          style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
        >
          Shuffle &amp; Restart
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center" style={{ background: t.surface1 }}>
        {/* Agent label */}
        {chatAgent && !won && (
          <div
            className="self-start mb-3 px-2.5 py-1 rounded-lg text-xs"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${t.accent}`,
              color: t.accent,
              backdropFilter: 'blur(4px)',
            }}
          >
            {chatAgent.name} is tracking the protocol sequence
          </div>
        )}

        {/* Win overlay */}
        <AnimatePresence>
          {won && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5"
              style={{ background: `${t.bg}e0`, backdropFilter: 'blur(8px)' }}
            >
              <div className="text-4xl">🎯</div>
              <div>
                <div className="text-2xl font-bold text-center" style={{ color: t.text }}>All pairs matched!</div>
                <div className="text-sm text-center mt-1" style={{ color: t.textMuted }}>
                  {formatTime(elapsed)} &nbsp;·&nbsp; {attempts} attempts
                </div>
              </div>
              <button
                type="button"
                onClick={handleRestart}
                className="px-8 py-3 rounded-xl text-sm font-semibold"
                style={{ background: t.accent, color: t.bg }}
              >
                Shuffle &amp; Play Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4x4 grid */}
        <div
          className="grid gap-2.5"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            width: '100%',
            maxWidth: 480,
          }}
        >
          {deck.map(card => {
            const isFaceUp = flipped.has(card.id) || matched.has(card.pairId);
            const isMatched = matched.has(card.pairId);
            return (
              <MatchCard
                key={card.id}
                card={card}
                faceUp={isFaceUp}
                isMatched={isMatched}
                accent={t.accent}
                surface1={t.surface1}
                surface2={t.surface2}
                surface3={t.surface3}
                border={t.border}
                text={t.text}
                textMuted={t.textMuted}
                onClick={() => handleCardClick(card)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Card sub-component ----

interface MatchCardProps {
  card: CardDef;
  faceUp: boolean;
  isMatched: boolean;
  accent: string;
  surface1: string;
  surface2: string;
  surface3: string;
  border: string;
  text: string;
  textMuted: string;
  onClick: () => void;
}

function MatchCard({
  card, faceUp, isMatched,
  accent, surface1, surface2, surface3, border, text, textMuted,
  onClick,
}: MatchCardProps) {
  return (
    <div
      className="relative cursor-pointer"
      style={{ perspective: 600, height: 100 }}
      onClick={onClick}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Back face */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            background: surface2,
            border: `1px solid ${border}`,
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 6px,
              rgba(255,255,255,0.03) 6px,
              rgba(255,255,255,0.03) 12px
            )`,
          }}
        >
          <span className="text-2xl font-bold" style={{ color: textMuted, textShadow: `0 0 12px ${accent}66` }}>?</span>
        </div>

        {/* Front face */}
        <div
          className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1 p-2"
          style={{
            backfaceVisibility: 'hidden',
            rotateY: 180,
            transform: 'rotateY(180deg)',
            background: isMatched ? `${surface2}` : surface2,
            border: isMatched
              ? '1.5px solid rgba(34,197,94,0.5)'
              : `1px solid ${border}`,
            boxShadow: isMatched ? '0 0 12px rgba(34,197,94,0.2)' : 'none',
          }}
        >
          <span className="text-xl leading-none">{card.icon}</span>
          <span
            className="text-center font-semibold leading-tight"
            style={{
              color: isMatched ? 'rgba(34,197,94,0.9)' : text,
              fontSize: card.label.length > 6 ? '0.6rem' : '0.7rem',
              letterSpacing: '0.05em',
            }}
          >
            {card.label}
          </span>
          {card.kind === 'agent' && (
            <span className="text-xs" style={{ color: textMuted, fontSize: '0.55rem', letterSpacing: '0.08em' }}>
              AGENT
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
