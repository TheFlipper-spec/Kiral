import React, { useState, useEffect } from 'react';
import type { GameReport, MoveAnalysis } from '../types/chess';
import { EngineLineBox } from './EngineLineBox';
import { MoveTableTab } from './MoveTableTab';
import { SummaryTab } from './SummaryTab';
import { EvalGraph } from './EvalGraph';
import type { AnalysisProgress } from '../engine/gameAnalyzer';
import {
  BarChart3,
  ListOrdered,
  XCircle,
  Upload,
  Activity,
  Copy,
  Check,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export interface AnalysisPanelProps {
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
  // Mistake Replay Props
  activeMistake?: {
    index: number;
    total: number;
    item: any;
    success: boolean | null;
    pieceHintRevealed: boolean;
    solutionRevealed: boolean;
  } | null;
  onNextMistake?: () => void;
  onRevealMistakePieceHint?: () => void;
  onRevealMistakeSolution?: () => void;
  onExitMistakeReplay?: () => void;
  isGameOver?: boolean;
  onRestartGame?: () => void;
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
  onOpenLoadModal,
  activeMistake = null,
  onNextMistake,
  onRevealMistakePieceHint,
  onRevealMistakeSolution,
  onExitMistakeReplay,
  isGameOver = false,
  onRestartGame
}) => {
  const [activeTab, setActiveTab] = useState<'moves' | 'summary' | 'graph' | 'mistakes'>('moves');
  const [copiedPgn, setCopiedPgn] = useState<boolean>(false);

  // Auto-switch to mistakes tab when replay starts, or summary when game ends
  useEffect(() => {
    if (activeMistake) {
      setActiveTab('mistakes');
    } else if (isGameOver && report) {
      setActiveTab('summary');
    }
  }, [activeMistake, isGameOver, Boolean(report)]);

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
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#262626] bg-[#121212] shrink-0 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 shrink-0">
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
          {/* Mobile-only 3rd tab: Graph */}
          <button
            onClick={() => setActiveTab('graph')}
            className={`lg:hidden px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              activeTab === 'graph'
                ? 'bg-[#1E1E1E] border-[#383838] text-[#EDEDED]'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>График</span>
          </button>
          {/* 4th tab after game end: Mistakes */}
          {(isGameOver || mistakeCount > 0 || Boolean(activeMistake)) && (
            <button
              onClick={() => setActiveTab('mistakes')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                activeTab === 'mistakes'
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : 'border-transparent text-rose-400/80 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.5} />
              <span>Ошибки {mistakeCount > 0 ? `(${mistakeCount})` : ''}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
        ) : activeTab === 'summary' ? (
          report ? (
            <SummaryTab
              report={report}
              mistakeCount={mistakeCount}
              onStartMistakeReplay={onStartMistakeReplay}
              onRestartGame={onRestartGame}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-xs font-mono text-[#666666]">
              Ожидание анализа партии...
            </div>
          )
        ) : activeTab === 'graph' ? (
          <div className="flex-1 p-3 flex flex-col justify-center items-stretch bg-[#0E0E0E]">
            <span className="text-xs font-mono text-zinc-400 mb-2">График преимущества по ходам:</span>
            <div className="rounded-lg border border-[#262626] p-2 bg-[#121212]">
              <EvalGraph
                moves={moves}
                currentPly={currentPly}
                onSelectPly={onSelectPly}
                height={160}
              />
            </div>
          </div>
        ) : (
          /* Mistakes Tab / Interactive Mistake Replay */
          <div className="flex-1 p-3 overflow-y-auto font-mono space-y-3 bg-[#0E0E0E]">
            {activeMistake ? (
              <div className="p-3.5 rounded-xl bg-[#141414] border border-[#2a2a2a] space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Работа над ошибками ({activeMistake.index + 1} / {activeMistake.total})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-[10px] text-rose-300 font-bold uppercase">
                    {activeMistake.item.classification === 'blunder' ? 'Зевок' : 'Ошибка'}
                  </span>
                </div>

                <div className="text-xs text-zinc-300">
                  Ход {Math.floor(activeMistake.item.ply / 2) + 1}: сыграно <span className="font-bold text-rose-400">{activeMistake.item.playedSan}</span>
                </div>

                <div className="p-2.5 rounded bg-[#181818] border border-[#262626] text-xs text-zinc-400 leading-relaxed">
                  <span className="text-zinc-500 font-bold text-[10px] uppercase block mb-1">Почему это неверно:</span>
                  {activeMistake.item.reason || 'Позиция резко ухудшилась после этого хода.'}
                </div>

                {/* Success feedback */}
                {activeMistake.success === true && (
                  <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-700 text-xs text-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Отлично! Вы нашли лучший ход: <strong>{activeMistake.item.bestMoveSan}</strong></span>
                    </div>
                  </div>
                )}

                {/* Wrong move feedback */}
                {activeMistake.success === false && (
                  <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                    Ход не является лучшим. Попробуйте еще раз!
                  </div>
                )}

                {/* Pedagogical Hint 1 */}
                {activeMistake.pieceHintRevealed && !activeMistake.solutionRevealed && (
                  <div className="p-2.5 rounded bg-[#1baca6]/15 border border-[#1baca6]/40 text-xs text-[#1baca6] flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 shrink-0 text-[#1baca6]" />
                    <span>Обратите внимание на поле {activeMistake.item.pieceSquare || 'фигуры'}.</span>
                  </div>
                )}

                {/* Pedagogical Hint 2 */}
                {activeMistake.solutionRevealed && (
                  <div className="p-2.5 rounded bg-[#96bc4b]/15 border border-[#96bc4b]/40 text-xs text-[#96bc4b] flex items-center justify-between">
                    <span>Правильный ход: <strong>{activeMistake.item.bestMoveSan}</strong></span>
                  </div>
                )}

                {/* Action controls */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#262626]">
                  {activeMistake.success === true ? (
                    <button
                      onClick={onNextMistake}
                      className="w-full py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Следующая ошибка</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {!activeMistake.pieceHintRevealed && !activeMistake.solutionRevealed && onRevealMistakePieceHint && (
                          <button
                            onClick={onRevealMistakePieceHint}
                            className="px-2.5 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] text-xs text-[#1baca6] flex items-center gap-1.5 transition-colors"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>Подсказка</span>
                          </button>
                        )}
                        {!activeMistake.solutionRevealed && onRevealMistakeSolution && (
                          <button
                            onClick={onRevealMistakeSolution}
                            className="px-2.5 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] text-xs text-[#f0c15c] flex items-center gap-1.5 transition-colors"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Показать ход</span>
                          </button>
                        )}
                      </div>
                      {onExitMistakeReplay && (
                        <button
                          onClick={onExitMistakeReplay}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Завершить
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : mistakeCount > 0 ? (
              <div className="p-4 rounded-xl bg-[#141414] border border-[#2a2a2a] text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" strokeWidth={1.5} />
                <div>
                  <h4 className="text-sm font-bold text-white">В партии найдено {mistakeCount} ошибок</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Пройдите интерактивный разбор, чтобы закрепить лучшие ходы и усилить свою игру.
                  </p>
                </div>
                {onStartMistakeReplay && (
                  <button
                    onClick={onStartMistakeReplay}
                    className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <span>Начать работу над ошибками ({mistakeCount})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#141414] border border-[#2a2a2a] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" strokeWidth={1.5} />
                <h4 className="text-sm font-bold text-white">Чистая игра!</h4>
                <p className="text-xs text-zinc-400">
                  В этой партии не обнаружено критических ошибок и зевков.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Eval Graph pinned on desktop */}
      <div className="hidden lg:block shrink-0">
        <EvalGraph
          moves={moves}
          currentPly={currentPly}
          onSelectPly={onSelectPly}
          height={86}
        />
      </div>
    </div>
  );
};
