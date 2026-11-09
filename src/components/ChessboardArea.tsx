import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { EvalBar } from './EvalBar';
import { ClassificationBadge } from './ClassificationBadge';
import type { MoveAnalysis, MoveClassification } from '../types/chess';
import type { MistakeReviewItem } from '../engine/mistakeReplay';
import {
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  RotateCw,
  Eye,
  Clock,
  UserPlus,
  UserCheck,
  User,
  Flag,
  Bot,
  Undo2,
  Handshake,
  X,
  Target
} from 'lucide-react';

import { CountryFlag } from './CountryFlag';

export interface MoveAccentInfo {
  classification: MoveClassification;
  nameRu: string;
  reason: string;
  isCheck: boolean;
  san?: string;
}

export interface BoardPlayerBarInfo {
  id?: string;
  name: string;
  elo?: number;
  isAi?: boolean;
  color: 'w' | 'b';
  timeRemaining?: number | null;
  isTurn?: boolean;
  country?: string;
  avatarUrl?: string;
}

export interface CapturedPiecesSummary {
  whiteCaptures: Array<{ type: 'p' | 'n' | 'b' | 'r' | 'q'; count: number; symbol: string }>;
  blackCaptures: Array<{ type: 'p' | 'n' | 'b' | 'r' | 'q'; count: number; symbol: string }>;
  whiteAdvantage: number;
  blackAdvantage: number;
}

export function getCapturedPieces(fen: string): CapturedPiecesSummary {
  const boardPart = fen.split(' ')[0] || '';
  const initial: Record<string, number> = {
    P: 8, N: 2, B: 2, R: 2, Q: 1,
    p: 8, n: 2, b: 2, r: 2, q: 1
  };
  const counts: Record<string, number> = {
    P: 0, N: 0, B: 0, R: 0, Q: 0,
    p: 0, n: 0, b: 0, r: 0, q: 0
  };
  for (const ch of boardPart) {
    if (counts[ch] !== undefined) {
      counts[ch]++;
    }
  }

  const order: Array<'p' | 'n' | 'b' | 'r' | 'q'> = ['p', 'n', 'b', 'r', 'q'];
  const symbols: Record<string, string> = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
    P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕'
  };

  const whiteCaptures: Array<{ type: 'p' | 'n' | 'b' | 'r' | 'q'; count: number; symbol: string }> = [];
  order.forEach((t) => {
    const taken = Math.max(0, initial[t] - counts[t]);
    if (taken > 0) {
      whiteCaptures.push({ type: t, count: taken, symbol: symbols[t] });
    }
  });

  const blackCaptures: Array<{ type: 'p' | 'n' | 'b' | 'r' | 'q'; count: number; symbol: string }> = [];
  (['P', 'N', 'B', 'R', 'Q'] as const).forEach((t) => {
    const lower = t.toLowerCase() as 'p' | 'n' | 'b' | 'r' | 'q';
    const taken = Math.max(0, initial[t] - counts[t]);
    if (taken > 0) {
      blackCaptures.push({ type: lower, count: taken, symbol: symbols[t] });
    }
  });

  const whiteMaterial = counts.P * 1 + counts.N * 3 + counts.B * 3 + counts.R * 5 + counts.Q * 9;
  const blackMaterial = counts.p * 1 + counts.n * 3 + counts.b * 3 + counts.r * 5 + counts.q * 9;
  const diff = whiteMaterial - blackMaterial;

  return {
    whiteCaptures,
    blackCaptures,
    whiteAdvantage: Math.max(0, diff),
    blackAdvantage: Math.max(0, -diff)
  };
}

interface ChessboardAreaProps {
  fen: string;
  isFlipped: boolean;
  onFlip: () => void;
  currentMove?: MoveAnalysis;
  currentPly: number;
  totalPlies: number;
  onGoToStart: () => void;
  onGoToPrev: () => void;
  onGoToNext: () => void;
  onGoToEnd: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  evalCp: number;
  mate: number | null;
  bestMoveUci?: string;
  onPieceDrop?: (sourceSquare: string, targetSquare: string, promotion?: string) => boolean;
  isAiThinking?: boolean;
  gameOverMessage?: string | null;
  onRestartGame?: () => void;
  moveAccent?: MoveAccentInfo | null;
  showEngineArrows?: boolean;
  openingsArrow?: { from: string; to: string } | null;
  topPlayer?: BoardPlayerBarInfo;
  bottomPlayer?: BoardPlayerBarInfo;
  isOpponentFriend?: boolean;
  onToggleOpponentFriend?: () => void;
  onOpenTopPlayerProfile?: () => void;
  canResign?: boolean;
  onResignGame?: () => void;
  canOfferDraw?: boolean;
  onOfferDraw?: () => void;
  canUndoMove?: boolean;
  onUndoMove?: () => void;
  mistakeCount?: number;
  onStartMistakeReplay?: () => void;
  activeMistake?: {
    index: number;
    total: number;
    item: MistakeReviewItem;
    success: boolean | null;
    pieceHintRevealed: boolean;
    solutionRevealed: boolean;
  } | null;
  onNextMistake?: () => void;
  onRevealMistakePieceHint?: () => void;
  onRevealMistakeSolution?: () => void;
  onExitMistakeReplay?: () => void;
  timeControlBadge?: string;
  isAnalysisEnabled?: boolean;
  isSpectating?: boolean;
  onExitSpectate?: () => void;
  restrictPieceColor?: boolean;
  moves?: MoveAnalysis[];
  onSelectPly?: (ply: number) => void;
}

