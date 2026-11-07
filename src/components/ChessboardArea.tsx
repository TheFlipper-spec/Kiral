import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { EvalBar } from './EvalBar';
import { ClassificationBadge } from './ClassificationBadge';
import type { MoveAnalysis, MoveClassification } from '../types/chess';
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
  Bot
} from 'lucide-react';

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
  onPieceDrop?: (sourceSquare: string, targetSquare: string) => boolean;
  isAiThinking?: boolean;
  gameOverMessage?: string | null;
  onRestartGame?: () => void;
  moveAccent?: MoveAccentInfo | null;
  showEngineArrows?: boolean;
  topPlayer?: BoardPlayerBarInfo;
  bottomPlayer?: BoardPlayerBarInfo;
  isOpponentFriend?: boolean;
  onToggleOpponentFriend?: () => void;
  onOpenTopPlayerProfile?: () => void;
  onOpenBottomPlayerProfile?: () => void;
  canResign?: boolean;
  onResignGame?: () => void;
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
  topPlayer,
  bottomPlayer,
  isOpponentFriend = false,
  onToggleOpponentFriend,
  onOpenTopPlayerProfile,
  onOpenBottomPlayerProfile,
  canResign = false,
  onResignGame
}) => {
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [isDismissedGameOver, setIsDismissedGameOver] = useState<boolean>(false);

  // Reset dismissal when game over message changes
  useEffect(() => {
    setIsDismissedGameOver(false);
  }, [gameOverMessage]);

  // Clear selected square whenever board position changes
  useEffect(() => {
    setSelectedSquare(null);
  }, [fen]);

  // Calculate all legal moves for the selected piece
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      const chess = new Chess(fen);
      const piece = chess.get(selectedSquare as Parameters<typeof chess.get>[0]);
      if (!piece || piece.color !== chess.turn()) return [];

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
  }, [fen, selectedSquare]);

  // Handle square clicks for click-to-move
  const handleSquareClick = (square: string) => {
    if (!onPieceDrop) return;
    try {
      const chess = new Chess(fen);
      const clickedPiece = chess.get(square as Parameters<typeof chess.get>[0]);

      // If a piece is already selected
      if (selectedSquare) {
        // If clicking a legal target destination -> execute move
        const isLegal = legalMoves.some((m) => m.to === square);
        if (isLegal) {
          const success = onPieceDrop(selectedSquare, square);
          if (success) {
            setSelectedSquare(null);
            return;
          }
        }

        // If clicking another piece of the same color -> switch selection
        if (clickedPiece && clickedPiece.color === chess.turn()) {
          if (selectedSquare === square) {
            setSelectedSquare(null); // toggle off
          } else {
            setSelectedSquare(square); // switch to newly clicked piece
          }
          return;
        }

        // Clicked elsewhere -> deselect
        setSelectedSquare(null);
        return;
      }

      // No piece selected yet -> select if piece belongs to current turn
      if (clickedPiece && clickedPiece.color === chess.turn()) {
        setSelectedSquare(square);
      }
    } catch {
      setSelectedSquare(null);
    }
  };

  // Best engine move arrow (hidden in 1v1 PvP mode)
  const customArrows: Array<{ startSquare: string; endSquare: string; color: string }> = [];
  if (showEngineArrows && bestMoveUci && bestMoveUci.length >= 4) {
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

  // Target square classification badge position
  let badgePosition: { xPct: number; yPct: number } | null = null;
  if (currentMove && currentMove.to) {
    const file = currentMove.to.charCodeAt(0) - 97;
    const rank = parseInt(currentMove.to[1], 10);
    const col = isFlipped ? 7 - file : file;
    const row = isFlipped ? rank - 1 : 8 - rank;

    badgePosition = {
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

  let inCheckPosition: { xPct: number; yPct: number } | null = null;
  if (inCheckSquare) {
    const file = inCheckSquare.charCodeAt(0) - 97;
    const rank = parseInt(inCheckSquare[1], 10);
    const col = isFlipped ? 7 - file : file;
    const row = isFlipped ? rank - 1 : 8 - rank;
    inCheckPosition = {
      xPct: col * 12.5,
      yPct: row * 12.5
    };
  }

  // Square styling for selected square and previous move highlights
  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (currentMove) {
    customSquareStyles[currentMove.from] = {
      backgroundColor: 'rgba(255, 255, 255, 0.08)'
    };
    customSquareStyles[currentMove.to] = {
      backgroundColor: 'rgba(255, 255, 255, 0.16)'
    };
  }
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: 'rgba(255, 255, 255, 0.22)'
    };
  }
  if (inCheckSquare) {
    customSquareStyles[inCheckSquare] = {
      backgroundColor: 'rgba(220, 38, 38, 0.45)',
      boxShadow: 'inset 0 0 16px rgba(239, 68, 68, 0.9)'
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

  return (
    <div className="flex flex-col items-center justify-center px-2 py-1 sm:p-2 select-none h-full w-full overflow-hidden">
      {/* Top Player / Opponent Bar */}
      {topPlayer && (
        <div className="w-full max-w-[330px] sm:max-w-[430px] lg:max-w-[470px] landscape:max-lg:max-w-[270px] mb-1.5 flex items-center justify-between px-2.5 py-1 bg-[#121212] border border-[#262626] rounded-md text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 truncate">
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
            <span className="font-semibold text-[#EDEDED] truncate max-w-[110px] sm:max-w-[160px]">
              {topPlayer.name}
            </span>
            {typeof topPlayer.elo === 'number' && (
              <span className="px-1.5 py-0.2 rounded bg-[#1C1C1C] border border-[#303030] text-[#1baca6] text-[10px] font-bold shrink-0">
                {topPlayer.elo}
              </span>
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

      {/* Board & Eval Bar Container (pixel-aligned height) */}
      <div className="flex items-stretch gap-2 sm:gap-2.5 w-full max-w-[330px] sm:max-w-[430px] lg:max-w-[470px] landscape:max-lg:max-w-[270px] relative shrink-0">
        {/* Vertical Eval Bar */}
        <EvalBar evalCp={evalCp} mate={mate} flipped={isFlipped} />

        {/* Board wrapper */}
        <div
          ref={boardContainerRef}
          className="relative flex-1 aspect-square rounded-md overflow-hidden border border-[#262626] shadow-xl bg-[#121212]"
        >
          <Chessboard
            options={{
              position: fen,
              boardOrientation: isFlipped ? 'black' : 'white',
              allowDragging: true,
              onSquareClick: ({ square }) => {
                handleSquareClick(square);
              },
              onPieceClick: ({ square }) => {
                if (square) handleSquareClick(square);
              },
              onPieceDrop: ({ sourceSquare, targetSquare }) => {
                if (!targetSquare) return false;
                setSelectedSquare(null);
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
                  <div className="w-[80%] h-[80%] rounded-full border-[3px] border-white/40 group-hover:border-white/90 group-hover:scale-105 transition-all" />
                ) : (
                  // Empty square destination dot
                  <div className="w-[28%] h-[28%] rounded-full bg-white/40 group-hover:bg-white/90 group-hover:scale-125 transition-all shadow-sm" />
                )}
              </div>
            );
          })}

          {/* Destination square classification badge overlay */}
          {badgePosition && currentMove && (
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

          {/* 1.5s Move Status Accent Floating Notification */}
          {moveAccent && (
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

          {/* Game Over Banner Overlay */}
          {gameOverMessage && !isDismissedGameOver && (
            <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
              <div className="p-5 bg-[#141414] border border-[#333333] rounded-lg shadow-2xl flex flex-col items-center text-center max-w-xs w-full">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#888888] mb-1">
                  Партия завершена
                </span>
                <span className="text-base font-sans font-bold text-[#EDEDED] mb-4">
                  {gameOverMessage}
                </span>
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

          {/* Compact floating banner when modal is dismissed */}
          {gameOverMessage && isDismissedGameOver && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414]/95 border border-[#333333] shadow-xl backdrop-blur-md text-xs font-mono">
              <span className="text-[#EDEDED] font-semibold truncate max-w-[150px] sm:max-w-xs">
                {gameOverMessage}
              </span>
              <button
                onClick={() => setIsDismissedGameOver(false)}
                className="text-[#1baca6] hover:underline flex items-center gap-1 text-[11px] ml-1"
                title="Показать окно результата"
              >
                <Eye className="w-3 h-3" />
                <span>Окно</span>
              </button>
              {onRestartGame && (
                <button
                  onClick={onRestartGame}
                  className="px-2 py-0.5 rounded bg-[#262626] hover:bg-[#333333] text-[#CCCCCC] hover:text-white text-[11px] flex items-center gap-1 transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Переиграть</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Player Bar */}
      {bottomPlayer && (
        <div className="w-full max-w-[330px] sm:max-w-[430px] lg:max-w-[470px] landscape:max-lg:max-w-[270px] mt-1.5 flex items-center justify-between px-2.5 py-1 bg-[#121212] border border-[#262626] rounded-md text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span
              className={`w-3 h-3 rounded-sm border shrink-0 ${
                bottomPlayer.color === 'w'
                  ? 'bg-[#E5E5E5] border-white'
                  : 'bg-[#262626] border-[#555555]'
              }`}
            />
            <User className="w-3.5 h-3.5 text-[#1baca6] shrink-0" />
            <span className="font-semibold text-[#EDEDED] truncate max-w-[110px] sm:max-w-[160px]">
              {bottomPlayer.name}
            </span>
            {typeof bottomPlayer.elo === 'number' && (
              <span className="px-1.5 py-0.2 rounded bg-[#1baca6]/15 border border-[#1baca6]/30 text-[#1baca6] text-[10px] font-bold shrink-0">
                {bottomPlayer.elo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenBottomPlayerProfile && (
              <button
                onClick={onOpenBottomPlayerProfile}
                className="px-1.5 py-0.5 rounded bg-[#1C1C1C] hover:bg-[#262626] border border-[#333333] text-[#CCCCCC] text-[10px] flex items-center gap-1 transition-colors"
                title="Открыть мой профиль и статистику побед/поражений"
              >
                <User className="w-3 h-3 text-[#1baca6]" />
                <span>Профиль</span>
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
            {typeof bottomPlayer.timeRemaining === 'number' && (
              <div
                className={`px-2 py-0.5 rounded border font-mono text-xs font-bold flex items-center gap-1 transition-colors ${
                  bottomPlayer.timeRemaining < 60
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
                    : bottomPlayer.isTurn
                    ? 'bg-[#1baca6]/25 border-[#1baca6] text-white'
                    : 'bg-[#181818] border-[#2C2C2C] text-[#777777]'
                }`}
                title="Ваше оставшееся время (10 минут на партию)"
              >
                <Clock className="w-3 h-3" />
                <span>{formatClock(bottomPlayer.timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation & Controls Bar */}
      <div className="w-full max-w-[330px] sm:max-w-[430px] lg:max-w-[470px] landscape:max-lg:max-w-[270px] mt-1.5 flex items-center justify-between px-2 py-1 bg-[#121212] border border-[#262626] rounded-md text-[#EDEDED] shrink-0">
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

        {/* Right: Board options (Flip & Sound) */}
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-[50px] sm:min-w-[80px] justify-end">
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
