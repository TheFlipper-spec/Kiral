import React from 'react';
import type { MoveAnalysis } from '../types/chess';
import { ClassificationBadge } from './ClassificationBadge';
import { Play, RotateCcw, Target, CheckCircle2, Compass, ArrowUpRight } from 'lucide-react';

interface EngineLineBoxProps {
  currentMove?: MoveAnalysis;
  isPreviewingLine: boolean;
  onTogglePreviewLine: () => void;
}

export const EngineLineBox: React.FC<EngineLineBoxProps> = ({
  currentMove,
  isPreviewingLine,
  onTogglePreviewLine
}) => {
  if (!currentMove) {
    return (
      <div className="p-3 bg-[#121212] border-b border-[#262626] text-xs font-mono text-[#888888] flex items-center justify-between select-none animate-card-in">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[#1baca6]" strokeWidth={1.5} />
          <span>Начальная позиция партии</span>
        </div>
        <span className="font-semibold px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#262626] text-[#EDEDED]">
          0.0
        </span>
      </div>
    );
  }

  const {
    moveNumber,
    turn,
    san,
    classification,
    classificationReason,
    bestMoveSan,
    bestLinePv,
    evalAfter,
    mateAfter,
    centipawnLoss,
    winPercentLoss
  } = currentMove;

  let evalText = '';
  if (mateAfter !== null) {
    evalText = `M${Math.abs(mateAfter)}`;
  } else {
    const p = (evalAfter / 100).toFixed(2);
    evalText = evalAfter > 0 ? `+${p}` : p;
  }

  const isBest = ['best', 'brilliant', 'great', 'book', 'forced'].includes(classification);
  const isBlunderOrMistake = ['blunder', 'mistake', 'miss'].includes(classification);
  const hasAlternative = Boolean(bestMoveSan && bestMoveSan !== san && !isBest);

  const cpLossPawns = centipawnLoss && centipawnLoss >= 20 ? (centipawnLoss / 100).toFixed(1) : null;
  const winLossRounded = typeof winPercentLoss === 'number' && winPercentLoss >= 4 ? Math.round(winPercentLoss) : null;

  const pvDisplay = bestLinePv.slice(0, 4).join(' ');

  return (
    <div className={`p-3 bg-[#121212] border-b border-[#262626] flex flex-col gap-2.5 shrink-0 select-none animate-card-in ${
      isBlunderOrMistake ? 'border-l-2 border-l-rose-500/80' : isBest ? 'border-l-2 border-l-emerald-500/80' : ''
    }`}>
      {/* 1. What was played in the game */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm sm:text-base font-bold text-white tracking-tight">
              {moveNumber}.{turn === 'b' ? '..' : ''} {san}
            </span>
            <ClassificationBadge classification={classification} showLabel />
          </div>

          <div className="flex items-center gap-1.5">
            {cpLossPawns && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 font-bold" title="Потеря перевеса позиции">
                -{cpLossPawns} п.
              </span>
            )}
            <div className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#262626] text-[#EDEDED]" title="Оценка позиции Stockfish">
              {evalText}
            </div>
          </div>
        </div>

        {/* Tactical Explanation / Coach Commentary */}
        <div className="p-2 rounded-md bg-[#161616] border border-[#242424] text-[11px] font-sans text-zinc-300 leading-relaxed">
          {classificationReason || 'Ход выполнен.'}
          {winLossRounded && (
            <span className="text-rose-400 font-mono text-[10px] ml-1">
              (Шанс на победу снизился на {winLossRounded}%)
            </span>
          )}
        </div>
      </div>

      {/* 2. Better Alternative (Engine Recommendation) */}
      {hasAlternative ? (
        <div className="bg-[#141a12] border border-[#2b3d22] rounded-lg p-2.5 flex flex-col gap-1.5 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[#96bc4b] text-[10px] font-mono font-bold uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-[#96bc4b]" strokeWidth={1.5} />
              <span>Лучшая альтернатива:</span>
              <span className="text-white text-xs font-bold">{bestMoveSan}</span>
            </div>

            <button
              onClick={onTogglePreviewLine}
              className={`px-2 py-1 rounded text-[10px] font-mono font-semibold flex items-center gap-1 transition-all border cursor-pointer ${
                isPreviewingLine
                  ? 'bg-[#1baca6] text-black border-[#1baca6] shadow-sm font-bold'
                  : 'bg-[#1E2619] border-[#384e2d] text-[#C4DE8A] hover:bg-[#25321f] hover:text-white'
              }`}
              title={isPreviewingLine ? 'Вернуться к текущему ходу' : 'Показать вариант движка на доске'}
            >
              {isPreviewingLine ? (
                <>
                  <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
                  <span>Возврат</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" strokeWidth={1.5} />
                  <span>Показать ход</span>
                </>
              )}
            </button>
          </div>

          {pvDisplay && (
            <div className="text-[10px] font-mono text-[#8ca870] truncate flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 shrink-0 opacity-70" />
              <span className="text-zinc-400">Линия:</span>
              <span className="text-zinc-300 truncate">{pvDisplay}</span>
            </div>
          )}
        </div>
      ) : isBest ? (
        <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px] font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Лучший ход! Решение полностью совпало с первой линией движка.</span>
        </div>
      ) : null}
    </div>
  );
};
