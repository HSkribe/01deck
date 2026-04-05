import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { RefreshCw, Crown } from 'lucide-react';

type Piece = { type: string; color: 'w' | 'b' } | null;
type Board = Piece[][];

const PIECES: Record<string, string> = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟',
};

function initBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRow = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let i = 0; i < 8; i++) {
    b[0][i] = { type: backRow[i], color: 'b' };
    b[1][i] = { type: 'P', color: 'b' };
    b[6][i] = { type: 'P', color: 'w' };
    b[7][i] = { type: backRow[i], color: 'w' };
  }
  return b;
}

function getLegalMoves(board: Board, row: number, col: number): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  const moves: [number, number][] = [];
  const { type, color } = piece;
  const isEnemy = (r: number, c: number) => board[r]?.[c]?.color === (color === 'w' ? 'b' : 'w');
  const isEmpty = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8 && !board[r][c];
  const canGo = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c]?.color !== color;

  const addLine = (dr: number, dc: number) => {
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      if (board[r][c]) {
        if (isEnemy(r, c)) moves.push([r, c]);
        break;
      }
      moves.push([r, c]);
      r += dr; c += dc;
    }
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (isEmpty(row + dir, col)) {
      moves.push([row + dir, col]);
      if (row === startRow && isEmpty(row + 2 * dir, col)) moves.push([row + 2 * dir, col]);
    }
    if (isEnemy(row + dir, col - 1)) moves.push([row + dir, col - 1]);
    if (isEnemy(row + dir, col + 1)) moves.push([row + dir, col + 1]);
  } else if (type === 'R') {
    addLine(-1, 0); addLine(1, 0); addLine(0, -1); addLine(0, 1);
  } else if (type === 'B') {
    addLine(-1, -1); addLine(-1, 1); addLine(1, -1); addLine(1, 1);
  } else if (type === 'Q') {
    addLine(-1, 0); addLine(1, 0); addLine(0, -1); addLine(0, 1);
    addLine(-1, -1); addLine(-1, 1); addLine(1, -1); addLine(1, 1);
  } else if (type === 'N') {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => {
      if (canGo(row + dr, col + dc)) moves.push([row + dr, col + dc]);
    });
  } else if (type === 'K') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => {
      if (canGo(row + dr, col + dc)) moves.push([row + dr, col + dc]);
    });
  }
  return moves;
}

function makeAIMove(board: Board): Board | null {
  const allMoves: { from: [number, number]; to: [number, number] }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === 'b') {
        const moves = getLegalMoves(board, r, c);
        moves.forEach(to => allMoves.push({ from: [r, c], to }));
      }
    }
  }
  if (allMoves.length === 0) return null;

  // Prefer captures
  const captures = allMoves.filter(m => board[m.to[0]][m.to[1]]?.color === 'w');
  const move = captures.length > 0
    ? captures[Math.floor(Math.random() * captures.length)]
    : allMoves[Math.floor(Math.random() * allMoves.length)];

  const newBoard = board.map(row => [...row]);
  newBoard[move.to[0]][move.to[1]] = newBoard[move.from[0]][move.from[1]];
  newBoard[move.from[0]][move.from[1]] = null;
  return newBoard;
}

