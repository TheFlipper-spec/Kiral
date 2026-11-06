import React, { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';

export interface ScoreDeltaData {
  id: string;
  type: 'elo' | 'puzzle';
  title: string;
  delta: number;
  oldValue: number;
  newValue: number;
  unit: string;
  isPositive: boolean;
  isNeutral?: boolean;
}

interface ScoreDeltaNotificationProps {
  data: ScoreDeltaData | null;
  onDismiss: () => void;
}

export const ScoreDeltaNotification: React.FC<ScoreDeltaNotificationProps> = ({ data, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!data) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 3800);

    return () => clearTimeout(timer);
  }, [data, onDismiss]);

  if (!data || !visible) return null;

  const getAccentColor = () => {
    if (data.isNeutral) return 'text-zinc-400 border-zinc-700 bg-zinc-900/80';
    if (data.type === 'puzzle') return 'text-cyan-400 border-cyan-800/80 bg-cyan-950/40';
    if (data.isPositive) return 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40';
    return 'text-rose-400 border-rose-800/80 bg-rose-950/40';
  };

  const getDeltaBadge = () => {
    if (data.isNeutral) {
      return (
        <span className="flex items-center gap-1 font-mono font-bold text-zinc-400">
          <Minus className="w-4 h-4" /> 0 {data.unit}
        </span>
      );
    }
    if (data.isPositive) {
      return (
        <span className="flex items-center gap-1 font-mono font-bold text-emerald-400">
          <TrendingUp className="w-4 h-4" /> +{data.delta} {data.unit}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 font-mono font-bold text-rose-400">
        <TrendingDown className="w-4 h-4" /> {data.delta} {data.unit}
      </span>
    );
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto animate-score-pop">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border backdrop-blur-md shadow-2xl ${getAccentColor()}`}>
        <div className="flex items-center justify-center w-8 h-8 rounded border border-white/10 bg-black/40">
          {data.type === 'puzzle' ? (
            <Award className="w-4 h-4 text-cyan-400" />
          ) : data.isPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : data.isNeutral ? (
            <Minus className="w-4 h-4 text-zinc-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          )}
        </div>

        <div className="flex flex-col">
          <div className="text-[11px] font-mono tracking-wider uppercase text-zinc-400">
            {data.title}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-base">{getDeltaBadge()}</div>
            <span className="text-xs font-mono text-zinc-500">
              ({data.oldValue} &rarr; {data.newValue})
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 200);
          }}
          className="ml-2 text-zinc-500 hover:text-zinc-200 transition-colors p-1"
          title="Закрыть"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
