import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { describeAgentVoice, remixHint, remixQuestion, resultVoice } from './agentFlavor';

type QuestionSet = {
  answer: string;
  category: string;
  hints: string[];
  questions: Array<{ text: string; yes: boolean }>;
};

const QUESTION_SETS: QuestionSet[] = [
  {
    answer: 'elephant',
    category: 'animal',
    hints: ['It is known for memory and size.', 'It has a trunk.'],
    questions: [
      { text: 'Is it a living thing?', yes: true },
      { text: 'Would you usually find it indoors?', yes: false },
      { text: 'Is it larger than a car tire?', yes: true },
      { text: 'Is it commonly kept as a household pet?', yes: false },
      { text: 'Does it have a trunk?', yes: true },
    ],
  },
  {
    answer: 'astronaut',
    category: 'person',
    hints: ['This role depends on extreme training.', 'It is closely tied to space travel.'],
    questions: [
      { text: 'Is it a person or role?', yes: true },
      { text: 'Would this role usually happen underwater?', yes: false },
      { text: 'Is special equipment essential?', yes: true },
      { text: 'Is the job strongly linked to space?', yes: true },
      { text: 'Would most people do this every day?', yes: false },
    ],
  },
  {
    answer: 'piano',
    category: 'object',
    hints: ['It can be used in both classical and pop performances.', 'Keys are central to how it works.'],
    questions: [
      { text: 'Is it an object?', yes: true },
      { text: 'Can it make music?', yes: true },
      { text: 'Does it fit in your pocket?', yes: false },
      { text: 'Does it have keys?', yes: true },
      { text: 'Is it usually played with hands?', yes: true },
    ],
  },
];

export function TwentyQuestionsRemix() {
  const { currentTheme: t, chatAgent } = useApp();
  const [roundIndex, setRoundIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [revealedHints, setRevealedHints] = useState(0);
  const [guess, setGuess] = useState('');
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState('');

  const round = useMemo(() => QUESTION_SETS[roundIndex % QUESTION_SETS.length], [roundIndex]);
  const currentQuestion = round.questions[Math.min(step, round.questions.length - 1)];
  const voice = useMemo(() => describeAgentVoice(chatAgent), [chatAgent]);
  const styledQuestion = useMemo(
    () => remixQuestion(chatAgent, currentQuestion.text, round.answer),
    [chatAgent, currentQuestion.text, round.answer],
  );

  const resetRound = () => {
    setStep(0);
    setRevealedHints(0);
    setGuess('');
    setFinished(false);
    setResult('');
  };

  const nextRound = () => {
    setRoundIndex(index => index + 1);
    resetRound();
  };

  const handleAdvance = () => {
    if (step < round.questions.length - 1) {
      setStep(value => value + 1);
    } else if (revealedHints < round.hints.length) {
      setRevealedHints(value => value + 1);
      setResult(`${chatAgent?.name ?? 'The host'} offers another clue in a ${voice.tone} style.`);
    } else {
      setFinished(true);
      setResult(`Out of questions. The answer was "${round.answer}".`);
    }
  };

  const handleGuess = () => {
    const normalized = guess.trim().toLowerCase();
    if (!normalized) return;
    if (normalized === round.answer.toLowerCase()) {
      setFinished(true);
      setResult(`${resultVoice(chatAgent, true)} You solved the round in ${step + 1} questions.`);
    } else {
      setResult(`${resultVoice(chatAgent, false)} "${guess}" is not the target. ${chatAgent ? `${chatAgent.name} pivots into another ${voice.tone} probe.` : 'Keep listening to the question trail.'}`);
      handleAdvance();
    }
    setGuess('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm" style={{ color: t.text }}>20 Questions Remix</div>
          <div className="text-xs mt-1" style={{ color: t.textMuted }}>
            Category: {round.category} · {voice.intro}
          </div>
        </div>
        <button
          type="button"
          onClick={nextRound}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
        >
          New round
        </button>
      </div>

      <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
        <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Current question</div>
        <div className="text-lg mt-2" style={{ color: t.text }}>{styledQuestion}</div>
        <div className="text-xs mt-3" style={{ color: t.textMuted }}>
          Expected answer for this seeded demo round: {currentQuestion.yes ? 'Yes' : 'No'}
        </div>
      </div>

      {revealedHints > 0 && (
        <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Hints</div>
          <div className="space-y-2 mt-3">
            {round.hints.slice(0, revealedHints).map(hint => (
              <div key={hint} className="text-sm" style={{ color: t.text }}>{remixHint(chatAgent, hint)}</div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!finished && (
          <button
            type="button"
            onClick={handleAdvance}
            className="px-4 py-2 rounded-xl text-sm"
            style={{ background: t.accent, color: t.bg }}
          >
            Advance question
          </button>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={guess}
            onChange={event => setGuess(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && handleGuess()}
            placeholder="Make a guess"
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
          />
          <button
            type="button"
            onClick={handleGuess}
            className="px-4 py-2 rounded-xl text-sm"
            style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.text }}
          >
            Guess
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: `${t.accent}10`, border: `1px solid ${t.border}`, color: t.text }}>
          {result}
        </div>
      )}
    </div>
  );
}