export function AgentChess() {
  const { currentTheme: t, chatAgent } = useApp();
  const [board, setBoard] = useState<Board>(initBoard);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [status, setStatus] = useState<string>('Your turn (White)');
  const [capturedW, setCapturedW] = useState<string[]>([]);
  const [capturedB, setCapturedB] = useState<string[]>([]);

  const agentName = chatAgent?.name || 'Agent';

  const handleReset = () => {
    setBoard(initBoard());
    setSelected(null);
    setLegalMoves([]);
    setTurn('w');
    setStatus('Your turn (White)');
    setCapturedW([]);
    setCapturedB([]);
  };

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (turn !== 'w') return;
    const piece = board[row][col];

    if (selected) {
      const isLegal = legalMoves.some(([r, c]) => r === row && c === col);
      if (isLegal) {
        // Execute move
        const newBoard = board.map(r => [...r]);
        const captured = newBoard[row][col];
        if (captured) setCapturedB(prev => [...prev, PIECES[captured.color + captured.type] || '?']);
        newBoard[row][col] = newBoard[selected[0]][selected[1]];
        newBoard[selected[0]][selected[1]] = null;

        // Pawn promotion
        if (newBoard[row][col]?.type === 'P' && row === 0) {
          newBoard[row][col] = { type: 'Q', color: 'w' };
        }

        setBoard(newBoard);
        setSelected(null);
        setLegalMoves([]);
        setTurn('b');
        setStatus(`${agentName} is thinking...`);

        // AI response
        setTimeout(() => {
          const aiBoard = makeAIMove(newBoard);
          if (aiBoard) {
            // Check what was captured
            let wasCapture = false;
            for (let r = 0; r < 8; r++) {
              for (let c = 0; c < 8; c++) {
                if (newBoard[r][c]?.color === 'w' && !aiBoard[r][c]) {
                  wasCapture = true;
                  const cap = newBoard[r][c]!;
                  setCapturedW(prev => [...prev, PIECES[cap.color + cap.type] || '?']);
                }
              }
            }
            setBoard(aiBoard);
            setTurn('w');
            setStatus('Your turn (White)');
          } else {
            setStatus(`${agentName} has no moves. You win!`);
          }
        }, 600);
        return;
      }
    }

    // Select new piece
    if (piece?.color === 'w') {
      setSelected([row, col]);
      setLegalMoves(getLegalMoves(board, row, col));
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }, [board, selected, legalMoves, turn, agentName]);

  const isLight = (r: number, c: number) => (r + c) % 2 === 0;
  const isSelected = (r: number, c: number) => selected?.[0] === r && selected?.[1] === c;
  const isLegal = (r: number, c: number) => legalMoves.some(([lr, lc]) => lr === r && lc === c);

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-3 px-1">
        <div>
          <div className="text-sm" style={{ color: t.text }}>Agent Chess</div>
          <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>{status}</div>
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
          New Game
        </motion.button>
      </div>

      {/* Captured by agent */}
      <div className="flex items-center gap-1 mb-1 w-full h-5">
        {capturedW.map((p, i) => (
          <span key={i} className="text-sm" style={{ color: t.textMuted }}>{p}</span>
        ))}
      </div>

      {/* Board */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `2px solid ${t.border}` }}
      >
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((piece, c) => {
              const light = isLight(r, c);
              const sel = isSelected(r, c);
              const legal = isLegal(r, c);
              const hasEnemy = legal && piece?.color === 'b';

              return (
                <motion.div
                  key={c}
                  className="w-10 h-10 flex items-center justify-center relative cursor-pointer select-none"
                  style={{
                    background: sel
                      ? '#4ade8080'
                      : light
                        ? (t.isDark ? '#2a2a2a' : '#f0d9b5')
                        : (t.isDark ? '#1a1a1a' : '#b58863'),
                  }}
                  onClick={() => handleSquareClick(r, c)}
                  whileHover={{ brightness: 1.1 }}
                >
                  {/* Legal move indicator */}
                  {legal && !hasEnemy && (
                    <motion.div
                      className="absolute w-3 h-3 rounded-full"
                      style={{ background: 'rgba(74,222,128,0.5)' }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    />
                  )}
                  {/* Capture indicator */}
                  {hasEnemy && (
                    <motion.div
                      className="absolute inset-0 rounded"
                      style={{ border: '2px solid rgba(239,68,68,0.6)' }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    />
                  )}
                  {piece && (
                    <span
                      className="text-xl z-10 relative"
                      style={{
                        filter: piece.color === 'b' ? 'none' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                        color: piece.color === 'w' ? (t.isDark ? '#ffffff' : '#fff8e7') : (t.isDark ? '#374151' : '#1a1a1a'),
                        textShadow: piece.color === 'w' ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.2)',
                      }}
                    >
                      {PIECES[piece.color + piece.type]}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Captured by player */}
      <div className="flex items-center gap-1 mt-1 w-full h-5">
        {capturedB.map((p, i) => (
          <span key={i} className="text-sm" style={{ color: t.textMuted }}>{p}</span>
        ))}
      </div>

      {/* Agent indicator */}
      <div
        className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg w-full"
        style={{
          background: t.surface2,
          border: `1px solid ${t.border}`,
        }}
      >
        {chatAgent ? (
          <>
            <img src={chatAgent.portrait} className="w-6 h-6 rounded-full object-cover" alt="" />
            <span className="text-xs" style={{ color: t.textMuted }}>
              {chatAgent.name} is playing as Black
            </span>
          </>
        ) : (
          <>
            <Crown size={14} style={{ color: t.textMuted }} />
            <span className="text-xs" style={{ color: t.textMuted }}>
              AI Agent plays as Black · Drop an agent into chat to personalize
            </span>
          </>
        )}
      </div>
    </div>
  );
}
