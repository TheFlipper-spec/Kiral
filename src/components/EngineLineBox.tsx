import React from 'react';
import type { MoveAnalysis } from '../types/chess';
import { ClassificationBadge } from './ClassificationBadge';
import { Play, RotateCcw } from 'lucide-react';

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
      <div className="p-3 bg-[#121212] border-b border-[#262626] text-xs font-mono text-[#888888] flex items-center justify-between">
        <span>Начальная позиция</span>
        <span className="text-[#EDEDED]">0.0</span>
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
    mateAfter
  } = currentMove;

  let evalText = '';
  if (mateAfter !== null) {
    evalText = `M${Math.abs(mateAfter)}`;
  } else {
    const p = (evalAfter / 100).toFixed(2);
    evalText = evalAfter > 0 ? `+${p}` : p;
  }

  const pvString = bestLinePv.slice(0, 4).join(' ');

  return (
    <div className="p-3 bg-[#121212] border-b border-[#262626] flex flex-col gap-2 shrink-0 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-[#EDEDED]">
            {moveNumber}.{turn === 'b' ? '..' : ''} {san}
          </span>
          <ClassificationBadge classification={classification} showLabel />
        </div>
        <div className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#262626] text-[#EDEDED]">
          {evalText}
        </div>
      </div>

      <div className="text-[11px] font-sans text-[#AAAAAA] leading-relaxed">
        {classificationReason}
      </div>

      <div className="mt-1 pt-2 border-t border-[#1F1F1F] flex items-center justify-between gap-2">
        <div className="text-[11px] font-mono text-[#888888] truncate flex-1">
          <span className="text-[#96bc4b] font-medium mr-1.5">Лучший:</span>
          <span className="text-[#EDEDED] font-semibold mr-1">{bestMoveSan}</span>
          {pvString && <span className="text-[#666666]">({pvString})</span>}
        </div>

        <button
          onClick={onTogglePreviewLine}
          className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors border ${
            isPreviewingLine
              ? 'bg-[#1baca6]/15 border-[#1baca6] text-[#1baca6]'
              : 'bg-[#1A1A1A] border-[#262626] text-[#CCCCCC] hover:bg-[#222222] hover:text-[#FFFFFF]'
          }`}
          title={isPreviewingLine ? 'Вернуться к партии' : 'Показать вариант движка'}
        >
          {isPreviewingLine ? (
            <>
              <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
              <span>Возврат</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" strokeWidth={1.5} />
              <span>Линия</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
