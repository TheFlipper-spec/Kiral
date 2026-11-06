import React, { useState } from 'react';
import type { SampleGame } from '../data/sampleGames';
import { SAMPLE_GAMES } from '../data/sampleGames';
import { X, FileText, Upload, Cpu } from 'lucide-react';

interface LoadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPgn: (pgn: string, depth: number) => void;
  currentDepth: number;
}

export const LoadGameModal: React.FC<LoadGameModalProps> = ({
  isOpen,
  onClose,
  onLoadPgn,
  currentDepth
}) => {
  const [pgnInput, setPgnInput] = useState('');
  const [selectedDepth, setSelectedDepth] = useState<number>(currentDepth);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAnalysis = (pgnToAnalyze: string) => {
    const trimmed = pgnToAnalyze.trim();
    if (!trimmed) {
      setErrorMsg('Пожалуйста, вставьте PGN-текст партии');
      return;
    }
    setErrorMsg(null);
    onLoadPgn(trimmed, selectedDepth);
    onClose();
  };

  const handleSelectSample = (sample: SampleGame) => {
    setPgnInput(sample.pgn);
    handleStartAnalysis(sample.pgn);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl bg-[#121212] border border-[#262626] rounded-lg shadow-2xl flex flex-col overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] bg-[#161616]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#EDEDED]" strokeWidth={1.5} />
            <h2 className="font-sans font-semibold text-[#EDEDED] text-sm">
              Загрузка партии для анализа
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#888888] hover:text-[#EDEDED] hover:bg-[#222222] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono text-[#888888] mb-1.5 uppercase tracking-wider">
              Исторические партии для теста
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_GAMES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className="p-2.5 rounded bg-[#181818] border border-[#262626] hover:border-[#404040] hover:bg-[#202020] text-left transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="font-semibold text-xs text-[#EDEDED] group-hover:text-white truncate">
                      {sample.title}
                    </div>
                    <div className="text-[11px] font-mono text-[#888888] mt-0.5 truncate">
                      {sample.white.split(' ')[1]} vs {sample.black.split(' ')[1]}
                    </div>
                  </div>
                  <div className="text-[10px] text-[#666666] font-mono mt-2">
                    {sample.year}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-[#888888] uppercase tracking-wider">
                Вставить PGN
              </label>
              {errorMsg && (
                <span className="text-xs text-[#ef4444] font-mono">{errorMsg}</span>
              )}
            </div>
            <textarea
              value={pgnInput}
              onChange={(e) => {
                setPgnInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6..."
              className="w-full h-32 p-3 bg-[#0A0A0A] border border-[#262626] rounded-md text-xs font-mono text-[#EDEDED] focus:outline-none focus:border-[#555555] resize-none placeholder-[#444444]"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#222222]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#888888]">
              <Cpu className="w-3.5 h-3.5 text-[#AAAAAA]" strokeWidth={1.5} />
              <span>Глубина поиска (Depth):</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[12, 14, 16, 18].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDepth(d)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                    selectedDepth === d
                      ? 'bg-[#E5E5E5] text-[#0A0A0A] font-bold border-[#E5E5E5]'
                      : 'bg-[#181818] text-[#888888] border-[#262626] hover:text-[#EDEDED]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-[#161616] border-t border-[#262626] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-sans text-[#888888] hover:text-[#EDEDED] hover:bg-[#202020] transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => handleStartAnalysis(pgnInput)}
            className="px-4 py-1.5 rounded bg-[#EDEDED] text-[#0A0A0A] hover:bg-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Начать анализ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
