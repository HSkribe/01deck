import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { remixQuestion, remixHint, resultVoice } from './agentFlavor';

const MAX_QUESTIONS = 20;

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
    hints: ['It is known for its memory.', 'It has a trunk.'],
    questions: [
      { text: 'Is it a living thing?', yes: true },
      { text: 'Is it an animal?', yes: true },
      { text: 'Is it larger than a human?', yes: true },
      { text: 'Does it live in the wild?', yes: true },
      { text: 'Is it commonly kept as a household pet?', yes: false },
      { text: 'Does it live in Africa or Asia?', yes: true },
      { text: 'Does it have four legs?', yes: true },
      { text: 'Does it eat meat?', yes: false },
      { text: 'Is it grey?', yes: true },
      { text: 'Does it have a long nose?', yes: true },
    ],
  },
  {
    answer: 'astronaut',
    category: 'person / role',
    hints: ['This role requires extreme training.', 'It is closely tied to space travel.'],
    questions: [
      { text: 'Is it a person or a role?', yes: true },
      { text: 'Can most people do this job?', yes: false },
      { text: 'Does it require special equipment?', yes: true },
      { text: 'Is it linked to outer space?', yes: true },
      { text: 'Do they work underground?', yes: false },
      { text: 'Is it a government or agency role?', yes: true },
      { text: 'Is physical fitness required?', yes: true },
      { text: 'Do they travel very far from Earth?', yes: true },
      { text: 'Is it a common everyday job?', yes: false },
      { text: 'Do they wear a specialized suit?', yes: true },
    ],
  },
  {
    answer: 'piano',
    category: 'object',
    hints: ['It can be used in classical and pop music.', 'Keys are central to how it works.'],
    questions: [
      { text: 'Is it an object?', yes: true },
      { text: 'Can it make music?', yes: true },
      { text: 'Is it electronic?', yes: false },
      { text: 'Does it fit in your pocket?', yes: false },
      { text: 'Is it usually found in homes or concert halls?', yes: true },
      { text: 'Does it have strings inside?', yes: true },
      { text: 'Do you play it with your hands?', yes: true },
      { text: 'Does it have black and white keys?', yes: true },
      { text: 'Is it a wind instrument?', yes: false },
      { text: 'Can it play many notes at once?', yes: true },
    ],
  },
  {
    answer: 'lightning',
    category: 'natural phenomenon',
    hints: ['It happens during storms.', 'It is extremely fast.'],
    questions: [
      { text: 'Is it a natural phenomenon?', yes: true },
      { text: 'Can you hold it in your hand?', yes: false },
      { text: 'Does it involve electricity?', yes: true },
      { text: 'Is it visible to the naked eye?', yes: true },
      { text: 'Does it occur in the sky?', yes: true },
      { text: 'Is it dangerous?', yes: true },
      { text: 'Does it last a long time?', yes: false },
      { text: 'Is it associated with rain?', yes: true },
      { text: 'Does it make a sound?', yes: true },
      { text: 'Is it hotter than the sun\'s surface?', yes: true },
    ],
  },
  {
    answer: 'library',
    category: 'place',
    hints: ['You go there to borrow things.', 'It is usually quiet inside.'],
    questions: [
      { text: 'Is it a place?', yes: true },
      { text: 'Is it outdoors?', yes: false },
      { text: 'Can you find books there?', yes: true },
      { text: 'Do you need to pay to enter?', yes: false },
      { text: 'Is it usually noisy?', yes: false },
      { text: 'Can you borrow items?', yes: true },
      { text: 'Is it a government or public building?', yes: true },
      { text: 'Do you need a membership card?', yes: true },
      { text: 'Is it a restaurant?', yes: false },
      { text: 'Can you use computers there?', yes: true },
    ],
  },
  {
    answer: 'submarine',
    category: 'vehicle',
    hints: ['It operates underwater.', 'It is used by navies.'],
    questions: [
      { text: 'Is it a vehicle?', yes: true },
      { text: 'Does it travel on land?', yes: false },
      { text: 'Does it travel underwater?', yes: true },
      { text: 'Is it larger than a car?', yes: true },
      { text: 'Is it used by the military?', yes: true },
      { text: 'Does it have wings?', yes: false },
      { text: 'Can it carry people?', yes: true },
      { text: 'Is it powered by an engine?', yes: true },
      { text: 'Does it float on water?', yes: false },
      { text: 'Is it made of metal?', yes: true },
    ],
  },
];

