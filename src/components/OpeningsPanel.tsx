import React, { useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Volume2,
  GraduationCap,
  Award
} from 'lucide-react';
import { CHESS_OPENINGS } from '../data/openings';
import type { ChessOpening, OpeningStep } from '../data/openings';
import { sound } from '../services/soundService';

interface OpeningsPanelProps {
  currentOpening: ChessOpening;
  currentStepIndex: number; // 0 to opening.moves.length
  onSelectOpening: (opening: ChessOpening) => void;
  onStepChange: (stepIndex: number) => void;
  onResetOpening: () => void;
}

export const OpeningsPanel: React.FC<OpeningsPanelProps> = ({
  currentOpening,
  currentStepIndex,
  onSelectOpening,
  onStepChange,
  onResetOpening
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'open' | 'semi-open' | 'gambit'>('all');

  const filteredOpenings = CHESS_OPENINGS.filter((o) => {
    if (selectedCategory === 'all') return true;
    return o.category === selectedCategory;
  });

  const totalSteps = currentOpening.moves.length;
  const isCompleted = currentStepIndex >= totalSteps;
  const currentStep: OpeningStep | undefined = currentOpening.moves[currentStepIndex];

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps) {
      const nextIdx = currentStepIndex + 1;
      onStepChange(nextIdx);
      const step = currentOpening.moves[currentStepIndex];
      if (step) {
        sound.speak(`${step.san}. ${step.explanation}`);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1);
    }
  };

  const handleSpeakCurrent = () => {
    if (currentStep) {
      sound.speak(`Ход ${currentStep.san}. ${currentStep.explanation}. ${currentStep.coachNote || ''}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] border-l border-[#262626] text-[#EDEDED] select-none overflow-y-auto">
      {/* Category selector */}
      <div className="p-3 border-b border-[#262626] bg-[#0E0E0E]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
            <GraduationCap className="w-4 h-4 text-[#1baca6]" strokeWidth={1.5} />
            <span>Школа дебютов</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1C1C] text-[#888888] border border-[#282828]">
            {currentOpening.eco}
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-mono">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#1baca6] text-black font-semibold'
                : 'bg-[#181818] text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setSelectedCategory('open')}
            className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'open'
                ? 'bg-[#1baca6] text-black font-semibold'
                : 'bg-[#181818] text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            Открытые
          </button>
          <button
            onClick={() => setSelectedCategory('semi-open')}
            className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'semi-open'
                ? 'bg-[#1baca6] text-black font-semibold'
                : 'bg-[#181818] text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            Полуоткрытые
          </button>
          <button
            onClick={() => setSelectedCategory('gambit')}
            className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'gambit'
                ? 'bg-[#1baca6] text-black font-semibold'
                : 'bg-[#181818] text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            Гамбиты
          </button>
        </div>
      </div>

      {/* Opening cards carousel / selector */}
      <div className="p-3 border-b border-[#262626] bg-[#141414]">
        <span className="text-[10px] font-mono uppercase text-[#777777] tracking-wider block mb-2">
          Выберите дебют для тренировки:
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {filteredOpenings.map((op) => {
            const isSelected = op.id === currentOpening.id;
            return (
              <button
                key={op.id}
                onClick={() => {
                  onSelectOpening(op);
                  sound.speak(`Изучаем: ${op.nameRu}`);
                }}
                className={`p-2 rounded-md border text-left transition-all font-mono text-xs ${
                  isSelected
                    ? 'bg-[#1baca6]/15 border-[#1baca6] text-white shadow-sm'
                    : 'bg-[#181818] border-[#262626] text-[#AAAAAA] hover:bg-[#202020] hover:text-[#EDEDED]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-[11px] truncate">{op.nameRu}</span>
                  <span className="text-[9px] text-[#1baca6] font-semibold">{op.eco}</span>
                </div>
                <div className="text-[10px] text-[#777777] truncate">
                  {op.moves.map((m) => m.san).slice(0, 3).join(' ')}...
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main active opening learning stage */}
      <div className="p-4 flex-1 space-y-4">
        {/* Title & Key Ideas */}
        <div className="p-3 rounded-lg border border-[#262626] bg-[#161616]">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-mono text-sm font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#1baca6]" strokeWidth={1.5} />
              {currentOpening.nameRu}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#2A2A2A] text-[#1baca6] font-semibold">
              {currentStepIndex}/{totalSteps} ходов
            </span>
          </div>

          <p className="text-xs text-[#999999] leading-relaxed mb-3">
            {currentOpening.description}
          </p>

          <div className="space-y-1 pt-2 border-t border-[#222222]">
            <span className="text-[10px] font-mono uppercase text-[#777777] block mb-1">
              Главные идеи дебюта:
            </span>
            {currentOpening.keyIdeas.map((idea, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-[#BBBBBB]">
                <span className="text-[#1baca6] font-mono font-bold mt-0.5">•</span>
                <span>{idea}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-step Coach Walkthrough Card */}
        {!isCompleted && currentStep ? (
          <div className="p-3.5 rounded-lg border border-[#1baca6]/40 bg-[#161b1b] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#1baca6] text-black font-mono font-bold text-xs">
                  Ход {Math.ceil(currentStep.ply / 2)}: {currentStep.san}
                </span>
                <span className="text-[11px] font-mono text-[#AAAAAA]">
                  ({currentStep.turn === 'w' ? 'Белые' : 'Черные'})
                </span>
              </div>
              <button
                onClick={handleSpeakCurrent}
                className="p-1 rounded text-[#777777] hover:text-[#1baca6] transition-colors"
                title="Озвучить ход"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-[#EDEDED] leading-relaxed">
              {currentStep.explanation}
            </p>

            {currentStep.coachNote && (
              <div className="p-2 rounded bg-black/40 border border-[#222222] text-[11px] text-[#96bc4b] font-mono flex items-start gap-1.5">
                <span className="font-bold shrink-0">Совет:</span>
                <span>{currentStep.coachNote}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-emerald-800/80 bg-emerald-950/20 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-900/40 border border-emerald-600 flex items-center justify-center mx-auto text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="font-mono text-sm font-bold text-emerald-300">
              Дебют полностью освоен!
            </h4>
            <p className="text-xs text-[#AAAAAA] leading-relaxed">
              Вы успешно прошли все ключевые ходы линии {currentOpening.nameRu}. Теперь вы готовы уверенно разыгрывать этот дебют в реальных партиях!
            </p>
            <button
              onClick={onResetOpening}
              className="mt-2 px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-mono text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Пройти заново</span>
            </button>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onResetOpening}
            className="px-2.5 py-1.5 rounded bg-[#181818] hover:bg-[#222222] border border-[#262626] text-[#888888] hover:text-white font-mono text-xs flex items-center gap-1 transition-colors"
            title="Сбросить в начальную позицию"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>С начала</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className="px-2.5 py-1.5 rounded bg-[#181818] hover:bg-[#222222] border border-[#262626] text-[#CCCCCC] disabled:opacity-30 disabled:hover:bg-[#181818] font-mono text-xs flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Назад</span>
            </button>

            <button
              onClick={handleNextStep}
              disabled={isCompleted}
              className="px-3 py-1.5 rounded bg-[#1baca6] hover:bg-[#189d97] text-black font-mono text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors shadow-sm"
            >
              <span>{isCompleted ? 'Завершено' : 'Следующий ход'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
