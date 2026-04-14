import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { RefreshCw, Crown, Zap } from 'lucide-react';

type Piece = { type: string; color: 'w' | 'b' } | null;
type Board = Piece[][];

const PIECES: Record<string, string> = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟',
};

// ─── Agent abilities ───────────────────────────────────────

type AbilityId = 'eliminate' | 'reveal' | 'double-leap' | 'fast-track';

interface Ability {
  id: AbilityId;
  name: string;
  agent: string;
  piece: string;
  icon: string;
  description: string;
  used: boolean;
}

const INITIAL_ABILITIES: Ability[] = [
  {
    id: 'eliminate',
    name: 'Eliminate',
    agent: 'LYRA',
    piece: 'Q',
    icon: '⚡',
    description: 'Remove any one enemy piece (not King) from the board.',
    used: false,
  },
  {
    id: 'reveal',
    name: 'Reveal',
    agent: 'ARIA',
    piece: 'B',
    icon: '👁',
    description: 'Preview the AI\'s planned next move for 3 seconds.',
    used: false,
  },
  {
    id: 'double-leap',
    name: 'Double Leap',
    agent: 'NOVA',
    piece: 'N',
    icon: '🔀',
    description: 'Your Knight moves twice this turn.',
    used: false,
  },
  {
    id: 'fast-track',
    name: 'Fast Track',
    agent: 'ECHO',
    piece: 'P',
    icon: '🚀',
    description: 'Advance any one of your pawns an extra square.',
    used: false,
  },
];

// ─── Chess logic ──────────────────────────────────────────

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
  if (next[to[0]][to[1]]?.type === 'P' && (to[0] === 0 || to[0] === 7)) {
    next[to[0]][to[1]] = { type: 'Q', color: next[to[0]][to[1]]!.color };
  }
  return next;
}

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

  const givesCheck = allMoves.filter(m => {
    const next = applyMove(board, m.from, m.to);
    return isInCheck(next, 'w');
  });
  const captures = allMoves.filter(m => board[m.to[0]][m.to[1]]?.color === 'w');
  const pool = givesCheck.length > 0 ? givesCheck : captures.length > 0 ? captures : allMoves;
  const move = pool[Math.floor(Math.random() * pool.length)];

  return applyMove(board, move.from, move.to);
}

