import React, { useEffect, useRef } from 'react';
import type { MoveAnalysis } from '../types/chess';
import { ClassificationBadge } from './ClassificationBadge';

interface MoveTableTabProps {
  moves: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  isAnalysisEnabled?: boolean;
  analysisScope?: 'my' | 'all';
  playerColor?: 'w' | 'b';
}

export const MoveTableTab: React.FC<MoveTableTabProps> = ({
  moves,
  currentPly,
  onSelectPly,
  isAnalysisEnabled = true,
  analysisScope = 'all',
  playerColor = 'w'
}) => {
  const activeRowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows: Array<{
    moveNumber: number;
    white?: MoveAnalysis;
    black?: MoveAnalysis;
  }> = [];

  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1]
    });
  }

  useEffect(() => {
    if (activeRowRef.current && containerRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentPly]);

  const formatEval = (m?: MoveAnalysis) => {
    if (!m) return '';
    if (m.mateAfter !== null && m.mateAfter !== undefined) return `M${Math.abs(m.mateAfter)}`;
    const cp = typeof m.evalAfter === 'number' && !isNaN(m.evalAfter) ? m.evalAfter : 0;
    const p = (cp / 100).toFixed(1);
    return cp > 0 ? `+${p}` : p;
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto divide-y divide-[#1A1A1A] select-none text-xs font-mono"
    >
      {rows.length === 0 ? (
        <div className="p-4 text-center text-[#666666] font-sans">
          Нет ходов для отображения
        </div>
      ) : (
        rows.map((row) => {
          const isWhiteActive = row.white && currentPly === row.white.ply + 1;
          const isBlackActive = row.black && currentPly === row.black.ply + 1;
          const isRowActive = isWhiteActive || isBlackActive;

          return (
            <div
              key={row.moveNumber}
              ref={isRowActive ? activeRowRef : null}
              className="grid grid-cols-[36px_1fr_1fr] items-stretch hover:bg-[#151515] transition-colors"
            >
              <div className="py-2 px-1 text-center text-[#666666] border-r border-[#1A1A1A] font-medium flex items-center justify-center">
                {row.moveNumber}.
              </div>

              <div
                onClick={() => row.white && onSelectPly(row.white.ply + 1)}
                className={`py-1.5 px-2 flex items-center justify-between cursor-pointer border-r border-[#1A1A1A] transition-all rounded-sm ${
                  isWhiteActive
                    ? 'bg-[#1baca6]/20 text-white font-bold shadow-[inset_0_0_0_1px_rgba(27,172,166,0.45)]'
                    : 'text-[#CCCCCC] hover:text-[#FFFFFF] hover:bg-[#181818]'
                }`}
              >
                {row.white ? (
                  <>
                    <span className="truncate">{row.white.san}</span>
                    {isAnalysisEnabled && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {(analysisScope === 'all' || playerColor === 'w') && (
                          <ClassificationBadge
                            classification={row.white.classification}
                            size="sm"
                          />
                        )}
                        <span className="text-[10px] text-[#777777] font-normal w-7 text-right">
                          {formatEval(row.white)}
                        </span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              <div
                onClick={() => row.black && onSelectPly(row.black.ply + 1)}
                className={`py-1.5 px-2 flex items-center justify-between cursor-pointer transition-all rounded-sm ${
                  isBlackActive
                    ? 'bg-[#1baca6]/20 text-white font-bold shadow-[inset_0_0_0_1px_rgba(27,172,166,0.45)]'
                    : 'text-[#CCCCCC] hover:text-[#FFFFFF] hover:bg-[#181818]'
                }`}
              >
                {row.black ? (
                  <>
                    <span className="truncate">{row.black.san}</span>
                    {isAnalysisEnabled && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {(analysisScope === 'all' || playerColor === 'b') && (
                          <ClassificationBadge
                            classification={row.black.classification}
                            size="sm"
                          />
                        )}
                        <span className="text-[10px] text-[#777777] font-normal w-7 text-right">
                          {formatEval(row.black)}
                        </span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
