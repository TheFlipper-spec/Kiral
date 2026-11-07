import React, { useState, useEffect } from 'react';
import { X, Globe, Bot, Swords, User } from 'lucide-react';
import type { UserProfile } from '../services/userService';
import { multiplayerService } from '../services/multiplayerService';
import type { RankedMatchSession } from '../services/multiplayerService';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onStartMatch: (session: RankedMatchSession) => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStartMatch
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    let timer: any = null;
    if (isSearching) {
      setSearchSeconds(0);
      timer = setInterval(() => {
        setSearchSeconds((s) => s + 1);
      }, 1000);
    } else {
      setSearchSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSearching]);

  if (!isOpen) return null;

  const handleStartSearch = async () => {
    setIsSearching(true);
    const cancel = await multiplayerService.startMatchmaking(
      currentUser,
      (session) => {
        setIsSearching(false);
        onStartMatch(session);
        onClose();
      }
    );
    setCancelFn(() => cancel);
  };

  const handleCancelSearch = () => {
    if (cancelFn) cancelFn();
    setIsSearching(false);
  };

  const handleStartRankedAi = () => {
    const session = multiplayerService.createRankedAiMatch(currentUser);
    onStartMatch(session);
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] bg-[#0E0E0E]">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-[#1baca6]" strokeWidth={1.5} />
            <span className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Соревновательный матч
            </span>
          </div>
          <button
            onClick={() => {
              if (isSearching) handleCancelSearch();
              onClose();
            }}
            className="p-1 rounded text-[#777777] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center">
          {/* User status card */}
          <div className="w-full flex items-center justify-between p-3 rounded-lg bg-[#181818] border border-[#262626] mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#202020] border border-[#333333] flex items-center justify-center text-[#1baca6]">
                <User className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <span className="text-xs font-mono font-bold text-white block">
                  {currentUser.username}
                </span>
                <span className="text-[10px] font-mono text-[#777777]">
                  Текущий рейтинг
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#1baca6]/15 border border-[#1baca6]/30 text-[#1baca6] font-mono font-bold text-xs">
              {currentUser.elo} ELO
            </span>
          </div>

          {!isSearching ? (
            /* Mode Selector */
            <div className="w-full space-y-3">
              <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider block text-center mb-1">
                Выберите тип соперника:
              </span>

              {/* Online human player card */}
              <button
                onClick={handleStartSearch}
                className="w-full p-4 rounded-xl border border-[#262626] bg-[#161616] hover:bg-[#1C1C1C] hover:border-[#1baca6]/50 transition-all text-left flex items-start gap-3.5 group"
              >
                <div className="p-2.5 rounded-lg bg-[#1baca6]/10 text-[#1baca6] group-hover:scale-105 transition-transform">
                  <Globe className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono font-bold text-white group-hover:text-[#1baca6] transition-colors">
                      Живой игрок онлайн
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                      Рейтинг
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#888888] leading-relaxed">
                    Автоподбор соперника со всего мира по вашему значению ЭЛО. Без подсказок и стрелок.
                  </p>
                </div>
              </button>

              {/* Ranked AI calibrated to player's ELO */}
              <button
                onClick={handleStartRankedAi}
                className="w-full p-4 rounded-xl border border-[#262626] bg-[#161616] hover:bg-[#1C1C1C] hover:border-[#5c8bb0]/50 transition-all text-left flex items-start gap-3.5 group"
              >
                <div className="p-2.5 rounded-lg bg-[#5c8bb0]/10 text-[#5c8bb0] group-hover:scale-105 transition-transform">
                  <Bot className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono font-bold text-white group-hover:text-[#5c8bb0] transition-colors">
                      ИИ вашего уровня (~{currentUser.elo} ELO)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold">
                      Мгновенно
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#888888] leading-relaxed">
                    Движок Stockfish автоматически откалиброван под ваш точный рейтинг. Также идет в зачет ELO.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* Radar Matchmaking Searching State */
            <div className="w-full flex flex-col items-center py-4 text-center">
              {/* Radar visualization */}
              <div className="relative w-32 h-32 mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-[#1baca6]/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border border-[#1baca6]/30 animate-pulse" />
                <div className="absolute inset-6 rounded-full border border-[#1baca6]/40" />
                <div className="relative w-12 h-12 rounded-full bg-[#1baca6]/15 border border-[#1baca6] flex items-center justify-center text-[#1baca6]">
                  <Globe className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              <span className="text-sm font-mono font-bold text-white mb-1">
                Поиск соперника...
              </span>
              <span className="text-xs font-mono text-[#1baca6] font-bold mb-2">
                {formatTime(searchSeconds)}
              </span>
              <span className="text-[11px] font-mono text-[#777777] max-w-xs mb-5">
                Ищем доступного игрока в диапазоне {Math.max(50, currentUser.elo - 150)} - {currentUser.elo + 150} ELO
              </span>

              {/* Fallback button if search takes > 10s */}
              {searchSeconds >= 10 && (
                <div className="w-full p-3 rounded-lg bg-[#181818] border border-[#2b2b2b] mb-4 text-left animate-in fade-in">
                  <span className="text-[11px] font-mono text-[#AAAAAA] block mb-2">
                    Сейчас нет свободных соперников?
                  </span>
                  <button
                    onClick={() => {
                      handleCancelSearch();
                      handleStartRankedAi();
                    }}
                    className="w-full py-1.5 px-3 rounded bg-[#252525] hover:bg-[#303030] border border-[#3a3a3a] text-xs font-mono text-[#1baca6] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Сыграть с ИИ вашего уровня</span>
                  </button>
                </div>
              )}

              <button
                onClick={handleCancelSearch}
                className="px-5 py-2 rounded-lg bg-[#1C1C1C] border border-[#2a2a2a] text-[#888888] hover:text-white text-xs font-mono font-medium transition-colors"
              >
                Отменить поиск
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
