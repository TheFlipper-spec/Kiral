import React, { useMemo, useRef, useState } from 'react';
import type { MoveAnalysis } from '../types/chess';
import { centipawnsToWinPercent } from '../engine/evalFormulas';

interface EvalGraphProps {
  moves: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  height?: number;
}

export const EvalGraph: React.FC<EvalGraphProps> = ({
  moves,
  currentPly,
  onSelectPly,
  height = 84
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const dataPoints = useMemo(() => {
    const points: Array<{
      ply: number;
      san: string;
      evalCp: number;
      mate: number | null;
      normValue: number;
    }> = [
      {
        ply: 0,
        san: 'Start',
        evalCp: 0,
        mate: null,
        normValue: 0
      }
    ];

    moves.forEach((m, idx) => {
      if (!m) return;
      const rawEval = typeof m.evalAfter === 'number' && !isNaN(m.evalAfter) ? m.evalAfter : 0;
      const rawMate = typeof m.mateAfter === 'number' && !isNaN(m.mateAfter) ? m.mateAfter : null;
      const wp = centipawnsToWinPercent(rawEval, rawMate);
      const rawNorm = (wp - 50) / 50;
      const normValue = isNaN(rawNorm) ? 0 : rawNorm;
      points.push({
        ply: (typeof m.ply === 'number' ? m.ply : idx) + 1,
        san: m.san || '',
        evalCp: rawEval,
        mate: rawMate,
        normValue
      });
    });

    return points;
  }, [moves]);

  const totalPoints = dataPoints.length;
  const width = 600;
  const midY = height / 2;

  const getY = (normVal: number) => {
    const margin = 6;
    const available = midY - margin;
    return midY - normVal * available;
  };

  const getX = (index: number) => {
    if (totalPoints <= 1) return 0;
    return (index / (totalPoints - 1)) * width;
  };

  const { linePath, whiteAreaPath, blackAreaPath } = useMemo(() => {
    if (totalPoints === 0) {
      return { linePath: '', whiteAreaPath: '', blackAreaPath: '' };
    }

    const coords = dataPoints.map((p, idx) => ({
      x: getX(idx),
      y: getY(p.normValue)
    }));

    const line = coords.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`,
      ''
    );

    let whiteArea = `M 0,${midY}`;
    coords.forEach((pt) => {
      const clampedY = Math.min(pt.y, midY);
      whiteArea += ` L ${pt.x.toFixed(1)},${clampedY.toFixed(1)}`;
    });
    whiteArea += ` L ${width},${midY} Z`;

    let blackArea = `M 0,${midY}`;
    coords.forEach((pt) => {
      const clampedY = Math.max(pt.y, midY);
      blackArea += ` L ${pt.x.toFixed(1)},${clampedY.toFixed(1)}`;
    });
    blackArea += ` L ${width},${midY} Z`;

    return { linePath: line, whiteAreaPath: whiteArea, blackAreaPath: blackArea };
  }, [dataPoints, totalPoints, height]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || totalPoints <= 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetIdx = Math.round(ratio * (totalPoints - 1));
    const targetPly = dataPoints[targetIdx]?.ply ?? 0;
    onSelectPly(targetPly);
  };

  const activeX = getX(Math.min(currentPly, totalPoints - 1));
  const activePoint = hoverIndex !== null ? dataPoints[hoverIndex] : dataPoints[currentPly] || dataPoints[0];

  const formatEvalText = (cp: number, mate: number | null) => {
    if (mate !== null) return `M${mate}`;
    const p = (cp / 100).toFixed(1);
    return cp > 0 ? `+${p}` : p;
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#0D0D0D] border-t border-[#262626] relative select-none flex flex-col"
    >
      <div className="flex items-center justify-between px-3 py-1 text-[10px] font-mono text-[#888888] border-b border-[#1A1A1A]">
        <span>График оценки</span>
        <div className="flex items-center gap-2">
          <span>Ход: {activePoint.ply === 0 ? 'Начало' : `${Math.ceil(activePoint.ply / 2)} (${activePoint.san})`}</span>
          <span className="text-[#EDEDED] font-semibold">
            {formatEvalText(activePoint.evalCp, activePoint.mate)}
          </span>
        </div>
      </div>

      <div className="relative w-full cursor-crosshair">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full block"
          style={{ height: `${height}px` }}
          preserveAspectRatio="none"
          onClick={handleSvgClick}
          onMouseMove={(e) => {
            if (!containerRef.current || totalPoints <= 1) return;
            const rect = containerRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const idx = Math.round(ratio * (totalPoints - 1));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <line
            x1="0"
            y1={midY}
            x2={width}
            y2={midY}
            stroke="#262626"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          <path d={whiteAreaPath} fill="#E5E5E5" fillOpacity="0.12" />
          <path d={blackAreaPath} fill="#262626" fillOpacity="0.35" />

          <path
            d={linePath}
            fill="none"
            stroke="#E5E5E5"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <line
            x1={activeX}
            y1="0"
            x2={activeX}
            y2={height}
            stroke="#1baca6"
            strokeWidth="1.5"
            opacity="0.85"
          />

          <circle
            cx={activeX}
            cy={getY(dataPoints[Math.min(currentPly, totalPoints - 1)]?.normValue ?? 0)}
            r="3"
            fill="#1baca6"
            stroke="#0A0A0A"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
};
