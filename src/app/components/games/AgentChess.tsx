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

/** Raw pseudo-legal moves — does NOT filter moves that leave own king in check. */
function getRawMoves(board: Board, row: number, col: number): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  const moves: [number, number][] = [];
  const { type, color } = piece;
  const enemy = color === 'w' ? 'b' : 'w';
  const isEnemy = (r: number, c: number) => board[r]?.[c]?.color === enemy;
  const isEmpty = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8 && !board[r][c];
  const canGo = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c]?.color !== color;

  const addLine = (dr: number, dc: number) => {
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      if (board[r][c]) { if (isEnemy(r, c)) moves.push([r, c]); break; }
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

function findKing(board: Board, color: 'w' | 'b'): [number, number] | null {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'K' && board[r][c]?.color === color) return [r, c];
  return null;
}

function isSquareAttacked(board: Board, row: number, col: number, byColor: 'w' | 'b'): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === byColor)
        if (getRawMoves(board, r, c).some(([mr, mc]) => mr === row && mc === col)) return true;
  return false;
}

function isInCheck(board: Board, color: 'w' | 'b'): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king[0], king[1], color === 'w' ? 'b' : 'w');
}

function applyMove(board: Board, from: [number, number], to: [number, number]): Board {
  const next = board.map(r => [...r]);
  next[to[0]][to[1]] = next[from[0]][from[1]];
  next[from[0]][from[1]] = null;
  // Pawn promotion to queen
  if (next[to[0]][to[1]]?.type === 'P' && (to[0] === 0 || to[0] === 7)) {
    next[to[0]][to[1]] = { type: 'Q', color: next[to[0]][to[1]]!.color };
  }
  return next;
}

/** Legal moves filtered so they don't leave own king in check. */
function getLegalMoves(board: Board, row: number, col: number): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  return getRawMoves(board, row, col).filter(to => {
    const next = applyMove(board, [row, col], to);
    return !isInCheck(next, piece.color);
  });
}

function hasAnyLegalMoves(board: Board, color: 'w' | 'b'): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === color && getLegalMoves(board, r, c).length > 0) return true;
  return false;
}

function makeAIMove(board: Board): Board | null {
  const allMoves: { from: [number, number]; to: [number, number] }[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === 'b')
        getLegalMoves(board, r, c).forEach(to => allMoves.push({ from: [r, c], to }));

  if (allMoves.length === 0) return null;

  // Prefer moves that give check, then captures, then random
  const givesCheck = allMoves.filter(m => {
    const next = applyMove(board, m.from, m.to);
    return isInCheck(next, 'w');
  });
  const captures = allMoves.filter(m => board[m.to[0]][m.to[1]]?.color === 'w');
  const pool = givesCheck.length > 0 ? givesCheck : captures.length > 0 ? captures : allMoves;
  const move = pool[Math.floor(Math.random() * pool.length)];

  return applyMove(board, move.from, move.to);
}

