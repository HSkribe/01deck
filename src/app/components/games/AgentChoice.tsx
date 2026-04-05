import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Trash2, Shuffle, Send, Bookmark, Trophy } from 'lucide-react';

interface GameState {
  type: 'number' | 'word' | 'riddle' | null;
  secret: number | string | null;
  riddleQuestion: string | null;
  hints: number;
  maxHints: number;
  guesses: string[];
  feedbacks: string[];
  won: boolean;
  lost: boolean;
}

interface SavedGame {
  name: string;
  type: string;
  won: boolean;
  guesses: number;
  savedAt: number;
}

const RIDDLES = [
  { q: 'I have cities but no houses, mountains but no trees. What am I?', a: 'map' },
  { q: 'The more you take, the more you leave behind. What am I?', a: 'footsteps' },
  { q: 'I speak without a mouth and hear without ears. What am I?', a: 'echo' },
  { q: 'I have hands but cannot clap. What am I?', a: 'clock' },
  { q: 'What has keys but no locks, space but no room, and you can enter but can\'t go inside?', a: 'keyboard' },
  { q: 'I fly without wings, I cry without eyes. What am I?', a: 'cloud' },
  { q: 'The more you cut me, the bigger I grow. What am I?', a: 'hole' },
  { q: 'I am always in front of you but cannot be seen. What am I?', a: 'future' },
  { q: 'I am light as a feather, yet the strongest person cannot hold me for more than a minute. What am I?', a: 'breath' },
  { q: 'I have a head, a tail, but no body. What am I?', a: 'coin' },
  { q: 'What gets wetter as it dries?', a: 'towel' },
  { q: 'I go up but never come down. What am I?', a: 'age' },
];

const WORD_LIST = [
  'protocol', 'neural', 'cipher', 'quantum', 'matrix',
  'vector', 'nexus', 'prism', 'agent', 'signal',
  'vertex', 'binary', 'kernel', 'syntax', 'fractal',
  'cosmos', 'cipher', 'forge', 'spark', 'orbit',
];

const GAME_TYPES = [
  { id: 'number', label: 'Number Guess', icon: '🔢', description: 'Agent thinks of a number 1–100' },
  { id: 'word', label: 'Word Guess', icon: '💬', description: 'Agent thinks of a hidden word' },
  { id: 'riddle', label: 'Riddle Mode', icon: '🧩', description: 'Can you solve the agent\'s riddle?' },
];

const STORAGE_KEY = 'agentchoice_saved_games';

function loadSaved(): SavedGame[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function persistSaved(games: SavedGame[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games.slice(-20)));
  } catch {}
}

