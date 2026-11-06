import React from 'react';
import type { GameReport, MoveClassification } from '../types/chess';
import { CLASSIFICATION_CONFIGS } from '../types/chess';

interface SummaryTabProps {
  report: GameReport;
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

export const SummaryTab: React.FC<SummaryTabProps> = ({ report }) => {
  const { whiteAccuracy, blackAccuracy, whitePlayer, blackPlayer, classificationSummary } = report;

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 select-none">
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
              {whiteAccuracy.toFixed(1)}
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
              {blackAccuracy.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-[#888888]">%</span>
          </div>
          <span className="text-[10px] font-mono text-[#666666] mt-0.5">Точность CAPS</span>
        </div>
      </div>

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
            const whiteCount = classificationSummary.white[type] || 0;
            const blackCount = classificationSummary.black[type] || 0;
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