export function TwentyQuestionsRemix() {
  const { currentTheme: t, chatAgent } = useApp();
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [guess, setGuess] = useState('');
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [result, setResult] = useState('');
  const [showGuessInput, setShowGuessInput] = useState(false);
  const [history, setHistory] = useState<Array<{ won: boolean; questionsUsed: number }>>([]);

  const round = useMemo(() => QUESTION_SETS[roundIndex % QUESTION_SETS.length], [roundIndex]);
  const currentQuestion = round.questions[Math.min(questionIndex, round.questions.length - 1)];
  const questionsUsed = answers.length;
  const questionsLeft = MAX_QUESTIONS - questionsUsed;
  const allQuestionsAsked = questionIndex >= round.questions.length;

  const styledQuestion = useMemo(
    () => remixQuestion(chatAgent, currentQuestion.text, round.answer),
    [chatAgent, currentQuestion.text, round.answer],
  );

  const resetRound = () => {
    setQuestionIndex(0);
    setAnswers([]);
    setHintsRevealed(0);
    setGuess('');
    setFinished(false);
    setWon(false);
    setResult('');
    setShowGuessInput(false);
  };

  const nextRound = () => {
    setRoundIndex(i => i + 1);
    resetRound();
  };

  const handleAnswer = (answer: boolean) => {
    if (finished) return;
    setAnswers(prev => [...prev, answer]);

    const newCount = questionsUsed + 1;
    if (newCount >= MAX_QUESTIONS) {
      setFinished(true);
      setResult(`You've used all 20 questions. The answer was "${round.answer}".`);
      setHistory(prev => [...prev, { won: false, questionsUsed: newCount }]);
      return;
    }

    if (questionIndex < round.questions.length - 1) {
      setQuestionIndex(i => i + 1);
    }
    // No more scripted questions — encourage guessing
    setResult('');
  };

  const handleHint = () => {
    if (hintsRevealed < round.hints.length) {
      setHintsRevealed(v => v + 1);
    }
  };

  const handleGuess = () => {
    const normalized = guess.trim().toLowerCase();
    if (!normalized) return;
    if (normalized === round.answer.toLowerCase()) {
      setFinished(true);
      setWon(true);
      setResult(`${resultVoice(chatAgent, true)} You got it in ${questionsUsed} question${questionsUsed !== 1 ? 's' : ''}!`);
      setHistory(prev => [...prev, { won: true, questionsUsed }]);
    } else {
      setResult(`${resultVoice(chatAgent, false)} "${guess}" is not it. Keep asking questions.`);
    }
    setGuess('');
    setShowGuessInput(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm" style={{ color: t.text }}>20 Questions</div>
          <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            Category: <strong style={{ color: t.text }}>{round.category}</strong>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <div className="text-xs text-right" style={{ color: t.textMuted }}>
              {history.filter(h => h.won).length}/{history.length} won
            </div>
          )}
          <button
            type="button"
            onClick={nextRound}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
          >
            {finished ? 'New round' : 'Skip'}
          </button>
        </div>
      </div>

      {/* Question counter bar */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: t.textMuted }}>
          <span>Question {questionsUsed + (finished ? 0 : 1)} of {MAX_QUESTIONS}</span>
          <span>{questionsLeft} left</span>
        </div>
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: t.surface3 }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{
              width: `${(questionsUsed / MAX_QUESTIONS) * 100}%`,
              background: questionsLeft > 10 ? t.accent : questionsLeft > 5 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Current question */}
      {!finished && (
        <div className="rounded-2xl p-5" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          {allQuestionsAsked ? (
            <div className="text-sm" style={{ color: t.textMuted }}>
              No more scripted questions — make your guess or use a hint!
            </div>
          ) : (
            <>
              <div className="text-xs uppercase tracking-[0.16em] mb-2" style={{ color: t.textMuted }}>
                Question {questionsUsed + 1}
              </div>
              <div className="text-base" style={{ color: t.text }}>{styledQuestion}</div>
            </>
          )}
        </div>
      )}

      {/* Yes / No buttons */}
      {!finished && !allQuestionsAsked && (
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={() => handleAnswer(true)}
            className="py-3 rounded-xl text-sm font-medium"
            style={{ background: `${t.accent}20`, border: `1px solid ${t.accent}40`, color: t.accent }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            ✓ Yes
          </motion.button>
          <motion.button
            onClick={() => handleAnswer(false)}
            className="py-3 rounded-xl text-sm font-medium"
            style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.text }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            ✗ No
          </motion.button>
        </div>
      )}

      {/* Answer history */}
      {answers.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {answers.map((a, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
              style={{ background: a ? '#22c55e33' : '#ef444433', color: a ? '#22c55e' : '#ef4444' }}
              title={`Q${i + 1}: ${round.questions[i]?.text ?? '?'} — ${a ? 'Yes' : 'No'}`}
            >
              {a ? '✓' : '✗'}
            </div>
          ))}
        </div>
      )}

      {/* Hints */}
      {hintsRevealed > 0 && (
        <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-xs uppercase tracking-[0.16em] mb-2" style={{ color: t.textMuted }}>Hints</div>
          <div className="space-y-2">
            {round.hints.slice(0, hintsRevealed).map(hint => (
              <div key={hint} className="text-sm" style={{ color: t.text }}>
                {remixHint(chatAgent, hint)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!finished && (
        <div className="flex gap-2">
          {hintsRevealed < round.hints.length && (
            <button
              type="button"
              onClick={handleHint}
              className="px-3 py-2 rounded-xl text-xs"
              style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
            >
              Use hint ({round.hints.length - hintsRevealed} left)
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowGuessInput(s => !s)}
            className="px-3 py-2 rounded-xl text-xs"
            style={{ background: t.accent, color: t.bg }}
          >
            Make a guess
          </button>
        </div>
      )}

      {/* Guess input */}
      <AnimatePresence>
        {showGuessInput && !finished && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuess()}
              placeholder="What is it?"
              autoFocus
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: t.surface2, border: `1px solid ${t.accent}`, color: t.text }}
            />
            <button
              type="button"
              onClick={handleGuess}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: t.accent, color: t.bg }}
            >
              Guess
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {result && (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{
            background: won ? '#22c55e15' : `${t.accent}10`,
            border: `1px solid ${won ? '#22c55e40' : t.border}`,
            color: t.text,
          }}
        >
          {result}
          {finished && (
            <button
              onClick={nextRound}
              className="mt-3 block px-4 py-2 rounded-xl text-sm"
              style={{ background: t.accent, color: t.bg }}
            >
              Next round →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
