import React from 'react';
import { Upload, RotateCcw, BookOpen, Swords, Users, Target } from 'lucide-react';
import { AI_DIFFICULTIES } from '../types/chess';

export type GameMode = 'review' | 'vs-ai' | 'pvp' | 'puzzles';

interface HeaderProps {
  gameMode: GameMode;
  onChangeMode: (mode: GameMode) => void;
  playerColor: 'w' | 'b';
  onChangePlayerColor: (color: 'w' | 'b') => void;
  aiDifficultyId: string;
  onChangeAiDifficulty: (difficultyId: string) => void;
  onOpenLoadModal: () => void;
  onReset: () => void;
  isEngineReady: boolean;
  gameTitle?: string;
  isAiThinking?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  gameMode,
  onChangeMode,
  playerColor,
  onChangePlayerColor,
  aiDifficultyId,
  onChangeAiDifficulty,
  onOpenLoadModal,
  onReset,
  isEngineReady,
  gameTitle,
  isAiThinking
}) => {
  return (
    <header className="h-12 border-b border-[#262626] bg-[#0A0A0A] px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Brand & Engine status */}
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-base font-bold tracking-tight text-[#EDEDED]">
            KIRAL
          </span>
          <span className="text-[10px] font-mono text-[#666666] tracking-wider uppercase hidden sm:inline">
            Chess Review & AI
          </span>
        </div>

        <div className="h-3.5 w-[1px] bg-[#262626]" />

        {/* Mode Selector Pill */}
        <div className="flex items-center bg-[#141414] border border-[#262626] rounded-md p-0.5">
          <button
            onClick={() => onChangeMode('review')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              gameMode === 'review'
                ? 'bg-[#222222] text-[#EDEDED] font-semibold'
                : 'text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden md:inline">Разбор</span>
          </button>
          <button
            onClick={() => onChangeMode('vs-ai')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              gameMode === 'vs-ai'
                ? 'bg-[#222222] text-[#1baca6] font-semibold'
                : 'text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Swords className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Против ИИ</span>
            <span className="sm:hidden">ИИ</span>
          </button>
          <button
            onClick={() => onChangeMode('pvp')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              gameMode === 'pvp'
                ? 'bg-[#222222] text-[#5c8bb0] font-semibold'
                : 'text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">1 на 1</span>
            <span className="sm:hidden">2P</span>
          </button>
          <button
            onClick={() => onChangeMode('puzzles')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              gameMode === 'puzzles'
                ? 'bg-[#222222] text-[#96bc4b] font-semibold'
                : 'text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Target className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Задачи</span>
          </button>
        </div>

        {/* Engine status indicator */}
        <div
          className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono"
          title={isEngineReady ? 'Stockfish Worker готов' : 'Инициализация...'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAiThinking
                ? 'bg-[#1baca6] animate-pulse'
                : isEngineReady
                ? 'bg-[#96bc4b]'
                : 'bg-[#f0c15c] animate-pulse'
            }`}
          />
          <span className="text-[#777777]">Stockfish 10</span>
        </div>

        {gameMode === 'review' && gameTitle && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#AAAAAA] font-sans truncate max-w-xs">
            <span className="text-[#444444]">—</span>
            <span className="truncate">{gameTitle}</span>
          </div>
        )}
      </div>

      {/* Mode-specific actions */}
      <div className="flex items-center gap-2">
        {gameMode === 'vs-ai' && (
          <>
            {/* Color selection */}
            <div className="flex items-center bg-[#141414] border border-[#262626] rounded-md p-0.5 text-xs font-mono">
              <button
                onClick={() => onChangePlayerColor('w')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  playerColor === 'w'
                    ? 'bg-[#E5E5E5] text-[#0A0A0A] font-bold'
                    : 'text-[#888888] hover:text-[#EDEDED]'
                }`}
                title="Играть белыми"
              >
                Белые
              </button>
              <button
                onClick={() => onChangePlayerColor('b')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  playerColor === 'b'
                    ? 'bg-[#333333] text-[#EDEDED] font-bold'
                    : 'text-[#888888] hover:text-[#EDEDED]'
                }`}
                title="Играть черными"
              >
                Черные
              </button>
            </div>

            {/* AI Difficulty Selector */}
            <div className="flex items-center bg-[#141414] border border-[#262626] rounded-md px-2 py-0.5 text-xs font-mono">
              <span className="text-[#666666] mr-1.5 hidden md:inline">Уровень:</span>
              <select
                value={aiDifficultyId}
                onChange={(e) => onChangeAiDifficulty(e.target.value)}
                className="bg-transparent text-[#1baca6] font-semibold focus:outline-none cursor-pointer py-0.5 text-xs"
              >
                {AI_DIFFICULTIES.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#141414] text-[#EDEDED]">
                    {d.name} (~{d.eloApprox} ELO)
                  </option>
                ))}
              </select>
            </div>

            {/* Restart match button */}
            <button
              onClick={onReset}
              className="px-2.5 py-1.5 rounded text-xs font-mono text-[#CCCCCC] hover:text-white bg-[#161616] border border-[#262626] hover:bg-[#202020] transition-colors flex items-center gap-1.5"
              title="Начать новую партию против ИИ"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Новая игра</span>
            </button>
          </>
        )}

        {gameMode === 'pvp' && (
          <button
            onClick={onReset}
            className="px-2.5 py-1.5 rounded text-xs font-mono text-[#CCCCCC] hover:text-white bg-[#161616] border border-[#262626] hover:bg-[#202020] transition-colors flex items-center gap-1.5"
            title="Начать новую партию 1 на 1"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Новая партия</span>
          </button>
        )}

        {gameMode === 'puzzles' && (
          <button
            onClick={onReset}
            className="px-2.5 py-1.5 rounded text-xs font-mono text-[#CCCCCC] hover:text-white bg-[#161616] border border-[#262626] hover:bg-[#202020] transition-colors flex items-center gap-1.5"
            title="Загрузить случайную задачу"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Новая задача</span>
          </button>
        )}

        {gameMode === 'review' && (
          <>
            <button
              onClick={onReset}
              className="px-2.5 py-1.5 rounded text-xs font-mono text-[#888888] hover:text-[#EDEDED] hover:bg-[#161616] border border-[#222222] transition-colors flex items-center gap-1.5"
              title="Сбросить к началу партии"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Сброс</span>
            </button>

            <button
              onClick={onOpenLoadModal}
              className="px-3 py-1.5 rounded bg-[#EDEDED] text-[#0A0A0A] hover:bg-white text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Загрузить PGN</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
