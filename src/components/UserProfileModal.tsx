import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  Globe,
  Camera,
  Upload
} from 'lucide-react';
import type { UserProfile } from '../services/userService';
import { userService, COUNTRIES, getCountryFlag } from '../services/userService';
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
  const [isEditingCountry, setIsEditingCountry] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSelectCountry = (code: string) => {
    if (!currentUser) return;
    const updated = userService.updateProfile(currentUser.id, { country: code });
    if (updated) {
      setLiveUser({ ...updated });
      if (onUserChanged) onUserChanged({ ...updated });
    }
    setIsEditingCountry(false);
  };

  const handleSelectAvatarPreset = (symbol: string) => {
    if (!currentUser) return;
    // Generate an SVG data URI for crisp rendering
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="#181e22" rx="50"/><text x="50" y="65" font-size="52" text-anchor="middle" dominant-baseline="middle" fill="#1baca6">${symbol}</text></svg>`;
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
    const updated = userService.updateProfile(currentUser.id, { avatarUrl: dataUri });
    if (updated) {
      setLiveUser({ ...updated });
      if (onUserChanged) onUserChanged({ ...updated });
    }
    setIsEditingAvatar(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize image to max 160x160 to keep localStorage compact
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
          const resized = canvas.toDataURL('image/jpeg', 0.85);
          const updated = userService.updateProfile(currentUser.id, { avatarUrl: resized });
          if (updated) {
            setLiveUser({ ...updated });
            if (onUserChanged) onUserChanged({ ...updated });
          }
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    setIsEditingAvatar(false);
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
          <div className="relative mb-3 group">
            {displayedUser.avatarUrl ? (
              <img
                src={displayedUser.avatarUrl}
                alt={displayedUser.username}
                className="w-16 h-16 rounded-full border-2 border-[#1baca6] object-cover bg-[#161616]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#1C1C1C] border-2 border-[#262626] flex items-center justify-center text-[#1baca6]">
                <User className="w-8 h-8" strokeWidth={1.5} />
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#121212]" />

            {isMe && (
              <button
                onClick={() => setIsEditingAvatar((prev) => !prev)}
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                title="Сменить аватарку"
              >
                <Camera className="w-5 h-5 text-[#1baca6]" />
              </button>
            )}
          </div>

          <h3 className="text-base font-bold text-white font-mono mb-1 flex items-center justify-center gap-2">
            {displayedUser.country && (
              <span
                className="text-xl leading-none select-none cursor-default"
                title={COUNTRIES.find((c) => c.code === displayedUser.country)?.nameRu}
              >
                {getCountryFlag(displayedUser.country)}
              </span>
            )}
            <span>{displayedUser.username}</span>
          </h3>
          <span className="text-[11px] font-mono text-[#777777] mb-3">
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

          {/* My Profile Customization Section */}
          {isMe && (
            <div className="w-full space-y-3 pt-2 border-t border-[#222222] text-left">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
                Настройки профиля
              </span>

              {/* Country Picker Toggle */}
              <div className="bg-[#161616] border border-[#262626] rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#1baca6]" />
                    <span className="text-xs font-mono text-zinc-300">Страна / Флаг:</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingCountry((p) => !p);
                      setIsEditingAvatar(false);
                    }}
                    className="px-2 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#333333] text-xs font-mono text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{getCountryFlag(displayedUser.country) || '🏳️'}</span>
                    <span>
                      {COUNTRIES.find((c) => c.code === displayedUser.country)?.nameRu || 'Выбрать'}
                    </span>
                  </button>
                </div>

                {isEditingCountry && (
                  <div className="mt-2.5 pt-2 border-t border-[#222222] grid grid-cols-2 xs:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                    {COUNTRIES.map((c) => {
                      const isSelected = displayedUser.country === c.code;
                      return (
                        <button
                          key={c.code}
                          onClick={() => handleSelectCountry(c.code)}
                          className={`px-2 py-1.5 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors text-left border ${
                            isSelected
                              ? 'bg-[#1baca6]/20 border-[#1baca6] text-white'
                              : 'bg-[#1A1A1A] border-[#2A2A2A] text-zinc-300 hover:bg-[#222222]'
                          }`}
                        >
                          <span className="text-base">{c.flag}</span>
                          <span className="truncate">{c.nameRu}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Avatar Picker Toggle */}
              <div className="bg-[#161616] border border-[#262626] rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#1baca6]" />
                    <span className="text-xs font-mono text-zinc-300">Аватарка:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#333333] text-xs font-mono text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Загрузить изображение с устройства"
                    >
                      <Upload className="w-3 h-3 text-[#1baca6]" />
                      <span>Фото</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingAvatar((p) => !p);
                        setIsEditingCountry(false);
                      }}
                      className="px-2 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#333333] text-xs font-mono text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Значки</span>
                    </button>
                  </div>
                </div>

                {isEditingAvatar && (
                  <div className="mt-2.5 pt-2 border-t border-[#222222] space-y-2">
                    <span className="text-[10px] font-mono text-zinc-500 block">
                      Выберите шахматный символ:
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { symbol: '♚', name: 'Король' },
                        { symbol: '♛', name: 'Ферзь' },
                        { symbol: '♞', name: 'Конь' },
                        { symbol: '♜', name: 'Ладья' },
                        { symbol: '♝', name: 'Слон' },
                        { symbol: '👑', name: 'Корона' },
                        { symbol: '🦅', name: 'Сокол' },
                        { symbol: '🏆', name: 'Кубок' }
                      ].map((p) => (
                        <button
                          key={p.symbol}
                          onClick={() => handleSelectAvatarPreset(p.symbol)}
                          className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#242424] border border-[#2C2C2C] hover:border-[#1baca6] transition-all cursor-pointer group"
                          title={p.name}
                        >
                          <span className="text-xl group-hover:scale-110 transition-transform">
                            {p.symbol}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400 mt-0.5">
                            {p.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons for Other Players */}
          {!isMe && (
            <div className="flex flex-col gap-2 w-full mt-2">
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