export function AgentChess() {
  const { currentTheme: t, chatAgent } = useApp();
  const [board, setBoard] = useState<Board>(initBoard);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [status, setStatus] = useState<string>('Your turn — White');
  const [capturedW, setCapturedW] = useState<string[]>([]);
  const [capturedB, setCapturedB] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [inCheck, setInCheck] = useState(false);

  const agentName = chatAgent?.name || 'Agent';

  const handleReset = () => {
    setBoard(initBoard());
    setSelected(null);
    setLegalMoves([]);
    setTurn('w');
    setStatus('Your turn — White');
    setCapturedW([]);
    setCapturedB([]);
    setGameOver(false);
    setInCheck(false);
  };

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (turn !== 'w' || gameOver) return;
    const piece = board[row][col];

    if (selected) {
      const isLegal = legalMoves.some(([r, c]) => r === row && c === col);
      if (isLegal) {
        const captured = board[row][col];
        if (captured) setCapturedB(prev => [...prev, PIECES[captured.color + captured.type] || '?']);
        const newBoard = applyMove(board, selected, [row, col]);

        setBoard(newBoard);
        setSelected(null);
        setLegalMoves([]);
        setInCheck(false);

        // Check state after player's move
        const aiInCheck = isInCheck(newBoard, 'b');
        const aiHasMoves = hasAnyLegalMoves(newBoard, 'b');

        if (!aiHasMoves) {
          if (aiInCheck) {
            setStatus('Checkmate — you win! ♔');
          } else {
            setStatus('Stalemate — draw!');
          }
          setGameOver(true);
          return;
        }

        setTurn('b');
        setStatus(aiInCheck ? `Check! ${agentName} is thinking...` : `${agentName} is thinking...`);

        setTimeout(() => {
          const aiBoard = makeAIMove(newBoard);
          if (!aiBoard) {
            setStatus('No moves — game over.');
            setGameOver(true);
            return;
          }

          // Detect AI captures
          for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
              if (newBoard[r][c]?.color === 'w' && !aiBoard[r][c])
                setCapturedW(prev => [...prev, PIECES[newBoard[r][c]!.color + newBoard[r][c]!.type] || '?']);

          const playerInCheck = isInCheck(aiBoard, 'w');
          const playerHasMoves = hasAnyLegalMoves(aiBoard, 'w');

          setBoard(aiBoard);
          setInCheck(playerInCheck);

          if (!playerHasMoves) {
            if (playerInCheck) {
              setStatus(`Checkmate — ${agentName} wins! ♚`);
            } else {
              setStatus('Stalemate — draw!');
            }
            setGameOver(true);
            return;
          }

          setTurn('w');
          setStatus(playerInCheck ? 'Check! Your turn — White' : 'Your turn — White');
        }, 600);
        return;
      }
    }

    if (piece?.color === 'w') {
      const moves = getLegalMoves(board, row, col);
      setSelected([row, col]);
      setLegalMoves(moves);
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }, [board, selected, legalMoves, turn, agentName, gameOver]);

  const isLight = (r: number, c: number) => (r + c) % 2 === 0;
  const isSelected = (r: number, c: number) => selected?.[0] === r && selected?.[1] === c;
  const isLegal = (r: number, c: number) => legalMoves.some(([lr, lc]) => lr === r && lc === c);
  const isKingInCheck = (r: number, c: number) =>
    inCheck && board[r][c]?.type === 'K' && board[r][c]?.color === 'w';

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-3 px-1">
        <div>
          <div className="text-sm" style={{ color: t.text }}>Agent Chess</div>
          <div className="text-xs mt-0.5" style={{ color: inCheck ? '#ef4444' : t.textMuted }}>{status}</div>
        </div>
        <motion.button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
          whileHover={{ scale: 1.05 }}
        >
          <RefreshCw size={12} /> New Game
        </motion.button>
      </div>

      <div className="flex items-center gap-1 mb-1 w-full h-5">
        {capturedW.map((p, i) => <span key={i} className="text-sm" style={{ color: t.textMuted }}>{p}</span>)}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: `2px solid ${inCheck ? '#ef4444' : t.border}` }}>
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((piece, c) => {
              const light = isLight(r, c);
              const sel = isSelected(r, c);
              const legal = isLegal(r, c);
              const hasEnemy = legal && piece?.color === 'b';
              const kingCheck = isKingInCheck(r, c);

              return (
                <motion.div
                  key={c}
                  className="w-10 h-10 flex items-center justify-center relative cursor-pointer select-none"
                  style={{
                    background: kingCheck
                      ? '#ef444460'
                      : sel
                        ? '#4ade8080'
                        : light
                          ? (t.isDark ? '#2a2a2a' : '#f0d9b5')
                          : (t.isDark ? '#1a1a1a' : '#b58863'),
                  }}
                  onClick={() => handleSquareClick(r, c)}
                >
                  {legal && !hasEnemy && (
                    <motion.div
                      className="absolute w-3 h-3 rounded-full"
                      style={{ background: 'rgba(74,222,128,0.5)' }}
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                    />
                  )}
                  {hasEnemy && (
                    <motion.div
                      className="absolute inset-0 rounded"
                      style={{ border: '2px solid rgba(239,68,68,0.6)' }}
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                    />
                  )}
                  {piece && (
                    <span
                      className="text-xl z-10 relative"
                      style={{
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

      <div className="flex items-center gap-1 mt-1 w-full h-5">
        {capturedB.map((p, i) => <span key={i} className="text-sm" style={{ color: t.textMuted }}>{p}</span>)}
      </div>

      <div
        className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg w-full"
        style={{ background: t.surface2, border: `1px solid ${t.border}` }}
      >
        {chatAgent ? (
          <>
            <img src={chatAgent.portrait} className="w-6 h-6 rounded-full object-cover" alt="" />
            <span className="text-xs" style={{ color: t.textMuted }}>{chatAgent.name} plays as Black</span>
          </>
        ) : (
          <>
            <Crown size={14} style={{ color: t.textMuted }} />
            <span className="text-xs" style={{ color: t.textMuted }}>AI Agent plays as Black · Drop an agent to personalize</span>
          </>
        )}
      </div>
    </div>
  );
}
