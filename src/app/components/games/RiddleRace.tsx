import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { describeAgentVoice, remixHint, resultVoice } from './agentFlavor';

const TIME_LIMIT = 60;

const RIDDLES = [
  { question: 'I can fill a room but take up no space. What am I?', answer: 'light', hints: ['You notice me immediately when I disappear.', 'I am measured in lumens.'] },
  { question: 'The more you take, the more you leave behind. What am I?', answer: 'footsteps', hints: ['Travel creates me.', 'They appear in sand, snow, or dust.'] },
  { question: 'I have keys but no locks, space but no room, and you can enter but not go inside. What am I?', answer: 'keyboard', hints: ['You are probably using one now.', 'It is common on laptops and desks.'] },
  { question: 'What has a head and a tail but no body?', answer: 'coin', hints: ['It has two sides.', 'You flip one to make decisions.'] },
  { question: 'I run but have no legs. What am I?', answer: 'water', hints: ['You drink me.', 'I can be a river or a stream.'] },
  { question: 'The more you have of me, the less you see. What am I?', answer: 'darkness', hints: ['I am the opposite of light.', 'I appear when the sun sets.'] },
  { question: 'I have cities but no houses, forests but no trees, and water but no fish. What am I?', answer: 'map', hints: ['You use me to navigate.', 'I represent the world on paper.'] },
  { question: 'I get shorter as I get older. What am I?', answer: 'candle', hints: ['I produce light.', 'You blow me out.'] },
  { question: 'What can travel around the world while staying in the corner?', answer: 'stamp', hints: ['You put me on mail.', 'I am small and adhesive.'] },
  { question: 'I am always hungry, I must always be fed. The finger I touch will soon turn red. What am I?', answer: 'fire', hints: ['I need oxygen to survive.', 'I produce heat and light.'] },
  { question: 'What has hands but cannot clap?', answer: 'clock', hints: ['I tell you something important every moment.', 'You find me on walls.'] },
  { question: 'I speak without a mouth and hear without ears. I have no body but come alive with wind. What am I?', answer: 'echo', hints: ['I repeat what you say.', 'Mountains and canyons are where you find me.'] },
  { question: 'What goes up but never comes down?', answer: 'age', hints: ['It happens to everyone.', 'You celebrate it once a year.'] },
  { question: 'I have a neck but no head. What am I?', answer: 'bottle', hints: ['You pour liquids from me.', 'I can hold wine or water.'] },
  { question: 'What gets wetter the more it dries?', answer: 'towel', hints: ['You use me after a shower.', 'I absorb water.'] },
];

type RoundResult = { won: boolean; timeLeft: number; hintsUsed: number; score: number };

function calcScore(timeLeft: number, hintsUsed: number): number {
  return Math.max(0, timeLeft * 10 - hintsUsed * 50);
}

