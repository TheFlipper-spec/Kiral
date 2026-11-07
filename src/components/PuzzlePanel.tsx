import React, { useState, useEffect } from 'react';
import type { ChessPuzzle, PuzzleMistakeAnalysis } from '../data/puzzles';
import {
  Target,
  Lightbulb,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Shuffle,
  GraduationCap,
  Volume2,
  AlertTriangle
} from 'lucide-react';
import { sound } from '../services/soundService';

interface PuzzlePanelProps {
  puzzle: ChessPuzzle;
  status: 'playing' | 'solved' | 'failed';
  currentStep: number;
  mistakeAnalysis?: PuzzleMistakeAnalysis | null;
  onNextPuzzle: () => void;
  onRandomPuzzle: () => void;
  onRetry: () => void;
  onShowSolution: () => void;
  solvedCount: number;
  totalAttempted: number;
  filterDifficulty: 'all' | 'easy' | 'medium' | 'hard';
  onChangeFilter: (diff: 'all' | 'easy' | 'medium' | 'hard') => void;
}

export const PuzzlePanel: React.FC<PuzzlePanelProps> = ({
  puzzle,
  status,
  currentStep,
  mistakeAnalysis,
  onNextPuzzle,
  onRandomPuzzle,
  onRetry,
  onShowSolution,
  solvedCount,
  totalAttempted,
  filterDifficulty,
  onChangeFilter
}) => {
  const [revealedHints, setRevealedHints] = useState<number>(0);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Reset hints and explanation when puzzle changes
  useEffect(() => {
    setRevealedHints(0);
    setShowExplanation(false);
  }, [puzzle.id]);

  const handleRevealNextHint = () => {
    if (revealedHints < puzzle.hints.length) {
      const nextHint = puzzle.hints[revealedHints];
      setRevealedHints((prev) => prev + 1);
      if (nextHint) {
        sound.speak(nextHint);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] border-l border-[#262626] select-none text-[#EDEDED] font-sans">
      {/* Top Header */}
      <div className="p-4 border-b border-[#262626] bg-[#0E0E0E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#1baca6]" strokeWidth={1.5} />
          <span className="font-mono text-sm font-bold tracking-tight">
            Шахматные Задачи
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#888888]">
          <span>Решено:</span>
          <span className="font-bold text-[#96bc4b]">{solvedCount}</span>
          <span>/</span>
          <span>{totalAttempted}</span>
        </div>
      </div>

      {/* Difficulty Filter Tabs */}
      <div className="px-4 py-2 border-b border-[#262626] bg-[#141414] flex items-center justify-between text-xs font-mono">
        <span className="text-[#666666] text-[11px] uppercase tracking-wider">Фильтр:</span>
        <div className="flex items-center gap-1">
          {(['all', 'easy', 'medium', 'hard'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => onChangeFilter(lvl)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                filterDifficulty === lvl
                  ? 'bg-[#262626] text-white font-semibold'
                  : 'text-[#777777] hover:text-[#CCCCCC]'
              }`}
            >
              {lvl === 'all' ? 'Все' : lvl === 'easy' ? 'Легкие' : lvl === 'medium' ? 'Средние' : 'Сложные'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {/* Puzzle Card Info */}
        <div className="p-3 bg-[#161616] border border-[#262626] rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-white">
              {puzzle.title}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1F1F1F] text-[#AAAAAA] border border-[#2E2E2E]">
              {puzzle.rating} ELO
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#888888]">
            <span className="px-1.5 py-0.5 rounded bg-[#202020] text-[#1baca6] font-mono">
              {puzzle.theme}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  puzzle.turn === 'w' ? 'bg-[#EDEDED] border border-[#888888]' : 'bg-[#333333] border border-[#555555]'
                }`}
              />
              {puzzle.turn === 'w' ? 'Ход белых' : 'Ход черных'}
            </span>
          </div>
        </div>

        {/* Interactive Coach Briefing Card */}
        <div className="p-3 bg-[#15191C] border border-[#1baca6]/35 rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#1baca6] font-mono text-xs font-bold">
              <GraduationCap className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>Тренер Kiral: разбор позиции</span>
            </div>
            <button
              onClick={() =>
                sound.speak(
                  status === 'solved' || showExplanation
                    ? puzzle.explanation
                    : status === 'failed' && mistakeAnalysis
                    ? `${mistakeAnalysis.whyWrong} ${mistakeAnalysis.coachAdvice}`
                    : puzzle.coachBrief || puzzle.hints[0] || puzzle.title
                )
              }
              className="px-1.5 py-0.5 rounded bg-[#1F272B] hover:bg-[#283338] text-[#1baca6] text-[10px] font-mono flex items-center gap-1 transition-colors"
              title="Озвучить комментарий тренера"
            >
              <Volume2 className="w-3 h-3" strokeWidth={1.5} />
              <span>Озвучить</span>
            </button>
          </div>
          <p className="text-[11px] text-[#CCCCCC] leading-relaxed">
            {puzzle.coachBrief ||
              `Тема задачи — «${puzzle.theme}». Оцените слабые поля в лагере соперника и найдите форсированное продолжение.`}
          </p>
          {currentStep > 0 && status === 'playing' && (
            <div className="pt-1.5 border-t border-[#1baca6]/20 text-[11px] font-mono text-emerald-400">
              Первый шаг верный ({puzzle.solutionSans[0]})! Соперник ответил {puzzle.solutionSans[1]}. Найдите решающее продолжение.
            </div>
          )}
        </div>

        {/* Status Alert Banner */}
        {status === 'playing' && (
          <div className="p-3 bg-[#181818] border border-[#2E2E2E] rounded-md flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#1baca6] animate-pulse shrink-0" />
            <span className="text-xs text-[#CCCCCC]">
              {currentStep === 0
                ? `Ваш ход (${puzzle.turn === 'w' ? 'Белые' : 'Черные'}). Найдите сильнейший тактический удар.`
                : 'Отлично! Теперь завершите комбинацию следующим ходом.'}
            </span>
          </div>
        )}

        {status === 'solved' && (
          <div className="p-3 bg-[#142318] border border-[#254d31] rounded-md flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#96bc4b] shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex flex-col gap-1">
              <span className="font-mono font-bold text-[#96bc4b]">
                Задача блестяще решена!
              </span>
              <span className="text-[#CCCCCC] text-[11px] leading-relaxed">
                Тренер: «Превосходный расчет! Вы точно использовали мотив «{puzzle.theme}» и довели атаку до конца».
              </span>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="p-3 bg-[#261515] border border-[#5c2828] rounded-md space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-[#e05252] shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#e05252]">
                    Почему этот ход неверный?
                  </span>
                  {mistakeAnalysis?.wrongMoveSan && (
                    <span className="px-1.5 py-0.5 rounded bg-black/40 border border-[#5c2828] font-mono text-[10px] text-rose-300">
                      Ваш ход: {mistakeAnalysis.wrongMoveSan}
                    </span>
                  )}
                </div>
                <p className="text-[#E5E5E5] text-[11px] leading-relaxed mt-1">
                  {mistakeAnalysis
                    ? mistakeAnalysis.whyWrong
                    : 'Этот ход выпускает тактическое преимущество и позволяет сопернику консолидировать оборону.'}
                </p>
              </div>
            </div>

            {mistakeAnalysis?.opponentReplySan && (
              <div className="px-2.5 py-1.5 rounded bg-black/30 border border-[#442020] flex items-center gap-2 text-[11px] font-mono text-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Опровержение соперника: <strong>{mistakeAnalysis.opponentReplySan}</strong>
                </span>
              </div>
            )}

            <div className="pt-1.5 border-t border-[#442020] text-[11px] text-[#CCCCCC] leading-relaxed">
              <span className="font-mono font-semibold text-[#f0c15c] mr-1">Совет тренера:</span>
              <span>
                {mistakeAnalysis?.coachAdvice ||
                  puzzle.hints[0] ||
                  'Проверьте все шахи и взятия незащищенных фигур.'}
              </span>
            </div>
          </div>
        )}

        {/* Progressive Hints Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#777777] uppercase tracking-wider">
              Подсказки
            </span>
            {revealedHints < puzzle.hints.length && status !== 'solved' && (
              <button
                onClick={handleRevealNextHint}
                className="text-[11px] font-mono text-[#1baca6] hover:underline flex items-center gap-1"
              >
                <Lightbulb className="w-3 h-3" strokeWidth={1.5} />
                <span>Открыть ({revealedHints}/{puzzle.hints.length})</span>
              </button>
            )}
          </div>

          {revealedHints === 0 && status !== 'solved' ? (
            <div className="p-2.5 bg-[#141414] border border-[#222222] rounded text-[11px] text-[#666666]">
              Попробуйте найти решение самостоятельно, либо нажмите «Открыть».
            </div>
          ) : (
            <div className="space-y-1.5">
              {puzzle.hints.slice(0, revealedHints).map((h, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-[#171717] border border-[#282828] rounded text-[11px] text-[#CCCCCC] flex items-start gap-2"
                >
                  <span className="font-mono text-[#1baca6] font-bold">#{i + 1}</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Educational Tactical Explanation */}
        {(status === 'solved' || showExplanation) && (
          <div className="p-3 bg-[#141414] border border-[#262626] rounded-md space-y-2 animate-in fade-in duration-200">
            <span className="font-mono text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1baca6]" />
              Тактическое объяснение
            </span>
            <p className="text-[11px] text-[#AAAAAA] leading-relaxed">
              {puzzle.explanation}
            </p>
            <div className="pt-1 border-t border-[#222222] flex items-center gap-1.5 text-[10px] font-mono text-[#777777]">
              <span>Линия:</span>
              <span className="text-[#96bc4b] font-bold">
                {puzzle.solutionSans.join(' → ')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 border-t border-[#262626] bg-[#0E0E0E] flex flex-col gap-2">
        {status === 'solved' ? (
          <button
            onClick={onNextPuzzle}
            className="w-full py-2 px-3 rounded bg-[#EDEDED] hover:bg-white text-[#0A0A0A] font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Следующая задача</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRetry}
              className="py-1.5 px-2.5 rounded bg-[#181818] hover:bg-[#222222] border border-[#262626] text-[#CCCCCC] hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Сбросить</span>
            </button>
            <button
              onClick={() => {
                setShowExplanation(true);
                onShowSolution();
              }}
              className="py-1.5 px-2.5 rounded bg-[#181818] hover:bg-[#222222] border border-[#262626] text-[#ca3431] hover:text-red-400 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Показать ход</span>
            </button>
          </div>
        )}

        <button
          onClick={onRandomPuzzle}
          className="w-full py-1.5 px-2.5 rounded bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] text-[#888888] hover:text-[#EDEDED] font-mono text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <Shuffle className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Случайная задача</span>
        </button>
      </div>
    </div>
  );
};
