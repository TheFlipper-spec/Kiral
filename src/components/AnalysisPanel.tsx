import React, { useState } from 'react';
import type { GameReport, MoveAnalysis } from '../types/chess';
import { EngineLineBox } from './EngineLineBox';
import { MoveTableTab } from './MoveTableTab';
import { SummaryTab } from './SummaryTab';
import { EvalGraph } from './EvalGraph';
import type { AnalysisProgress } from '../engine/gameAnalyzer';
import { BarChart3, ListOrdered, XCircle, Upload, Activity, Copy, Check } from 'lucide-react';

interface AnalysisPanelProps {
  report: GameReport | null;
  currentPly: number;
  onSelectPly: (ply: number) => void;
  progress: AnalysisProgress | null;
  isAnalyzing: boolean;
  onCancelAnalysis: () => void;
  isPreviewingLine: boolean;
  onTogglePreviewLine: () => void;
  hideEngineHints?: boolean;
  mistakeCount?: number;
  onStartMistakeReplay?: () => void;
  isAnalysisEnabled?: boolean;
  onToggleAnalysis?: () => void;
  onOpenLoadModal?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  report,
  currentPly,
  onSelectPly,
  progress,
  isAnalyzing,
  onCancelAnalysis,
  isPreviewingLine,
  onTogglePreviewLine,
  hideEngineHints = false,
  mistakeCount = 0,
  onStartMistakeReplay,
  isAnalysisEnabled = true,
  onToggleAnalysis,
  onOpenLoadModal
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'moves'>('moves');
  const [copiedPgn, setCopiedPgn] = useState<boolean>(false);

  const rawMoves = report?.moves || [];
  const moves = rawMoves.filter((m): m is MoveAnalysis => Boolean(m));
  const currentMove: MoveAnalysis | undefined =
    currentPly > 0 ? (rawMoves[currentPly - 1] ?? undefined) : undefined;

  const progressPct = progress
    ? Math.round((progress.currentPly / Math.max(1, progress.totalPlies)) * 100)
    : 0;