export function AgentChoice() {
  const { currentTheme: t, chatAgent } = useApp();
  const [game, setGame] = useState<GameState>({
    type: null, secret: null, riddleQuestion: null,
    hints: 0, maxHints: 5, guesses: [], feedbacks: [], won: false, lost: false,
  });
  const [input, setInput] = useState('');
  const [savedGames, setSavedGames] = useState<SavedGame[]>(loadSaved);
  const [showSaved, setShowSaved] = useState(false);
  const [sessionWins, setSessionWins] = useState(0);

  useEffect(() => { persistSaved(savedGames); }, [savedGames]);

  const agentName = chatAgent?.name || 'Agent';

  const startGame = (type: 'number' | 'word' | 'riddle') => {
    let secret: number | string;
    let riddleQuestion: string | null = null;
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
      riddleQuestion = riddle.q;
      maxHints = 3;
    }
    setGame({
      type, secret, riddleQuestion,
      hints: 0, maxHints,
      guesses: [],
      feedbacks: [`${agentName}: I've designed a ${type} challenge. You have ${maxHints} attempts.`],
      won: false, lost: false,
    });
    setInput('');
  };

  const handleGuess = () => {
    if (!input.trim() || !game.type || game.won || game.lost) return;
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
        feedback = `${agentName}: Higher!`;
      } else {
        feedback = `${agentName}: Lower!`;
      }
    } else if (game.type === 'word') {
      if (guess === secret) {
        feedback = `${agentName}: Brilliant! The word was "${secret}"! 🎉`;
        won = true;
      } else {
        const commonLetters = guess.split('').filter(l => (secret as string).includes(l)).length;
        feedback = `${agentName}: "${guess}" is wrong. ${commonLetters} letter(s) in common.`;
      }
    } else {
      if (guess === secret || (secret as string).startsWith(guess) && guess.length >= 3) {
        feedback = `${agentName}: Correct! The answer was "${secret}"! Well reasoned! 🎉`;
        won = true;
      } else {
        feedback = `${agentName}: Not quite. Think differently.`;
      }
    }

    const newHints = game.hints + 1;
    const lost = newHints >= game.maxHints && !won;
    if (lost) feedback += ` Game over — the answer was "${game.secret}".`;
    if (won) setSessionWins(w => w + 1);

    setGame(prev => ({
      ...prev,
      hints: newHints,
      guesses: [...prev.guesses, guess],
      feedbacks: [...prev.feedbacks, `You: ${input.trim()}`, feedback],
      won,
      lost,
    }));
    setInput('');
  };

  const handleSave = () => {
    const entry: SavedGame = {
      name: `${game.type} game — ${new Date().toLocaleDateString()}`,
      type: game.type!,
      won: game.won,
      guesses: game.guesses.length,
      savedAt: Date.now(),
    };
    setSavedGames(prev => [entry, ...prev]);
  };

  const deleteGame = (index: number) => {
    setSavedGames(prev => prev.filter((_, i) => i !== index));
  };

  const gameOver = game.won || game.lost;

  return (
    <div className="flex flex-col">
      {!game.type ? (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm" style={{ color: t.text }}>Agent Choice</div>
            {sessionWins > 0 && (
              <div className="flex items-center gap-1 text-xs" style={{ color: t.accent }}>
                <Trophy size={11} /> {sessionWins} win{sessionWins !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div className="text-xs mb-4" style={{ color: t.textMuted }}>
            {agentName} will design a game for you to play
          </div>
          <div className="space-y-2 mb-4">
            {GAME_TYPES.map(gt => (
              <motion.button
                key={gt.id}
                onClick={() => startGame(gt.id as 'number' | 'word' | 'riddle')}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                style={{ background: t.surface2, border: `1px solid ${t.border}` }}
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

          {savedGames.length > 0 && (
            <div>
              <button
                onClick={() => setShowSaved(s => !s)}
                className="text-xs mb-2 flex items-center gap-1"
                style={{ color: t.textMuted }}
              >
                <Bookmark size={11} /> {savedGames.length} saved game{savedGames.length !== 1 ? 's' : ''}
              </button>
              <AnimatePresence>
                {showSaved && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {savedGames.map((sg, i) => (
                      <div
                        key={sg.savedAt}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                        style={{ background: t.surface3, border: `1px solid ${t.border}` }}
                      >
                        <div>
                          <span style={{ color: t.text }}>{sg.name}</span>
                          <span className="ml-2" style={{ color: sg.won ? '#22c55e' : '#ef4444' }}>
                            {sg.won ? '✓ Won' : '✗ Lost'} · {sg.guesses} guess{sg.guesses !== 1 ? 'es' : ''}
                          </span>
                        </div>
                        <button onClick={() => deleteGame(i)} style={{ color: t.textMuted }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm" style={{ color: t.text }}>
                {GAME_TYPES.find(g => g.id === game.type)?.label}
              </div>
              <div className="text-xs" style={{ color: t.textMuted }}>
                {gameOver ? (game.won ? '🎉 You won!' : '💀 Game over') : `${game.maxHints - game.hints} attempts left`}
              </div>
            </div>
            <div className="flex gap-2">
              {gameOver && (
                <motion.button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                  style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Bookmark size={11} /> Save
                </motion.button>
              )}
              <motion.button
                onClick={() => startGame(game.type!)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
                whileHover={{ scale: 1.05 }}
              >
                <Shuffle size={11} /> New
              </motion.button>
              <motion.button
                onClick={() => setGame({ type: null, secret: null, riddleQuestion: null, hints: 0, maxHints: 5, guesses: [], feedbacks: [], won: false, lost: false })}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
                whileHover={{ scale: 1.05 }}
              >
                Change
              </motion.button>
            </div>
          </div>

          {game.type === 'riddle' && game.riddleQuestion && (
            <div
              className="p-3 rounded-xl mb-3 text-xs"
              style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text, lineHeight: 1.6 }}
            >
              🧩 {game.riddleQuestion}
            </div>
          )}

          <div className="flex gap-1 mb-3">
            {[...Array(game.maxHints)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-colors"
                style={{
                  background: i < game.hints
                    ? (game.won ? '#22c55e' : '#ef4444')
                    : t.surface3,
                }}
              />
            ))}
          </div>

          <div
            className="h-44 overflow-y-auto mb-3 space-y-1.5 p-2 rounded-xl"
            style={{ background: t.surface2, border: `1px solid ${t.border}` }}
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

          {!gameOver && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={game.type === 'number' ? 'Enter a number 1–100' : 'Your answer...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGuess()}
                autoFocus
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
              />
              <motion.button
                onClick={handleGuess}
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: input.trim() ? t.accent : t.surface3, color: input.trim() ? t.bg : t.textMuted }}
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
