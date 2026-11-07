import React, { useState } from 'react';
import { Target, BookOpen, GraduationCap } from 'lucide-react';
import { PuzzlePanel } from './PuzzlePanel';
import { OpeningsPanel } from './OpeningsPanel';
import type { ChessPuzzle, PuzzleMistakeAnalysis } from '../data/puzzles';
import type { ChessOpening } from '../data/openings';

interface LearnPanelProps {
  // Sub-branch state
  activeTab: 'puzzles' | 'openings';
  onTabChange: (tab: 'puzzles' | 'openings') => void;

  // Puzzle props
  puzzle: ChessPuzzle;
  puzzleStatus: 'playing' | 'solved' | 'failed';
  puzzleCurrentStep: number;
  mistakeAnalysis?: PuzzleMistakeAnalysis | null;
  onNextPuzzle: () => void;
  onRandomPuzzle: () => void;
  onRetryPuzzle: () => void;
  onShowPuzzleSolution: () => void;
  solvedCount: number;
  totalAttempted: number;
  filterDifficulty: 'all' | 'easy' | 'medium' | 'hard';
  onChangeFilter: (diff: 'all' | 'easy' | 'medium' | 'hard') => void;

  // Openings props
  currentOpening: ChessOpening;
  openingStepIndex: number;
  onSelectOpening: (opening: ChessOpening) => void;
  onOpeningStepChange: (stepIndex: number) => void;
  onResetOpening: () => void;
}

export const LearnPanel: React.FC<LearnPanelProps> = ({
  activeTab,
  onTabChange,
  puzzle,
  puzzleStatus,
  puzzleCurrentStep,
  mistakeAnalysis,
  onNextPuzzle,
  onRandomPuzzle,
  onRetryPuzzle,
  onShowPuzzleSolution,
  solvedCount,
  totalAttempted,
  filterDifficulty,
  onChangeFilter,
  currentOpening,
  openingStepIndex,
  onSelectOpening,
  onOpeningStepChange,
  onResetOpening
}) => {
  return (
    <div className="flex flex-col h-full bg-[#121212] select-none overflow-hidden">
      {/* Top Learn Branch Switcher */}
      <div className="px-3 py-2 bg-[#0C0C0C] border-b border-[#222222] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-[#1baca6]" strokeWidth={1.5} />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            Обучение
          </span>
        </div>

        <div className="flex items-center bg-[#161616] border border-[#262626] rounded-md p-0.5">
          <button
            onClick={() => onTabChange('puzzles')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'puzzles'
                ? 'bg-[#222222] text-[#96bc4b] font-semibold shadow-sm'
                : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Задачи</span>
          </button>
          <button
            onClick={() => onTabChange('openings')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'openings'
                ? 'bg-[#222222] text-[#1baca6] font-semibold shadow-sm'
                : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Изучение дебютов</span>
          </button>
        </div>
      </div>

      {/* Body: Puzzles or Openings */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'puzzles' ? (
          <PuzzlePanel
            puzzle={puzzle}
            status={puzzleStatus}
            currentStep={puzzleCurrentStep}
            mistakeAnalysis={mistakeAnalysis}
            onNextPuzzle={onNextPuzzle}
            onRandomPuzzle={onRandomPuzzle}
            onRetry={onRetryPuzzle}
            onShowSolution={onShowPuzzleSolution}
            solvedCount={solvedCount}
            totalAttempted={totalAttempted}
            filterDifficulty={filterDifficulty}
            onChangeFilter={onChangeFilter}
          />
        ) : (
          <OpeningsPanel
            currentOpening={currentOpening}
            currentStepIndex={openingStepIndex}
            onSelectOpening={onSelectOpening}
            onStepChange={onOpeningStepChange}
            onResetOpening={onResetOpening}
          />
        )}
      </div>
    </div>
  );
};