  const handleCopyMovesText = () => {
    try {
      const pgnText = moves.map((m, idx) => {
        const moveNum = Math.floor(idx / 2) + 1;
        return idx % 2 === 0 ? `${moveNum}. ${m.san}` : m.san;
      }).join(' ');
      navigator.clipboard.writeText(pgnText);
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2000);
    } catch {}
  };

  // Zen Mode (when Analysis is toggled OFF by user)
  if (!isAnalysisEnabled) {
    const totalMovesCount = Math.ceil(moves.length / 2);
    const activeMoveNum = Math.floor(currentPly / 2) + 1;
    const activeMoveColor = currentPly % 2 === 1 ? 'Белые' : 'Черные';

    return (
      <div className="flex flex-col h-full bg-[#0E0E0E] border-l border-[#262626] overflow-hidden select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#262626] bg-[#121212] shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1baca6]" />
            <span className="text-xs font-mono font-bold text-[#EDEDED] uppercase tracking-wider">
              Режим игры
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleAnalysis && (
              <button
                onClick={onToggleAnalysis}
                className="px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 border bg-[#181818] text-[#777777] border-[#2a2a2a] hover:text-[#EDEDED] hover:border-[#444]"
                title="Нажмите, чтобы включить анализ Stockfish и оценку"
              >
                <Activity className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                <span>Анализ: Выкл</span>
              </button>
            )}
            {onOpenLoadModal && (
              <button
                onClick={onOpenLoadModal}
                className="px-2 py-1 rounded bg-[#EDEDED] text-[#0A0A0A] hover:bg-white text-[11px] font-mono font-semibold transition-colors flex items-center gap-1 shadow-sm"
                title="Загрузить партию PGN или FEN"
              >
                <Upload className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                <span>PGN</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Strip */}
        <div className="px-3 py-2 border-b border-[#262626] bg-[#111111] text-[11px] font-mono text-[#888888] flex items-center justify-between shrink-0">
          <span>Чистая доска • Без подсказок движка</span>
          <span className="text-[#1baca6] font-semibold">{report?.result || 'В игре'}</span>
        </div>

        {/* Zen Hub Content */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
          {/* Match Info Card */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Статус партии:</span>
              <span className="text-zinc-200 font-bold">{report?.result || 'Партия идет'}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Всего ходов:</span>
              <span className="text-zinc-200 font-bold">{totalMovesCount > 0 ? totalMovesCount : '—'}</span>
            </div>
            {currentPly > 0 && (
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Текущий ход:</span>
                <span className="text-[#1baca6] font-bold">
                  {activeMoveNum}. {activeMoveColor} (ход {currentPly})
                </span>
              </div>
            )}
            {report?.whitePlayer && report?.blackPlayer && (
              <div className="pt-2 border-t border-[#222222] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 truncate max-w-[120px]">{report.whitePlayer}</span>
                <span className="text-zinc-500 font-bold text-[10px]">VS</span>
                <span className="text-zinc-300 truncate max-w-[120px]">{report.blackPlayer}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block px-1">
              Быстрые действия
            </span>

            {onToggleAnalysis && (
              <button
                onClick={onToggleAnalysis}
                className="w-full px-3 py-2.5 rounded-lg bg-[#181818] hover:bg-[#202020] border border-[#2d2d2d] hover:border-[#1baca6]/50 text-xs font-mono text-zinc-200 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#1baca6] group-hover:scale-110 transition-transform" />
                  <span>Включить анализ Stockfish</span>
                </div>
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">Оценка и ошибки</span>
              </button>
            )}

            {moves.length > 0 && (
              <button
                onClick={handleCopyMovesText}
                className="w-full px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] text-xs font-mono text-zinc-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {copiedPgn ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span>{copiedPgn ? 'Ходы скопированы!' : 'Скопировать нотацию ходов'}</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{moves.length} п/х</span>
              </button>
            )}

            {onOpenLoadModal && (
              <button
                onClick={onOpenLoadModal}
                className="w-full px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] text-xs font-mono text-zinc-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Загрузить другую партию (PGN/FEN)</span>
                </div>
              </button>
            )}
          </div>

          {/* Hint note */}
          <div className="p-2.5 rounded-lg bg-[#121212] border border-[#222222] text-[11px] font-mono text-zinc-500 leading-relaxed">
            Навигация по ходам доступна в ленте под доской. Анализ отключен для максимальной концентрации и комфортной игры без перегрузки интерфейса.
          </div>
        </div>
      </div>
    );
  }

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
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#262626] bg-[#121212] shrink-0 gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('moves')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border ${
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
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              activeTab === 'summary'
                ? 'bg-[#1E1E1E] border-[#383838] text-[#EDEDED]'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Сводка</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleAnalysis && (
            <button
              onClick={onToggleAnalysis}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 border ${
                isAnalysisEnabled
                  ? 'bg-[#1baca6]/15 text-[#1baca6] border-[#1baca6]/40 hover:bg-[#1baca6]/25'
                  : 'bg-[#181818] text-[#777777] border-[#2a2a2a] hover:text-[#EDEDED]'
              }`}
              title={
                isAnalysisEnabled
                  ? 'Анализ ходов включен (нажмите, чтобы отключить)'
                  : 'Анализ ходов отключен (нажмите, чтобы включить)'
              }
            >
              <Activity className="w-3 h-3 shrink-0" strokeWidth={1.5} />
              <span>{isAnalysisEnabled ? 'Анализ: Вкл' : 'Анализ: Выкл'}</span>
            </button>
          )}
          {onOpenLoadModal && (
            <button
              onClick={onOpenLoadModal}
              className="px-2 py-1 rounded bg-[#EDEDED] text-[#0A0A0A] hover:bg-white text-[11px] font-mono font-semibold transition-colors flex items-center gap-1 shadow-sm"
              title="Загрузить партию PGN или FEN"
            >
              <Upload className="w-3 h-3 shrink-0" strokeWidth={1.5} />
              <span>PGN</span>
            </button>
          )}
          {report && !onOpenLoadModal && (
            <div className="text-[11px] font-mono text-[#777777] truncate max-w-[90px]">
              {report.result}
            </div>
          )}
        </div>
      </div>

      {/* Engine Line Box */}
      {!isAnalysisEnabled ? (
        <div className="px-3 py-2 border-b border-[#262626] bg-[#111111] text-[11px] font-mono text-[#777777] flex items-center justify-between shrink-0">
          <span>Анализ ходов отключен пользователем</span>
          <span className="text-[#888888]">Чистая доска</span>
        </div>
      ) : hideEngineHints ? (
        <div className="px-3 py-2 border-b border-[#262626] bg-[#111111] text-[11px] font-mono text-[#777777] flex items-center justify-between shrink-0">
          <span>Подсказки движка скрыты во время партии</span>
          <span className="text-[#f0c15c] font-semibold">Честная игра</span>
        </div>
      ) : (
        <EngineLineBox
          currentMove={currentMove}
          isPreviewingLine={isPreviewingLine}
          onTogglePreviewLine={onTogglePreviewLine}
        />
      )}

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'moves' ? (
          <MoveTableTab
            moves={moves}
            currentPly={currentPly}
            onSelectPly={onSelectPly}
            isAnalysisEnabled={isAnalysisEnabled}
          />
        ) : report ? (
          <SummaryTab
            report={report}
            mistakeCount={mistakeCount}
            onStartMistakeReplay={onStartMistakeReplay}
          />
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
