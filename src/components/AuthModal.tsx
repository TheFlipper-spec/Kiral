import React, { useState } from 'react';
import { X, User, Plus, Check } from 'lucide-react';
import { userService } from '../services/userService';
import type { UserProfile } from '../services/userService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserChanged: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const allUsers = userService.getAllUsers();

  const handleLoginOrCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setError('Введите имя пользователя');
      return;
    }
    if (trimmed.length < 2) {
      setError('Имя должно содержать минимум 2 символа');
      return;
    }

    const updatedUser = userService.loginUser(trimmed);
    onUserChanged(updatedUser);
    setUsernameInput('');
    setError(null);
    onClose();
  };

  const handleSwitchProfile = (userId: string) => {
    const switched = userService.switchUser(userId);
    if (switched) {
      onUserChanged(switched);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] select-none animate-in fade-in duration-150">
      <div className="bg-[#121212] border border-[#282828] rounded-lg max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#262626] bg-[#0E0E0E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#1baca6]" strokeWidth={1.5} />
            <span className="font-mono text-sm font-bold tracking-tight text-[#EDEDED]">
              Профиль Игрока
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#777777] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Current Active Account Box */}
        <div className="p-4 border-b border-[#262626] bg-[#161616]">
          <span className="text-[10px] font-mono uppercase text-[#777777] tracking-wider block mb-1">
            Текущий профиль
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-white">
              {currentUser.username}
            </span>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[#1baca6] font-bold">{currentUser.elo} ELO</span>
              <span className="text-[#444444]">•</span>
              <span className="text-[#96bc4b] font-bold">{currentUser.puzzlePoints} б.</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-mono text-[#888888] flex items-center gap-3">
            <span>Побед: <strong className="text-[#EDEDED]">{currentUser.stats.wins}</strong></span>
            <span>Поражений: <strong className="text-[#EDEDED]">{currentUser.stats.losses}</strong></span>
            <span>Ничьих: <strong className="text-[#EDEDED]">{currentUser.stats.draws}</strong></span>
          </div>
        </div>

        {/* Login or Create Form */}
        <form onSubmit={handleLoginOrCreate} className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-mono text-[#888888] block mb-1.5">
              Войти или создать новый профиль:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setError(null);
                }}
                placeholder="Имя игрока (напр. Magnus)"
                maxLength={20}
                className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded px-3 py-1.5 text-xs font-mono text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#1baca6]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#1baca6] hover:bg-[#189d97] text-[#0A0A0A] font-mono text-xs font-bold rounded flex items-center gap-1 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Войти</span>
              </button>
            </div>
            {error && (
              <span className="text-[10px] text-[#ca3431] font-mono block mt-1">
                {error}
              </span>
            )}
          </div>

          {/* Quick profile switch */}
          {allUsers.length > 1 && (
            <div className="pt-2">
              <span className="text-[10px] font-mono text-[#666666] uppercase tracking-wider block mb-1.5">
                Сохраненные профили:
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {allUsers.map((u) => {
                  const isActive = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSwitchProfile(u.id)}
                      className={`w-full px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between border transition-colors ${
                        isActive
                          ? 'bg-[#1baca6]/15 border-[#1baca6]/40 text-white'
                          : 'bg-[#161616] border-[#222222] text-[#888888] hover:text-[#CCCCCC] hover:border-[#333333]'
                      }`}
                    >
                      <span className="font-semibold truncate">{u.username}</span>
                      <div className="flex items-center gap-2 shrink-0 text-[11px]">
                        <span>{u.elo} ELO</span>
                        {isActive && <Check className="w-3.5 h-3.5 text-[#1baca6]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
