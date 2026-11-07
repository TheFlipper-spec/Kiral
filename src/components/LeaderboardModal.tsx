import React, { useState, useEffect } from 'react';
import { X, Trophy, Target, Award, RefreshCw, Cloud } from 'lucide-react';
import { userService } from '../services/userService';
import type { UserProfile } from '../services/userService';
import { cloudDatabase } from '../services/cloudDatabase';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSelectUser?: (user: UserProfile) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser
}) => {
  const [activeTab, setActiveTab] = useState<'puzzles' | 'elo'>('puzzles');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [puzzlesLeaderboard, setPuzzlesLeaderboard] = useState<UserProfile[]>([]);
  const [eloLeaderboard, setEloLeaderboard] = useState<UserProfile[]>([]);

  const loadData = () => {
    setPuzzlesLeaderboard(userService.getPuzzlesLeaderboard());
    setEloLeaderboard(userService.getEloLeaderboard());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Auto-refresh from cloud on open
      handleRefresh();
    }
  }, [isOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await userService.refreshFromCloud();
      loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] select-none animate-in fade-in duration-150">
      <div className="bg-[#121212] border border-[#282828] rounded-lg max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#262626] bg-[#0E0E0E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-[#1baca6]" strokeWidth={1.5} />
            <span className="font-mono text-sm font-bold tracking-tight text-[#EDEDED]">
              Таблица Лидеров
            </span>
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded bg-[#181818] border border-[#262626] text-[10px] font-mono text-[#888888]">
              <Cloud className={`w-3 h-3 ${cloudDatabase.isConnected ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className="hidden sm:inline">Облачная БД</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded text-[#777777] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
              title="Обновить таблицу"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#777777] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 pt-3 pb-2 border-b border-[#262626] bg-[#141414] flex gap-2">
          <button
            onClick={() => setActiveTab('puzzles')}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'puzzles'
                ? 'bg-[#222222] text-[#96bc4b] border border-[#333333]'
                : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            <Target className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Топ по задачам</span>
          </button>
          <button
            onClick={() => setActiveTab('elo')}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'elo'
                ? 'bg-[#222222] text-[#1baca6] border border-[#333333]'
                : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            <Award className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Топ по Эло</span>
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {activeTab === 'puzzles' ? (
            puzzlesLeaderboard.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-500 space-y-2">
                <p>В таблице пока нет игроков.</p>
                <p className="text-[11px] text-zinc-600">Решайте шахматные задачи, чтобы заработать первые баллы!</p>
              </div>
            ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[36px_1fr_90px_70px] text-[10px] font-mono text-[#666666] uppercase px-3 py-1">
                <span>#</span>
                <span>Игрок</span>
                <span className="text-right">Баллы</span>
                <span className="text-right">Решено</span>
              </div>
              {puzzlesLeaderboard.map((user, idx) => {
                const isCurrent = user.id === currentUser.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => onSelectUser && onSelectUser(user)}
                    className={`grid grid-cols-[36px_1fr_90px_70px] items-center px-3 py-2 rounded border text-xs font-mono transition-colors cursor-pointer hover:border-[#1baca6]/40 ${
                      isCurrent
                        ? 'bg-[#182218] border-[#254d31] text-[#EDEDED]'
                        : 'bg-[#151515] border-[#222222] text-[#CCCCCC] hover:bg-[#1A1A1A]'
                    }`}
                    title="Нажмите, чтобы посмотреть профиль и статистику"
                  >
                    <span className="font-bold text-[#888888]">
                      {idx === 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#f0c15c]/20 text-[#f0c15c] font-bold text-[10px]">1</span>
                      ) : idx === 1 ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#EDEDED]/20 text-[#EDEDED] font-bold text-[10px]">2</span>
                      ) : idx === 2 ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#a88865]/20 text-[#a88865] font-bold text-[10px]">3</span>
                      ) : (
                        `${idx + 1}`
                      )}
                    </span>
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold truncate">
                        {user.username}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#254d31] text-[#96bc4b] font-bold">
                          ВЫ
                        </span>
                      )}
                    </div>
                    <span className="text-right font-bold text-[#96bc4b]">
                      {user.puzzlePoints} б.
                    </span>
                    <span className="text-right text-[#888888]">
                      {user.solvedPuzzleIds.length}
                    </span>
                  </div>
                );
              })}
            </div>
            )
          ) : (
            eloLeaderboard.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-500 space-y-2">
                <p>В таблице пока нет игроков.</p>
                <p className="text-[11px] text-zinc-600">Сыграйте матч против бота Stockfish для получения рейтинга Эло!</p>
              </div>
            ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[36px_1fr_80px_90px] text-[10px] font-mono text-[#666666] uppercase px-3 py-1">
                <span>#</span>
                <span>Игрок</span>
                <span className="text-right">Эло</span>
                <span className="text-right">В / П / Н</span>
              </div>
              {eloLeaderboard.map((user, idx) => {
                const isCurrent = user.id === currentUser.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => onSelectUser && onSelectUser(user)}
                    className={`grid grid-cols-[36px_1fr_80px_90px] items-center px-3 py-2 rounded border text-xs font-mono transition-colors cursor-pointer hover:border-[#1baca6]/40 ${
                      isCurrent
                        ? 'bg-[#152026] border-[#1d3d4d] text-[#EDEDED]'
                        : 'bg-[#151515] border-[#222222] text-[#CCCCCC] hover:bg-[#1A1A1A]'
                    }`}
                    title="Нажмите, чтобы посмотреть профиль и статистику"
                  >
                    <span className="font-bold text-[#888888]">
                      {idx === 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#f0c15c]/20 text-[#f0c15c] font-bold text-[10px]">1</span>
                      ) : idx === 1 ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#EDEDED]/20 text-[#EDEDED] font-bold text-[10px]">2</span>
                      ) : idx === 2 ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#a88865]/20 text-[#a88865] font-bold text-[10px]">3</span>
                      ) : (
                        `${idx + 1}`
                      )}
                    </span>
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold truncate">
                        {user.username}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#1d3d4d] text-[#1baca6] font-bold">
                          ВЫ
                        </span>
                      )}
                    </div>
                    <span className="text-right font-bold text-[#1baca6]">
                      {user.elo}
                    </span>
                    <span className="text-right text-[11px] text-[#777777]">
                      {user.stats.wins} / {user.stats.losses} / {user.stats.draws}
                    </span>
                  </div>
                );
              })}
            </div>
            )
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-3 border-t border-[#262626] bg-[#0E0E0E] text-[11px] font-mono text-[#666666] flex items-center justify-between">
          <span>Ваш профиль: <strong className="text-[#EDEDED]">{currentUser.username}</strong></span>
          <span>Эло: <strong className="text-[#1baca6]">{currentUser.elo}</strong> | Баллы: <strong className="text-[#96bc4b]">{currentUser.puzzlePoints}</strong></span>
        </div>
      </div>
    </div>
  );
};
