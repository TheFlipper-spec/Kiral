import React, { useState } from 'react';
import type { GameReport, MoveAnalysis } from '../types/chess';
import { EngineLineBox } from './EngineLineBox';
import { MoveTableTab } from './MoveTableTab';
import { SummaryTab } from './SummaryTab';
import { EvalGraph } from './EvalGraph';
import type { AnalysisProgress } from '../engine/gameAnalyzer';
import { BarChart3, ListOrdered, XCircle } from 'lucide-react';

interface AnalysisPanelProps {
  report: GameReport | null;
  currentPly: number;
  onSelectPly: (ply: number) => void;
  progress: AnalysisProgress | null;
  isAnalyzing: boolean;
  onCancelAnalysis: () => void;
  isPreviewingLine: boolean;
  onTogglePreviewLine: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  report,
  currentPly,
  onSelectPly,
  progress,
  isAnalyzing,
  onCancelAnalysis,
  isPreviewingLine,
  onTogglePreviewLine
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'moves'>('moves');

  const moves = report?.moves || [];
  const currentMove: MoveAnalysis | undefined = currentPly > 0 ? moves[currentPly - 1] : undefined;

  const progressPct = progress
    ? Math.round((progress.currentPly / Math.max(1, progress.totalPlies)) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full bg-[#0E0E0E] border-l border-[#262626] overflow-hidden select-none">
      {/* Analysis Progress Strip (2px thin line + monospace status) */}
      {isAnalyzing && progress && (
        <div className="bg-[#141414] border-b border-[#262626] shrink-0">
          <div className="h-[2px] bg-[#222222] w-full overflow-hidden">
            <div
              className="h-full bg-[#1baca6] transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-[#888888]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1baca6] animate-pulse" />
              <span>
                Анализ полуходов: {progress.currentPly}/{progress.totalPlies}
              </span>
              <span className="text-[#555555]">|</span>
              <span>Depth: {progress.depth}</span>
            </div>
            <button
              onClick={onCancelAnalysis}
              className="text-[#ef4444] hover:text-[#ff6b6b] flex items-center gap-1 text-[10px]"
            >
              <XCircle className="w-3 h-3" strokeWidth={1.5} />
              <span>Стоп</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#262626] bg-[#121212] shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('moves')}
            className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              activeTab === 'moves'
                ? 'bg-[#1E1E1E] border-[#383838] text-[#EDEDED]'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Партия</span>
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              activeTab === 'summary'
                ? 'bg-[#1E1E1E] border-[#383838] text-[#EDEDED]'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Сводка</span>
          </button>
        </div>

        {report && (
          <div className="text-[11px] font-mono text-[#777777] truncate max-w-[140px]">
            {report.result}
          </div>
        )}
      </div>

      {/* Engine Line Box */}
      <EngineLineBox
        currentMove={currentMove}
        isPreviewingLine={isPreviewingLine}
        onTogglePreviewLine={onTogglePreviewLine}
      />

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'moves' ? (
          <MoveTableTab
            moves={moves}
            currentPly={currentPly}
            onSelectPly={onSelectPly}
          />
        ) : report ? (
          <SummaryTab report={report} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 text-xs font-mono text-[#666666]">
            Ожидание анализа...
          </div>
        )}
      </div>

      {/* Eval Graph */}
      <EvalGraph
        moves={moves}
        currentPly={currentPly}
        onSelectPly={onSelectPly}
        height={86}
      />
    </div>
  );
};
