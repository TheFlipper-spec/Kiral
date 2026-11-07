import React, { useState, useEffect } from 'react';
import { Upload, RotateCcw, BookOpen, Swords, Users, Trophy, User, Download, GraduationCap, Undo2 } from 'lucide-react';
import { AI_DIFFICULTIES } from '../types/chess';
import type { UserProfile } from '../services/userService';
import type { ScoreDeltaData } from './ScoreDeltaNotification';

export type GameMode = 'review' | 'vs-ai' | 'pvp' | 'puzzles' | 'ranked' | 'learn';

interface HeaderProps {
  gameMode: GameMode;
  onChangeMode: (mode: GameMode) => void;
  playerColor: 'w' | 'b';
  onChangePlayerColor: (color: 'w' | 'b') => void;
  aiDifficultyId: string;
  onChangeAiDifficulty: (difficultyId: string) => void;
  onOpenLoadModal: () => void;
  onReset: () => void;
  isEngineReady: boolean;
  gameTitle?: string;
  isAiThinking?: boolean;
  currentUser?: UserProfile;
  scoreDelta?: ScoreDeltaData | null;
  isCloudConnected?: boolean;
  onOpenLeaderboard: () => void;
  onOpenFriends?: () => void;
  onOpenMyProfile?: () => void;
  onOpenAuth: () => void;
  canUndoMove?: boolean;
  onUndoMove?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gameMode,
  onChangeMode,
  playerColor,
  onChangePlayerColor,
  aiDifficultyId,
  onChangeAiDifficulty,
  onOpenLoadModal,
  onReset,
  isEngineReady,
  isAiThinking,
  currentUser,
  scoreDelta,
  onOpenLeaderboard,
  onOpenAuth,
  canUndoMove = false,
  onUndoMove
}) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const res = await installPrompt.userChoice;
      if (res.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      alert('Чтобы скачать сайт как приложение:\n• На Android: нажмите меню браузера (⋮) -> «Установить приложение»\n• На iPhone/iPad: нажмите «Поделиться» (квадрат со стрелкой) -> «На экран «Домой»»\n• На ПК в Chrome: значок установки в адресной строке справа');
    }
  };

  const renderModeButtons = (isMobileBar = false) => (
    <div
      className={
        isMobileBar
          ? 'flex md:hidden landscape:hidden items-center justify-between bg-[#0E0E0E] border-t border-[#1F1F1F] px-1.5 py-1 gap-0.5 w-full'
          : 'hidden md:flex landscape:flex items-center bg-[#141414] border border-[#262626] rounded-md p-0.5 shrink-0'
      }
    >
      <button
        onClick={() => onChangeMode('review')}
        className={`${isMobileBar ? 'flex-1 justify-center px-1 py-1 text-[11px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-1 whitespace-nowrap transition-colors ${
          gameMode === 'review'
            ? 'bg-[#222222] text-[#EDEDED] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
      >
        <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" strokeWidth={1.5} />
        <span>Разбор</span>
      </button>
      <button
        onClick={() => onChangeMode('ranked')}
        className={`${isMobileBar ? 'flex-1 justify-center px-1 py-1 text-[11px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-1 whitespace-nowrap transition-colors ${
          gameMode === 'ranked'
            ? 'bg-[#222222] text-[#f0c15c] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
        title="Соревновательный режим: матчмейкинг онлайн или рейтинговый ИИ"
      >
        <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#f0c15c] shrink-0" strokeWidth={1.5} />
        <span>Рейтинг</span>
      </button>
      <button
        onClick={() => onChangeMode('vs-ai')}
        className={`${isMobileBar ? 'flex-1 justify-center px-1 py-1 text-[11px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-1 whitespace-nowrap transition-colors ${
          gameMode === 'vs-ai'
            ? 'bg-[#222222] text-[#1baca6] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
      >
        <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" strokeWidth={1.5} />
        <span className="hidden lg:inline">Тренировка</span>
        <span className="lg:hidden">ИИ</span>
      </button>
      <button
        onClick={() => onChangeMode('pvp')}
        className={`${isMobileBar ? 'flex-1 justify-center px-1 py-1 text-[11px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-1 whitespace-nowrap transition-colors ${
          gameMode === 'pvp'
            ? 'bg-[#222222] text-[#5c8bb0] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
      >
        <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" strokeWidth={1.5} />
        <span>1 на 1</span>
      </button>
      <button
        onClick={() => onChangeMode('learn')}
        className={`${isMobileBar ? 'flex-1 justify-center px-1 py-1 text-[11px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-1 whitespace-nowrap transition-colors ${
          gameMode === 'learn' || gameMode === 'puzzles'
            ? 'bg-[#222222] text-[#96bc4b] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
        title="Обучение: Тактические задачи и Школа дебютов"
      >
        <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" strokeWidth={1.5} />
        <span>Обучение</span>
      </button>
    </div>
  );

  return (
    <header className="border-b border-[#262626] bg-[#0A0A0A] flex flex-col select-none shrink-0 z-30">
      <div className="h-11 md:h-12 px-2 sm:px-3.5 flex items-center justify-between gap-2 w-full">
        {/* Brand & Mode Selector */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="font-mono text-sm sm:text-base font-bold tracking-tight text-[#EDEDED]">
              KIRAL
            </span>
            <span className="text-[10px] font-mono text-[#666666] tracking-wider uppercase hidden xl:inline whitespace-nowrap">
              Chess Platform
            </span>
          </div>

          <div className="hidden md:block landscape:block h-3.5 w-[1px] bg-[#262626] shrink-0" />

          {renderModeButtons(false)}

          {/* Engine status indicator */}
          <div
            className="hidden 2xl:flex items-center gap-1.5 text-[11px] font-mono whitespace-nowrap shrink-0"
            title={isEngineReady ? 'Stockfish Worker готов' : 'Инициализация...'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isAiThinking
                  ? 'bg-[#1baca6] animate-pulse'
                  : isEngineReady
                  ? 'bg-[#96bc4b]'
                  : 'bg-[#f0c15c] animate-pulse'
              }`}
            />
            <span className="text-[#777777]">Stockfish 10</span>
          </div>
        </div>

        {/* Right: Mode-specific actions & Global User Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {gameMode === 'vs-ai' && (
            <>
              <div className="flex items-center bg-[#141414] border border-[#262626] rounded-md p-0.5 text-[11px] font-mono shrink-0">
                <button
                  onClick={() => onChangePlayerColor('w')}
                  className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap ${
                    playerColor === 'w'
                      ? 'bg-[#E5E5E5] text-[#0A0A0A] font-bold'
                      : 'text-[#888888] hover:text-[#EDEDED]'
                  }`}
                  title="Играть белыми"
                >
                  Бел
                </button>
                <button
                  onClick={() => onChangePlayerColor('b')}
                  className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap ${
                    playerColor === 'b'
                      ? 'bg-[#333333] text-[#EDEDED] font-bold'
                      : 'text-[#888888] hover:text-[#EDEDED]'
                  }`}
                  title="Играть черными"
                >
                  Чер
                </button>
              </div>

              <div className="flex items-center bg-[#141414] border border-[#262626] rounded-md px-1.5 py-0.5 text-[11px] font-mono shrink-0">
                <select
                  value={aiDifficultyId}
                  onChange={(e) => onChangeAiDifficulty(e.target.value)}
                  className="bg-transparent text-[#1baca6] font-semibold focus:outline-none cursor-pointer py-0.5 text-[11px] max-w-[110px] sm:max-w-none"
                >
                  {AI_DIFFICULTIES.map((d) => (
                    <option key={d.id} value={d.id} className="bg-[#141414] text-[#EDEDED]">
                      {d.name} (~{d.eloApprox})
                    </option>
                  ))}
                </select>
              </div>

              {onUndoMove && (
                <button
                  onClick={onUndoMove}
                  disabled={!canUndoMove}
                  className="p-1.5 sm:px-2 sm:py-1 rounded text-xs font-mono text-[#f0c15c] hover:text-[#ffd875] bg-[#161616] border border-[#262626] hover:bg-[#202020] disabled:opacity-35 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                  title="Отменить ход (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="hidden xl:inline">Отмена</span>
                </button>
              )}

              <button
                onClick={onReset}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded text-xs font-mono text-[#CCCCCC] hover:text-white bg-[#161616] border border-[#262626] hover:bg-[#202020] transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                title="Начать новую партию против ИИ"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="hidden lg:inline">Заново</span>
              </button>
            </>
          )}

          {gameMode === 'ranked' && (
            <button
              onClick={onReset}
              className="px-2.5 py-1 rounded text-xs font-mono font-semibold text-[#0A0A0A] bg-[#f0c15c] hover:bg-[#f5ce78] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Найти нового соперника по рейтингу"
            >
              <Swords className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Поиск игры</span>
            </button>
          )}

          {gameMode === 'pvp' && (
            <>
              {onUndoMove && (
                <button
                  onClick={onUndoMove}
                  disabled={!canUndoMove}
                  className="p-1.5 sm:px-2 sm:py-1 rounded text-xs font-mono text-[#f0c15c] hover:text-[#ffd875] bg-[#161616] border border-[#262626] hover:bg-[#202020] disabled:opacity-35 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                  title="Отменить ход (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Отмена</span>
                </button>
              )}
              <button
                onClick={onReset}
                className="px-2 py-1 rounded text-xs font-mono text-[#CCCCCC] hover:text-white bg-[#161616] border border-[#262626] hover:bg-[#202020] transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                title="Начать новую партию 1 на 1"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">Заново</span>
              </button>
            </>
          )}

          {gameMode === 'puzzles' && (
            <button
              onClick={onReset}
              className="px-2 py-1 rounded text-xs font-mono text-[#CCCCCC] hover:text-white bg-[#161616] border border-[#262626] hover:bg-[#202020] transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              title="Загрузить случайную задачу"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Следующая</span>
            </button>
          )}

          {gameMode === 'review' && (
            <>
              {onUndoMove && (
                <button
                  onClick={onUndoMove}
                  disabled={!canUndoMove}
                  className="hidden sm:flex p-1.5 sm:px-2 sm:py-1 rounded text-xs font-mono text-[#f0c15c] hover:text-[#ffd875] hover:bg-[#161616] border border-[#222222] disabled:opacity-35 transition-colors items-center gap-1 whitespace-nowrap shrink-0"
                  title="Отменить ход (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="hidden xl:inline">Отмена</span>
                </button>
              )}
              <button
                onClick={onReset}
                className="p-1.5 sm:px-2 sm:py-1 rounded text-xs font-mono text-[#888888] hover:text-[#EDEDED] hover:bg-[#161616] border border-[#222222] transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                title="Сбросить к началу партии"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="hidden xl:inline">Сброс</span>
              </button>

              <button
                onClick={onOpenLoadModal}
                className="px-2 sm:px-2.5 py-1 rounded bg-[#EDEDED] text-[#0A0A0A] hover:bg-white text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="hidden sm:inline">Загрузить PGN</span>
                <span className="sm:hidden">PGN</span>
              </button>
            </>
          )}

          <div className="h-4 w-[1px] bg-[#262626] hidden sm:block shrink-0" />

          {/* Install PWA App button */}
          <button
            onClick={handleInstallClick}
            className="p-1.5 sm:px-2 sm:py-1 rounded text-[#CCCCCC] hover:text-[#1baca6] hover:bg-[#1C1C1C] border border-[#262626] transition-colors flex items-center gap-1 text-xs font-mono whitespace-nowrap shrink-0"
            title="Скачать / установить сайт как приложение"
          >
            <Download className="w-3.5 h-3.5 text-[#1baca6]" strokeWidth={1.5} />
            <span className="hidden 2xl:inline">Приложение</span>
          </button>

          {/* Leaderboard button */}
          <button
            onClick={onOpenLeaderboard}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded text-[#CCCCCC] hover:text-[#f0c15c] hover:bg-[#1C1C1C] border border-[#262626] transition-colors flex items-center gap-1.5 text-xs font-mono whitespace-nowrap shrink-0"
            title="Таблица лидеров (Топ по задачам и Эло)"
          >
            <Trophy className="w-3.5 h-3.5 text-[#f0c15c]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Топ</span>
          </button>

          {/* User profile button with floating score delta animation */}
          {currentUser && (
            <div className="relative shrink-0">
              {scoreDelta && (
                <div
                  key={scoreDelta.id}
                  className={`absolute -top-7 right-0 pointer-events-none z-50 px-2 py-0.5 rounded text-[11px] font-mono font-bold border shadow-lg animate-delta-float whitespace-nowrap ${
                    scoreDelta.type === 'puzzle'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                      : scoreDelta.isPositive
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : scoreDelta.isNeutral
                      ? 'bg-zinc-900 text-zinc-300 border-zinc-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  {scoreDelta.type === 'puzzle'
                    ? `+${scoreDelta.delta} б.`
                    : scoreDelta.isPositive
                    ? `+${scoreDelta.delta} ELO`
                    : scoreDelta.isNeutral
                    ? `0 ELO`
                    : `${scoreDelta.delta} ELO`}
                </div>
              )}

              <button
                onClick={onOpenAuth}
                className={`px-2 py-1 rounded bg-[#161616] hover:bg-[#202020] border transition-all flex items-center gap-1.5 text-xs font-mono whitespace-nowrap ${
                  scoreDelta
                    ? scoreDelta.isPositive || scoreDelta.type === 'puzzle'
                      ? 'border-emerald-600/80 shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                      : 'border-rose-600/80'
                    : 'border-[#262626]'
                }`}
                title="Вход / Регистрация и настройки аккаунта"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    className="w-4 h-4 rounded-full border border-white/20 object-cover shrink-0"
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-[#1baca6] shrink-0" strokeWidth={1.5} />
                )}
                <span className="font-semibold text-white truncate max-w-[68px] sm:max-w-[100px]">
                  {currentUser.username}
                </span>
                <span className="px-1 py-0.2 rounded bg-[#1baca6]/20 text-[#1baca6] font-bold text-[10px]">
                  {currentUser.elo}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Portrait Mode Selector Bar */}
      {renderModeButtons(true)}
    </header>
  );
};
