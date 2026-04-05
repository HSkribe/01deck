import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { describeAgentVoice, resultVoice, triviaHostLine } from './agentFlavor';

type TriviaQuestion = {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

const TRIVIA: TriviaQuestion[] = [
  {
    prompt: 'Which planet is known as the Red Planet?',
    options: ['Mars', 'Venus', 'Mercury', 'Jupiter'],
    answer: 'Mars',
    explanation: 'Mars gets the nickname from iron oxide on its surface.',
  },
  {
    prompt: 'What data structure uses FIFO ordering?',
    options: ['Stack', 'Queue', 'Tree', 'Graph'],
    answer: 'Queue',
    explanation: 'FIFO means first in, first out, which is queue behavior.',
  },
  {
    prompt: 'Which instrument has 88 keys in its standard form?',
    options: ['Violin', 'Piano', 'Flute', 'Trumpet'],
    answer: 'Piano',
    explanation: 'A standard acoustic piano has 88 keys.',
  },
  {
    prompt: 'Which ocean is the largest on Earth?',
    options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'],
    answer: 'Pacific',
    explanation: 'The Pacific Ocean is the largest and deepest ocean basin.',
  },
];

export function TriviaQuizzes() {
  const { currentTheme: t, chatAgent } = useApp();
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const question = useMemo(() => TRIVIA[index], [index]);
  const voice = useMemo(() => describeAgentVoice(chatAgent), [chatAgent]);
  const hostPrompt = useMemo(() => triviaHostLine(chatAgent, question.prompt), [chatAgent, question.prompt]);

  const chooseOption = (option: string) => {
    if (showResult) return;
    setSelected(option);
    setShowResult(true);
    if (option === question.answer) {
      setScore(value => value + 1);
    }
  };

  const nextQuestion = () => {
    if (index < TRIVIA.length - 1) {
      setIndex(value => value + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      setIndex(0);
      setSelected(null);
      setShowResult(false);
      setScore(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm" style={{ color: t.text }}>Trivia Quizzes</div>
          <div className="text-xs mt-1" style={{ color: t.textMuted }}>
            {voice.intro}
          </div>
        </div>
        <div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: t.surface3, color: t.textMuted }}>
          Score: {score}/{TRIVIA.length}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
        <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>
          Question {index + 1} of {TRIVIA.length}
        </div>
        <div className="text-lg mt-3" style={{ color: t.text }}>{hostPrompt}</div>
        <div className="text-xs mt-3" style={{ color: t.textMuted }}>
          Host tone: {voice.tone} · {voice.framing}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {question.options.map(option => {
          const isCorrect = showResult && option === question.answer;
          const isWrong = showResult && selected === option && option !== question.answer;
          return (
            <button
              key={option}
              type="button"
              onClick={() => chooseOption(option)}
              className="rounded-2xl p-4 text-left"
              style={{
                background: isCorrect ? 'rgba(34,197,94,0.14)' : isWrong ? 'rgba(239,68,68,0.14)' : t.surface2,
                border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.4)' : isWrong ? 'rgba(239,68,68,0.4)' : t.border}`,
                color: t.text,
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: `${t.accent}10`, border: `1px solid ${t.border}`, color: t.text }}>
          {resultVoice(chatAgent, selected === question.answer)} {question.explanation}
        </div>
      )}

      {showResult && (
        <button
          type="button"
          onClick={nextQuestion}
          className="px-4 py-2 rounded-xl text-sm"
          style={{ background: t.accent, color: t.bg }}
        >
          {index < TRIVIA.length - 1 ? 'Next question' : 'Restart quiz'}
        </button>
      )}
    </div>
  );
}
