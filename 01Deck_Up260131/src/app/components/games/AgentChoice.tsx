import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Save, Shuffle, Send, Bookmark } from 'lucide-react';

interface GameState {
  type: 'number' | 'word' | 'riddle' | null;
  secret: number | string | null;
  hints: number;
  maxHints: number;
  guesses: string[];
  feedbacks: string[];
  won: boolean;
  savedName: string | null;
}

const RIDDLES = [
  { q: 'I have cities but no houses. I have mountains but no trees. What am I?', a: 'map' },
  { q: 'The more you take, the more you leave behind. What am I?', a: 'footsteps' },
  { q: 'I speak without a mouth and hear without ears. What am I?', a: 'echo' },
  { q: 'I have hands but cannot clap. What am I?', a: 'clock' },
  { q: 'What has keys but no locks, space but no room, and you can enter but can\'t go inside?', a: 'keyboard' },
];

const GAME_TYPES = [
  {
    id: 'number',
    label: 'Number Guess',
    icon: '🔢',
    description: 'Agent thinks of a number 1–100',
  },
  {
    id: 'word',
    label: 'Word Guess',
    icon: '💬',
    description: 'Agent thinks of a hidden word',
  },
  {
    id: 'riddle',
    label: 'Riddle Mode',
    icon: '🧩',
    description: 'Can you solve the agent\'s riddle?',
  },
];

const WORD_LIST = ['protocol', 'neural', 'cipher', 'quantum', 'matrix', 'vector', 'nexus', 'prism', 'agent', 'signal'];