export const ChessboardArea: React.FC<ChessboardAreaProps> = ({
  fen,
  isFlipped,
  onFlip,
  currentMove,
  currentPly,
  totalPlies,
  onGoToStart,
  onGoToPrev,
  onGoToNext,
  onGoToEnd,
  isPlaying,
  onTogglePlay,
  soundEnabled,
  onToggleSound,
  evalCp,
  mate,
  bestMoveUci,
  onPieceDrop,
  isAiThinking = false,
  gameOverMessage = null,
  onRestartGame,
  moveAccent = null,
  showEngineArrows = true,
  openingsArrow = null,
  topPlayer,
  bottomPlayer,
  isOpponentFriend = false,
  onToggleOpponentFriend,
  onOpenTopPlayerProfile,
  canResign = false,
  onResignGame,
  canOfferDraw = false,
  onOfferDraw,
  canUndoMove = false,
  onUndoMove,
  mistakeCount = 0,
  onStartMistakeReplay,
  activeMistake = null,
  onNextMistake: _onNextMistake,
  onRevealMistakePieceHint: _onRevealMistakePieceHint,
  onRevealMistakeSolution: _onRevealMistakeSolution,
  onExitMistakeReplay: _onExitMistakeReplay,
  timeControlBadge,
  isAnalysisEnabled = true,
  isSpectating = false,
  onExitSpectate,
  restrictPieceColor = false,
  moves = [],
  onSelectPly
}) => {
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const mobileRibbonRef = useRef<HTMLDivElement>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [isDismissedGameOver, setIsDismissedGameOver] = useState<boolean>(false);
  const [mistakeMode, setMistakeMode] = useState<'review' | 'solve'>('review');
  const [pendingPromotion, setPendingPromotion] = useState<{
    sourceSquare: string;
    targetSquare: string;
    color: 'w' | 'b';
  } | null>(null);

  useEffect(() => {
    setMistakeMode('review');
  }, [activeMistake?.index]);

  const capturedSummary = useMemo(() => getCapturedPieces(fen), [fen]);

  const isPawnPromotion = (source: string, target: string): boolean => {
    try {
      const chess = new Chess(fen);
      const piece = chess.get(source as Parameters<typeof chess.get>[0]);
      if (!piece || piece.type !== 'p') return false;
      if (piece.color !== chess.turn()) return false;
      const targetPiece = chess.get(target as Parameters<typeof chess.get>[0]);
      // Never promote onto a friendly piece
      if (targetPiece && targetPiece.color === piece.color) return false;
      const isRank8 = piece.color === 'w' && source[1] === '7' && target[1] === '8';
      const isRank1 = piece.color === 'b' && source[1] === '2' && target[1] === '1';
      if (!isRank8 && !isRank1) return false;
      const moves = chess.moves({ square: source as any, verbose: true });
      return moves.some((m) => m.to === target);
    } catch {
      return false;
    }
  };

  // Reset dismissal when game over message changes
  useEffect(() => {
    setIsDismissedGameOver(false);
  }, [gameOverMessage]);

  // Clear selected square whenever board position changes
  useEffect(() => {
    setSelectedSquare(null);
  }, [fen]);

  // Auto-scroll mobile move ribbon to active ply
  useEffect(() => {
    if (mobileRibbonRef.current) {
      const activeBtn = mobileRibbonRef.current.querySelector('[data-active-ply="true"]') as HTMLElement | null;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentPly]);

  // Calculate all legal moves for the selected piece
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      const chess = new Chess(fen);
      const piece = chess.get(selectedSquare as Parameters<typeof chess.get>[0]);
      if (!piece || piece.color !== chess.turn()) return [];
      if (restrictPieceColor && bottomPlayer && piece.color !== bottomPlayer.color) return [];

      const verboseMoves = chess.moves({
        square: selectedSquare as Parameters<typeof chess.moves>[0]['square'],
        verbose: true
      });

      return verboseMoves.map((m) => ({
        to: m.to,
        isCapture: Boolean(m.captured) || m.flags.includes('e')
      }));
    } catch {
      return [];
    }
  }, [fen, selectedSquare, restrictPieceColor, bottomPlayer?.color]);

  // Select piece on drag start so legal move dots & capture rings always appear immediately
  const handlePieceDragSelect = (square: string) => {
    if (isSpectating || !onPieceDrop) return;
    if (activeMistake && mistakeMode === 'review') {
      setMistakeMode('solve');
    }
    try {
      const chess = new Chess(fen);
      const piece = chess.get(square as Parameters<typeof chess.get>[0]);
      if (piece && piece.color === chess.turn()) {
        if (restrictPieceColor && bottomPlayer && piece.color !== bottomPlayer.color) {
          return;
        }
        setSelectedSquare(square);
      }
    } catch {}
  };

  // Handle square clicks for click-to-move
  const handleSquareClick = (square: string) => {
    if (isSpectating) return;
    if (!onPieceDrop) return;
    if (activeMistake && mistakeMode === 'review') {
      setMistakeMode('solve');
    }
    try {
      const chess = new Chess(fen);
      const clickedPiece = chess.get(square as Parameters<typeof chess.get>[0]);

      // Priority 1: If clicking a piece of the active player's turn, ALWAYS select or toggle it!
      // This prevents friendly pieces from ever being treated as promotion targets or blocked moves.
      if (clickedPiece && clickedPiece.color === chess.turn()) {
        if (restrictPieceColor && bottomPlayer && clickedPiece.color !== bottomPlayer.color) {
          setSelectedSquare(null);
          return;
        }
        if (selectedSquare === square) {
          setSelectedSquare(null); // toggle off
        } else {
          setSelectedSquare(square); // switch to newly clicked piece
        }
        return;
      }

      // Priority 2: If a piece is already selected and user clicked a target square
      if (selectedSquare) {
        const isLegal = legalMoves.some((m) => m.to === square);
        if (isLegal) {
          if (isPawnPromotion(selectedSquare, square)) {
            const piece = chess.get(selectedSquare as Parameters<typeof chess.get>[0]);
            setPendingPromotion({
              sourceSquare: selectedSquare,
              targetSquare: square,
              color: piece?.color || 'w'
            });
            setSelectedSquare(null);
            return;
          }

          const success = onPieceDrop(selectedSquare, square);
          if (success) {
            setSelectedSquare(null);
            return;
          }
        }

        // Clicked invalid or unreachable square -> deselect
        setSelectedSquare(null);
        return;
      }

      // No piece selected yet -> select if piece belongs to current turn
      if (clickedPiece && clickedPiece.color === chess.turn()) {
        if (restrictPieceColor && bottomPlayer && clickedPiece.color !== bottomPlayer.color) {
          return;
        }
        setSelectedSquare(square);
      }
    } catch {
      setSelectedSquare(null);
    }
  };

  // Best engine move arrow (hidden in 1v1 PvP & Ranked modes, disabled during mistake replay or when analysis is turned off)
  const customArrows: Array<{ startSquare: string; endSquare: string; color: string }> = [];
  if (isAnalysisEnabled && !activeMistake && showEngineArrows && bestMoveUci && bestMoveUci.length >= 4) {
    const from = bestMoveUci.substring(0, 2);
    const to = bestMoveUci.substring(2, 4);
    if (from !== to) {
      customArrows.push({
        startSquare: from,
        endSquare: to,
        color: 'rgba(150, 188, 75, 0.75)'
      });
    }
  }

  // Openings School arrow for guided learning
  if (!activeMistake && openingsArrow && openingsArrow.from && openingsArrow.to) {
    customArrows.push({
      startSquare: openingsArrow.from,
      endSquare: openingsArrow.to,
      color: 'rgba(27, 172, 166, 0.85)'
    });
  }

  // Mistake Replay Arrows:
  // 1. In Review Mode: red arrow demonstrating what the player played
  if (
    activeMistake &&
    mistakeMode === 'review' &&
    activeMistake.success !== true &&
    !activeMistake.solutionRevealed &&
    activeMistake.item.playedUci &&
    activeMistake.item.playedUci.length >= 4
  ) {
    customArrows.push({
      startSquare: activeMistake.item.playedUci.substring(0, 2),
      endSquare: activeMistake.item.playedUci.substring(2, 4),
      color: 'rgba(239, 68, 68, 0.88)'
    });
  }

  // 2. Mistake Replay solution hint arrow (green)
  if (activeMistake?.solutionRevealed && activeMistake.item.bestMoveUci && activeMistake.item.bestMoveUci.length >= 4) {
    customArrows.push({
      startSquare: activeMistake.item.bestMoveUci.substring(0, 2),
      endSquare: activeMistake.item.bestMoveUci.substring(2, 4),
      color: 'rgba(150, 188, 75, 0.95)'
    });
  }

  // 3. Mistake Replay successful move arrow (emerald)
  if (activeMistake?.success === true && activeMistake.item.bestMoveUci && activeMistake.item.bestMoveUci.length >= 4) {
    customArrows.push({
      startSquare: activeMistake.item.bestMoveUci.substring(0, 2),
      endSquare: activeMistake.item.bestMoveUci.substring(2, 4),
      color: 'rgba(16, 185, 129, 0.95)'
    });
  }

  // Target square classification badge position (disabled during mistake replay)
  let badgePosition: { xPct: number; yPct: number } | null = null;
  if (!activeMistake && currentMove && currentMove.to) {
    const file = currentMove.to.charCodeAt(0) - 97;
    const rank = parseInt(currentMove.to[1], 10);
    const col = isFlipped ? 7 - file : file;
    const row = isFlipped ? rank - 1 : 8 - rank;

    badgePosition = {
      xPct: col * 12.5,
      yPct: row * 12.5
    };
  }

  // Mistake target square badge position (shows ?? or ? on the destination square in review mode)
  let mistakeBadgePosition: { xPct: number; yPct: number } | null = null;
  if (
    activeMistake &&
    mistakeMode === 'review' &&
    activeMistake.success !== true &&
    activeMistake.item.playedUci &&
    activeMistake.item.playedUci.length >= 4
  ) {
    const blunderTo = activeMistake.item.playedUci.substring(2, 4);
    const file = blunderTo.charCodeAt(0) - 97;
    const rank = parseInt(blunderTo[1], 10);
    const col = isFlipped ? 7 - file : file;
    const row = isFlipped ? rank - 1 : 8 - rank;
    mistakeBadgePosition = {
      xPct: col * 12.5,
      yPct: row * 12.5
    };
  }

  // Detect King in Check
  const inCheckSquare = useMemo(() => {
    try {
      const chess = new Chess(fen);
      if (!chess.inCheck()) return null;
      const turn = chess.turn();
      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            const file = String.fromCharCode(97 + c);
            const rank = (8 - r).toString();
            return `${file}${rank}`;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [fen]);

  // Detect King in Checkmate
  const inCheckmateSquare = useMemo(() => {
    try {
      const chess = new Chess(fen);
      if (!chess.isCheckmate()) return null;
      const turn = chess.turn();
      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            const file = String.fromCharCode(97 + c);
            const rank = (8 - r).toString();
            return `${file}${rank}`;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [fen]);

  let inCheckPosition: { xPct: number; yPct: number } | null = null;
  if (inCheckSquare && !inCheckmateSquare) {
    const file = inCheckSquare.charCodeAt(0) - 97;
    const rank = parseInt(inCheckSquare[1], 10);
    const col = isFlipped ? 7 - file : file;
    const row = isFlipped ? rank - 1 : 8 - rank;
    inCheckPosition = {
      xPct: col * 12.5,
      yPct: row * 12.5
    };
  }

  let inCheckmatePosition: { xPct: number; yPct: number } | null = null;
  if (inCheckmateSquare) {
    const file = inCheckmateSquare.charCodeAt(0) - 97;
    const rank = parseInt(inCheckmateSquare[1], 10);
    const col = isFlipped ? 7 - file : file;
    const row = isFlipped ? rank - 1 : 8 - rank;
    inCheckmatePosition = {
      xPct: col * 12.5,
      yPct: row * 12.5
    };
  }

  // Square styling for selected square and previous move highlights (disabled during mistake replay)
  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (!activeMistake && currentMove) {
    customSquareStyles[currentMove.from] = {
      backgroundColor: 'rgba(255, 255, 255, 0.08)'
    };
    customSquareStyles[currentMove.to] = {
      backgroundColor: 'rgba(255, 255, 255, 0.16)'
    };
  }
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: 'rgba(27, 172, 166, 0.35)',
      boxShadow: 'inset 0 0 0 2px rgba(27, 172, 166, 0.9)'
    };
  }
  if (inCheckSquare && !inCheckmateSquare) {
    customSquareStyles[inCheckSquare] = {
      backgroundColor: 'rgba(220, 38, 38, 0.45)',
      boxShadow: 'inset 0 0 16px rgba(239, 68, 68, 0.9)'
    };
  }
  if (inCheckmateSquare) {
    customSquareStyles[inCheckmateSquare] = {
      backgroundColor: 'rgba(185, 28, 28, 0.75)',
      boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 1)'
    };
  }

  // Mistake Replay Visual Highlights:
  // 1. In Review Mode: highlight source and destination of the played mistake
  if (
    activeMistake &&
    mistakeMode === 'review' &&
    activeMistake.success !== true &&
    activeMistake.item.playedUci &&
    activeMistake.item.playedUci.length >= 4
  ) {
    const blunderFrom = activeMistake.item.playedUci.substring(0, 2);
    const blunderTo = activeMistake.item.playedUci.substring(2, 4);
    customSquareStyles[blunderFrom] = {
      backgroundColor: 'rgba(239, 68, 68, 0.16)',
      boxShadow: 'inset 0 0 10px rgba(239, 68, 68, 0.45)'
    };
    customSquareStyles[blunderTo] = {
      backgroundColor: 'rgba(239, 68, 68, 0.28)',
      boxShadow: 'inset 0 0 14px rgba(239, 68, 68, 0.75)'
    };
  }
  // 2. Cyan highlight on piece to move when Hint 1 is revealed (does NOT show destination)
  if (activeMistake?.pieceHintRevealed && activeMistake.item.pieceSquare) {
    customSquareStyles[activeMistake.item.pieceSquare] = {
      backgroundColor: 'rgba(27, 172, 166, 0.35)',
      boxShadow: 'inset 0 0 16px rgba(27, 172, 166, 0.9), 0 0 8px rgba(27, 172, 166, 0.6)'
    };
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onGoToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onGoToNext();
      } else if (e.key === 'Home') {
        e.preventDefault();
        onGoToStart();
      } else if (e.key === 'End') {
        e.preventDefault();
        onGoToEnd();
      } else if (e.key === ' ') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onFlip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onGoToPrev, onGoToNext, onGoToStart, onGoToEnd, onTogglePlay, onFlip]);

  const formatClock = (seconds: number) => {
    const clamped = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const boardWidthClass = "kiral-board-container";

  const topCaptured = topPlayer ? (topPlayer.color === 'w' ? capturedSummary.whiteCaptures : capturedSummary.blackCaptures) : [];
  const topAdvantage = topPlayer ? (topPlayer.color === 'w' ? capturedSummary.whiteAdvantage : capturedSummary.blackAdvantage) : 0;

  const bottomCaptured = bottomPlayer ? (bottomPlayer.color === 'w' ? capturedSummary.whiteCaptures : capturedSummary.blackCaptures) : [];
  const bottomAdvantage = bottomPlayer ? (bottomPlayer.color === 'w' ? capturedSummary.whiteAdvantage : capturedSummary.blackAdvantage) : 0;

  return (
    <div className="flex flex-col items-center justify-center px-1 sm:px-2 py-0.5 select-none h-full w-full min-h-0">
      {/* Top Player / Opponent Bar */}
      {topPlayer && (
        <div className={`${boardWidthClass} mb-0.5 sm:mb-1 flex items-center justify-between px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#121212] border border-[#262626] rounded-md text-xs font-mono shrink-0`}>
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <span
              className={`w-3 h-3 rounded-sm border shrink-0 ${
                topPlayer.color === 'w'
                  ? 'bg-[#E5E5E5] border-white'
                  : 'bg-[#262626] border-[#555555]'
              }`}
            />
            {topPlayer.isAi ? (
              <Bot className="w-3.5 h-3.5 text-[#1baca6] shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 text-[#888888] shrink-0" />
            )}
            {topPlayer.country && (
              <CountryFlag code={topPlayer.country} className="w-4 h-3 shrink-0" />
            )}
            <span className="font-semibold text-[#EDEDED] truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[260px]">
              {topPlayer.name}
            </span>
            {typeof topPlayer.elo === 'number' && (
              <span className="px-1.5 py-0.2 rounded bg-[#1C1C1C] border border-[#303030] text-[#1baca6] text-[10px] font-bold shrink-0">
                {topPlayer.elo}
              </span>
            )}
            {/* Captured Pieces by Top Player */}
            {topCaptured.length > 0 && (
              <div className="flex items-center gap-1 select-none ml-1.5 shrink-0">
                {topCaptured.map((c) => (
                  <span
                    key={c.type}
                    className={`inline-flex items-center text-[13px] sm:text-[14px] leading-none ${
                      topPlayer.color === 'w' ? 'text-zinc-400' : 'text-zinc-100'
                    }`}
                  >
                    <span>{c.symbol}</span>
                    {c.count > 1 && (
                      <span className="text-[9px] font-mono text-zinc-500 font-bold ml-0.5">
                        {c.count}
                      </span>
                    )}
                  </span>
                ))}
                {topAdvantage > 0 && (
                  <span className="ml-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-800/40">
                    +{topAdvantage}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!topPlayer.isAi && onToggleOpponentFriend && (
              <button
                onClick={onToggleOpponentFriend}
                className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-colors ${
                  isOpponentFriend
                    ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                    : 'bg-[#1C1C1C] border-[#333333] text-[#1baca6] hover:bg-[#262626]'
                }`}
                title={isOpponentFriend ? 'В друзьях' : 'Добавить соперника в друзья'}
              >
                {isOpponentFriend ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                <span className="hidden sm:inline">{isOpponentFriend ? 'Друг' : '+Друг'}</span>
              </button>
            )}
            {!topPlayer.isAi && onOpenTopPlayerProfile && (
              <button
                onClick={onOpenTopPlayerProfile}
                className="px-1.5 py-0.5 rounded bg-[#1C1C1C] hover:bg-[#262626] border border-[#333333] text-[#CCCCCC] text-[10px] flex items-center gap-1 transition-colors"
                title="Посмотреть профиль и статистику соперника"
              >
                <User className="w-3 h-3 text-[#1baca6]" />
                <span className="hidden sm:inline">Профиль</span>
              </button>
            )}
            {typeof topPlayer.timeRemaining === 'number' && (
              <div
                className={`px-2 py-0.5 rounded border font-mono text-xs font-bold flex items-center gap-1 transition-colors ${
                  topPlayer.timeRemaining < 60
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
                    : topPlayer.isTurn
                    ? 'bg-[#1baca6]/20 border-[#1baca6] text-white'
                    : 'bg-[#181818] border-[#2C2C2C] text-[#777777]'
                }`}
                title="Оставшееся время соперника"
              >
                <Clock className="w-3 h-3" />
                <span>{formatClock(topPlayer.timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Spectator Header Banner */}
      {isSpectating && (
        <div className={`w-full ${boardWidthClass} bg-[#161616] border border-[#2a2a2a] px-3 py-1.5 rounded-lg flex items-center justify-between mb-2 shadow-md`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">Прямой эфир</span>
          </div>
          {onExitSpectate && (
            <button
              onClick={onExitSpectate}
              className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#303030] border border-[#3a3a3a] text-xs font-mono text-[#EDEDED] transition-colors"
            >
              Выйти из эфира
            </button>
          )}
        </div>
      )}

      {/* Board, Eval Bar & Landscape Side Controls */}
      <div className={`flex items-stretch ${isAnalysisEnabled ? 'gap-1.5 sm:gap-2.5' : ''} ${boardWidthClass} relative shrink-0`}>
        {/* Vertical Eval Bar */}
        {isAnalysisEnabled && <EvalBar evalCp={evalCp} mate={mate} flipped={isFlipped} />}

        {/* Board wrapper */}
        <div
          ref={boardContainerRef}
          className={`relative ${isAnalysisEnabled ? 'flex-1' : 'w-full'} aspect-square rounded-md overflow-hidden border border-[#262626] shadow-xl bg-[#121212]`}
        >
          <Chessboard
            options={{
              position: fen,
              boardOrientation: isFlipped ? 'black' : 'white',
              allowDragging: !isSpectating,
              dragActivationDistance: 5,
              canDragPiece: ({ piece }) => {
                if (isSpectating) return false;
                if (!piece || !piece.pieceType) return false;
                const pieceColor = piece.pieceType[0] as 'w' | 'b';
                try {
                  const chess = new Chess(fen);
                  if (pieceColor !== chess.turn()) return false;
                } catch {}
                if (restrictPieceColor && bottomPlayer && bottomPlayer.color) {
                  if (pieceColor !== bottomPlayer.color) {
                    return false;
                  }
                }
                return true;
              },
              onSquareClick: ({ square }) => {
                handleSquareClick(square);
              },
              onPieceDrag: ({ square }) => {
                if (square) handlePieceDragSelect(square);
              },
              onPieceDrop: ({ sourceSquare, targetSquare }) => {
                if (isSpectating) return false;
                if (!targetSquare) return false;
                setSelectedSquare(null);
                if (activeMistake && mistakeMode === 'review') {
                  setMistakeMode('solve');
                }
                if (isPawnPromotion(sourceSquare, targetSquare)) {
                  try {
                    const chess = new Chess(fen);
                    const moves = chess.moves({ square: sourceSquare as any, verbose: true });
                    const isLegal = moves.some((m) => m.to === targetSquare);
                    if (isLegal) {
                      const piece = chess.get(sourceSquare as any);
                      setPendingPromotion({
                        sourceSquare,
                        targetSquare,
                        color: piece?.color || 'w'
                      });
                      return false;
                    }
                  } catch {
                    return false;
                  }
                }
                return onPieceDrop ? onPieceDrop(sourceSquare, targetSquare) : false;
              },
              boardStyle: {
                borderRadius: '4px',
                boxShadow: 'none'
              },
              darkSquareStyle: { backgroundColor: '#444d5c' },
              lightSquareStyle: { backgroundColor: '#cbd5e1' },
              arrows: customArrows,
              squareStyles: customSquareStyles,
              animationDurationInMs: 150
            }}
          />

          {/* Interactive Pawn Promotion Selector Modal */}
          {pendingPromotion && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-[3px] flex items-center justify-center p-3 animate-in fade-in duration-200">
              <div className="bg-[#141414] border border-[#333333] rounded-xl p-3.5 shadow-2xl flex flex-col items-center max-w-[280px] w-full">
                <div className="flex items-center justify-between w-full mb-2.5">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#CCCCCC]">
                    Превращение пешки
                  </span>
                  <button
                    onClick={() => setPendingPromotion(null)}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors p-0.5"
                    title="Отмена"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 w-full">
                  {[
                    { type: 'q', name: 'Ферзь', symbol: pendingPromotion.color === 'w' ? '♕' : '♛' },
                    { type: 'r', name: 'Ладья', symbol: pendingPromotion.color === 'w' ? '♖' : '♜' },
                    { type: 'b', name: 'Слон', symbol: pendingPromotion.color === 'w' ? '♗' : '♝' },
                    { type: 'n', name: 'Конь', symbol: pendingPromotion.color === 'w' ? '♘' : '♞' }
                  ].map((p) => (
                    <button
                      key={p.type}
                      onClick={() => {
                        const { sourceSquare, targetSquare } = pendingPromotion;
                        setPendingPromotion(null);
                        setSelectedSquare(null);
                        if (onPieceDrop) {
                          onPieceDrop(sourceSquare, targetSquare, p.type);
                        }
                      }}
                      className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333333] hover:border-[#1baca6] transition-all group cursor-pointer"
                      title={p.name}
                    >
                      <span className="text-3xl leading-none group-hover:scale-110 transition-transform text-white">
                        {p.symbol}
                      </span>
                      <span className="text-[10px] font-mono mt-1 text-zinc-400 group-hover:text-white">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Legal move indicators overlay (dots & capture rings) */}
          {legalMoves.map((m) => {
            const file = m.to.charCodeAt(0) - 97;
            const rank = parseInt(m.to[1], 10);
            const col = isFlipped ? 7 - file : file;
            const row = isFlipped ? rank - 1 : 8 - rank;

            return (
              <div
                key={`dest-${m.to}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSquareClick(m.to);
                }}
                className="absolute pointer-events-auto cursor-pointer z-30 flex items-center justify-center group"
                style={{
                  left: `${col * 12.5}%`,
                  top: `${row * 12.5}%`,
                  width: '12.5%',
                  height: '12.5%'
                }}
                title={m.isCapture ? `Взять на ${m.to}` : `Ход на ${m.to}`}
              >
                {m.isCapture ? (
                  // Capture ring
                  <div className="w-[82%] h-[82%] rounded-full border-[3.5px] border-[#1baca6]/90 bg-[#1baca6]/15 group-hover:border-[#1baca6] group-hover:bg-[#1baca6]/30 group-hover:scale-105 transition-all shadow-[0_0_8px_rgba(0,0,0,0.4)]" />
                ) : (
                  // Empty square destination dot
                  <div className="w-[30%] h-[30%] rounded-full bg-[#1baca6]/85 border border-black/35 group-hover:bg-[#1baca6] group-hover:scale-125 transition-all shadow-[0_1px_5px_rgba(0,0,0,0.45)]" />
                )}
              </div>
            );
          })}

          {/* Destination square classification badge overlay */}
          {isAnalysisEnabled && badgePosition && currentMove && (
            <div
              className="absolute pointer-events-none transition-all duration-150 z-20 flex items-start justify-end p-0.5"
              style={{
                left: `${badgePosition.xPct}%`,
                top: `${badgePosition.yPct}%`,
                width: '12.5%',
                height: '12.5%'
              }}
            >
              <ClassificationBadge
                classification={currentMove.classification}
                size="square"
              />
            </div>
          )}

          {/* King In Check Indicator Overlay */}
          {inCheckPosition && (
            <div
              className="absolute pointer-events-none transition-all duration-150 z-20 flex flex-col items-center justify-between p-0.5"
              style={{
                left: `${inCheckPosition.xPct}%`,
                top: `${inCheckPosition.yPct}%`,
                width: '12.5%',
                height: '12.5%'
              }}
            >
              <div className="w-full h-full rounded border-2 border-red-500/80 animate-pulse flex items-start justify-center">
                <span className="bg-red-600 text-white font-mono text-[8px] font-extrabold px-1 rounded-sm shadow tracking-wider uppercase -mt-2">
                  ШАХ
                </span>
              </div>
            </div>
          )}

          {/* King In Checkmate Indicator Overlay */}
          {inCheckmatePosition && (
            <div
              className="absolute pointer-events-none z-30 flex flex-col items-center justify-center p-0.5 animate-bounce"
              style={{
                left: `${inCheckmatePosition.xPct}%`,
                top: `${inCheckmatePosition.yPct}%`,
                width: '12.5%',
                height: '12.5%'
              }}
            >
              <div className="w-full h-full rounded border-2 border-red-500 bg-red-950/90 flex flex-col items-center justify-center shadow-2xl">
                <span className="bg-red-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow tracking-wider uppercase">
                  МАТ!
                </span>
              </div>
            </div>
          )}

          {/* Mistake played square classification badge overlay (e.g. ?? on f3 in review mode) */}
          {mistakeBadgePosition && activeMistake && (
            <div
              className="absolute pointer-events-none transition-all duration-150 z-20 flex items-start justify-end p-0.5"
              style={{
                left: `${mistakeBadgePosition.xPct}%`,
                top: `${mistakeBadgePosition.yPct}%`,
                width: '12.5%',
                height: '12.5%'
              }}
            >
              <ClassificationBadge
                classification={activeMistake.item.classification}
                size="square"
              />
            </div>
          )}

          {/* 1.5s Move Status Accent Floating Notification */}
          {!activeMistake && isAnalysisEnabled && moveAccent && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-150">
              <div className="bg-[#121212]/95 border border-[#333333] shadow-2xl rounded-lg px-3.5 py-2 flex items-center gap-3 backdrop-blur-md">
                <ClassificationBadge classification={moveAccent.classification} size="md" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    {moveAccent.san && (
                      <span className="font-mono text-xs font-bold text-white">
                        {moveAccent.san}
                      </span>
                    )}
                    <span className="text-xs font-mono font-semibold text-[#EDEDED]">
                      {moveAccent.nameRu}
                    </span>
                    {moveAccent.isCheck && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-600/30 text-red-400 border border-red-500/50">
                        ШАХ!
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#999999] font-sans truncate max-w-[200px]">
                    {moveAccent.reason}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Modal Overlay */}
          {gameOverMessage && !isDismissedGameOver && !activeMistake && (
            <div className="absolute inset-0 bg-black/85 z-40 flex flex-col items-center justify-center p-4 backdrop-blur-[3px] animate-in fade-in duration-300">
              <div className="p-5 bg-[#141414] border border-[#333333] rounded-xl shadow-2xl flex flex-col items-center text-center max-w-sm w-full">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#888888] mb-1">
                  Партия завершена
                </span>
                <span className="text-base font-sans font-bold text-[#EDEDED] mb-4">
                  {gameOverMessage}
                </span>

                {Boolean(mistakeCount && mistakeCount > 0 && onStartMistakeReplay) && (
                  <button
                    onClick={onStartMistakeReplay}
                    className="w-full mb-3 px-4 py-2 rounded-lg bg-[#1baca6] text-black hover:bg-[#20c2bc] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
                    title="Интерактивно переиграть свои зевки и ошибки"
                  >
                    <Target className="w-4 h-4" />
                    <span>Работа над ошибками ({mistakeCount})</span>
                  </button>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full justify-center">
                  <button
                    onClick={() => setIsDismissedGameOver(true)}
                    className="w-full sm:w-auto px-3 py-1.5 rounded bg-[#222222] border border-[#3a3a3a] text-[#CCCCCC] hover:text-white hover:bg-[#2c2c2c] text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
                    title="Скрыть окно и свободно смотреть партию"
                  >
                    <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Посмотреть партию</span>
                  </button>
                  {onRestartGame && (
                    <button
                      onClick={onRestartGame}
                      className="w-full sm:w-auto px-3.5 py-1.5 rounded bg-[#EDEDED] text-[#0A0A0A] hover:bg-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Новая игра</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compact floating banner when modal is dismissed and mistake replay is not active */}
          {gameOverMessage && isDismissedGameOver && !activeMistake && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#141414]/95 border border-[#333333] shadow-2xl backdrop-blur-md text-[11px] sm:text-xs font-mono max-w-[96%] select-none shrink-0 whitespace-nowrap overflow-x-auto no-scrollbar">
              <span className="text-[#EDEDED] font-semibold whitespace-nowrap">
                {gameOverMessage}
              </span>
              <button
                onClick={() => setIsDismissedGameOver(false)}
                className="text-[#1baca6] hover:text-[#25d3cc] flex items-center gap-1 text-[10px] sm:text-[11px] shrink-0 font-medium px-1.5 py-0.5 rounded hover:bg-[#202020] transition-colors cursor-pointer"
                title="Показать окно результата"
              >
                <Eye className="w-3 h-3 shrink-0" />
                <span className="whitespace-nowrap">Окно</span>
              </button>
              {Boolean(mistakeCount && mistakeCount > 0 && onStartMistakeReplay) && (
                <button
                  onClick={onStartMistakeReplay}
                  className="px-2 py-0.5 rounded bg-[#1baca6]/20 border border-[#1baca6]/40 hover:bg-[#1baca6]/30 text-[#1baca6] text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                  title="Работа над ошибками"
                >
                  <Target className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">Ошибки ({mistakeCount})</span>
                </button>
              )}
              {onRestartGame && (
                <button
                  onClick={onRestartGame}
                  className="px-2 py-0.5 rounded bg-[#222222] hover:bg-[#2c2c2c] border border-[#333333] text-[#CCCCCC] hover:text-white text-[10px] sm:text-[11px] flex items-center gap-1 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <RotateCw className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">Переиграть</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Landscape Side Action Column (replaces bottom bar on phone landscape) */}
        <div className="hidden max-lg:landscape:flex flex-col items-center justify-center gap-1 ml-2 py-1.5 px-1 bg-[#121212] border border-[#262626] rounded-md text-[#CCCCCC] text-[11px] font-mono shrink-0 shadow-lg select-none">
          <button
            onClick={onGoToStart}
            disabled={currentPly <= 0}
            className="p-1 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white disabled:opacity-30 transition-colors"
            title="В начало (Home)"
          >
            <ChevronFirst className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onGoToPrev}
            disabled={currentPly <= 0}
            className="p-1 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white disabled:opacity-30 transition-colors"
            title="Назад (ArrowLeft)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={totalPlies === 0}
            className="p-1.5 rounded bg-[#1C1C1C] hover:bg-[#262626] text-white transition-colors"
            title={isPlaying ? 'Пауза' : 'Воспроизведение'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onGoToNext}
            disabled={currentPly >= totalPlies}
            className="p-1 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white disabled:opacity-30 transition-colors"
            title="Вперед (ArrowRight)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onGoToEnd}
            disabled={currentPly >= totalPlies}
            className="p-1 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white disabled:opacity-30 transition-colors"
            title="В конец (End)"
          >
            <ChevronLast className="w-3.5 h-3.5" />
          </button>
          <div className="h-[1px] w-4 bg-[#262626] my-0.5" />
          <button
            onClick={onFlip}
            className="p-1 rounded hover:bg-[#202020] text-[#1baca6] transition-colors"
            title="Перевернуть доску"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleSound}
            className="p-1 rounded hover:bg-[#202020] text-[#CCCCCC] transition-colors"
            title="Звук"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
          </button>
          {onRestartGame && !isSpectating && (
            <button
              onClick={onRestartGame}
              className="p-1 rounded hover:bg-[#202020] text-zinc-400 hover:text-white transition-colors"
              title="Заново"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[9px] text-[#777777] font-mono mt-0.5">{currentPly}/{totalPlies}</span>
        </div>
      </div>

      {/* Bottom Player Bar */}
      {bottomPlayer && (
        <div className={`${boardWidthClass} mt-0.5 sm:mt-1 flex items-center justify-between px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#121212] border border-[#262626] rounded-md text-xs font-mono shrink-0`}>
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <span
              className={`w-3 h-3 rounded-sm border shrink-0 ${
                bottomPlayer.color === 'w'
                  ? 'bg-[#E5E5E5] border-white'
                  : 'bg-[#262626] border-[#555555]'
              }`}
            />
            <User className="w-3.5 h-3.5 text-[#1baca6] shrink-0" />
            {bottomPlayer.country && (
              <CountryFlag code={bottomPlayer.country} className="w-4 h-3 shrink-0" />
            )}
            <span className="font-semibold text-[#EDEDED] truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[260px]">
              {bottomPlayer.name}
            </span>
            {typeof bottomPlayer.elo === 'number' && (
              <span className="px-1.5 py-0.2 rounded bg-[#1baca6]/15 border border-[#1baca6]/30 text-[#1baca6] text-[10px] font-bold shrink-0">
                {bottomPlayer.elo}
              </span>
            )}
            {/* Captured Pieces by Bottom Player */}
            {bottomCaptured.length > 0 && (
              <div className="flex items-center gap-1 select-none ml-1.5 shrink-0">
                {bottomCaptured.map((c) => (
                  <span
                    key={c.type}
                    className={`inline-flex items-center text-[13px] sm:text-[14px] leading-none ${
                      bottomPlayer.color === 'w' ? 'text-zinc-400' : 'text-zinc-100'
                    }`}
                  >
                    <span>{c.symbol}</span>
                    {c.count > 1 && (
                      <span className="text-[9px] font-mono text-zinc-500 font-bold ml-0.5">
                        {c.count}
                      </span>
                    )}
                  </span>
                ))}
                {bottomAdvantage > 0 && (
                  <span className="ml-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-800/40">
                    +{bottomAdvantage}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canUndoMove && onUndoMove && (
              <button
                onClick={onUndoMove}
                className="px-1.5 py-0.5 rounded bg-[#1C1C1C] hover:bg-[#262626] border border-[#3a3a3a] text-[#f0c15c] hover:text-[#ffd875] text-[10px] flex items-center gap-1 transition-colors"
                title="Отменить последний ход (Ctrl+Z)"
              >
                <Undo2 className="w-3 h-3" />
                <span className="hidden sm:inline">Отменить ход</span>
              </button>
            )}
            {canOfferDraw && onOfferDraw && (
              <button
                onClick={onOfferDraw}
                className="px-1.5 py-0.5 rounded bg-[#1C1C1C] hover:bg-[#262626] border border-[#3a3a3a] text-[#CCCCCC] hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                title="Предложить ничью сопернику"
              >
                <Handshake className="w-3 h-3 text-[#1baca6]" />
                <span className="hidden sm:inline">Ничья</span>
              </button>
            )}
            {canResign && onResignGame && (
              <button
                onClick={onResignGame}
                className="px-1.5 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/60 text-rose-300 text-[10px] flex items-center gap-1 transition-colors"
                title="Сдаться в текущей партии"
              >
                <Flag className="w-3 h-3" />
                <span className="hidden sm:inline">Сдаться</span>
              </button>
            )}
            {timeControlBadge && (
              <span className="hidden xs:inline px-1.5 py-0.5 rounded bg-[#161616] border border-[#2A2A2A] text-[10px] font-mono text-[#1baca6] font-bold">
                {timeControlBadge}
              </span>
            )}
            {typeof bottomPlayer.timeRemaining === 'number' && (
              <div
                className={`px-2 py-0.5 rounded border font-mono text-xs font-bold flex items-center gap-1 transition-colors ${
                  bottomPlayer.timeRemaining < 60
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
                    : bottomPlayer.isTurn
                    ? 'bg-[#1baca6]/25 border-[#1baca6] text-white'
                    : 'bg-[#181818] border-[#2C2C2C] text-[#777777]'
                }`}
                title="Ваше оставшееся время"
              >
                <Clock className="w-3 h-3" />
                <span>{formatClock(bottomPlayer.timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Horizontal Move Ribbon (compact 1-line move strip on phones) */}
      {moves && moves.length > 0 && onSelectPly && !activeMistake && (
        <div
          ref={mobileRibbonRef}
          className={`${boardWidthClass} lg:hidden landscape:hidden mt-0.5 flex items-center gap-1 overflow-x-auto no-scrollbar px-2 py-1 bg-[#111111] border border-[#242424] rounded-md text-[11px] font-mono shrink-0`}
        >
          {moves.filter(Boolean).map((m) => {
            const isActive = currentPly === m.ply;
            const isWhite = m.turn === 'w';
            return (
              <React.Fragment key={m.ply}>
                {isWhite && (
                  <span className="text-[#666666] pl-1 select-none shrink-0">
                    {m.moveNumber}.
                  </span>
                )}
                <button
                  onClick={() => onSelectPly(m.ply)}
                  data-active-ply={isActive ? 'true' : undefined}
                  className={`px-1.5 py-0.5 rounded transition-colors shrink-0 ${
                    isActive
                      ? 'bg-[#1baca6]/25 text-[#1baca6] font-bold border border-[#1baca6]/50'
                      : 'text-[#CCCCCC] hover:bg-[#1E1E1E]'
                  }`}
                >
                  {m.san}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Navigation & Controls Bar (hidden on phone landscape to maximize board size) */}
      <div className={`${boardWidthClass} mt-0.5 sm:mt-1 flex items-center justify-between px-2 py-0.5 sm:py-1 bg-[#121212] border border-[#262626] rounded-md text-[#EDEDED] shrink-0 max-lg:landscape:hidden`}>
        {/* Left: Move Counter or AI Thinking Status */}
        <div className="text-xs font-mono text-[#888888] flex items-center gap-1.5 min-w-[50px] sm:min-w-[80px]">
          {isAiThinking ? (
            <span className="flex items-center gap-1.5 text-[#1baca6] font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1baca6]" />
              Stockfish...
            </span>
          ) : (
            <span>{currentPly}/{totalPlies}</span>
          )}
        </div>

        {/* Center: Playback Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={onGoToStart}
            disabled={currentPly <= 0}
            className="p-1.5 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="В начало (Home)"
          >
            <ChevronFirst className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={onGoToPrev}
            disabled={currentPly <= 0}
            className="p-1.5 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Назад (ArrowLeft)"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={totalPlies === 0}
            className="p-2 rounded bg-[#1C1C1C] hover:bg-[#262626] text-[#EDEDED] hover:text-white transition-colors"
            title={isPlaying ? 'Пауза (Space)' : 'Воспроизведение (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <Play className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
          <button
            onClick={onGoToNext}
            disabled={currentPly >= totalPlies}
            className="p-1.5 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Вперед (ArrowRight)"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={onGoToEnd}
            disabled={currentPly >= totalPlies}
            className="p-1.5 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="В конец (End)"
          >
            <ChevronLast className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Right: Board options (Flip, Sound, Reset, Result) */}
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-[50px] sm:min-w-[80px] justify-end">
          {gameOverMessage && isDismissedGameOver && (
            <button
              onClick={() => setIsDismissedGameOver(false)}
              className="px-1.5 py-1 rounded bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-[#1baca6] hover:text-[#25d3cc] text-[10px] font-mono flex items-center gap-1 transition-colors"
              title="Показать окно результата"
            >
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">Итог</span>
            </button>
          )}
          {onRestartGame && !isSpectating && (
            <button
              onClick={onRestartGame}
              className="p-1.5 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white transition-colors"
              title="Сброс / Новая партия"
            >
              <RotateCw className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded transition-colors ${
              soundEnabled
                ? 'text-[#CCCCCC] hover:bg-[#202020] hover:text-white'
                : 'text-[#666666] hover:bg-[#202020]'
            }`}
            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <VolumeX className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
          <button
            onClick={onFlip}
            className="p-1.5 rounded hover:bg-[#202020] text-[#CCCCCC] hover:text-white transition-colors"
            title="Перевернуть доску (F)"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
