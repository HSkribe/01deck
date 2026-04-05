import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { describeAgentVoice, remixHint, resultVoice } from './agentFlavor';

const RIDDLES = [
  {
    question: 'I can fill a room but take up no space. What am I?',
    answer: 'light',
    hints: ['You notice me immediately when I disappear.', 'I am measured in lumens.'],
  },
  {
    question: 'The more you take, the more you leave behind. What am I?',
    answer: 'footsteps',
    hints: ['Travel creates me.', 'They appear in sand, snow, or dust.'],
  },
  {
    question: 'I have keys but no locks, space but no room, and you can enter but not go inside. What am I?',
    answer: 'keyboard',
    hints: ['You are probably using one now.', 'It is common on laptops and desks.'],
  },
];

export function RiddleRace() {
  const { currentTheme: t, chatAgent } = useApp();
  const [roundIndex, setRoundIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [hintsShown, setHintsShown] = useState(0);
  const [status, setStatus] = useState('');
  const [solved, setSolved] = useState(false);

  const riddle = useMemo(() => RIDDLES[roundIndex % RIDDLES.length], [roundIndex]);
  const voice = useMemo(() => describeAgentVoice(chatAgent), [chatAgent]);

  const handleGuess = () => {
    const normalized = guess.trim().toLowerCase();
    if (!normalized) return;
    if (normalized === riddle.answer) {
      setSolved(true);
      setStatus(`${resultVoice(chatAgent, true)} ${chatAgent?.name ?? 'The host'} concedes the round.`);
    } else if (hintsShown < riddle.hints.length) {
      setHintsShown(value => value + 1);
      setStatus(`${resultVoice(chatAgent, false)} Hint ${hintsShown + 1}: ${remixHint(chatAgent, riddle.hints[hintsShown])}`);
    } else {
      setSolved(true);
      setStatus(`Round over. The answer was "${riddle.answer}".`);
    }
    setGuess('');
  };

  const nextRound = () => {
    setRoundIndex(index => index + 1);
    setGuess('');
    setHintsShown(0);
    setStatus('');
    setSolved(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm" style={{ color: t.text }}>Riddle Race</div>
          <div className="text-xs mt-1" style={{ color: t.textMuted }}>
            {voice.intro}
          </div>
        </div>
        <button
          type="button"
          onClick={nextRound}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
        >
          New riddle
        </button>
      </div>

      <div className="rounded-2xl p-5" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
        <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Riddle prompt</div>
        <div className="text-lg mt-3" style={{ color: t.text }}>{riddle.question}</div>
        <div className="text-xs mt-3" style={{ color: t.textMuted }}>
          Delivery mode: {voice.tone} · {voice.framing}
        </div>
      </div>

      {hintsShown > 0 && (
        <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Hints used</div>
          <div className="space-y-2 mt-3">
            {riddle.hints.slice(0, hintsShown).map(hint => (
              <div key={hint} className="text-sm" style={{ color: t.text }}>{remixHint(chatAgent, hint)}</div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={guess}
          onChange={event => setGuess(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && handleGuess()}
          placeholder="Your answer"
          disabled={solved}
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

      {status && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: `${t.accent}10`, border: `1px solid ${t.border}`, color: t.text }}>
          {status}
        </div>
      )}
    </div>
  );
}