export function AgentChoice() {
  const { currentTheme: t, chatAgent } = useApp();
  const [game, setGame] = useState<GameState>({
    type: null, secret: null, hints: 0, maxHints: 5, guesses: [], feedbacks: [], won: false, savedName: null,
  });
  const [input, setInput] = useState('');
  const [savedGames, setSavedGames] = useState<string[]>([]);
  const [saveInput, setSaveInput] = useState('');
  const [showSave, setShowSave] = useState(false);

  const agentName = chatAgent?.name || 'Agent';

  const startGame = (type: 'number' | 'word' | 'riddle') => {
    let secret: number | string;
    let maxHints = 5;
    if (type === 'number') {
      secret = Math.floor(Math.random() * 100) + 1;
      maxHints = 7;
    } else if (type === 'word') {
      secret = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
      maxHints = 5;
    } else {
      const riddle = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      secret = riddle.a;
      maxHints = 3;
    }
    setGame({
      type,
      secret,
      hints: 0,
      maxHints,
      guesses: [],
      feedbacks: [`${agentName}: I've designed a ${type} challenge for you. Can you figure it out? You have ${maxHints} attempts.`],
      won: false,
      savedName: null,
    });
    setInput('');
  };

  const handleGuess = () => {
    if (!input.trim() || !game.type || game.won) return;
    const guess = input.trim().toLowerCase();
    const secret = typeof game.secret === 'number' ? game.secret : (game.secret as string).toLowerCase();
    let feedback = '';
    let won = false;

    if (game.type === 'number') {
      const n = parseInt(guess);
      if (isNaN(n)) {
        feedback = `${agentName}: Please enter a valid number.`;
      } else if (n === secret) {
        feedback = `${agentName}: Correct! 🎉 The number was ${secret}!`;
        won = true;
      } else if (n < (secret as number)) {
        feedback = `${agentName}: Higher! Try a larger number.`;
      } else {
        feedback = `${agentName}: Lower! Try a smaller number.`;
      }
    } else if (game.type === 'word') {
      if (guess === secret) {
        feedback = `${agentName}: Brilliant! The word was "${secret}"! 🎉`;
        won = true;
      } else {
        const commonLetters = guess.split('').filter(l => (secret as string).includes(l)).length;
        feedback = `${agentName}: "${guess}" is wrong. ${commonLetters} letter(s) in common with the answer.`;
      }
    } else {
      if (guess === secret || (secret as string).includes(guess)) {
        feedback = `${agentName}: Correct! The answer was "${secret}"! Well reasoned! 🎉`;
        won = true;
      } else {
        feedback = `${agentName}: Not quite. Think differently about the riddle.`;
      }
    }

    const newHints = game.hints + 1;
    const outOfGuesses = newHints >= game.maxHints && !won;
    if (outOfGuesses) {
      feedback += ` Game over! The answer was "${game.secret}".`;
    }

    setGame(prev => ({
      ...prev,
      hints: newHints,
      guesses: [...prev.guesses, guess],
      feedbacks: [...prev.feedbacks, `You: ${input.trim()}`, feedback],
      won: won || outOfGuesses,
    }));
    setInput('');
  };

  const handleSave = () => {
    if (saveInput.trim()) {
      setSavedGames(prev => [...prev, saveInput.trim()]);
      setShowSave(false);
      setSaveInput('');
    }
  };

  const getRiddleQuestion = () => {
    const riddle = RIDDLES.find(r => r.a === game.secret);
    return riddle?.q || '';
  };

  return (
    <div className="flex flex-col">
      {/* Game type selector */}
      {!game.type ? (
        <div>
          <div className="text-sm mb-1" style={{ color: t.text }}>Agent Choice</div>
          <div className="text-xs mb-4" style={{ color: t.textMuted }}>
            {agentName} will design a game for you to play
          </div>
          <div className="space-y-2">
            {GAME_TYPES.map(gt => (
              <motion.button
                key={gt.id}
                onClick={() => startGame(gt.id as 'number' | 'word' | 'riddle')}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.border}`,
                }}
                whileHover={{ scale: 1.02, borderColor: t.accent }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl">{gt.icon}</span>
                <div>
                  <div className="text-sm" style={{ color: t.text }}>{gt.label}</div>
                  <div className="text-xs" style={{ color: t.textMuted }}>{gt.description}</div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Saved games */}
          {savedGames.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>
                Saved Games
              </div>
              {savedGames.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: t.surface3,
                    border: `1px solid ${t.border}`,
                    color: t.textMuted,
                    marginBottom: 4,
                  }}
                >
                  <Bookmark size={11} />
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Game header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm" style={{ color: t.text }}>
                {GAME_TYPES.find(g => g.id === game.type)?.label}
              </div>
              <div className="text-xs" style={{ color: t.textMuted }}>
                {game.won ? 'Game over' : `${game.maxHints - game.hints} attempts remaining`}
              </div>
            </div>
            <div className="flex gap-2">
              {game.won && (
                <motion.button
                  onClick={() => setShowSave(s => !s)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                  style={{
                    background: t.surface3,
                    border: `1px solid ${t.border}`,
                    color: t.textMuted,
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Save size={11} />
                  Save
                </motion.button>
              )}
              <motion.button
                onClick={() => startGame(game.type!)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                style={{
                  background: t.surface3,
                  border: `1px solid ${t.border}`,
                  color: t.textMuted,
                }}
                whileHover={{ scale: 1.05 }}
              >
                <Shuffle size={11} />
                New
              </motion.button>
              <motion.button
                onClick={() => setGame({ type: null, secret: null, hints: 0, maxHints: 5, guesses: [], feedbacks: [], won: false, savedName: null })}
                className="text-xs px-2 py-1 rounded-lg"
                style={{
                  background: t.surface3,
                  border: `1px solid ${t.border}`,
                  color: t.textMuted,
                }}
                whileHover={{ scale: 1.05 }}
              >
                Change
              </motion.button>
            </div>
          </div>

          {/* Riddle question */}
          {game.type === 'riddle' && (
            <div
              className="p-3 rounded-xl mb-3 text-xs"
              style={{
                background: t.surface2,
                border: `1px solid ${t.border}`,
                color: t.text,
                lineHeight: 1.6,
              }}
            >
              🧩 {getRiddleQuestion()}
            </div>
          )}

          {/* Hints bar */}
          <div className="flex gap-1 mb-3">
            {[...Array(game.maxHints)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full"
                style={{
                  background: i < game.hints
                    ? (game.won ? '#22c55e' : '#ef4444')
                    : t.surface3,
                }}
              />
            ))}
          </div>

          {/* Messages */}
          <div
            className="h-44 overflow-y-auto mb-3 space-y-1.5 p-2 rounded-xl"
            style={{
              background: t.surface2,
              border: `1px solid ${t.border}`,
            }}
          >
            {game.feedbacks.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: msg.startsWith('You:') ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs px-2 py-1 rounded"
                style={{
                  color: msg.startsWith('You:') ? t.textMuted : t.text,
                  background: msg.startsWith('You:') ? 'transparent' : `${t.accent}08`,
                  lineHeight: 1.5,
                }}
              >
                {msg}
              </motion.div>
            ))}
          </div>

          {/* Save input */}
          <AnimatePresence>
            {showSave && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-2 mb-2"
              >
                <input
                  type="text"
                  placeholder="Name this game..."
                  value={saveInput}
                  onChange={e => setSaveInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: t.surface2,
                    border: `1px solid ${t.accent}`,
                    color: t.text,
                  }}
                />
                <motion.button
                  onClick={handleSave}
                  className="px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: t.accent,
                    color: t.bg,
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  Save
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          {!game.won && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Your answer..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGuess()}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.border}`,
                  color: t.text,
                }}
              />
              <motion.button
                onClick={handleGuess}
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: input.trim() ? t.accent : t.surface3,
                  color: input.trim() ? t.bg : t.textMuted,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Send size={14} />
              </motion.button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
