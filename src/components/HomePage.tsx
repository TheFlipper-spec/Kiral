import React, { useState, useEffect } from 'react';
import { QueenParticleCanvas } from './QueenParticleCanvas';
import {
  Trophy,
  Swords,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { userService } from '../services/userService';
import type { UserProfile } from '../services/userService';
import { CountryFlag } from './CountryFlag';
import { AI_DIFFICULTIES } from '../types/chess';
import type { PlayedMatchRecord } from '../types/chess';

interface HomePageProps {
  onStartVsAi: (difficultyId: string) => void;
  onStartRanked: () => void;
  onOpenReview: () => void;
  onOpenLearn: () => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onChallengePlayer: (user: UserProfile) => void;
  onLoadHistoryMatch: (match: PlayedMatchRecord, openMistakes?: boolean) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onStartVsAi,
  onStartRanked,
  onOpenReview,
  onOpenLearn,
  currentUser,
  onSelectUser,
  onChallengePlayer,
  onLoadHistoryMatch
}) => {
  const [leaderboardTab, setLeaderboardTab] = useState<'elo' | 'puzzles' | 'history'>('elo');
  const [selectedAiDifficulty, setSelectedAiDifficulty] = useState<string>('casual');
  const [eloList, setEloList] = useState<UserProfile[]>([]);
  const [puzzlesList, setPuzzlesList] = useState<UserProfile[]>([]);
  const [matchHistory, setMatchHistory] = useState<PlayedMatchRecord[]>([]);

  useEffect(() => {
    setEloList(userService.getEloLeaderboard());
    setPuzzlesList(userService.getPuzzlesLeaderboard());
    setMatchHistory(userService.getMatchHistory());

    userService.refreshFromCloud().then(() => {
      setEloList(userService.getEloLeaderboard());
      setPuzzlesList(userService.getPuzzlesLeaderboard());
      setMatchHistory(userService.getMatchHistory());
    }).catch(() => {});
  }, []);

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto bg-[#070709] text-[#EDEDED] font-sans selection:bg-[#1baca6] selection:text-black">
      {/* Background Tech Grid Matrix */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]"
      />

      <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-7 flex flex-col gap-6 relative z-10">
        {/* Top Digital Platform Announcement Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#0F1115] border border-[#1E232D] shadow-sm text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1baca6] animate-pulse" />
            <span className="text-[#1baca6] font-bold uppercase tracking-wider text-[11px]">Kiral Engine v2.4</span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden sm:inline">Stockfish 19 & Silero Speech Pipeline</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Честная игра (Античит)</span>
            </div>
            <div className="flex items-center gap-1.5 hidden md:flex">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>WASM Stockfish 3600 ELO</span>
            </div>
          </div>
        </div>

        {/* Main Grid: Hero Showcase + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1.15fr_460px] gap-6 items-start">
          
          {/* Left Column: Hero Showcase & Action Launchers */}
          <div className="flex flex-col gap-6">
            
            {/* Hero Banner with 3D Rotating Particle Queen */}
            <div className="relative rounded-2xl bg-gradient-to-b from-[#0F1318] to-[#0A0D11] border border-[#1F2633] overflow-hidden p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              {/* Background radial glow */}
              <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#1baca6]/10 blur-3xl rounded-full pointer-events-none" />

              {/* Text Info */}
              <div className="flex-1 flex flex-col items-start gap-3 z-10 max-w-lg">
                <div className="px-2.5 py-0.5 rounded-full bg-[#1baca6]/15 border border-[#1baca6]/30 text-[#1baca6] text-[10px] font-mono font-bold uppercase tracking-widest">
                  Digital Chess Platform
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-mono font-extrabold tracking-tight text-white leading-none">
                  KIRAL <span className="text-[#1baca6]">CHESS</span>
                </h1>

                <p className="text-zinc-300 text-xs sm:text-sm font-sans leading-relaxed">
                  Профессиональная платформа для игры, рейтинговых дуэлей и глубокого разбора партий с встроенным ИИ, естественной озвучкой и точностью CAPS.
                </p>

                {/* Primary Fast CTA Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 w-full sm:w-auto">
                  <button
                    onClick={onStartRanked}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#f0c15c] hover:bg-[#f6ce76] text-black font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-black" />
                    <span>В бой по рейтингу</span>
                  </button>

                  <button
                    onClick={() => onStartVsAi(selectedAiDifficulty)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#1baca6] hover:bg-[#20c2bc] text-black font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    <Swords className="w-4 h-4 text-black" />
                    <span>Играть с ИИ</span>
                  </button>
                </div>
              </div>

              {/* 3D Rotating Particle Queen Visual */}
              <div className="relative shrink-0 flex items-center justify-center">
                <QueenParticleCanvas />
              </div>
            </div>

            {/* Mode Launcher Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Card 1: Ranked Matchmaking */}
              <div
                onClick={onStartRanked}
                className="group relative p-4 rounded-xl bg-[#0D1014] hover:bg-[#12161C] border border-[#1D232E] hover:border-[#f0c15c]/50 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-[#f0c15c]/10 border border-[#f0c15c]/30 flex items-center justify-center text-[#f0c15c] group-hover:scale-110 transition-transform">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    PvP 1 на 1
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-sm font-mono font-bold text-white group-hover:text-[#f0c15c] transition-colors flex items-center gap-1.5">
                    <span>Рейтинговый матч</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Подбор соперника по уровню ELO, соревновательные часы и чистая честная игра без подсказок.
                  </p>
                </div>
              </div>

              {/* Card 2: AI Training */}
              <div className="p-4 rounded-xl bg-[#0D1014] border border-[#1D232E] flex flex-col justify-between shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-[#1baca6]/10 border border-[#1baca6]/30 flex items-center justify-center text-[#1baca6]">
                    <Swords className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    Stockfish 19
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-sm font-mono font-bold text-white">
                    Тренировка с ИИ
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Спарринг с движком нужной сложности от новичка до гроссмейстера:
                  </p>

                  <div className="mt-2.5 flex items-center gap-1.5">
                    <select
                      value={selectedAiDifficulty}
                      onChange={(e) => setSelectedAiDifficulty(e.target.value)}
                      className="flex-1 bg-[#151920] border border-[#262E3D] rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-[#1baca6] focus:outline-none cursor-pointer"
                    >
                      {AI_DIFFICULTIES.map((d) => (
                        <option key={d.id} value={d.id} className="bg-[#141414] text-white">
                          {d.name} ({d.eloApprox} ELO)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => onStartVsAi(selectedAiDifficulty)}
                      className="px-3 py-1.5 rounded-lg bg-[#1baca6] hover:bg-[#20c2bc] text-black font-mono font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Старт</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: Game Review & Analysis */}
              <div
                onClick={onOpenReview}
                className="group relative p-4 rounded-xl bg-[#0D1014] hover:bg-[#12161C] border border-[#1D232E] hover:border-purple-500/50 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    Разбор партии
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-sm font-mono font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    <span>Анализ и ошибки</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Глубокий разбор, расчет точности CAPS, зевки, график преимущества и голосовой тренер.
                  </p>
                </div>
              </div>

              {/* Card 4: Learning & Puzzles */}
              <div
                onClick={onOpenLearn}
                className="group relative p-4 rounded-xl bg-[#0D1014] hover:bg-[#12161C] border border-[#1D232E] hover:border-[#96bc4b]/50 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-[#96bc4b]/10 border border-[#96bc4b]/30 flex items-center justify-center text-[#96bc4b] group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    Обучение
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-sm font-mono font-bold text-white group-hover:text-[#96bc4b] transition-colors flex items-center gap-1.5">
                    <span>Задачи и дебюты</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Сотни тактических задач по уровням сложности и пошаговая интерактивная школа дебютов.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Embedded Live Leaderboard */}
          <div className="bg-[#0C0F13] border border-[#1E2430] rounded-2xl flex flex-col overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-[#1A202A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#f0c15c]" />
                <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Таблица лидеров
                </h2>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-[#13171F] p-0.5 rounded-lg border border-[#232B39]">
                <button
                  onClick={() => setLeaderboardTab('elo')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                    leaderboardTab === 'elo'
                      ? 'bg-[#1baca6] text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Эло
                </button>
                <button
                  onClick={() => setLeaderboardTab('puzzles')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                    leaderboardTab === 'puzzles'
                      ? 'bg-[#96bc4b] text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Задачи
                </button>
                <button
                  onClick={() => setLeaderboardTab('history')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                    leaderboardTab === 'history'
                      ? 'bg-[#5c8bb0] text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  История
                </button>
              </div>
            </div>

            {/* Leaderboard Rows List */}
            <div className="p-3 sm:p-4 flex-1 overflow-y-auto max-h-[520px] space-y-1.5 font-mono text-xs">
              {leaderboardTab === 'elo' && (
                eloList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                    Загрузка игроков...
                  </div>
                ) : (
                  eloList.map((user, idx) => {
                    const isCurrent = user.id === currentUser.id;
                    return (
                      <div
                        key={user.id}
                        onClick={() => onSelectUser(user)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#152321] border-[#1baca6]/50 text-white'
                            : 'bg-[#11141A] border-[#1D232E] text-zinc-300 hover:border-[#1baca6]/30 hover:bg-[#151922]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Rank badge */}
                          <span className="w-5 text-center font-bold">
                            {idx === 0 ? (
                              <span className="w-5 h-5 rounded-full inline-flex items-center justify-center bg-[#f0c15c] text-black text-[10px]">1</span>
                            ) : idx === 1 ? (
                              <span className="w-5 h-5 rounded-full inline-flex items-center justify-center bg-zinc-300 text-black text-[10px]">2</span>
                            ) : idx === 2 ? (
                              <span className="w-5 h-5 rounded-full inline-flex items-center justify-center bg-amber-700 text-white text-[10px]">3</span>
                            ) : (
                              <span className="text-zinc-500">{idx + 1}</span>
                            )}
                          </span>

                          {/* Country Flag & Avatar */}
                          {user.country && (
                            <CountryFlag code={user.country} className="w-4 h-3 shrink-0" />
                          )}

                          <span className="font-semibold text-white truncate max-w-[110px] sm:max-w-[140px]">
                            {user.username}
                          </span>

                          {isCurrent && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#1baca6]/20 text-[#1baca6] font-bold">
                              ВЫ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-[#1baca6] whitespace-nowrap">
                            {user.elo} <span className="text-[10px] text-zinc-500">ELO</span>
                          </span>

                          {!isCurrent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onChallengePlayer(user);
                              }}
                              className="px-2 py-0.5 rounded bg-[#1A212D] hover:bg-[#253042] border border-[#2F3C52] text-[10px] font-bold text-amber-300 transition-colors"
                              title="Вызвать игрока на рейтинговую партию"
                            >
                              Вызов
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              )}

              {leaderboardTab === 'puzzles' && (
                puzzlesList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                    Решайте задачи, чтобы появиться в топе!
                  </div>
                ) : (
                  puzzlesList.map((user, idx) => {
                    const isCurrent = user.id === currentUser.id;
                    return (
                      <div
                        key={user.id}
                        onClick={() => onSelectUser(user)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#182315] border-[#96bc4b]/50 text-white'
                            : 'bg-[#11141A] border-[#1D232E] text-zinc-300 hover:border-[#96bc4b]/30 hover:bg-[#151922]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-center font-bold text-zinc-500">
                            {idx + 1}
                          </span>
                          {user.country && (
                            <CountryFlag code={user.country} className="w-4 h-3 shrink-0" />
                          )}
                          <span className="font-semibold text-white truncate max-w-[130px]">
                            {user.username}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#96bc4b]/20 text-[#96bc4b] font-bold">
                              ВЫ
                            </span>
                          )}
                        </div>

                        <span className="font-bold text-[#96bc4b]">
                          {user.puzzlePoints} <span className="text-[10px] text-zinc-500">б.</span>
                        </span>
                      </div>
                    );
                  })
                )
              )}

              {leaderboardTab === 'history' && (
                matchHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                    История партий пока пуста.
                  </div>
                ) : (
                  matchHistory.slice(0, 15).map((m) => {
                    const isWin = m.result === 'win';
                    const isLoss = m.result === 'loss';
                    return (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl bg-[#11141A] border border-[#1D232E] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isWin
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                                : isLoss
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {isWin ? 'Победа' : isLoss ? 'Поражение' : 'Ничья'}
                          </span>
                          <span className="text-white font-semibold truncate max-w-[100px]">
                            vs {m.opponentName}
                          </span>
                        </div>

                        <button
                          onClick={() => onLoadHistoryMatch(m, false)}
                          className="px-2 py-1 rounded bg-[#182126] hover:bg-[#202C33] border border-[#273B45] text-[#1baca6] text-[10px] font-bold transition-colors"
                        >
                          Разбор
                        </button>
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* Bottom Current User Rating Pin */}
            <div className="p-3 bg-[#0A0D11] border-t border-[#1A202A] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0">
                {currentUser.country && (
                  <CountryFlag code={currentUser.country} className="w-4 h-3 shrink-0" />
                )}
                <span className="font-bold text-white truncate max-w-[120px]">
                  {currentUser.username}
                </span>
                <span className="text-[#1baca6] font-bold">{currentUser.elo} ELO</span>
              </div>

              <button
                onClick={() => onSelectUser(currentUser)}
                className="px-2.5 py-1 rounded-lg bg-[#151922] hover:bg-[#1E2430] border border-[#2A3445] text-zinc-300 text-[11px] transition-colors"
              >
                Мой профиль
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
