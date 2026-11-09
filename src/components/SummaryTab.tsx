import React from 'react';
import type { GameReport, MoveClassification } from '../types/chess';
import { CLASSIFICATION_CONFIGS } from '../types/chess';
import { Target, Trophy, RotateCw } from 'lucide-react';

interface SummaryTabProps {
  report: GameReport;
  mistakeCount?: number;
  onStartMistakeReplay?: () => void;
  onRestartGame?: () => void;
}

const CLASSIFICATION_ORDER: MoveClassification[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'book',
  'forced',
  'inaccuracy',
  'mistake',
  'blunder',
  'miss'
];

export const SummaryTab: React.FC<SummaryTabProps> = ({
  report,
  mistakeCount = 0,
  onStartMistakeReplay,
  onRestartGame
}) => {
  const { whiteAccuracy, blackAccuracy, whitePlayer, blackPlayer, classificationSummary, result } = report;
  const safeWhiteAcc = typeof whiteAccuracy === 'number' && !isNaN(whiteAccuracy) ? whiteAccuracy.toFixed(1) : '100.0';
  const safeBlackAcc = typeof blackAccuracy === 'number' && !isNaN(blackAccuracy) ? blackAccuracy.toFixed(1) : '100.0';
  const safeWhiteSummary = classificationSummary?.white || ({} as Record<MoveClassification, number>);
  const safeBlackSummary = classificationSummary?.black || ({} as Record<MoveClassification, number>);

  const isWhiteWin = result?.startsWith('1-0') || result?.toLowerCase().includes('белые');
  const isBlackWin = result?.startsWith('0-1') || result?.toLowerCase().includes('черные');
  const isDraw = result?.startsWith('1/2') || result?.toLowerCase().includes('ничья');

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3.5 select-none">
      {/* Match Outcome Card */}
      <div className="p-3.5 bg-[#141414] border border-[#2a2a2a] rounded-xl flex flex-col gap-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#f0c15c]" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Итог партии
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#333333] text-xs font-mono font-bold text-[#EDEDED]">
            {result || '1 - 0'}
          </span>
        </div>

        <div className="text-sm font-sans font-bold text-[#EDEDED]">
          {isWhiteWin ? `Победа белых (${whitePlayer})` : isBlackWin ? `Победа черных (${blackPlayer})` : isDraw ? 'Ничья' : result}
        </div>

        {/* Action Buttons: Mistake Replay & New Game */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-[#222222]">
          {Boolean(mistakeCount && mistakeCount > 0 && onStartMistakeReplay) && (
            <button
              onClick={onStartMistakeReplay}
              className="w-full flex-1 p-2 rounded-lg bg-[#1baca6] hover:bg-[#20c2bc] text-black font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              title="Интерактивно переиграть свои ошибки"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Ошибки ({mistakeCount})</span>
            </button>
          )}

          {onRestartGame && (
            <button
              onClick={onRestartGame}
              className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-[#1F1F1F] hover:bg-[#282828] border border-[#333333] text-zinc-200 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Новая партия</span>
            </button>
          )}
        </div>
      </div>
      {/* Accuracy CAPS Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* White Player Card */}
        <div className="p-3 bg-[#121212] border border-[#262626] rounded-md flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-sans font-medium text-[#888888] truncate">
              {whitePlayer}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#EDEDED] border border-black/40" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-bold text-[#EDEDED] tracking-tight">
              {safeWhiteAcc}
            </span>
            <span className="text-xs font-mono text-[#888888]">%</span>
          </div>
          <span className="text-[10px] font-mono text-[#666666] mt-0.5">Точность CAPS</span>
        </div>

        {/* Black Player Card */}
        <div className="p-3 bg-[#121212] border border-[#262626] rounded-md flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-sans font-medium text-[#888888] truncate">
              {blackPlayer}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#262626] border border-[#444444]" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-bold text-[#EDEDED] tracking-tight">
              {safeBlackAcc}
            </span>
            <span className="text-xs font-mono text-[#888888]">%</span>
          </div>
          <span className="text-[10px] font-mono text-[#666666] mt-0.5">Точность CAPS</span>
        </div>
      </div>

      {/* Mistake Replay Action Button */}
      {Boolean(mistakeCount && mistakeCount > 0 && onStartMistakeReplay) && (
        <button
          onClick={onStartMistakeReplay}
          className="w-full p-2.5 rounded-lg bg-[#1baca6] hover:bg-[#20c2bc] text-black font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          title="Интерактивно переиграть свои зевки и ошибки"
        >
          <Target className="w-4 h-4" />
          <span>Работа над ошибками ({mistakeCount})</span>
        </button>
      )}

      {/* Classification Breakdown Table */}
      <div className="bg-[#121212] border border-[#262626] rounded-md overflow-hidden">
        <div className="grid grid-cols-[54px_1fr_54px] items-center px-3 py-2 bg-[#161616] border-b border-[#262626] text-[10px] font-mono font-semibold text-[#888888]">
          <span className="text-left">Белые</span>
          <span className="text-center">Категория хода</span>
          <span className="text-right">Черные</span>
        </div>

        <div className="divide-y divide-[#1C1C1C]">
          {CLASSIFICATION_ORDER.map((type) => {
            const config = CLASSIFICATION_CONFIGS[type];
            const whiteCount = safeWhiteSummary[type] || 0;
            const blackCount = safeBlackSummary[type] || 0;
            const hasMoves = whiteCount > 0 || blackCount > 0;

            return (
              <div
                key={type}
                className={`grid grid-cols-[54px_1fr_54px] items-center px-3 py-1.5 hover:bg-[#181818] transition-colors ${
                  hasMoves ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div className="text-left font-mono text-xs font-semibold text-[#EDEDED]">
                  {whiteCount > 0 ? whiteCount : '—'}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold font-mono"
                    style={{
                      backgroundColor: config.color,
                      color: config.textColor
                    }}
                  >
                    {config.symbol}
                  </span>
                  <span className="text-xs font-sans text-[#CCCCCC]">
                    {config.nameRu}
                  </span>
                </div>

                <div className="text-right font-mono text-xs font-semibold text-[#EDEDED]">
                  {blackCount > 0 ? blackCount : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
