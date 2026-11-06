import React, { useState } from 'react';
import { X, User, Plus, Check, Cloud, RefreshCw, Key, Shield, LogIn } from 'lucide-react';
import { userService } from '../services/userService';
import type { UserProfile } from '../services/userService';
import { cloudDatabase } from '../services/cloudDatabase';
import type { CloudConfig } from '../services/cloudDatabase';
import { getStoredAuth0Config, saveAuth0Config, isAuth0Configured } from '../services/auth0Service';

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
  const [activeSection, setActiveSection] = useState<'profile' | 'cloud' | 'auth0'>('profile');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Cloud credentials form state
  const currentCloudCfg = cloudDatabase.getConfig();
  const [cloudProvider, setCloudProvider] = useState<'supabase' | 'firebase' | 'rest' | 'none'>(
    currentCloudCfg.provider || 'none'
  );
  const [supabaseUrl, setSupabaseUrl] = useState(currentCloudCfg.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(currentCloudCfg.supabaseAnonKey || '');
  const [firebaseUrl, setFirebaseUrl] = useState(currentCloudCfg.firebaseDbUrl || '');

  // Auth0 form state
  const auth0Cfg = getStoredAuth0Config();
  const [auth0Domain, setAuth0Domain] = useState(auth0Cfg.domain);
  const [auth0ClientId, setAuth0ClientId] = useState(auth0Cfg.clientId);
  const [auth0Saved, setAuth0Saved] = useState(false);

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

  const handleSyncCloudNow = async () => {
    setIsSyncing(true);
    setSyncStatus('Синхронизация с облаком...');
    try {
      const refreshed = await userService.refreshFromCloud();
      setSyncStatus(`Готово. Синхронизировано игроков: ${refreshed.length}`);
      const current = userService.getCurrentUser();
      onUserChanged(current);
    } catch {
      setSyncStatus('Ошибка синхронизации.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleSaveCloudConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const newCfg: CloudConfig = {
      provider: cloudProvider,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseKey.trim(),
      firebaseDbUrl: firebaseUrl.trim()
    };
    cloudDatabase.saveConfig(newCfg);
    setSyncStatus('Настройки облака сохранены!');
    setTimeout(() => setSyncStatus(null), 2500);
  };

  const handleSaveAuth0 = (e: React.FormEvent) => {
    e.preventDefault();
    saveAuth0Config({
      domain: auth0Domain.trim(),
      clientId: auth0ClientId.trim()
    });
    setAuth0Saved(true);
    setTimeout(() => {
      setAuth0Saved(false);
      window.location.reload();
    }, 1200);
  };

  const handleAuth0LoginClick = () => {
    if (isAuth0Configured()) {
      const redirectUri = window.location.origin + window.location.pathname;
      const url = `https://${auth0Cfg.domain}/authorize?client_id=${auth0Cfg.clientId}&response_type=token&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=openid%20profile%20email`;
      window.location.href = url;
    } else {
      setActiveSection('auth0');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] select-none animate-in fade-in duration-150">
      <div className="bg-[#121212] border border-[#282828] rounded-lg max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#262626] bg-[#0E0E0E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#1baca6]" strokeWidth={1.5} />
            <span className="font-mono text-sm font-bold tracking-tight text-[#EDEDED]">
              Профиль & Облачная БД
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#777777] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#262626] bg-[#141414] text-xs font-mono">
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              activeSection === 'profile'
                ? 'border-[#1baca6] text-[#EDEDED] bg-[#181818] font-bold'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            Игрок
          </button>
          <button
            onClick={() => setActiveSection('auth0')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeSection === 'auth0'
                ? 'border-[#1baca6] text-[#EDEDED] bg-[#181818] font-bold'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Auth0</span>
          </button>
          <button
            onClick={() => setActiveSection('cloud')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeSection === 'cloud'
                ? 'border-[#1baca6] text-[#EDEDED] bg-[#181818] font-bold'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Облако</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {activeSection === 'profile' && (
            <>
              {/* Current Active Account Box */}
              <div className="p-3.5 rounded border border-[#262626] bg-[#161616]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase text-[#777777] tracking-wider">
                    Активный аккаунт
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {currentUser.authProvider === 'auth0' ? 'Auth0 SSO' : 'Локальный'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-white">
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

              {/* Auth0 Login CTA */}
              <button
                type="button"
                onClick={handleAuth0LoginClick}
                className="w-full py-2 px-3 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#3b82f6]/40 text-xs font-mono font-bold text-white flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>{isAuth0Configured() ? 'Войти через Auth0 Universal Login' : 'Настроить Auth0 вход'}</span>
              </button>

              {/* Login or Create Form */}
              <form onSubmit={handleLoginOrCreate} className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-mono text-[#888888] block mb-1.5">
                    Быстрый вход по никнейму:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        setError(null);
                      }}
                      placeholder="Никнейм игрока"
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

                {/* Profiles list */}
                {allUsers.length > 1 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-[#666666] uppercase tracking-wider block mb-1.5">
                      Игроки на этом устройстве:
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
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
                                : 'bg-[#161616] border-[#222222] text-[#888888] hover:text-[#CCCCCC]'
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
            </>
          )}

          {activeSection === 'auth0' && (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded border border-[#262626] bg-[#161616] space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Shield className="w-4 h-4 text-[#38bdf8]" />
                  <span>Auth0 Single Sign-On</span>
                </div>
                <p className="text-[11px] text-[#888888] leading-relaxed">
                  Позволяет игрокам регистрироваться с любых компьютеров и телефонов через Email, Google, GitHub или Passkeys (WebAuthn).
                </p>
              </div>

              <form onSubmit={handleSaveAuth0} className="space-y-2.5 pt-1">
                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                    Auth0 Domain:
                  </label>
                  <input
                    type="text"
                    value={auth0Domain}
                    onChange={(e) => setAuth0Domain(e.target.value)}
                    placeholder="dev-xyz.us.auth0.com"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-[#1baca6]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                    Auth0 Client ID:
                  </label>
                  <input
                    type="text"
                    value={auth0ClientId}
                    onChange={(e) => setAuth0ClientId(e.target.value)}
                    placeholder="Ваш Client ID приложения"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-[#1baca6]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-[#EDEDED] hover:bg-white text-black font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Сохранить настройки Auth0</span>
                  </button>
                </div>

                {auth0Saved && (
                  <span className="text-[11px] text-emerald-400 block text-center mt-1">
                    Сохранено! Перезагрузка страницы...
                  </span>
                )}
              </form>
            </div>
          )}

          {activeSection === 'cloud' && (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded border border-[#262626] bg-[#161616] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Cloud className="w-4 h-4 text-[#1baca6]" />
                    <span>Синхронизация Базы Данных</span>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cloudDatabase.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-[#888888] leading-relaxed">
                  {cloudDatabase.statusMessage}
                </p>
                <button
                  type="button"
                  onClick={handleSyncCloudNow}
                  disabled={isSyncing}
                  className="w-full py-1.5 px-2.5 rounded bg-[#202020] hover:bg-[#282828] border border-[#333333] text-zinc-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Обновить данные с облака</span>
                </button>
                {syncStatus && (
                  <span className="text-[10px] text-emerald-400 block text-center">
                    {syncStatus}
                  </span>
                )}
              </div>

              {/* Cloud Provider Configuration */}
              <form onSubmit={handleSaveCloudConfig} className="space-y-2.5 pt-1">
                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                    Облачный провайдер:
                  </label>
                  <select
                    value={cloudProvider}
                    onChange={(e) => setCloudProvider(e.target.value as CloudConfig['provider'])}
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-[#1baca6]"
                  >
                    <option value="none">Локальный с облачным кэшем</option>
                    <option value="supabase">Supabase (PostgreSQL Cloud)</option>
                    <option value="firebase">Firebase Realtime Database</option>
                  </select>
                </div>

                {cloudProvider === 'supabase' && (
                  <>
                    <div>
                      <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                        Supabase URL:
                      </label>
                      <input
                        type="text"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://xyz.supabase.co"
                        className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-[#1baca6]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                        Supabase Anon Key:
                      </label>
                      <input
                        type="password"
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        placeholder="eyJhbGciOi..."
                        className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-[#1baca6]"
                      />
                    </div>
                  </>
                )}

                {cloudProvider === 'firebase' && (
                  <div>
                    <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                      Firebase Realtime DB URL:
                    </label>
                    <input
                      type="text"
                      value={firebaseUrl}
                      onChange={(e) => setFirebaseUrl(e.target.value)}
                      placeholder="https://xyz-default-rtdb.firebaseio.com"
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-[#1baca6]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-1.5 bg-[#1baca6] hover:bg-[#189d97] text-[#0A0A0A] font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Сохранить подключение к базе</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
