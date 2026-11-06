import React from 'react';
import { centipawnsToWinPercent } from '../engine/evalFormulas';

interface EvalBarProps {
  evalCp: number;
  mate: number | null;
  flipped?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({ evalCp, mate, flipped = false }) => {
  // Win probability for White (0 - 100)
  const whitePercent = centipawnsToWinPercent(evalCp, mate);
  const clampedWhite = Math.max(3, Math.min(97, whitePercent));
  const clampedBlack = 100 - clampedWhite;

  let evalText = '';
  if (mate !== null) {
    evalText = `M${Math.abs(mate)}`;
  } else {
    const pawns = evalCp / 100;
    if (pawns > 0) {
      evalText = `+${pawns.toFixed(1)}`;
    } else if (pawns < 0) {
      evalText = pawns.toFixed(1);
    } else {
      evalText = '0.0';
    }
  }

  const isWhiteAdvantage = mate !== null ? mate > 0 : evalCp >= 0;

  // If flipped, top is White and bottom is Black. Otherwise top is Black and bottom is White.
  const topColor = flipped ? '#E5E5E5' : '#1e1e1e';
  const topHeight = flipped ? clampedWhite : clampedBlack;
  const topTextColor = flipped ? '#121212' : '#EDEDED';
  const showTopText = flipped ? isWhiteAdvantage : !isWhiteAdvantage;

  const bottomColor = flipped ? '#1e1e1e' : '#E5E5E5';
  const bottomHeight = flipped ? clampedBlack : clampedWhite;
  const bottomTextColor = flipped ? '#EDEDED' : '#121212';
  const showBottomText = flipped ? !isWhiteAdvantage : isWhiteAdvantage;

  return (
    <div
      className="w-6 h-full bg-[#121212] border border-[#262626] rounded-sm flex flex-col justify-between relative overflow-hidden select-none shrink-0"
      title={`Оценка позиции: ${evalText}`}
    >
      {/* Top portion */}
      <div
        className="w-full transition-all duration-300 ease-out flex items-center justify-center overflow-hidden"
        style={{
          height: `${topHeight}%`,
          backgroundColor: topColor
        }}
      >
        {showTopText && (
          <span
            className="text-[9px] font-mono font-medium py-1 tracking-tighter"
            style={{ color: topTextColor }}
          >
            {evalText}
          </span>
        )}
      </div>

      {/* Subtle division hairline */}
      <div className="w-full h-[1px] bg-[#383838] z-10 shrink-0" />

      {/* Bottom portion */}
      <div
        className="w-full transition-all duration-300 ease-out flex items-center justify-center overflow-hidden"
        style={{
          height: `${bottomHeight}%`,
          backgroundColor: bottomColor
        }}
      >
        {showBottomText && (
          <span
            className="text-[9px] font-mono font-medium py-1 tracking-tighter"
            style={{ color: bottomTextColor }}
          >
            {evalText}
          </span>
        )}
      </div>
    </div>
  );
};
