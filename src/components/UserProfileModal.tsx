import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Trophy,
  Target,
  UserPlus,
  UserCheck,
  Swords,
  CheckCircle2,
  RefreshCw,
  Clock,
  Eye,
  Check
} from 'lucide-react';
import type { UserProfile } from '../services/userService';
import { userService } from '../services/userService';
import { multiplayerService } from '../services/multiplayerService';
import type { LiveGamePresence } from '../services/multiplayerService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserProfile | null;
  currentUser: UserProfile;
  onChallengePlayer?: (user: UserProfile) => void;
  onSpectateGame?: (game: LiveGamePresence) => void;
  onUserChanged?: (user: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  currentUser,
  onChallengePlayer,
  onSpectateGame,
  onUserChanged
}) => {
  const [challenged, setChallenged] = useState(false);
  const [liveUser, setLiveUser] = useState<UserProfile | null>(targetUser);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const syncUserFromCloud = async (id: string, fallback: UserProfile) => {
    setIsRefreshing(true);
    try {
      await userService.refreshFromCloud();
      const fresh = userService.getUserById(id);
      if (fresh) {
        setLiveUser({ ...fresh });
      } else {
        setLiveUser(fallback);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && targetUser) {
      const cached = userService.getUserById(targetUser.id);
      setLiveUser(cached ? { ...cached } : targetUser);
      syncUserFromCloud(targetUser.id, targetUser);
    } else {
      setLiveUser(null);
    }
  }, [isOpen, targetUser]);

  if (!isOpen || !targetUser) return null;

  const displayedUser = liveUser || targetUser;
  const isMe = displayedUser.id === currentUser.id;
  const friendshipStatus = userService.getFriendshipStatus(displayedUser.id, displayedUser.username);
  const liveGame = multiplayerService.getLiveGameForUser(displayedUser.id || displayedUser.username);

  const totalGames = displayedUser.stats?.totalGames || 0;
  const wins = displayedUser.stats?.wins || 0;
  const losses = displayedUser.stats?.losses || 0;
  const draws = displayedUser.stats?.draws || 0;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const handleFriendAction = () => {
    if (friendshipStatus === 'friends') {
      userService.removeFriend(displayedUser.id);
    } else if (friendshipStatus === 'pending_incoming') {
      userService.acceptFriendRequest(displayedUser.id);
    } else if (friendshipStatus === 'none') {
      userService.sendFriendRequest(displayedUser);
      multiplayerService.sendFriendRequestNotification(displayedUser.id, currentUser);
    }
    if (onUserChanged) onUserChanged({ ...userService.getCurrentUser() });
    setChallenged((prev) => !prev);
  };

  const handleChallenge = () => {
    setChallenged(true);
    if (onChallengePlayer) {
      onChallengePlayer(displayedUser);
    }
    setTimeout(() => setChallenged(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] bg-[#0E0E0E]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#888888]">
              Профиль игрока
            </span>
            <button
              onClick={() => syncUserFromCloud(displayedUser.id, displayedUser)}
              className="p-1 rounded text-[#777777] hover:text-[#1baca6] hover:bg-[#1A1A1A] transition-colors"
              title="Обновить статистику и ELO из облака"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1baca6]' : ''}`} strokeWidth={1.5} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#777777] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Profile Card */}
        <div className="p-5 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-3">
            {displayedUser.avatarUrl ? (
              <img
                src={displayedUser.avatarUrl}
                alt={displayedUser.username}
                className="w-16 h-16 rounded-full border-2 border-[#1baca6] object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#1C1C1C] border-2 border-[#262626] flex items-center justify-center text-[#1baca6]">
                <User className="w-8 h-8" strokeWidth={1.5} />
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#121212]" />
          </div>

          <h3 className="text-base font-bold text-white font-mono mb-1">
            {displayedUser.username}
          </h3>
          <span className="text-[11px] font-mono text-[#777777] mb-4">
            В игре с {displayedUser.createdAt || 'ноября 2026'}
          </span>

          {/* Ratings Grid */}
          <div className="grid grid-cols-2 gap-2 w-full mb-4">
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#262626] flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-[#1baca6]/15 text-[#1baca6]">
                <Trophy className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase text-[#777777] block">Рейтинг ELO</span>
                <span className="text-sm font-mono font-bold text-white">{displayedUser.elo}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#262626] flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-[#96bc4b]/15 text-[#96bc4b]">
                <Target className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase text-[#777777] block">Задачи</span>
                <span className="text-sm font-mono font-bold text-white">{displayedUser.puzzlePoints} б.</span>
              </div>
            </div>
          </div>

          {/* Detailed Match Statistics */}
          <div className="w-full p-3.5 rounded-lg bg-[#161616] border border-[#262626] mb-4">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#222222]">
              <span className="text-[11px] font-mono text-[#888888]">Всего сыграно партий</span>
              <span className="text-xs font-mono font-bold text-white">{totalGames}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-2">
              <div className="p-1.5 rounded bg-[#1A1A1A]">
                <span className="text-[10px] font-mono text-emerald-400 block font-semibold">Победы</span>
                <span className="text-xs font-mono font-bold text-white">{wins}</span>
              </div>
              <div className="p-1.5 rounded bg-[#1A1A1A]">
                <span className="text-[10px] font-mono text-zinc-400 block font-semibold">Ничьи</span>
                <span className="text-xs font-mono font-bold text-white">{draws}</span>
              </div>
              <div className="p-1.5 rounded bg-[#1A1A1A]">
                <span className="text-[10px] font-mono text-rose-400 block font-semibold">Поражения</span>
                <span className="text-xs font-mono font-bold text-white">{losses}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-[#888888]">Винрейт</span>
              <span className="text-xs font-mono font-bold text-[#1baca6]">{winRate}%</span>
            </div>
          </div>

          {/* Action Buttons */}
          {!isMe && (
            <div className="flex flex-col gap-2 w-full">
              {liveGame && onSpectateGame && (
                <button
                  onClick={() => {
                    onSpectateGame(liveGame);
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/80 text-rose-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-rose-400" />
                  <span>Смотреть прямой эфир ({liveGame.opponentName})</span>
                </button>
              )}

              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={handleFriendAction}
                  disabled={friendshipStatus === 'pending_outgoing'}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    friendshipStatus === 'friends'
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      : friendshipStatus === 'pending_incoming'
                      ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300 hover:bg-emerald-800/60'
                      : friendshipStatus === 'pending_outgoing'
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-[#1C1C1C] border-[#333333] text-white hover:bg-[#252525]'
                  }`}
                >
                  {friendshipStatus === 'friends' ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>В друзьях</span>
                    </>
                  ) : friendshipStatus === 'pending_incoming' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Принять заявку</span>
                    </>
                  ) : friendshipStatus === 'pending_outgoing' ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Заявка отправлена</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-[#1baca6]" />
                      <span>+ Заявка в друзья</span>
                    </>
                  )}
                </button>

                {!liveGame && (
                  <button
                    onClick={handleChallenge}
                    disabled={challenged}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#1baca6] text-black hover:bg-[#20c2bc] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-75"
                  >
                    {challenged ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Вызов отправлен</span>
                      </>
                    ) : (
                      <>
                        <Swords className="w-3.5 h-3.5" />
                        <span>Вызвать</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
