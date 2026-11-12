import React from 'react';
import { BookOpen, Swords, Users, Trophy, User, GraduationCap, Activity, Home } from 'lucide-react';
import { AI_DIFFICULTIES } from '../types/chess';
import type { UserProfile } from '../services/userService';
import { CountryFlag } from './CountryFlag';
import type { ScoreDeltaData } from './ScoreDeltaNotification';

export type GameMode = 'home' | 'review' | 'vs-ai' | 'pvp' | 'puzzles' | 'ranked' | 'learn';

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
  isAnalysisEnabled?: boolean;
  onToggleAnalysis?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gameMode,
  onChangeMode,
  playerColor,
  onChangePlayerColor,
  aiDifficultyId,
  onChangeAiDifficulty,
  onReset,
  isEngineReady,
  isAiThinking,
  currentUser,
  scoreDelta,
  onOpenLeaderboard,
  onOpenAuth,
  isAnalysisEnabled = true,
  onToggleAnalysis
}) => {

  const renderModeButtons = (isMobileBar = false) => (
    <div
      className={
        isMobileBar
          ? 'grid grid-cols-6 items-center bg-[#0E0E0E] border-t border-[#1F1F1F] px-1 py-1 gap-1 w-full'
          : 'hidden md:flex landscape:flex items-center bg-[#141414] border border-[#262626] rounded-md p-0.5 shrink-0'
      }
    >
      <button
        onClick={() => onChangeMode('home')}
        className={`${isMobileBar ? 'min-h-[42px] flex-col justify-center px-1 py-1 text-[10px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-0.5 sm:gap-1 transition-all active:scale-95 ${
          gameMode === 'home'
            ? 'bg-[#222222] text-[#1baca6] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
        title="Главная страница Kiral"
      >
        <Home className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
        <span className="truncate">Главная</span>
      </button>
      <button
        onClick={() => onChangeMode('review')}
        className={`${isMobileBar ? 'min-h-[42px] flex-col justify-center px-1 py-1 text-[10px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-0.5 sm:gap-1 transition-all active:scale-95 ${
          gameMode === 'review'
            ? 'bg-[#222222] text-[#EDEDED] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
        title="Анализ и разбор партий"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
        <span className="truncate">Разбор</span>
      </button>
      <button
        onClick={() => onChangeMode('ranked')}
        className={`${isMobileBar ? 'min-h-[42px] flex-col justify-center px-1 py-1 text-[10px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-0.5 sm:gap-1 transition-all active:scale-95 ${
          gameMode === 'ranked'
            ? 'bg-[#222222] text-[#f0c15c] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
        title="Соревновательный режим: матчмейкинг онлайн или рейтинговый ИИ"
      >
        <Trophy className="w-3.5 h-3.5 text-[#f0c15c] shrink-0" strokeWidth={1.5} />
        <span className="truncate">Рейтинг</span>
      </button>
      <button
        onClick={() => onChangeMode('vs-ai')}
        className={`${isMobileBar ? 'min-h-[42px] flex-col justify-center px-1 py-1 text-[10px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-0.5 sm:gap-1 transition-all active:scale-95 ${
          gameMode === 'vs-ai'
            ? 'bg-[#222222] text-[#1baca6] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
        title="Тренировочная игра против Stockfish"
      >
        <Swords className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
        <span className="truncate">ИИ</span>
      </button>
      <button
        onClick={() => onChangeMode('pvp')}
        className={`${isMobileBar ? 'min-h-[42px] flex-col justify-center px-1 py-1 text-[10px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-0.5 sm:gap-1 transition-all active:scale-95 ${
          gameMode === 'pvp'
            ? 'bg-[#222222] text-[#5c8bb0] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
        title="Игра вдвоем на одном устройстве"
      >
        <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
        <span className="truncate">1 на 1</span>
      </button>
      <button
        onClick={() => onChangeMode('learn')}
        className={`${isMobileBar ? 'min-h-[42px] flex-col justify-center px-1 py-1 text-[10px]' : 'px-2 py-1 text-xs'} rounded font-mono flex items-center gap-0.5 sm:gap-1 transition-all active:scale-95 ${
          gameMode === 'learn' || gameMode === 'puzzles'
            ? 'bg-[#222222] text-[#96bc4b] font-semibold'
            : 'text-[#777777] hover:text-[#CCCCCC]'
        }`}
        title="Обучение: Тактические задачи и Школа дебютов"
      >
        <GraduationCap className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
        <span className="truncate">Учёба</span>
      </button>
    </div>
  );

  return (
    <header className="border-b border-[#262626] bg-[#0A0A0A] flex flex-col select-none shrink-0 z-30">
      <div className="h-11 md:h-12 px-2 sm:px-3.5 flex items-center justify-between gap-2 w-full">
        {/* Brand & Mode Selector */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => onChangeMode('home')}
            className="flex items-baseline gap-1.5 shrink-0 cursor-pointer group text-left"
            title="На главную страницу"
          >
            <span className="font-mono text-sm sm:text-base font-bold tracking-tight text-[#EDEDED] group-hover:text-[#1baca6] transition-colors">
              KIRAL
            </span>
            <span className="text-[10px] font-mono text-[#666666] tracking-wider uppercase hidden xl:inline whitespace-nowrap">
              Chess Platform
            </span>
          </button>

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

              <div className="flex items-center bg-[#141414] border border-[#262626] rounded-md px-1 sm:px-1.5 py-0.5 text-[11px] font-mono shrink-0">
                <select
                  value={aiDifficultyId}
                  onChange={(e) => onChangeAiDifficulty(e.target.value)}
                  className="bg-transparent text-[#1baca6] font-semibold focus:outline-none cursor-pointer py-0.5 text-[11px] max-w-[50px] sm:max-w-none text-center"
                  title="Уровень сложности ИИ (ELO)"
                >
                  {AI_DIFFICULTIES.map((d) => (
                    <option key={d.id} value={d.id} className="bg-[#141414] text-[#EDEDED]" title={`${d.name} (${d.eloApprox} ELO)`}>
                      {d.eloApprox}
                    </option>
                  ))}
                </select>
              </div>
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

          {/* Master Analysis Switch (Permanently visible on PC & Mobile) */}
          {onToggleAnalysis && gameMode !== 'ranked' && (
            <button
              onClick={onToggleAnalysis}
              className={`min-h-[36px] sm:min-h-[38px] px-2 sm:px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 border active:scale-95 ${
                isAnalysisEnabled
                  ? 'bg-[#1baca6]/15 text-[#1baca6] border-[#1baca6]/60 hover:bg-[#1baca6]/25 font-bold shadow-sm'
                  : 'bg-[#141414] text-[#777777] border-[#2a2a2a] hover:text-[#CCCCCC]'
              }`}
              title={isAnalysisEnabled ? 'Анализ ходов включен (нажмите для выключения)' : 'Анализ ходов выключен (нажмите для включения)'}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span className="hidden sm:inline">{isAnalysisEnabled ? 'Анализ: Вкл' : 'Анализ: Выкл'}</span>
            </button>
          )}

          {/* Leaderboard button */}
          <button
            onClick={onOpenLeaderboard}
            className="min-h-[36px] sm:min-h-[38px] px-2 sm:px-2.5 py-1 rounded text-[#CCCCCC] hover:text-[#f0c15c] hover:bg-[#1C1C1C] border border-[#262626] transition-all flex items-center gap-1.5 text-xs font-mono whitespace-nowrap shrink-0 active:scale-95 shadow-sm"
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
                  className={`absolute -top-7 right-0 pointer-events-none z-50 px-2 py-0.5 rounded text-[11px] font-mono font-bold border shadow-sm animate-delta-float whitespace-nowrap ${
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
                className={`min-h-[36px] sm:min-h-[38px] px-1.5 sm:px-2 py-1 rounded bg-[#161616] hover:bg-[#202020] border transition-all flex items-center gap-1 sm:gap-1.5 text-xs font-mono whitespace-nowrap active:scale-95 ${
                  scoreDelta
                    ? scoreDelta.isPositive || scoreDelta.type === 'puzzle'
                      ? 'border-emerald-600/80 shadow-sm'
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
                {currentUser.country && (
                  <CountryFlag code={currentUser.country} className="w-4 h-3 shrink-0" />
                )}
                <span className="font-semibold text-white truncate max-w-[55px] sm:max-w-[100px]">
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
