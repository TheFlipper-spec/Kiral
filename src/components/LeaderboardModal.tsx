import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Target,
  Award,
  RefreshCw,
  Cloud,
  Users,
  UserPlus,
  UserCheck,
  Search,
  User,
  Swords,
  Clock,
  History,
  Eye,
  Check,
  Trash2
} from 'lucide-react';
import { userService } from '../services/userService';
import type { UserProfile } from '../services/userService';
import { cloudDatabase } from '../services/cloudDatabase';
import { multiplayerService } from '../services/multiplayerService';
import type { LiveGamePresence } from '../services/multiplayerService';
import type { PlayedMatchRecord } from '../types/chess';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialTab?: 'elo' | 'puzzles' | 'friends' | 'history';
  onSelectUser?: (user: UserProfile) => void;
  onChallengePlayer?: (user: UserProfile) => void;
  onUserChanged?: (user: UserProfile) => void;
  onSpectateGame?: (game: LiveGamePresence) => void;
  onLoadHistoryMatch?: (match: PlayedMatchRecord, openMistakes?: boolean) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialTab = 'elo',
  onSelectUser,
  onChallengePlayer,
  onUserChanged,
  onSpectateGame,
  onLoadHistoryMatch
}) => {
  const [activeTab, setActiveTab] = useState<'elo' | 'puzzles' | 'friends' | 'history'>(initialTab);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [puzzlesLeaderboard, setPuzzlesLeaderboard] = useState<UserProfile[]>([]);
  const [eloLeaderboard, setEloLeaderboard] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setTick] = useState(0);

  const loadData = () => {
    setPuzzlesLeaderboard(userService.getPuzzlesLeaderboard());
    setEloLeaderboard(userService.getEloLeaderboard());
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadData();
      handleRefresh();
    }
  }, [isOpen, initialTab]);

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

  const friendIds = currentUser.friends || [];
  const allRegistered = eloLeaderboard;
  const myFriendsList = allRegistered.filter((u) => friendIds.includes(u.id));
  const filteredPlayers = allRegistered.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const renderActionButtons = (user: UserProfile) => {
    const isMe = user.id === currentUser.id;
    const status = userService.getFriendshipStatus(user.id, user.username);

    return (
      <div className="flex items-center justify-end gap-1 shrink-0">
        {!isMe && (
          <>
            {status === 'friends' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  userService.removeFriend(user.id);
                  setTick((t) => t + 1);
                  if (onUserChanged) onUserChanged({ ...userService.getCurrentUser() });
                }}
                className="px-1.5 py-1 rounded border text-[10px] font-mono flex items-center gap-1 bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-rose-950/50 hover:border-rose-700/50 hover:text-rose-300 transition-colors group"
                title="В друзьях (кликните, чтобы удалить)"
              >
                <UserCheck className="w-3 h-3 group-hover:hidden" />
                <Trash2 className="w-3 h-3 hidden group-hover:inline text-rose-400" />
                <span className="hidden sm:inline group-hover:hidden">Друг</span>
                <span className="hidden sm:group-hover:inline">Удалить</span>
              </button>
            )}

            {status === 'pending_outgoing' && (
              <span
                className="px-1.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 text-[10px] font-mono flex items-center gap-1"
                title="Заявка отправлена"
              >
                <Clock className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Заявка</span>
              </span>
            )}

            {status === 'pending_incoming' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  userService.acceptFriendRequest(user.id);
                  setTick((t) => t + 1);
                  if (onUserChanged) onUserChanged({ ...userService.getCurrentUser() });
                }}
                className="px-1.5 py-1 rounded border border-emerald-700/70 bg-emerald-900/40 text-emerald-300 text-[10px] font-mono flex items-center gap-1 hover:bg-emerald-800/50 transition-colors"
                title="Принять заявку в друзья"
              >
                <Check className="w-3 h-3" />
                <span>Принять</span>
              </button>
            )}

            {status === 'none' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  userService.sendFriendRequest(user);
                  multiplayerService.sendFriendRequestNotification(user.id, currentUser);
                  setTick((t) => t + 1);
                  if (onUserChanged) onUserChanged({ ...userService.getCurrentUser() });
                }}
                className="px-1.5 py-1 rounded border border-[#333333] bg-[#1F1F1F] text-[#1baca6] hover:bg-[#2A2A2A] text-[10px] font-mono flex items-center gap-1 transition-colors"
                title="Отправить заявку в друзья"
              >
                <UserPlus className="w-3 h-3" />
                <span className="hidden sm:inline">+Друг</span>
              </button>
            )}

            {onChallengePlayer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChallengePlayer(user);
                  onClose();
                }}
                className="p-1 rounded bg-[#202020] hover:bg-[#2a2a2a] border border-[#333333] text-[#f0c15c] text-[10px] font-mono transition-colors"
                title="Бросить вызов на матч"
              >
                <Swords className="w-3 h-3" />
              </button>
            )}
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectUser) onSelectUser(user);
          }}
          className="px-2 py-1 rounded bg-[#222222] hover:bg-[#2E2E2E] border border-[#383838] text-[10px] font-mono text-[#EDEDED] flex items-center gap-1 transition-colors"
          title="Открыть профиль"
        >
          <User className="w-3 h-3 text-[#1baca6]" />
          <span>Профиль</span>
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-[2px] select-none animate-in fade-in duration-150">
      <div className="bg-[#121212] border border-[#282828] rounded-xl max-w-xl w-full shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#262626] bg-[#0E0E0E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#1baca6]" strokeWidth={1.5} />
            <span className="font-mono text-sm font-bold tracking-tight text-[#EDEDED]">
              Игроки, Лидерборд и Друзья
            </span>
            <div className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded bg-[#181818] border border-[#262626] text-[10px] font-mono text-[#888888]">
              <Cloud className={`w-3 h-3 ${cloudDatabase.isConnected ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className="hidden sm:inline">Облако</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded text-[#777777] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
              title="Обновить список игроков из облака"
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
        <div className="px-3 sm:px-4 pt-2.5 pb-2 border-b border-[#262626] bg-[#141414] grid grid-cols-4 gap-1 sm:gap-1.5">
          <button
            onClick={() => setActiveTab('elo')}
            className={`py-1.5 px-1.5 rounded text-xs font-mono font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              activeTab === 'elo'
                ? 'bg-[#222222] text-[#1baca6] border border-[#333333]'
                : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="hidden sm:inline">Топ</span> Эло
          </button>
          <button
            onClick={() => setActiveTab('puzzles')}
            className={`py-1.5 px-1.5 rounded text-xs font-mono font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              activeTab === 'puzzles'
                ? 'bg-[#222222] text-[#96bc4b] border border-[#333333]'
                : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            <Target className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span>Задачи</span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-1.5 px-1.5 rounded text-xs font-mono font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              activeTab === 'friends'
                ? 'bg-[#222222] text-[#f0c15c] border border-[#333333]'
                : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span>Друзья ({myFriendsList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-1.5 px-1.5 rounded text-xs font-mono font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#222222] text-[#5c8bb0] border border-[#333333]'
                : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span>История ({userService.getMatchHistory().length})</span>
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {activeTab === 'history' ? (
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#888888] block">
                История сыгранных партий ({userService.getMatchHistory().length})
              </span>
              {userService.getMatchHistory().length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500 space-y-2">
                  <p>История партий пока пуста.</p>
                  <p className="text-[11px] text-zinc-600">
                    Сыграйте партию на рейтинг, 1 на 1 или против ИИ, чтобы просмотреть её разбор!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userService.getMatchHistory().map((m) => {
                    const isWin = m.result === 'win';
                    const isLoss = m.result === 'loss';
                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-lg bg-[#151515] border border-[#222222] hover:border-[#333333] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isWin
                                  ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300'
                                  : isLoss
                                  ? 'bg-rose-950/80 border border-rose-700/60 text-rose-300'
                                  : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                              }`}
                            >
                              {isWin ? 'Победа' : isLoss ? 'Поражение' : 'Ничья'}
                            </span>
                            <span className="font-bold text-white">vs {m.opponentName}</span>
                            {typeof m.opponentElo === 'number' && (
                              <span className="text-[11px] text-[#1baca6]">({m.opponentElo} ELO)</span>
                            )}
                            {typeof m.eloDelta === 'number' && m.eloDelta !== 0 && (
                              <span
                                className={`text-[11px] font-bold ${
                                  m.eloDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {m.eloDelta > 0 ? `+${m.eloDelta}` : m.eloDelta} ELO
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#777777]">
                            <span>{m.date}</span>
                            <span>•</span>
                            <span>{m.movesCount} ходов</span>
                            {m.timeControlLabel && (
                              <>
                                <span>•</span>
                                <span>{m.timeControlLabel}</span>
                              </>
                            )}
                            {typeof m.accuracy === 'number' && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-300 font-semibold">{m.accuracy}% точность</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          {onLoadHistoryMatch && (
                            <>
                              <button
                                onClick={() => {
                                  onLoadHistoryMatch(m, false);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded bg-[#1e282d] hover:bg-[#25363e] border border-[#2d4957] text-[#1baca6] font-bold text-[10px] flex items-center gap-1 transition-colors"
                                title="Открыть партию в режиме Разбора"
                              >
                                <span>Разбор</span>
                              </button>
                              <button
                                onClick={() => {
                                  onLoadHistoryMatch(m, true);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded bg-[#2a1a1a] hover:bg-[#382222] border border-[#522a2a] text-[#f87171] font-bold text-[10px] flex items-center gap-1 transition-colors"
                                title="Запустить работу над ошибками этой партии"
                              >
                                <span>Ошибки</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'friends' ? (
            <div className="space-y-4">
              {/* Search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Найти игрока по никнейму..."
                  className="w-full bg-[#181818] border border-[#2C2C2C] rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-[#EDEDED] placeholder-[#666666] focus:outline-none focus:border-[#1baca6]"
                />
              </div>

              {/* Incoming Friend Requests Section */}
              {currentUser.incomingFriendRequests && currentUser.incomingFriendRequests.length > 0 && (
                <div className="p-3 rounded-lg bg-[#181510] border border-amber-900/50 mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-2 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Входящие заявки в друзья ({currentUser.incomingFriendRequests.length})</span>
                  </span>
                  <div className="space-y-1.5">
                    {currentUser.incomingFriendRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#201a14] border border-amber-800/40 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-white truncate">{req.username}</span>
                          <span className="text-[11px] text-[#1baca6]">{req.elo} ELO</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              userService.acceptFriendRequest(req.id);
                              setTick((t) => t + 1);
                              if (onUserChanged) onUserChanged({ ...userService.getCurrentUser() });
                            }}
                            className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>Принять</span>
                          </button>
                          <button
                            onClick={() => {
                              userService.declineFriendRequest(req.id);
                              setTick((t) => t + 1);
                              if (onUserChanged) onUserChanged({ ...userService.getCurrentUser() });
                            }}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition-colors"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends list */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#888888] block mb-2">
                  Мои друзья ({myFriendsList.length})
                </span>
                {myFriendsList.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#161616] border border-[#222222] text-center text-xs font-mono text-[#777777]">
                    У вас пока нет добавленных друзей. Нажмите кнопку «+Друг» напротив любого игрока ниже!
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {myFriendsList.map((friend) => {
                      const liveGame = multiplayerService.getLiveGameForUser(friend.id || friend.username);
                      return (
                        <div
                          key={friend.id}
                          onClick={() => onSelectUser && onSelectUser(friend)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#161e22] border border-[#223843] text-xs font-mono cursor-pointer hover:border-[#1baca6]/60 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="font-bold text-white truncate">{friend.username}</span>
                            <span className="text-[11px] text-[#1baca6] font-semibold">{friend.elo} ELO</span>
                            {liveGame && (
                              <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.2 rounded shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <span className="hidden sm:inline">В игре vs {liveGame.opponentName}</span>
                                <span className="sm:hidden">В игре</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {liveGame && onSpectateGame && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSpectateGame(liveGame);
                                  onClose();
                                }}
                                className="px-2 py-1 rounded bg-[#252525] hover:bg-[#323232] border border-[#444444] text-[#EDEDED] font-mono text-[10px] flex items-center gap-1 transition-colors"
                                title="Смотреть партию в прямом эфире"
                              >
                                <Eye className="w-3 h-3 text-[#1baca6]" />
                                <span>Эфир</span>
                              </button>
                            )}
                            {onChallengePlayer && !liveGame && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChallengePlayer(friend);
                                  onClose();
                                }}
                                className="px-2 py-1 rounded bg-[#1baca6] text-black font-bold text-[10px] flex items-center gap-1 hover:bg-[#20c2bc] transition-colors"
                                title="Пригласить друга на партию"
                              >
                                <Swords className="w-3 h-3" />
                                <span>Вызвать</span>
                              </button>
                            )}
                            {renderActionButtons(friend)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* All players directory */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#888888] block mb-2">
                  Зарегистрированные игроки ({filteredPlayers.length})
                </span>
                {filteredPlayers.length === 0 ? (
                  <div className="py-6 text-center text-xs font-mono text-zinc-500">
                    Игроки не найдены.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredPlayers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => onSelectUser && onSelectUser(user)}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#151515] border border-[#222222] text-xs font-mono cursor-pointer hover:border-[#1baca6]/40 hover:bg-[#1A1A1A] transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="font-semibold text-[#EDEDED] truncate">{user.username}</span>
                          <span className="text-[11px] text-[#1baca6]">{user.elo} ELO</span>
                          <span className="text-[10px] text-[#777777] hidden sm:inline">
                            ({user.stats.wins}В / {user.stats.losses}П / {user.stats.draws}Н)
                          </span>
                        </div>
                        {renderActionButtons(user)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'puzzles' ? (
            puzzlesLeaderboard.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-500 space-y-2">
                <p>В таблице пока нет зарегистрированных игроков.</p>
                <p className="text-[11px] text-zinc-600">Зарегистрируйтесь и решайте задачи, чтобы занять 1 место!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[28px_1fr_70px_auto] gap-2 text-[10px] font-mono text-[#666666] uppercase px-3 py-1">
                  <span>#</span>
                  <span>Игрок</span>
                  <span className="text-right">Баллы</span>
                  <span className="text-right">Действия</span>
                </div>
                {puzzlesLeaderboard.map((user, idx) => {
                  const isCurrent = user.id === currentUser.id;
                  return (
                    <div
                      key={user.id}
                      onClick={() => onSelectUser && onSelectUser(user)}
                      className={`grid grid-cols-[28px_1fr_70px_auto] gap-2 items-center px-3 py-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer hover:border-[#1baca6]/40 ${
                        isCurrent
                          ? 'bg-[#182218] border-[#254d31] text-[#EDEDED]'
                          : 'bg-[#151515] border-[#222222] text-[#CCCCCC] hover:bg-[#1A1A1A]'
                      }`}
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
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold truncate">{user.username}</span>
                        {isCurrent && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#254d31] text-[#96bc4b] font-bold shrink-0">
                            ВЫ
                          </span>
                        )}
                      </div>
                      <span className="text-right font-bold text-[#96bc4b] whitespace-nowrap">
                        {user.puzzlePoints} б.
                      </span>
                      {renderActionButtons(user)}
                    </div>
                  );
                })}
              </div>
            )
          ) : eloLeaderboard.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500 space-y-2">
              <p>В таблице пока нет зарегистрированных игроков.</p>
              <p className="text-[11px] text-zinc-600">Зарегистрируйтесь и сыграйте рейтинговый матч!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[28px_1fr_60px_65px_auto] gap-2 text-[10px] font-mono text-[#666666] uppercase px-3 py-1">
                <span>#</span>
                <span>Игрок</span>
                <span className="text-right">Эло</span>
                <span className="text-right hidden sm:inline">В/П/Н</span>
                <span className="text-right">Действия</span>
              </div>
              {eloLeaderboard.map((user, idx) => {
                const isCurrent = user.id === currentUser.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => onSelectUser && onSelectUser(user)}
                    className={`grid grid-cols-[28px_1fr_60px_auto] sm:grid-cols-[28px_1fr_60px_65px_auto] gap-2 items-center px-3 py-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer hover:border-[#1baca6]/40 ${
                      isCurrent
                        ? 'bg-[#152026] border-[#1d3d4d] text-[#EDEDED]'
                        : 'bg-[#151515] border-[#222222] text-[#CCCCCC] hover:bg-[#1A1A1A]'
                    }`}
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
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold truncate">{user.username}</span>
                      {isCurrent && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#1d3d4d] text-[#1baca6] font-bold shrink-0">
                          ВЫ
                        </span>
                      )}
                    </div>
                    <span className="text-right font-bold text-[#1baca6]">{user.elo}</span>
                    <span className="text-right text-[11px] text-[#777777] hidden sm:inline whitespace-nowrap">
                      {user.stats.wins}/{user.stats.losses}/{user.stats.draws}
                    </span>
                    {renderActionButtons(user)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info banner with My Profile trigger */}
        <div className="p-3 border-t border-[#262626] bg-[#0E0E0E] text-[11px] font-mono text-[#888888] flex items-center justify-between gap-2">
          <div className="truncate">
            <span>Вы: <strong className="text-[#EDEDED]">{currentUser.username}</strong></span>
            <span className="ml-2 text-[#1baca6] font-bold">{currentUser.elo} ELO</span>
          </div>
          <button
            onClick={() => {
              if (onSelectUser) onSelectUser(currentUser);
            }}
            className="px-2.5 py-1 rounded bg-[#1baca6]/15 hover:bg-[#1baca6]/25 border border-[#1baca6]/40 text-[#1baca6] text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <User className="w-3.5 h-3.5" />
            <span>Моя статистика</span>
          </button>
        </div>
      </div>
    </div>
  );
};
