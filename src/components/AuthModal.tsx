import React, { useState } from 'react';
import { X, User, Check, RefreshCw, Shield, LogIn, Settings, Lock, LogOut, Award, Swords, Users } from 'lucide-react';
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
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [devTab, setDevTab] = useState<'cloud' | 'auth0'>('cloud');
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const isLoggedIn = currentUser.isRegistered && currentUser.authProvider !== 'guest';

  const handleLogout = () => {
    const guest = userService.logoutUser();
    onUserChanged(guest);
    setIsSwitchingAccount(false);
    setError(null);
    setSuccessMsg('Вы успешно вышли из профиля');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  // Cloud credentials form state
  const currentCloudCfg = cloudDatabase.getConfig();
  const [cloudProvider, setCloudProvider] = useState<'supabase' | 'firebase' | 'rest' | 'none'>(
    currentCloudCfg.provider || 'none'
  );
  const [supabaseUrl, setSupabaseUrl] = useState(currentCloudCfg.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(currentCloudCfg.supabaseAnonKey || '');
  const [firebaseUrl, setFirebaseUrl] = useState(currentCloudCfg.firebaseDbUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

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
      setError('Введите желаемый никнейм');
      return;
    }
    if (trimmed.length < 2) {
      setError('Никнейм должен содержать минимум 2 символа');
      return;
    }
    if (!passwordInput || passwordInput.trim().length < 3) {
      setError('Пароль обязателен для регистрации и входа (минимум 3 символа)');
      return;
    }

    const res = userService.loginUser(trimmed, passwordInput);
    if (!res.success) {
      setError(res.error || 'Ошибка входа');
      return;
    }

    onUserChanged(res.user);
    setUsernameInput('');
    setPasswordInput('');
    setError(null);
    setSuccessMsg(`Добро пожаловать, ${res.user.username}!`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 700);
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
    setSyncStatus('Синхронизация с базой...');
    try {
      const refreshed = await userService.refreshFromCloud();
      setSyncStatus(`Синхронизировано игроков: ${refreshed.length}`);
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
    setSyncStatus('Настройки сохранены! База активирована.');
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
      setShowDevSettings(true);
      setDevTab('auth0');
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
              Личный кабинет игрока
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#777777] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Current Active Account Box */}
          <div className="p-3.5 rounded border border-[#262626] bg-[#161616]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-[#777777] tracking-wider">
                Текущий активный профиль
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {currentUser.authProvider === 'auth0' ? 'Auth0' : currentUser.isRegistered ? 'Игрок' : 'Гость'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold text-white">
                {currentUser.username}
              </span>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-[#1baca6]/15 text-[#1baca6] font-bold">
                  {currentUser.elo} ELO
                </span>
                <span className="px-2 py-0.5 rounded bg-[#96bc4b]/15 text-[#96bc4b] font-bold">
                  {currentUser.puzzlePoints} баллов
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] font-mono text-[#888888] flex items-center gap-3">
              <span>Побед: <strong className="text-[#EDEDED]">{currentUser.stats.wins}</strong></span>
              <span>Поражений: <strong className="text-[#EDEDED]">{currentUser.stats.losses}</strong></span>
              <span>Ничьих: <strong className="text-[#EDEDED]">{currentUser.stats.draws}</strong></span>
              <span>Решено: <strong className="text-[#96bc4b]">{currentUser.solvedPuzzleIds.length}</strong></span>
            </div>
          </div>

          {successMsg && (
            <span className="text-xs text-emerald-400 font-mono block p-2 rounded bg-emerald-950/40 border border-emerald-800 text-center">
              {successMsg}
            </span>
          )}

          {/* If already logged in: show logout and switch account buttons instead of inputs */}
          {isLoggedIn && !isSwitchingAccount ? (
            <div className="space-y-3 p-3.5 rounded border border-[#262626] bg-[#161616]">
              <div>
                <span className="text-xs font-mono font-bold text-white block mb-0.5">
                  Управление сессией
                </span>
                <p className="text-[11px] font-mono text-[#777777] leading-relaxed">
                  Вы авторизованы как <strong className="text-[#EDEDED]">{currentUser.username}</strong>. Ваши победы, рейтинг и решенные задачи сохраняются.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-200 font-mono text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Выйти из профиля</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSwitchingAccount(true)}
                  className="w-full py-2 bg-[#1C1C1C] hover:bg-[#262626] border border-[#333333] text-[#CCCCCC] hover:text-white font-mono text-xs rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#1baca6]" />
                  <span>Войти под другим профилем</span>
                </button>
              </div>
            </div>
          ) : (
            /* Simple Direct Registration / Login Form */
            <form onSubmit={handleLoginOrCreate} className="space-y-3 p-3.5 rounded border border-[#262626] bg-[#161616]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-white block mb-0.5">
                    {isSwitchingAccount ? 'Смена профиля' : 'Регистрация / Вход'}
                  </span>
                  <p className="text-[11px] font-mono text-[#777777] leading-relaxed">
                    Введите никнейм и пароль для входа или создания нового аккаунта.
                  </p>
                </div>
                {isSwitchingAccount && (
                  <button
                    type="button"
                    onClick={() => setIsSwitchingAccount(false)}
                    className="text-[11px] font-mono text-[#777777] hover:text-white underline shrink-0 ml-2"
                  >
                    Отмена
                  </button>
                )}
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#888888] uppercase tracking-wider block mb-1">
                  Никнейм игрока:
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="Например, Kirill"
                    maxLength={20}
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#1baca6]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#888888] uppercase tracking-wider block mb-1">
                  Пароль (обязательно):
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="Минимум 3 символа"
                    required
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#1baca6]"
                  />
                </div>
              </div>

              {error && (
                <span className="text-[11px] text-[#ca3431] font-mono block">
                  {error}
                </span>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-[#1baca6] hover:bg-[#189d97] text-[#0A0A0A] font-mono text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Войти / Зарегистрироваться</span>
              </button>
            </form>
          )}

          {/* Social Auth0 Button (if configured by owner) */}
          {isAuth0Configured() && (
            <button
              type="button"
              onClick={handleAuth0LoginClick}
              className="w-full py-2 px-3 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#3b82f6]/40 text-xs font-mono font-bold text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Войти через Google / GitHub / Email (Auth0)</span>
            </button>
          )}

          {/* Multiple Accounts Switcher on this device */}
          {allUsers.length > 1 && (
            <div className="pt-1">
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

          {/* Developer / Project Owner Settings (Collapsible, hidden for normal users) */}
          <div className="pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={() => setShowDevSettings(!showDevSettings)}
              className="w-full flex items-center justify-between text-[11px] font-mono text-[#666666] hover:text-[#AAAAAA] p-1.5 rounded hover:bg-[#161616] transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-zinc-500" />
                <span>Настройки владельца сайта (База данных & Auth0)</span>
              </div>
              <span>{showDevSettings ? '▲ Скрыть' : '▼ Настроить'}</span>
            </button>

            {showDevSettings && (
              <div className="mt-2.5 p-3 rounded border border-[#2a2a2a] bg-[#141414] space-y-3 text-xs font-mono animate-in fade-in duration-150">
                <div className="text-[11px] text-[#888888] leading-relaxed bg-[#0F0F0F] p-2.5 rounded border border-[#222222]">
                  <strong className="text-white block mb-0.5">Информация для владельца сайта:</strong>
                  Обычным игрокам эти настройки трогать не нужно — они просто вводят свой ник вверху.
                  Здесь ты можешь один раз подключить базу данных (Supabase или Firebase), чтобы игроки с любых устройств сохранялись в одну общую таблицу лидеров.
                </div>

                <div className="flex border-b border-[#262626] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDevTab('cloud')}
                    className={`flex-1 py-1 text-center border-b-2 ${
                      devTab === 'cloud'
                        ? 'border-[#1baca6] text-white font-bold'
                        : 'border-transparent text-[#666666]'
                    }`}
                  >
                    Облачная БД
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevTab('auth0')}
                    className={`flex-1 py-1 text-center border-b-2 ${
                      devTab === 'auth0'
                        ? 'border-[#1baca6] text-white font-bold'
                        : 'border-transparent text-[#666666]'
                    }`}
                  >
                    Auth0 SSO
                  </button>
                </div>

                {devTab === 'cloud' && (
                  <form onSubmit={handleSaveCloudConfig} className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#888888]">Статус подключения:</span>
                      <span className={cloudDatabase.isConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {cloudDatabase.isConnected ? 'Подключено' : 'Ожидание ключей'}
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#777777] uppercase block mb-1">
                        Провайдер:
                      </label>
                      <select
                        value={cloudProvider}
                        onChange={(e) => setCloudProvider(e.target.value as CloudConfig['provider'])}
                        className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#EDEDED] font-mono"
                      >
                        <option value="none">Локальный кэш (по умолчанию)</option>
                        <option value="supabase">Supabase (бесплатный PostgreSQL)</option>
                        <option value="firebase">Firebase Realtime Database</option>
                      </select>
                    </div>

                    {cloudProvider === 'supabase' && (
                      <>
                        <div>
                          <label className="text-[10px] text-[#777777] uppercase block mb-0.5">
                            Supabase URL:
                          </label>
                          <input
                            type="text"
                            value={supabaseUrl}
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            placeholder="https://xyz.supabase.co"
                            className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#EDEDED] font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#777777] uppercase block mb-0.5">
                            Supabase Anon Key:
                          </label>
                          <input
                            type="password"
                            value={supabaseKey}
                            onChange={(e) => setSupabaseKey(e.target.value)}
                            placeholder="eyJhbGciOi..."
                            className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#EDEDED] font-mono"
                          />
                        </div>
                      </>
                    )}

                    {cloudProvider === 'firebase' && (
                      <div>
                        <label className="text-[10px] text-[#777777] uppercase block mb-0.5">
                          Firebase Realtime DB URL:
                        </label>
                        <input
                          type="text"
                          value={firebaseUrl}
                          onChange={(e) => setFirebaseUrl(e.target.value)}
                          placeholder="https://xyz-default-rtdb.firebaseio.com"
                          className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#EDEDED] font-mono"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-[#1baca6] text-black font-bold rounded text-xs"
                      >
                        Сохранить БД
                      </button>
                      <button
                        type="button"
                        onClick={handleSyncCloudNow}
                        disabled={isSyncing}
                        className="px-3 py-1.5 bg-[#202020] border border-[#333333] text-zinc-300 rounded text-xs flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>Синхронизировать</span>
                      </button>
                    </div>

                    {syncStatus && (
                      <span className="text-[10px] text-emerald-400 block text-center mt-1">
                        {syncStatus}
                      </span>
                    )}
                  </form>
                )}

                {devTab === 'auth0' && (
                  <form onSubmit={handleSaveAuth0} className="space-y-2.5 pt-1">
                    <p className="text-[10px] text-[#777777] leading-relaxed">
                      Чтобы включить вход через Google/GitHub/Email на Auth0.com: создай бесплатное SPA-приложение и скопируй сюда Domain и Client ID.
                    </p>
                    <div>
                      <label className="text-[10px] text-[#777777] uppercase block mb-0.5">
                        Domain:
                      </label>
                      <input
                        type="text"
                        value={auth0Domain}
                        onChange={(e) => setAuth0Domain(e.target.value)}
                        placeholder="dev-xyz.us.auth0.com"
                        className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#EDEDED] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#777777] uppercase block mb-0.5">
                        Client ID:
                      </label>
                      <input
                        type="text"
                        value={auth0ClientId}
                        onChange={(e) => setAuth0ClientId(e.target.value)}
                        placeholder="Ваш Client ID"
                        className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1 text-xs text-[#EDEDED] font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-[#EDEDED] text-black font-bold rounded text-xs"
                    >
                      Сохранить Auth0
                    </button>
                    {auth0Saved && (
                      <span className="text-[10px] text-emerald-400 block text-center">
                        Сохранено! Перезагрузка...
                      </span>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