export function RiddleRace() {
  const { currentTheme: t, chatAgent } = useApp();

  const [usedIndexes, setUsedIndexes] = useState<number[]>([]);
  const [riddleIndex, setRiddleIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [hintsShown, setHintsShown] = useState(0);
  const [status, setStatus] = useState('');
  const [solved, setSolved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const riddle = useMemo(() => RIDDLES[riddleIndex], [riddleIndex]);
  const voice = useMemo(() => describeAgentVoice(chatAgent), [chatAgent]);

  const totalScore = history.reduce((sum, r) => sum + r.score, 0);
  const streak = history.length > 0
    ? history.slice().reverse().findIndex(r => !r.won)
    : 0;
  const currentStreak = streak === -1 ? history.length : streak;

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const endRound = useCallback((won: boolean, currentTime: number, hints: number) => {
    stopTimer();
    setRunning(false);
    setSolved(true);
    const score = won ? calcScore(currentTime, hints) : 0;
    setHistory(prev => [...prev, { won, timeLeft: currentTime, hintsUsed: hints, score }]);
    if (!won) {
      setStatus(`Time's up! The answer was "${riddle.answer}".`);
    }
  }, [riddle.answer, stopTimer]);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(TIME_LIMIT);
    setRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endRound(false, 0, hintsShown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer, endRound, hintsShown]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const pickNextRiddle = () => {
    const available = RIDDLES.map((_, i) => i).filter(i => !usedIndexes.includes(i));
    if (available.length === 0) {
      setUsedIndexes([]);
      return Math.floor(Math.random() * RIDDLES.length);
    }
    return available[Math.floor(Math.random() * available.length)];
  };

  const nextRound = () => {
    stopTimer();
    const next = pickNextRiddle();
    setUsedIndexes(prev => [...prev, next]);
    setRiddleIndex(next);
    setGuess('');
    setHintsShown(0);
    setStatus('');
    setSolved(false);
    setTimeLeft(TIME_LIMIT);
    setRunning(false);
  };

  const handleGuess = () => {
    const normalized = guess.trim().toLowerCase();
    if (!normalized || solved) return;

    if (!running) startTimer();

    if (normalized === riddle.answer) {
      const score = calcScore(timeLeft, hintsShown);
      setSolved(true);
      stopTimer();
      setRunning(false);
      setHistory(prev => [...prev, { won: true, timeLeft, hintsUsed: hintsShown, score }]);
      setStatus(`${resultVoice(chatAgent, true)} +${score} pts`);
    } else if (hintsShown < riddle.hints.length) {
      setHintsShown(v => v + 1);
      setStatus(`${resultVoice(chatAgent, false)} Hint ${hintsShown + 1}: ${remixHint(chatAgent, riddle.hints[hintsShown])}`);
    } else {
      endRound(false, timeLeft, hintsShown);
      setStatus(`Round over. The answer was "${riddle.answer}".`);
    }
    setGuess('');
  };

  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timerPct > 50 ? '#22c55e' : timerPct > 25 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm" style={{ color: t.text }}>Riddle Race</div>
          <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>{voice.intro}</div>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <div className="text-right">
              <div className="text-xs font-medium" style={{ color: t.accent }}>{totalScore} pts</div>
              {currentStreak > 1 && (
                <div className="text-xs" style={{ color: t.textMuted }}>🔥 {currentStreak} streak</div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={nextRound}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
          >
            {solved ? 'Next →' : 'Skip'}
          </button>
        </div>
      </div>

      {/* Timer bar */}
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: t.surface3 }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${timerPct}%`, background: timerColor, transitionDuration: '1s' }}
        />
      </div>
      <div className="flex justify-between text-xs" style={{ color: t.textMuted, marginTop: -12 }}>
        <span>{running ? `${timeLeft}s` : 'Answer to start timer'}</span>
        <span>Riddle {(history.length % RIDDLES.length) + 1} · {riddle.hints.length - hintsShown} hint{riddle.hints.length - hintsShown !== 1 ? 's' : ''} left</span>
      </div>

      {/* Riddle card */}
      <div className="rounded-2xl p-5" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
        <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Riddle</div>
        <div className="text-lg mt-3" style={{ color: t.text }}>{riddle.question}</div>
      </div>

      {/* Hints */}
      {hintsShown > 0 && (
        <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-xs uppercase tracking-[0.16em] mb-3" style={{ color: t.textMuted }}>Hints</div>
          <div className="space-y-2">
            {riddle.hints.slice(0, hintsShown).map(hint => (
              <div key={hint} className="text-sm" style={{ color: t.text }}>
                {remixHint(chatAgent, hint)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={guess}
          onChange={e => setGuess(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGuess()}
          placeholder={solved ? 'Round over' : 'Your answer — first guess starts the timer'}
          disabled={solved}
          autoFocus={!solved}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
        />
        <button
          type="button"
          onClick={handleGuess}
          disabled={solved}
          className="px-4 py-2 rounded-xl text-sm"
          style={{ background: solved ? t.surface3 : t.accent, color: solved ? t.textMuted : t.bg }}
        >
          Submit
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: `${t.accent}10`, border: `1px solid ${t.border}`, color: t.text }}>
          {status}
        </div>
      )}

      {/* Round history */}
      {history.length > 0 && (
        <div className="flex gap-1.5">
          {history.slice(-8).map((r, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full"
              style={{ background: r.won ? '#22c55e' : '#ef4444' }}
              title={r.won ? `+${r.score} pts` : 'Lost'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