function getAIPlannedMove(board: Board): { from: [number, number]; to: [number, number] } | null {
  const allMoves: { from: [number, number]; to: [number, number] }[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === 'b')
        getLegalMoves(board, r, c).forEach(to => allMoves.push({ from: [r, c], to }));

  if (allMoves.length === 0) return null;
  const captures = allMoves.filter(m => board[m.to[0]][m.to[1]]?.color === 'w');
  const pool = captures.length > 0 ? captures : allMoves;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Component ────────────────────────────────────────────

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
  const [abilities, setAbilities] = useState<Ability[]>(INITIAL_ABILITIES);

  // Ability activation state
  const [activeAbility, setActiveAbility] = useState<AbilityId | null>(null);
  // For 'double-leap': track if the knight just moved and needs bonus move
  const [pendingDoubleLeap, setPendingDoubleLeap] = useState<[number, number] | null>(null);
  // For 'reveal': highlight AI's planned move squares
  const [revealHighlight, setRevealHighlight] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  // For 'fast-track': show pawn selection mode
  const [fastTrackPawns, setFastTrackPawns] = useState<[number, number][]>([]);

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const agentName = chatAgent?.name || 'Agent';

  const markAbilityUsed = (id: AbilityId) => {
    setAbilities(prev => prev.map(a => a.id === id ? { ...a, used: true } : a));
  };

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
    setAbilities(INITIAL_ABILITIES);
    setActiveAbility(null);
    setPendingDoubleLeap(null);
    setRevealHighlight(null);
    setFastTrackPawns([]);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  };

  const activateAbility = (ability: Ability) => {
    if (ability.used || gameOver || turn !== 'w') return;

    if (ability.id === 'eliminate') {
      setActiveAbility('eliminate');
      setStatus('⚡ LYRA — Click any enemy piece to eliminate it.');
      setSelected(null);
      setLegalMoves([]);
    } else if (ability.id === 'reveal') {
      const planned = getAIPlannedMove(board);
      if (!planned) {
        setStatus('No AI move to reveal.');
        return;
      }
      markAbilityUsed('reveal');
      setRevealHighlight(planned);
      setStatus(`👁 ARIA — AI is planning: ${String.fromCharCode(97 + planned.from[1])}${8 - planned.from[0]} → ${String.fromCharCode(97 + planned.to[1])}${8 - planned.to[0]}`);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => {
        setRevealHighlight(null);
        setStatus('Your turn — White');
      }, 3000);
    } else if (ability.id === 'double-leap') {
      setActiveAbility('double-leap');
      setStatus('🔀 NOVA — Move your Knight. It will leap again immediately after.');
      // Find white knights
      const knights: [number, number][] = [];
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
          if (board[r][c]?.color === 'w' && board[r][c]?.type === 'N') knights.push([r, c]);
      // Highlight them by setting legal moves to knight positions (we use a different highlight)
      setSelected(null);
      setLegalMoves([]);
    } else if (ability.id === 'fast-track') {
      const pawns: [number, number][] = [];
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
          if (board[r][c]?.color === 'w' && board[r][c]?.type === 'P') pawns.push([r, c]);
      if (pawns.length === 0) {
        setStatus('No pawns left to advance.');
        return;
      }
      setActiveAbility('fast-track');
      setFastTrackPawns(pawns);
      setStatus('🚀 ECHO — Click a pawn to advance it one extra square.');
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const runAITurn = useCallback((boardState: Board) => {
    setTurn('b');
    const aiInCheck = isInCheck(boardState, 'b');
    const aiHasMoves = hasAnyLegalMoves(boardState, 'b');

    if (!aiHasMoves) {
      setStatus(aiInCheck ? 'Checkmate — you win! ♔' : 'Stalemate — draw!');
      setGameOver(true);
      return;
    }

    setStatus(aiInCheck ? `Check! ${agentName} is thinking...` : `${agentName} is thinking...`);

    setTimeout(() => {
      const aiBoard = makeAIMove(boardState);
      if (!aiBoard) { setStatus('No moves — game over.'); setGameOver(true); return; }

      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
          if (boardState[r][c]?.color === 'w' && !aiBoard[r][c])
            setCapturedW(prev => [...prev, PIECES[boardState[r][c]!.color + boardState[r][c]!.type] || '?']);

      const playerInCheck = isInCheck(aiBoard, 'w');
      const playerHasMoves = hasAnyLegalMoves(aiBoard, 'w');

      setBoard(aiBoard);
      setInCheck(playerInCheck);

      if (!playerHasMoves) {
        setStatus(playerInCheck ? `Checkmate — ${agentName} wins! ♚` : 'Stalemate — draw!');
        setGameOver(true);
        return;
      }

      setTurn('w');
      setStatus(playerInCheck ? 'Check! Your turn — White' : 'Your turn — White');
    }, 600);
  }, [agentName]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameOver) return;

    // ── Eliminate mode ───────────────────────────────────
    if (activeAbility === 'eliminate' && turn === 'w') {
      const target = board[row][col];
      if (target?.color === 'b' && target.type !== 'K') {
        const newBoard = board.map(r => [...r]);
        setCapturedB(prev => [...prev, PIECES[target.color + target.type] || '?']);
        newBoard[row][col] = null;
        setBoard(newBoard);
        setActiveAbility(null);
        markAbilityUsed('eliminate');
        setStatus(`⚡ Eliminated! ${agentName} is responding...`);
        runAITurn(newBoard);
        return;
      }
      if (target?.color === 'b' && target.type === 'K') {
        setStatus('⚡ LYRA — Cannot eliminate the King. Pick another piece.');
        return;
      }
      setStatus('⚡ LYRA — Click an enemy piece to eliminate it.');
      return;
    }

    // ── Fast-track pawn mode ─────────────────────────────
    if (activeAbility === 'fast-track' && turn === 'w') {
      const isPawnTarget = fastTrackPawns.some(([r, c]) => r === row && c === col);
      if (isPawnTarget) {
        const piece = board[row][col];
        if (piece?.type === 'P' && piece.color === 'w') {
          const targetRow = row - 1; // move one extra square forward
          if (targetRow >= 0 && !board[targetRow][col]) {
            const newBoard = board.map(r => [...r]);
            newBoard[targetRow][col] = piece;
            newBoard[row][col] = null;
            // Promotion check
            if (targetRow === 0) newBoard[targetRow][col] = { type: 'Q', color: 'w' };
            setBoard(newBoard);
            setFastTrackPawns([]);
            setActiveAbility(null);
            markAbilityUsed('fast-track');
            setStatus(`🚀 Advanced! ${agentName} is responding...`);
            runAITurn(newBoard);
            return;
          } else {
            setStatus('🚀 ECHO — That pawn can\'t advance further. Pick another.');
            return;
          }
        }
      }
      setStatus('🚀 ECHO — Click one of your highlighted pawns.');
      return;
    }

    // ── Double-leap: second move ─────────────────────────
    if (activeAbility === 'double-leap' && pendingDoubleLeap) {
      const leapMoves = getLegalMoves(board, pendingDoubleLeap[0], pendingDoubleLeap[1]);
      const isLeapTarget = leapMoves.some(([r, c]) => r === row && c === col);
      if (isLeapTarget) {
        const captured = board[row][col];
        if (captured) setCapturedB(prev => [...prev, PIECES[captured.color + captured.type] || '?']);
        const newBoard = applyMove(board, pendingDoubleLeap, [row, col]);
        setBoard(newBoard);
        setPendingDoubleLeap(null);
        setActiveAbility(null);
        setSelected(null);
        setLegalMoves([]);
        markAbilityUsed('double-leap');
        runAITurn(newBoard);
        return;
      }
      // Allow selecting the knight again to pick new move
      setSelected(pendingDoubleLeap);
      setLegalMoves(leapMoves);
      return;
    }

    if (turn !== 'w') return;

    const piece = board[row][col];

    if (selected) {
      const isLegalMove = legalMoves.some(([r, c]) => r === row && c === col);
      if (isLegalMove) {
        const captured = board[row][col];
        if (captured) setCapturedB(prev => [...prev, PIECES[captured.color + captured.type] || '?']);
        const newBoard = applyMove(board, selected, [row, col]);

        // ── Double-leap: check if we moved a knight with this ability active
        if (activeAbility === 'double-leap' && board[selected[0]][selected[1]]?.type === 'N') {
          setBoard(newBoard);
          setSelected(null);
          const leapMoves = getLegalMoves(newBoard, row, col);
          setLegalMoves(leapMoves);
          setPendingDoubleLeap([row, col]);
          setStatus('🔀 NOVA — Knight leaps again! Pick its second destination.');
          return;
        }

        setBoard(newBoard);
        setSelected(null);
        setLegalMoves([]);
        setInCheck(false);
        runAITurn(newBoard);
        return;
      }
    }

    // ── Double-leap: first knight selection ─────────────
    if (activeAbility === 'double-leap' && piece?.color === 'w' && piece.type === 'N') {
      const moves = getLegalMoves(board, row, col);
      setSelected([row, col]);
      setLegalMoves(moves);
      return;
    }

    if (piece?.color === 'w') {
      const moves = getLegalMoves(board, row, col);
      setSelected([row, col]);
      setLegalMoves(moves);
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }, [board, selected, legalMoves, turn, agentName, gameOver, activeAbility, fastTrackPawns, pendingDoubleLeap, runAITurn]);

  const isLight = (r: number, c: number) => (r + c) % 2 === 0;
  const isSelected = (r: number, c: number) => selected?.[0] === r && selected?.[1] === c;
  const isLegal = (r: number, c: number) => legalMoves.some(([lr, lc]) => lr === r && lc === c);
  const isKingInCheck = (r: number, c: number) =>
    inCheck && board[r][c]?.type === 'K' && board[r][c]?.color === 'w';
  const isRevealFrom = (r: number, c: number) =>
    revealHighlight?.from[0] === r && revealHighlight?.from[1] === c;
  const isRevealTo = (r: number, c: number) =>
    revealHighlight?.to[0] === r && revealHighlight?.to[1] === c;
  const isFastTrackPawn = (r: number, c: number) =>
    fastTrackPawns.some(([pr, pc]) => pr === r && pc === c);
  const isEliminateTarget = (r: number, c: number) =>
    activeAbility === 'eliminate' && board[r][c]?.color === 'b' && board[r][c]?.type !== 'K';
  const isDoubleLeapKnight = (r: number, c: number) =>
    activeAbility === 'double-leap' && !pendingDoubleLeap && board[r][c]?.color === 'w' && board[r][c]?.type === 'N';
  const isPendingLeap = (r: number, c: number) =>
    pendingDoubleLeap?.[0] === r && pendingDoubleLeap?.[1] === c;

  const unusedAbilities = abilities.filter(a => !a.used);

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
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

      {/* Agent abilities panel */}
      <div className="w-full mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap size={11} style={{ color: t.accent }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
            Agent Abilities — {unusedAbilities.length} remaining
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {abilities.map(ability => (
            <motion.button
              key={ability.id}
              onClick={() => activateAbility(ability)}
              disabled={ability.used || gameOver || turn !== 'w'}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-left"
              style={{
                background: activeAbility === ability.id
                  ? `${t.accent}20`
                  : ability.used
                    ? t.surface1
                    : t.surface2,
                border: `1px solid ${activeAbility === ability.id
                  ? t.accent
                  : ability.used
                    ? t.border
                    : t.border}`,
                opacity: ability.used ? 0.4 : turn !== 'w' && !gameOver ? 0.6 : 1,
                cursor: ability.used || gameOver || turn !== 'w' ? 'not-allowed' : 'pointer',
              }}
              whileHover={!ability.used && turn === 'w' && !gameOver ? { scale: 1.02 } : {}}
              whileTap={!ability.used && turn === 'w' && !gameOver ? { scale: 0.97 } : {}}
              title={ability.description}
            >
              <span style={{ fontSize: 16 }}>{ability.icon}</span>
              <div className="min-w-0">
                <div className="text-[10px] font-medium truncate" style={{ color: ability.used ? t.textMuted : t.text }}>
                  {ability.name}
                </div>
                <div className="text-[9px]" style={{ color: t.textMuted }}>
                  {ability.agent} · {ability.used ? 'Used' : ability.piece === 'Q' ? 'Queen' : ability.piece === 'B' ? 'Bishop' : ability.piece === 'N' ? 'Knight' : 'Pawn'}
                </div>
              </div>
              {ability.used && (
                <span className="ml-auto text-[9px]" style={{ color: t.textMuted }}>✓</span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Captured by AI */}
      <div className="flex items-center gap-1 mb-1 w-full h-5">
        {capturedW.map((p, i) => <span key={i} className="text-sm" style={{ color: t.textMuted }}>{p}</span>)}
      </div>

      {/* Board */}
      <div className="rounded-xl overflow-hidden" style={{ border: `2px solid ${inCheck ? '#ef4444' : t.border}` }}>
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((piece, c) => {
              const light = isLight(r, c);
              const sel = isSelected(r, c);
              const legal = isLegal(r, c);
              const hasEnemy = legal && piece?.color === 'b';
              const kingCheck = isKingInCheck(r, c);
              const revFrom = isRevealFrom(r, c);
              const revTo = isRevealTo(r, c);
              const ftPawn = isFastTrackPawn(r, c);
              const elimTarget = isEliminateTarget(r, c);
              const dlKnight = isDoubleLeapKnight(r, c);
              const pendLeap = isPendingLeap(r, c);

              let bgColor = light
                ? (t.isDark ? '#2a2a2a' : '#f0d9b5')
                : (t.isDark ? '#1a1a1a' : '#b58863');

              if (kingCheck) bgColor = '#ef444460';
              else if (sel || pendLeap) bgColor = '#4ade8080';
              else if (revFrom) bgColor = 'rgba(234,179,8,0.4)';
              else if (revTo) bgColor = 'rgba(234,179,8,0.6)';
              else if (ftPawn) bgColor = 'rgba(16,185,129,0.35)';
              else if (dlKnight) bgColor = 'rgba(168,85,247,0.35)';

              return (
                <motion.div
                  key={c}
                  className="w-10 h-10 flex items-center justify-center relative cursor-pointer select-none"
                  style={{ background: bgColor }}
                  onClick={() => handleSquareClick(r, c)}
                  whileHover={elimTarget || ftPawn || dlKnight ? { opacity: 0.8 } : {}}
                >
                  {/* Legal move dot */}
                  {legal && !hasEnemy && (
                    <motion.div
                      className="absolute w-3 h-3 rounded-full"
                      style={{ background: 'rgba(74,222,128,0.5)' }}
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                    />
                  )}
                  {/* Enemy capture ring */}
                  {hasEnemy && (
                    <motion.div
                      className="absolute inset-0 rounded"
                      style={{ border: '2px solid rgba(239,68,68,0.6)' }}
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                    />
                  )}
                  {/* Eliminate target ring */}
                  {elimTarget && (
                    <motion.div
                      className="absolute inset-0"
                      style={{ border: '2px solid rgba(245,158,11,0.8)', background: 'rgba(245,158,11,0.1)' }}
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                  )}
                  {/* Piece */}
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

      {/* Captured by player */}
      <div className="flex items-center gap-1 mt-1 w-full h-5">
        {capturedB.map((p, i) => <span key={i} className="text-sm" style={{ color: t.textMuted }}>{p}</span>)}
      </div>

      {/* Agent footer */}
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
        <span className="ml-auto text-[10px]" style={{ color: t.textMuted }}>
          Activate abilities on your turn
        </span>
      </div>
    </div>
  );
}
