import React from 'react';
import type { MoveClassification } from '../types/chess';
import { CLASSIFICATION_CONFIGS } from '../types/chess';

interface BadgeProps {
  classification: MoveClassification;
  size?: 'sm' | 'md' | 'lg' | 'square';
  showLabel?: boolean;
}

export const ClassificationBadge: React.FC<BadgeProps> = ({
  classification,
  size = 'md',
  showLabel = false
}) => {
  const config = CLASSIFICATION_CONFIGS[classification] || CLASSIFICATION_CONFIGS.good;

  // Board square badge (circular vector badge top-right of square)
  if (size === 'square') {
    return (
      <div
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md border border-black/20 text-[10px] font-bold font-mono tracking-tighter"
        style={{
          backgroundColor: config.color,
          color: config.textColor
        }}
        title={`${config.nameRu} (${config.nameEn})`}
      >
        {config.symbol}
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <span
        className="inline-flex items-center justify-center px-1 py-0.5 rounded text-[9px] font-mono font-bold leading-none"
        style={{
          backgroundColor: `${config.color}20`,
          color: config.color,
          border: `1px solid ${config.color}40`
        }}
        title={config.nameRu}
      >
        {config.symbol}
      </span>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono select-none"
      style={{
        backgroundColor: `${config.color}15`,
        borderColor: `${config.color}40`,
        color: config.color
      }}
    >
      <span
        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{
          backgroundColor: config.color,
          color: config.textColor
        }}
      >
        {config.symbol}
      </span>
      {showLabel && (
        <span className="font-sans font-medium text-[11px] text-[#EDEDED]">
          {config.nameRu}
        </span>
      )}
    </div>
  );
};
