import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess, Move } from 'chess.js';
import { Header } from './components/Header';
import type { GameMode } from './components/Header';
import { ChessboardArea } from './components/ChessboardArea';
import type { MoveAccentInfo, BoardPlayerBarInfo } from './components/ChessboardArea';
import { AnalysisPanel } from './components/AnalysisPanel';
import { LearnPanel } from './components/LearnPanel';
import { CHESS_OPENINGS } from './data/openings';
import type { ChessOpening } from './data/openings';
import { LoadGameModal } from './components/LoadGameModal';
import { gameAnalyzer, uciToSan } from './engine/gameAnalyzer';
import type { AnalysisProgress } from './engine/gameAnalyzer';
import { stockfish } from './engine/stockfishService';
import { sound } from './services/soundService';
import { SAMPLE_GAMES } from './data/sampleGames';
import { PUZZLES, analyzePuzzleMistake } from './data/puzzles';
import type { PuzzleMistakeAnalysis } from './data/puzzles';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AuthModal } from './components/AuthModal';
import { ScoreDeltaNotification } from './components/ScoreDeltaNotification';
import type { ScoreDeltaData } from './components/ScoreDeltaNotification';
import { MatchmakingModal } from './components/MatchmakingModal';
import { UserProfileModal } from './components/UserProfileModal';
import { multiplayerService } from './services/multiplayerService';
import type { RankedMatchSession, MovePayload, DirectChallengePayload } from './services/multiplayerService';
import { Swords, RotateCw, Handshake } from 'lucide-react';
import { userService } from './services/userService';
import type { UserProfile, ActiveGameSyncData } from './services/userService';
import { cloudDatabase } from './services/cloudDatabase';
import { classifySingleMove, calculatePlayerAccuracy, quickEvaluateFen } from './engine/evalFormulas';
import { detectOpeningNameFromMoves } from './engine/bookMoves';
import { extractPlayerMistakes } from './engine/mistakeReplay';
import { CLASSIFICATION_CONFIGS, AI_DIFFICULTIES, TIME_CONTROLS } from './types/chess';
import type { GameReport, MoveAnalysis, MoveClassification, EngineEvaluation, TimeControlId } from './types/chess';

const STORAGE_ACTIVE_RANKED_MATCH = 'kiral_active_ranked_match_v1';
const INITIAL_RANKED_TIME_SEC = 600; // 10 minutes per player

export const App: React.FC = () => {
  // User profile & leaderboards
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => userService.getCurrentUser());
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'elo' | 'puzzles' | 'friends'>('elo');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);
  const [pendingPostAuthAction, setPendingPostAuthAction] = useState<'ranked' | null>(null);
  const [scoreDelta, setScoreDelta] = useState<ScoreDeltaData | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => cloudDatabase.isConnected);
  const [remoteActiveGamePrompt, setRemoteActiveGamePrompt] = useState<ActiveGameSyncData | null>(null);
  const [incomingDrawOffer, setIncomingDrawOffer] = useState<{ fromUser: string } | null>(null);
  const [isMistakeReplayActive, setIsMistakeReplayActive] = useState<boolean>(false);
  const [mistakeIndex, setMistakeIndex] = useState<number>(0);
  const [mistakeSuccess, setMistakeSuccess] = useState<boolean | null>(null);
  const [mistakePieceHintRevealed, setMistakePieceHintRevealed] = useState<boolean>(false);
  const [mistakeSolutionRevealed, setMistakeSolutionRevealed] = useState<boolean>(false);
  const lastLocalActionTimeRef = useRef<number>(Date.now());
  const aiRequestIdRef = useRef<number>(0);

  useEffect(() => {
    const updateCloud = () => setIsCloudConnected(cloudDatabase.isConnected);
    updateCloud();
    const interval = setInterval(updateCloud, 5000);

    // Subscribe to authoritative user updates from UserService / Supabase
    const unsubUser = userService.subscribe((updated) => {
      setCurrentUser({ ...updated });
    });

    // Window focus & visibility change sync hooks (PC & smartphone synchronization)
    const handleSync = () => {
      userService.refreshFromCloud().then(() => {
        const cur = userService.getCurrentUser();
        setCurrentUser({ ...cur });
      });
    };

    window.addEventListener('focus', handleSync);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      unsubUser();
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Game mode & AI settings
  const [gameMode, setGameMode] = useState<GameMode>('review');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [aiDifficultyId, setAiDifficultyId] = useState<string>('casual');
  const [aiDepth, setAiDepth] = useState<number>(4);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
  const [moveAccent, setMoveAccent] = useState<MoveAccentInfo | null>(null);
  const moveAccentTimerRef = useRef<number | null>(null);

  // Ranked & Multiplayer state + Chess Clocks
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState<boolean>(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserProfile | null>(null);
  const [activeRankedSession, setActiveRankedSession] = useState<RankedMatchSession | null>(null);
  const [activeTimeControlId, setActiveTimeControlId] = useState<TimeControlId>('rapid_10_0');
  const [incomingChallenge, setIncomingChallenge] = useState<DirectChallengePayload | null>(null);
  const [whiteTime, setWhiteTime] = useState<number>(INITIAL_RANKED_TIME_SEC);
  const [blackTime, setBlackTime] = useState<number>(INITIAL_RANKED_TIME_SEC);
  const whiteTimeRef = useRef<number>(whiteTime);
  whiteTimeRef.current = whiteTime;
  const blackTimeRef = useRef<number>(blackTime);
  blackTimeRef.current = blackTime;
  const activeRankedSessionRef = useRef<RankedMatchSession | null>(null);
  activeRankedSessionRef.current = activeRankedSession;

  const activeTimeControl = useMemo(
    () =>
      TIME_CONTROLS.find((t) => t.id === (activeRankedSession?.timeControlId || activeTimeControlId)) ||
      TIME_CONTROLS[2],
    [activeRankedSession?.timeControlId, activeTimeControlId]
  );

  useEffect(() => {
    multiplayerService.setPlayer(currentUser);
    const unsub = multiplayerService.onDirectChallenge((chal) => {
      setIncomingChallenge(chal);
      sound.playCheck();
      sound.speak(`Вызов от игрока ${chal.fromUser.username}!`);
    });
    return () => unsub();
  }, [currentUser]);

  // Puzzle state
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState<number>(0);
  const [puzzleStatus, setPuzzleStatus] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [puzzleStep, setPuzzleStep] = useState<number>(0);
  const [puzzleMistakeAnalysis, setPuzzleMistakeAnalysis] = useState<PuzzleMistakeAnalysis | null>(null);
  const [solvedPuzzlesCount, setSolvedPuzzlesCount] = useState<number>(0);
  const [totalAttemptedPuzzles, setTotalAttemptedPuzzles] = useState<number>(0);
  const [puzzleDifficultyFilter, setPuzzleDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  // Learn / Openings state
  const [activeLearnTab, setActiveLearnTab] = useState<'puzzles' | 'openings'>('puzzles');
  const [currentOpening, setCurrentOpening] = useState<ChessOpening>(CHESS_OPENINGS[0]);
  const [openingStepIndex, setOpeningStepIndex] = useState<number>(0);

  // Board & Review state
  const [currentPgn, setCurrentPgn] = useState<string>(SAMPLE_GAMES[0].pgn);
  const [gameTitle, setGameTitle] = useState<string>(SAMPLE_GAMES[0].title);
  const [fens, setFens] = useState<string[]>([]);
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [report, setReport] = useState<GameReport | null>(null);

  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [isEngineReady, setIsEngineReady] = useState<boolean>(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
  const [analysisDepth, setAnalysisDepth] = useState<number>(14);

  const [isPreviewingLine, setIsPreviewingLine] = useState<boolean>(false);
  const [previewFen, setPreviewFen] = useState<string | null>(null);

  // References for async safety
  const fensRef = useRef<string[]>(fens);
  fensRef.current = fens;
  const currentPlyRef = useRef<number>(currentPly);
  currentPlyRef.current = currentPly;
  const isAiThinkingRef = useRef<boolean>(isAiThinking);
  isAiThinkingRef.current = isAiThinking;
  const gameModeRef = useRef<GameMode>(gameMode);
  gameModeRef.current = gameMode;

  const checkGameOverStatus = (chessInstance: Chess): string | null => {
    if (chessInstance.isCheckmate()) {
      const winner = chessInstance.turn() === 'w' ? 'Черные' : 'Белые';
      return `Мат! Победили ${winner}`;
    }
    if (chessInstance.isStalemate()) {
      return 'Ничья: Пат';
    }
    if (chessInstance.isThreefoldRepetition()) {
      return 'Ничья: Троекратное повторение';
    }
    if (chessInstance.isInsufficientMaterial()) {
      return 'Ничья: Недостаточно материала';
    }
    if (chessInstance.isDraw()) {
      return 'Ничья (правило 50 ходов)';
    }
    return null;
  };

  const loadPgnIntoState = useCallback((pgnString: string, title?: string) => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgnString);
      const moves = chess.history({ verbose: true });

      const replay = new Chess();
      const generatedFens = [replay.fen()];
      for (const m of moves) {
        replay.move(m);
        generatedFens.push(replay.fen());
      }

      setFens(generatedFens);
      setCurrentPly(0);
      setIsPlaying(false);
      setIsPreviewingLine(false);
      setPreviewFen(null);
      setGameOverMessage(null);
      if (title) setGameTitle(title);
      return true;
    } catch (err) {
      console.error('Error parsing PGN:', err);
      return false;
    }
  }, []);

  const runAnalysis = useCallback(
    async (pgnToAnalyze: string, depth = 14) => {
      setIsAnalyzing(true);
      setProgress({
        currentPly: 0,
        totalPlies: 0,
        depth
      });

      try {
        const fullReport = await gameAnalyzer.analyzePgn(pgnToAnalyze, depth, (prog) => {
          if (gameModeRef.current !== 'review') return;
          setProgress(prog);
          if (prog.reportSoFar) {
            setReport(prog.reportSoFar);
          }
        });
        if (gameModeRef.current === 'review') {
          setReport(fullReport);
        }
      } catch (err) {
        console.error('Analysis failed:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  // Initialize
  useEffect(() => {
    loadPgnIntoState(SAMPLE_GAMES[0].pgn, SAMPLE_GAMES[0].title);

    stockfish.init().then(() => {
      setIsEngineReady(true);
      runAnalysis(SAMPLE_GAMES[0].pgn, 14);
    });

    return () => {
      stockfish.stop();
    };
  }, [loadPgnIntoState, runAnalysis]);

  const playMoveAudio = useCallback(
    (targetPly: number) => {
      if (!soundEnabled || targetPly === 0 || !report || !report.moves[targetPly - 1]) return;
      const move = report.moves[targetPly - 1];
      if (move.classification === 'blunder') {
        sound.playBlunder();
      } else if (move.captured) {
        sound.playCapture();
      } else {
        const fen = fens[targetPly];
        if (fen && fen.includes('+')) {
          sound.playCheck();
        } else {
          sound.playMove();
        }
      }
    },
    [soundEnabled, report, fens]
  );

  const handleSelectPly = useCallback(
    (ply: number) => {
      const clamped = Math.max(0, Math.min(fens.length - 1, ply));
      setCurrentPly(clamped);
      setIsPreviewingLine(false);
      setPreviewFen(null);
      playMoveAudio(clamped);
    },
    [fens.length, playMoveAudio]
  );

  // Autoplay timer for review mode
  useEffect(() => {
    let timer: number | null = null;
    if (isPlaying) {
      timer = window.setInterval(() => {
        setCurrentPly((prev) => {
          if (prev >= fens.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          playMoveAudio(next);
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, fens.length, playMoveAudio]);

  // Mistakes extraction for Mistake Replay (Работа над ошибками)
  const playerMistakes = useMemo(
    () => extractPlayerMistakes(report, playerColor),
    [report, playerColor]
  );

  const activeMistake = useMemo(() => {
    if (!isMistakeReplayActive || !playerMistakes[mistakeIndex]) return null;
    return {
      index: mistakeIndex,
      total: playerMistakes.length,
      item: playerMistakes[mistakeIndex],
      success: mistakeSuccess,
      pieceHintRevealed: mistakePieceHintRevealed,
      solutionRevealed: mistakeSolutionRevealed
    };
  }, [
    isMistakeReplayActive,
    playerMistakes,
    mistakeIndex,
    mistakeSuccess,
    mistakePieceHintRevealed,
    mistakeSolutionRevealed
  ]);

  const handleStartMistakeReplay = useCallback(() => {
    if (playerMistakes.length === 0) return;
    const firstItem = playerMistakes[0];
    setIsMistakeReplayActive(true);
    setMistakeIndex(0);
    setMistakeSuccess(null);
    setMistakePieceHintRevealed(false);
    setMistakeSolutionRevealed(false);
    setPreviewFen(firstItem.fenBefore);
    setIsPreviewingLine(true);
    setMoveAccent(null);
    setCurrentPly(Math.max(0, firstItem.ply));
  }, [playerMistakes]);

  const handleNextMistake = useCallback(() => {
    if (mistakeIndex + 1 < playerMistakes.length) {
      const nextIdx = mistakeIndex + 1;
      const nextItem = playerMistakes[nextIdx];
      setMistakeIndex(nextIdx);
      setMistakeSuccess(null);
      setMistakePieceHintRevealed(false);
      setMistakeSolutionRevealed(false);
      setPreviewFen(nextItem.fenBefore);
      setMoveAccent(null);
      setCurrentPly(Math.max(0, nextItem.ply));
    } else {
      setIsMistakeReplayActive(false);
      setPreviewFen(null);
      setIsPreviewingLine(false);
      setMoveAccent(null);
      setCurrentPly(Math.max(0, fens.length - 1));
      sound.playVictory();
      sound.speak('Работа над ошибками успешно завершена!');
    }
  }, [mistakeIndex, playerMistakes, fens.length]);

  const handleRevealMistakePieceHint = useCallback(() => {
    setMistakePieceHintRevealed(true);
    const item = playerMistakes[mistakeIndex];
    if (item && item.pieceSquare) {
      sound.speak(`Внимание на поле ${item.pieceSquare}. Найдите лучший ход этой фигурой!`);
    }
  }, [playerMistakes, mistakeIndex]);

  const handleRevealMistakeSolution = useCallback(() => {
    setMistakeSolutionRevealed(true);
    const item = playerMistakes[mistakeIndex];
    if (item && item.bestMoveSan) {
      sound.speak(`Лучший ход: ${item.bestMoveSan}.`);
    }
  }, [playerMistakes, mistakeIndex]);

  const handleExitMistakeReplay = useCallback(() => {
    setIsMistakeReplayActive(false);
    setPreviewFen(null);
    setIsPreviewingLine(false);
    setMoveAccent(null);
    setCurrentPly(Math.max(0, fens.length - 1));
  }, [fens.length]);

  // Position Evaluation Cache (always stores objective Skill 20 Stockfish evaluations)
  const positionEvalCacheRef = useRef<Map<string, EngineEvaluation>>(
    new Map([
      [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        {
          cp: 20,
          mate: null,
          depth: 14,
          pv: ['e2e4', 'e7e5', 'g1f3', 'b8c6'],
          bestMove: 'e2e4',
          secondBest: {
            cp: 15,
            mate: null,
            pv: ['d2d4', 'd7d5'],
            bestMove: 'd2d4'
          }
        }
      ]
    ])
  );

  const buildUpdatedReport = useCallback(
    (prev: GameReport | null, plyIndex: number, analysis: MoveAnalysis): GameReport => {
      const existingMoves = prev ? [...prev.moves] : [];
      existingMoves[plyIndex] = analysis;
      // Keep only valid contiguous or defined moves up to max ply
      const cleanMoves = existingMoves.filter(Boolean);

      const counts = {
        white: {} as Record<MoveClassification, number>,
        black: {} as Record<MoveClassification, number>
      };
      (Object.keys(CLASSIFICATION_CONFIGS) as MoveClassification[]).forEach((k) => {
        counts.white[k] = 0;
        counts.black[k] = 0;
      });
      cleanMoves.forEach((m) => {
        if (m.turn === 'w') counts.white[m.classification]++;
        else counts.black[m.classification]++;
      });

      return {
        whiteAccuracy: calculatePlayerAccuracy(cleanMoves, 'w'),
        blackAccuracy: calculatePlayerAccuracy(cleanMoves, 'b'),
        whitePlayer:
          prev?.whitePlayer ||
          (gameModeRef.current === 'vs-ai' ? (playerColor === 'w' ? 'Вы' : 'Stockfish') : 'Белые'),
        blackPlayer:
          prev?.blackPlayer ||
          (gameModeRef.current === 'vs-ai' ? (playerColor === 'b' ? 'Вы' : 'Stockfish') : 'Черные'),
        event:
          prev?.event ||
          (gameModeRef.current === 'vs-ai'
            ? 'Матч против Stockfish'
            : gameModeRef.current === 'ranked'
            ? 'Рейтинговый матч'
            : 'Интерактивный разбор'),
        date: prev?.date || new Date().toISOString().slice(0, 10),
        result: prev?.result || '*',
        moves: existingMoves,
        classificationSummary: counts
      };
    },
    [playerColor]
  );

  /**
   * Evaluates any move (Player, AI, or Online Opponent) in two stages:
   * 1) 0ms instant heuristic evaluation so EvalBar & Summary update immediately.
   * 2) Full-strength Stockfish (Skill 20, MultiPV 2) evaluation of fenBefore & fenAfter.
   */
  const recordAndEvaluateMove = useCallback(
    async (params: {
      plyIndex: number;
      fenBefore: string;
      fenAfter: string;
      moveResult: Move;
      announceAccent: boolean;
    }): Promise<EngineEvaluation> => {
      const { plyIndex, fenBefore, fenAfter, moveResult, announceAccent } = params;
      const moveSan = moveResult.san;
      const moveUci = `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`;
      const turn = moveResult.color;
      const piece = moveResult.piece;
      const captured = moveResult.captured;

      // Stage 1: Instant 0ms heuristic update so EvalBar reacts immediately
      const cachedBefore = positionEvalCacheRef.current.get(fenBefore);
      const quickBefore = cachedBefore || {
        ...quickEvaluateFen(fenBefore),
        depth: 1,
        pv: [],
        bestMove: ''
      };
      const quickAfter = quickEvaluateFen(fenAfter);

      const quickDetectedOpening = detectOpeningNameFromMoves(fensRef.current);
      const quickClass = classifySingleMove({
        ply: plyIndex,
        turn,
        san: moveSan,
        uci: moveUci,
        piece,
        captured,
        fenBefore,
        fenAfter,
        evalBefore: quickBefore.cp,
        evalAfter: quickAfter.cp,
        mateBefore: quickBefore.mate,
        mateAfter: quickAfter.mate,
        bestMoveUci: quickBefore.bestMove,
        openingName: quickDetectedOpening
      });

      const preliminaryAnalysis: MoveAnalysis = {
        ply: plyIndex,
        moveNumber: Math.floor(plyIndex / 2) + 1,
        turn,
        san: moveSan,
        uci: moveUci,
        from: moveResult.from,
        to: moveResult.to,
        piece,
        captured,
        fenBefore,
        fenAfter,
        evalBefore: quickBefore.cp,
        evalAfter: quickAfter.cp,
        mateBefore: quickBefore.mate,
        mateAfter: quickAfter.mate,
        winPercentBefore: quickClass.winBefore,
        winPercentAfter: quickClass.winAfter,
        winPercentLoss: quickClass.winLoss,
        centipawnLoss: quickClass.cpLoss,
        classification: quickClass.classification,
        classificationReason: quickClass.reason,
        bestMoveUci: quickBefore.bestMove || moveUci,
        bestMoveSan: quickBefore.bestMove ? uciToSan(fenBefore, quickBefore.bestMove) : moveSan,
        bestLinePv: [],
        depth: 1
      };

      setReport((prev) => buildUpdatedReport(prev, plyIndex, preliminaryAnalysis));

      // Stage 2: Deep objective Stockfish evaluation (Skill Level 20, MultiPV 2)
      let evalBeforeObj = positionEvalCacheRef.current.get(fenBefore);
      if (!evalBeforeObj || evalBeforeObj.depth < 8) {
        evalBeforeObj = await stockfish.evaluate(fenBefore, 9);
        positionEvalCacheRef.current.set(fenBefore, evalBeforeObj);
      }

      let evalAfterObj: EngineEvaluation;
      const chessAfter = new Chess(fenAfter);
      if (chessAfter.isCheckmate()) {
        evalAfterObj = {
          cp: turn === 'w' ? 10000 : -10000,
          mate: 0,
          depth: 20,
          pv: [],
          bestMove: ''
        };
      } else if (chessAfter.isDraw() || chessAfter.isStalemate()) {
        evalAfterObj = {
          cp: 0,
          mate: null,
          depth: 20,
          pv: [],
          bestMove: ''
        };
      } else {
        evalAfterObj = await stockfish.evaluate(fenAfter, 10);
      }
      positionEvalCacheRef.current.set(fenAfter, evalAfterObj);

      const trueBestBeforeUci = evalBeforeObj.bestMove || '';
      const trueBestBeforeSan = trueBestBeforeUci ? uciToSan(fenBefore, trueBestBeforeUci) : moveSan;

      const deepDetectedOpening = detectOpeningNameFromMoves(fensRef.current);
      const classResult = classifySingleMove({
        ply: plyIndex,
        turn,
        san: moveSan,
        uci: moveUci,
        piece,
        captured,
        fenBefore,
        fenAfter,
        evalBefore: evalBeforeObj.cp,
        evalAfter: evalAfterObj.cp,
        mateBefore: evalBeforeObj.mate,
        mateAfter: evalAfterObj.mate,
        bestMoveUci: trueBestBeforeUci,
        secondLineEval: evalBeforeObj.secondBest?.cp,
        secondLineUci: evalBeforeObj.secondBest?.bestMove,
        openingName: deepDetectedOpening
      });

      const deepAnalysis: MoveAnalysis = {
        ply: plyIndex,
        moveNumber: Math.floor(plyIndex / 2) + 1,
        turn,
        san: moveSan,
        uci: moveUci,
        from: moveResult.from,
        to: moveResult.to,
        piece,
        captured,
        fenBefore,
        fenAfter,
        evalBefore: evalBeforeObj.cp,
        evalAfter: evalAfterObj.cp,
        mateBefore: evalBeforeObj.mate,
        mateAfter: evalAfterObj.mate,
        winPercentBefore: classResult.winBefore,
        winPercentAfter: classResult.winAfter,
        winPercentLoss: classResult.winLoss,
        centipawnLoss: classResult.cpLoss,
        classification: classResult.classification,
        classificationReason: classResult.reason,
        bestMoveUci: trueBestBeforeUci || moveUci,
        bestMoveSan: trueBestBeforeSan,
        bestLinePv: evalAfterObj.pv,
        secondLineEval: evalBeforeObj.secondBest?.cp,
        secondLineUci: evalBeforeObj.secondBest?.bestMove,
        depth: evalAfterObj.depth
      };

      setReport((prev) => buildUpdatedReport(prev, plyIndex, deepAnalysis));

      if (announceAccent) {
        const isCheck = chessAfter.inCheck();
        const meta = CLASSIFICATION_CONFIGS[classResult.classification];
        setMoveAccent({
          classification: classResult.classification,
          nameRu: meta.nameRu,
          reason: classResult.reason,
          isCheck,
          san: moveSan
        });

        if (moveAccentTimerRef.current) clearTimeout(moveAccentTimerRef.current);
        moveAccentTimerRef.current = window.setTimeout(() => {
          setMoveAccent(null);
        }, 1600);

        let voiceAnnouncement = meta.nameRu;
        if (isCheck) {
          voiceAnnouncement += ', Шах!';
        }
        sound.speak(voiceAnnouncement);
      }

      return evalAfterObj;
    },
    [buildUpdatedReport]
  );

  // AI Move Engine
  const triggerAiMove = useCallback(
    async (fenToRespondTo: string, currentPlyCount: number) => {
      const chess = new Chess(fenToRespondTo);
      if (chess.isGameOver()) {
        setGameOverMessage(checkGameOverStatus(chess));
        return;
      }

      const reqId = ++aiRequestIdRef.current;
      setIsAiThinking(true);
      try {
        const aiMoveEval = await stockfish.getAiMove(fenToRespondTo, aiDepth);
        if (aiRequestIdRef.current !== reqId) return;
        let chosenUci = aiMoveEval.bestMove;

        // Human-like blunder & casual move simulator for low ELO (< 300) bots
        const activeOpp = activeRankedSessionRef.current?.opponent;
        const oppElo = activeOpp?.elo;
        const isNoviceDifficulty = aiDifficultyId === 'novice' || (oppElo !== undefined && oppElo <= 300);
        if (isNoviceDifficulty) {
          const blunderChance = oppElo && oppElo <= 120 ? 0.65 : 0.40;
          if (Math.random() < blunderChance) {
            const legalMoves = chess.moves({ verbose: true });
            if (legalMoves.length > 0) {
              // Prefer natural non-capturing moves or quiet piece moves
              const quietMoves = legalMoves.filter((m) => !m.captured);
              const pool = quietMoves.length > 0 ? quietMoves : legalMoves;
              const randomPick = pool[Math.floor(Math.random() * pool.length)];
              chosenUci = `${randomPick.from}${randomPick.to}${randomPick.promotion || ''}`;
            }
          }
        }

        // Fallback: If engine didn't return a move, pick legal move
        if (!chosenUci || chosenUci.length < 4) {
          const legalMoves = chess.moves({ verbose: true });
          if (legalMoves.length > 0) {
            const capture = legalMoves.find((m) => m.captured);
            const chosen = capture || legalMoves[Math.floor(Math.random() * legalMoves.length)];
            chosenUci = `${chosen.from}${chosen.to}${chosen.promotion || ''}`;
          }
        }

        if (chosenUci && chosenUci.length >= 4) {
          const from = chosenUci.substring(0, 2);
          const to = chosenUci.substring(2, 4);
          const promotion = chosenUci.length > 4 ? chosenUci[4] : undefined;

          // 1.2 second pause so player sees their own move accent and hears speech feedback
          await new Promise((resolve) => setTimeout(resolve, 1200));

          // Ensure game wasn't reset, undone, or another move requested while waiting
          if (aiRequestIdRef.current !== reqId || currentPlyRef.current !== currentPlyCount) {
            return;
          }

          const aiMoveResult = chess.move({ from, to, promotion });
          if (aiMoveResult) {
            const newFen = chess.fen();
            const newFens = [...fensRef.current.slice(0, currentPlyCount + 1), newFen];
            setFens(newFens);
            const nextPly = currentPlyCount + 1;
            setCurrentPly(nextPly);

            // Apply Fischer increment for AI move
            if (activeTimeControl?.incrementSeconds && activeTimeControl.incrementSeconds > 0) {
              const aiColor = activeRankedSessionRef.current
                ? activeRankedSessionRef.current.myColor === 'w'
                  ? 'b'
                  : 'w'
                : playerColor === 'w'
                ? 'b'
                : 'w';
              if (aiColor === 'w') {
                setWhiteTime((prev) => (typeof prev === 'number' ? prev + activeTimeControl.incrementSeconds : prev));
              } else {
                setBlackTime((prev) => (typeof prev === 'number' ? prev + activeTimeControl.incrementSeconds : prev));
              }
            }

            if (aiMoveResult.captured) {
              sound.playCapture();
            } else if (newFen.includes('+') || chess.inCheck()) {
              sound.playCheck();
              sound.speak('Вам шах!');
            } else {
              sound.playMove();
            }

            if (chess.isGameOver()) {
              const over = checkGameOverStatus(chess);
              const isMate = chess.isCheckmate();
              setTimeout(() => {
                if (gameModeRef.current === 'ranked' && activeRankedSessionRef.current) {
                  const opp = activeRankedSessionRef.current.opponent;
                  if (chess.isCheckmate()) {
                    const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'loss');
                    setCurrentUser({ ...userService.getCurrentUser() });
                    setGameOverMessage(`${over} • ${matchRes.message}`);
                    sound.playDefeat();
                    sound.speak(`Поражение. ${matchRes.eloChange} Эло.`);
                    setScoreDelta({
                      id: `elo-${Date.now()}`,
                      type: 'elo',
                      title: `Поражение против ${opp.username}`,
                      delta: matchRes.eloChange,
                      oldValue: matchRes.oldElo,
                      newValue: matchRes.newElo,
                      unit: 'ELO',
                      isPositive: false
                    });
                  } else if (chess.isDraw() || chess.isStalemate()) {
                    const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'draw');
                    setCurrentUser({ ...userService.getCurrentUser() });
                    setGameOverMessage(`${over} • ${matchRes.message}`);
                    setScoreDelta({
                      id: `elo-${Date.now()}`,
                      type: 'elo',
                      title: 'Ничья',
                      delta: 0,
                      oldValue: matchRes.oldElo,
                      newValue: matchRes.newElo,
                      unit: 'ELO',
                      isPositive: false,
                      isNeutral: true
                    });
                  } else {
                    setGameOverMessage(over);
                  }
                } else if (gameModeRef.current === 'vs-ai') {
                  if (chess.isCheckmate()) {
                    userService.recordCasualMatch('loss');
                    setCurrentUser({ ...userService.getCurrentUser() });
                    sound.playDefeat();
                    sound.speak('Поражение в тренировочном матче');
                  } else if (chess.isDraw() || chess.isStalemate()) {
                    userService.recordCasualMatch('draw');
                    setCurrentUser({ ...userService.getCurrentUser() });
                  }
                  setGameOverMessage(over);
                } else {
                  setGameOverMessage(over);
                }
              }, isMate ? 1200 : 0);
            }

            // Objectively evaluate AI move and update report & EvalBar
            await recordAndEvaluateMove({
              plyIndex: currentPlyCount,
              fenBefore: fenToRespondTo,
              fenAfter: newFen,
              moveResult: aiMoveResult,
              announceAccent: false
            });
          }
        }
      } catch (err) {
        console.error('AI Turn error:', err);
      } finally {
        setIsAiThinking(false);
      }
    },
    [aiDepth, recordAndEvaluateMove]
  );

  // Player Move Handler
  const handlePieceDrop = (sourceSquare: string, targetSquare: string, promotion: string = 'q'): boolean => {
    lastLocalActionTimeRef.current = Date.now();
    if (isAiThinkingRef.current) return false;

    const currentBoardFen = previewFen || fens[currentPly] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const chess = new Chess(currentBoardFen);

    // In Mistake Replay mode: validate attempt against current mistake item
    if (isMistakeReplayActive && playerMistakes[mistakeIndex]) {
      const currentItem = playerMistakes[mistakeIndex];
      let pMove: Move | null = null;
      try {
        pMove = chess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: (promotion as any) || 'q'
        });
      } catch {
        return false;
      }
      if (!pMove) return false;

      const playedUci = `${pMove.from}${pMove.to}${pMove.promotion || ''}`;
      const isCorrect =
        playedUci === currentItem.bestMoveUci ||
        (currentItem.bestMoveSan && pMove.san === currentItem.bestMoveSan);

      if (isCorrect) {
        sound.playVictory();
        sound.speak('Отлично! Вы нашли правильный ход!');
        setMistakeSuccess(true);
        setPreviewFen(chess.fen());
        return true;
      } else {
        sound.playBlunder();
        sound.speak('Этот ход не решает проблему. Попробуйте еще раз или возьмите подсказку.');
        setMistakeSuccess(false);
        return false;
      }
    }

    // In VS AI mode, restrict moves to player's turn
    if (gameMode === 'vs-ai' && (chess.turn() !== playerColor || Boolean(gameOverMessage))) {
      return false;
    }

    // In Ranked mode, restrict moves to active session, latest ply, and player's turn
    if (
      gameMode === 'ranked' &&
      (!activeRankedSession ||
        Boolean(gameOverMessage) ||
        currentPly !== fens.length - 1 ||
        chess.turn() !== playerColor)
    ) {
      return false;
    }

    // In Puzzle mode, handle puzzle step validation with detailed Coach Explanations
    const isPuzzleMode = gameMode === 'puzzles' || (gameMode === 'learn' && activeLearnTab === 'puzzles');
    if (isPuzzleMode) {
      const activePuzzle = PUZZLES[currentPuzzleIndex] || PUZZLES[0];
      if (!activePuzzle || puzzleStatus === 'solved') return false;
      if (chess.turn() !== activePuzzle.turn) return false;

      let pMove: Move | null = null;
      try {
        pMove = chess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: (promotion as any) || 'q'
        });
      } catch {
        return false;
      }
      if (!pMove) return false;

      const playedUci = `${pMove.from}${pMove.to}${pMove.promotion || ''}`;
      const expectedUci = activePuzzle.solutionMoves[puzzleStep];

      if (playedUci === expectedUci) {
        const nextFen = chess.fen();
        const nextPlies = [...fens.slice(0, currentPly + 1), nextFen];
        setFens(nextPlies);
        setCurrentPly(nextPlies.length - 1);
        setPuzzleStatus('playing');
        setPuzzleMistakeAnalysis(null);

        if (pMove.captured) sound.playCapture();
        else if (nextFen.includes('+')) sound.playCheck();
        else sound.playMove();

        const opponentStep = puzzleStep + 1;
        if (opponentStep < activePuzzle.solutionMoves.length) {
          setPuzzleStep(opponentStep + 1);
          sound.speak(`Верно, ${pMove.san}! Теперь найдите продолжение после ответа соперника.`);
          setTimeout(() => {
            try {
              const replyUci = activePuzzle.solutionMoves[opponentStep];
              const replyChess = new Chess(nextFen);
              const repResult = replyChess.move({
                from: replyUci.substring(0, 2),
                to: replyUci.substring(2, 4),
                promotion: replyUci.length > 4 ? replyUci[4] : undefined
              });
              if (repResult) {
                const repFen = replyChess.fen();
                setFens((prev) => [...prev, repFen]);
                setCurrentPly((prev) => prev + 1);
                if (repResult.captured) sound.playCapture();
                else if (repFen.includes('+')) sound.playCheck();
                else sound.playMove();

                if (opponentStep + 1 >= activePuzzle.solutionMoves.length) {
                  setPuzzleStatus('solved');
                  setSolvedPuzzlesCount((c) => c + 1);
                  const pRes = userService.recordPuzzleSolved(activePuzzle.id, activePuzzle.rating);
                  setCurrentUser({ ...userService.getCurrentUser() });
                  sound.playVictory();
                  sound.speak(`Задача решена! Плюс ${pRes.pointsAwarded} баллов. ${activePuzzle.explanation}`);
                  setScoreDelta({
                    id: `puzzle-${Date.now()}`,
                    type: 'puzzle',
                    title: 'Задача Решена!',
                    delta: pRes.pointsAwarded,
                    oldValue: pRes.oldTotalPoints,
                    newValue: pRes.newTotalPoints,
                    unit: 'баллов',
                    isPositive: true
                  });
                }
              }
            } catch (err) {
              console.error(err);
            }
          }, 450);
        } else {
          setPuzzleStatus('solved');
          setSolvedPuzzlesCount((c) => c + 1);
          const pRes = userService.recordPuzzleSolved(activePuzzle.id, activePuzzle.rating);
          setCurrentUser({ ...userService.getCurrentUser() });
          sound.playVictory();
          sound.speak(`Задача решена! Плюс ${pRes.pointsAwarded} баллов. ${activePuzzle.explanation}`);
          setScoreDelta({
            id: `puzzle-${Date.now()}`,
            type: 'puzzle',
            title: 'Задача Решена!',
            delta: pRes.pointsAwarded,
            oldValue: pRes.oldTotalPoints,
            newValue: pRes.newTotalPoints,
            unit: 'баллов',
            isPositive: true
          });
        }
        return true;
      } else {
        const mistake = analyzePuzzleMistake(
          activePuzzle,
          puzzleStep,
          currentBoardFen,
          pMove.san,
          playedUci,
          chess.fen()
        );
        setPuzzleMistakeAnalysis(mistake);
        setPuzzleStatus('failed');
        sound.playBlunder();
        sound.speak(mistake.whyWrong);
        return false;
      }
    }

    if ((gameMode === 'learn' || (gameMode as string) === 'puzzles') && activeLearnTab === 'openings') {
      const step = currentOpening.moves[openingStepIndex];
      if (!step) return false;
      const playedUci = `${sourceSquare}${targetSquare}`;
      const targetUci = `${step.from}${step.to}`;
      if (playedUci.toLowerCase() === targetUci.toLowerCase()) {
        const nextIdx = openingStepIndex + 1;
        applyOpeningStep(currentOpening, nextIdx);
        sound.playMove();
        sound.speak(`${step.san}. ${step.explanation}`);
        return true;
      } else {
        sound.playBlunder();
        sound.speak(`В дебюте ${currentOpening.nameRu} рекомендуется ход ${step.san}. Попробуйте еще раз!`);
        return false;
      }
    }

    let moveResult: Move | null = null;
    try {
      moveResult = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: (promotion as any) || 'q'
      });
    } catch {
      return false;
    }

    if (!moveResult) return false;

    // Cancel running PGN review if user makes an interactive move
    if (isAnalyzing) {
      gameAnalyzer.cancel();
      setIsAnalyzing(false);
    }

    const plyIndex = currentPly;
    const fenBefore = currentBoardFen;
    const newFen = chess.fen();
    const newFens = [...fens.slice(0, currentPly + 1), newFen];
    setFens(newFens);

    const nextPly = currentPly + 1;
    setCurrentPly(nextPly);

    // Apply Fischer increment for the moving player
    if (activeTimeControl?.incrementSeconds && activeTimeControl.incrementSeconds > 0) {
      if (playerColor === 'w') {
        setWhiteTime((prev) => (typeof prev === 'number' ? prev + activeTimeControl.incrementSeconds : prev));
      } else {
        setBlackTime((prev) => (typeof prev === 'number' ? prev + activeTimeControl.incrementSeconds : prev));
      }
    }
    setIsPreviewingLine(false);
    setPreviewFen(null);

    if (moveResult.captured) {
      sound.playCapture();
    } else if (newFen.includes('+')) {
      sound.playCheck();
    } else {
      sound.playMove();
    }

    if (gameMode === 'ranked' && activeRankedSession?.isOnlinePvP) {
      multiplayerService.sendMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: moveResult.promotion,
        fen: newFen,
        san: moveResult.san,
        whiteTime: whiteTimeRef.current,
        blackTime: blackTimeRef.current
      });
    }

    const overStatus = checkGameOverStatus(chess);
    if (overStatus) {
      const isMate = chess.isCheckmate();
      setTimeout(() => {
        if (gameMode === 'ranked' && activeRankedSession) {
          const opp = activeRankedSession.opponent;
          if (chess.isCheckmate()) {
            const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'win');
            if (activeRankedSession.isOnlinePvP) {
              const newOppElo = userService.applyOpponentMatchResult(
                opp.id,
                opp.username,
                opp.elo,
                matchRes.oldElo,
                'loss'
              );
              setActiveRankedSession((prev) =>
                prev ? { ...prev, opponent: { ...prev.opponent, elo: newOppElo } } : prev
              );
            }
            setCurrentUser({ ...userService.getCurrentUser() });
            setGameOverMessage(`${overStatus} • ${matchRes.message}`);
            sound.playVictory();
            sound.speak(`Победа! Плюс ${matchRes.eloChange} Эло.`);
            setScoreDelta({
              id: `elo-${Date.now()}`,
              type: 'elo',
              title: `Победа над ${opp.username}`,
              delta: matchRes.eloChange,
              oldValue: matchRes.oldElo,
              newValue: matchRes.newElo,
              unit: 'ELO',
              isPositive: true
            });
          } else if (chess.isDraw() || chess.isStalemate()) {
            const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'draw');
            if (activeRankedSession.isOnlinePvP) {
              const newOppElo = userService.applyOpponentMatchResult(
                opp.id,
                opp.username,
                opp.elo,
                matchRes.oldElo,
                'draw'
              );
              setActiveRankedSession((prev) =>
                prev ? { ...prev, opponent: { ...prev.opponent, elo: newOppElo } } : prev
              );
            }
            setCurrentUser({ ...userService.getCurrentUser() });
            setGameOverMessage(`${overStatus} • ${matchRes.message}`);
            setScoreDelta({
              id: `elo-${Date.now()}`,
              type: 'elo',
              title: 'Ничья',
              delta: 0,
              oldValue: matchRes.oldElo,
              newValue: matchRes.newElo,
              unit: 'ELO',
              isPositive: false,
              isNeutral: true
            });
          } else {
            setGameOverMessage(overStatus);
          }
        } else if (gameMode === 'vs-ai') {
          if (chess.isCheckmate()) {
            userService.recordCasualMatch('win');
            setCurrentUser({ ...userService.getCurrentUser() });
            sound.playVictory();
            sound.speak('Победа в тренировочном матче!');
          } else if (chess.isDraw() || chess.isStalemate()) {
            userService.recordCasualMatch('draw');
            setCurrentUser({ ...userService.getCurrentUser() });
          }
          setGameOverMessage(overStatus);
        } else {
          setGameOverMessage(overStatus);
        }
      }, isMate ? 1200 : 0);
    } else {
      setGameOverMessage(null);
    }

    // Evaluate player's move at full Stockfish strength and then trigger AI reply if needed
    recordAndEvaluateMove({
      plyIndex,
      fenBefore,
      fenAfter: newFen,
      moveResult,
      announceAccent: true
    }).then(() => {
      if (
        !chess.isGameOver() &&
        (gameMode === 'vs-ai' || (gameMode === 'ranked' && !activeRankedSession?.isOnlinePvP)) &&
        chess.turn() !== playerColor
      ) {
        triggerAiMove(newFen, nextPly);
      }
    });

    return true;
  };

  // Start game vs AI
  const startVsAiGame = useCallback(
    (side: 'w' | 'b') => {
      gameAnalyzer.cancel();
      stockfish.clearQueue();
      const cfg = AI_DIFFICULTIES.find((d) => d.id === aiDifficultyId) || AI_DIFFICULTIES[1];
      stockfish.setSkillLevel(cfg.skillLevel);
      setIsAnalyzing(false);
      setIsPlaying(false);
      setGameOverMessage(null);
      setIsPreviewingLine(false);
      setPreviewFen(null);

      const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      setFens([startFen]);
      setCurrentPly(0);
      setPlayerColor(side);
      setIsFlipped(side === 'b');

      const counts = {
        white: {} as Record<MoveClassification, number>,
        black: {} as Record<MoveClassification, number>
      };
      (Object.keys(CLASSIFICATION_CONFIGS) as MoveClassification[]).forEach((k) => {
        counts.white[k] = 0;
        counts.black[k] = 0;
      });

      setReport({
        whiteAccuracy: 100,
        blackAccuracy: 100,
        whitePlayer: side === 'w' ? 'Вы' : 'Stockfish',
        blackPlayer: side === 'b' ? 'Вы' : 'Stockfish',
        event: 'Матч против Stockfish',
        date: new Date().toISOString().slice(0, 10),
        result: '*',
        moves: [],
        classificationSummary: counts
      });

      // If user is playing as Black, AI plays White's first move
      if (side === 'b') {
        setTimeout(() => {
          triggerAiMove(startFen, 0);
        }, 300);
      }
    },
    [triggerAiMove, aiDifficultyId]
  );

  // Start 1v1 PvP Game
  const startPvpGame = useCallback(() => {
    gameAnalyzer.cancel();
    stockfish.clearQueue();
    setIsAnalyzing(false);
    setIsPlaying(false);
    setGameOverMessage(null);
    setIsPreviewingLine(false);
    setPreviewFen(null);

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setFens([startFen]);
    setCurrentPly(0);
    setIsFlipped(false);

    const counts = {
      white: {} as Record<MoveClassification, number>,
      black: {} as Record<MoveClassification, number>
    };
    (Object.keys(CLASSIFICATION_CONFIGS) as MoveClassification[]).forEach((k) => {
      counts.white[k] = 0;
      counts.black[k] = 0;
    });

    setReport({
      whiteAccuracy: 100,
      blackAccuracy: 100,
      whitePlayer: 'Белые',
      blackPlayer: 'Черные',
      event: 'Партия 1 на 1',
      date: new Date().toISOString().slice(0, 10),
      result: '*',
      moves: [],
      classificationSummary: counts
    });
  }, []);

  // Start Puzzles Mode
  const startPuzzlesMode = useCallback(
    (indexToLoad = 0) => {
      gameAnalyzer.cancel();
      stockfish.clearQueue();
      setIsAnalyzing(false);
      setIsPlaying(false);
      setGameOverMessage(null);
      setIsPreviewingLine(false);
      setPreviewFen(null);

      const targetIdx = Math.max(0, Math.min(PUZZLES.length - 1, indexToLoad));
      setCurrentPuzzleIndex(targetIdx);
      const puzzle = PUZZLES[targetIdx] || PUZZLES[0];
      setFens([puzzle.fen]);
      setCurrentPly(0);
      setIsFlipped(puzzle.turn === 'b');
      setPlayerColor(puzzle.turn);
      setPuzzleStatus('playing');
      setPuzzleStep(0);
      setPuzzleMistakeAnalysis(null);
      setTotalAttemptedPuzzles((c) => c + 1);
    },
    []
  );

  const handleNextPuzzle = useCallback(() => {
    const nextIdx = (currentPuzzleIndex + 1) % PUZZLES.length;
    startPuzzlesMode(nextIdx);
  }, [currentPuzzleIndex, startPuzzlesMode]);

  const handleRandomPuzzle = useCallback(() => {
    const filtered = PUZZLES.filter(
      (p) => puzzleDifficultyFilter === 'all' || p.difficulty === puzzleDifficultyFilter
    );
    const pool = filtered.length > 0 ? filtered : PUZZLES;
    const randomItem = pool[Math.floor(Math.random() * pool.length)];
    const randomIdx = PUZZLES.findIndex((p) => p.id === randomItem.id);
    startPuzzlesMode(randomIdx >= 0 ? randomIdx : 0);
  }, [puzzleDifficultyFilter, startPuzzlesMode]);

  const handleRetryPuzzle = useCallback(() => {
    const puzzle = PUZZLES[currentPuzzleIndex] || PUZZLES[0];
    setFens([puzzle.fen]);
    setCurrentPly(0);
    setPuzzleStatus('playing');
    setPuzzleStep(0);
    setPuzzleMistakeAnalysis(null);
  }, [currentPuzzleIndex]);

  const handleShowSolution = useCallback(() => {
    const puzzle = PUZZLES[currentPuzzleIndex] || PUZZLES[0];
    try {
      const replay = new Chess(puzzle.fen);
      const solutionFens = [puzzle.fen];
      for (const uci of puzzle.solutionMoves) {
        replay.move({
          from: uci.substring(0, 2),
          to: uci.substring(2, 4),
          promotion: uci.length > 4 ? uci[4] : undefined
        });
        solutionFens.push(replay.fen());
      }
      setFens(solutionFens);
      setCurrentPly(solutionFens.length - 1);
      setPuzzleStatus('failed');
      sound.speak(`Решение задачи: ${puzzle.explanation}`);
    } catch (err) {
      console.error(err);
    }
  }, [currentPuzzleIndex]);

  const applyOpeningStep = useCallback((opening: ChessOpening, stepIdx: number) => {
    const chess = new Chess();
    for (let i = 0; i < stepIdx && i < opening.moves.length; i++) {
      const m = opening.moves[i];
      try {
        chess.move({ from: m.from, to: m.to });
      } catch {}
    }
    const fen = chess.fen();
    setFens([fen]);
    setCurrentPly(0);
    setOpeningStepIndex(stepIdx);
  }, []);

  const handleSelectOpening = useCallback((op: ChessOpening) => {
    setCurrentOpening(op);
    applyOpeningStep(op, 0);
  }, [applyOpeningStep]);

  const handleOpeningStepChange = useCallback((stepIdx: number) => {
    applyOpeningStep(currentOpening, stepIdx);
  }, [currentOpening, applyOpeningStep]);

  const handleResetOpening = useCallback(() => {
    applyOpeningStep(currentOpening, 0);
  }, [currentOpening, applyOpeningStep]);

  const handleChangeAiDifficulty = (diffId: string) => {
    setAiDifficultyId(diffId);
    const cfg = AI_DIFFICULTIES.find((d) => d.id === diffId);
    if (cfg) {
      setAiDepth(cfg.depth);
      stockfish.setSkillLevel(cfg.skillLevel);
    }
  };

  /**
   * Undo last move for Review, VS-AI, 1v1 PvP, and Openings modes
   */
  const handleUndoMove = useCallback(() => {
    if (gameMode === 'ranked' || gameMode === 'puzzles') return;

    if (gameMode === 'learn' && activeLearnTab === 'openings') {
      if (openingStepIndex > 0) {
        applyOpeningStep(currentOpening, openingStepIndex - 1);
        sound.playMove();
      }
      return;
    }

    if (currentPly <= 0 || fens.length <= 1) return;

    aiRequestIdRef.current++;
    stockfish.clearQueue();
    setIsAiThinking(false);
    setGameOverMessage(null);
    setMoveAccent(null);
    setIsPreviewingLine(false);
    setPreviewFen(null);

    let targetPly = currentPly - 1;
    if (gameMode === 'vs-ai') {
      // If it's currently player's turn and at least 2 plies have been played,
      // undo both AI's reply and player's move so it returns to player's turn.
      const currentFenStr = fens[currentPly] || fens[fens.length - 1];
      let turn: 'w' | 'b' = 'w';
      try {
        turn = new Chess(currentFenStr).turn();
      } catch {
        turn = 'w';
      }
      if (turn === playerColor && currentPly >= 2) {
        targetPly = currentPly - 2;
      } else {
        targetPly = Math.max(0, currentPly - 1);
      }
      // If player is Black and we rolled back to ply 0 (White's turn), keep at ply 1
      if (playerColor === 'b' && targetPly === 0 && fens.length > 1) {
        targetPly = 1;
      }
    }

    const nextFens = fens.slice(0, targetPly + 1);
    fensRef.current = nextFens;
    currentPlyRef.current = targetPly;
    setFens(nextFens);
    setCurrentPly(targetPly);

    setReport((prev) => {
      if (!prev) return prev;
      const slicedMoves = prev.moves.slice(0, targetPly).filter(Boolean);
      const counts = {
        white: {} as Record<MoveClassification, number>,
        black: {} as Record<MoveClassification, number>
      };
      (Object.keys(CLASSIFICATION_CONFIGS) as MoveClassification[]).forEach((k) => {
        counts.white[k] = 0;
        counts.black[k] = 0;
      });
      slicedMoves.forEach((m) => {
        if (m.turn === 'w') counts.white[m.classification]++;
        else counts.black[m.classification]++;
      });

      return {
        ...prev,
        whiteAccuracy: calculatePlayerAccuracy(slicedMoves, 'w'),
        blackAccuracy: calculatePlayerAccuracy(slicedMoves, 'b'),
        moves: slicedMoves,
        classificationSummary: counts
      };
    });

    sound.playMove();
  }, [gameMode, currentPly, fens, playerColor]);

  // Keyboard shortcut Ctrl+Z to undo move in Review, VS-AI, and 1v1 PvP
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (gameMode === 'review' || gameMode === 'vs-ai' || gameMode === 'pvp') {
          e.preventDefault();
          handleUndoMove();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameMode, handleUndoMove]);

  const handleOpponentOnlineMove = useCallback(
    (movePayload: MovePayload) => {
      const plyIndex = currentPlyRef.current;
      const currentBoardFen =
        fensRef.current[plyIndex] ||
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const chess = new Chess(currentBoardFen);
      try {
        const res = chess.move({
          from: movePayload.from,
          to: movePayload.to,
          promotion: (movePayload.promotion as any) || undefined
        });
        if (res) {
          if (typeof movePayload.whiteTime === 'number') {
            setWhiteTime(movePayload.whiteTime);
          }
          if (typeof movePayload.blackTime === 'number') {
            setBlackTime(movePayload.blackTime);
          }
          const nextFen = chess.fen();
          const updatedFens = [...fensRef.current.slice(0, plyIndex + 1), nextFen];
          setFens(updatedFens);
          setCurrentPly(updatedFens.length - 1);
          if (res.captured) sound.playCapture();
          else if (nextFen.includes('+') || chess.inCheck()) {
            sound.playCheck();
            sound.speak('Вам шах!');
          } else sound.playMove();

          // Evaluate opponent's move so EvalBar and Summary stay 100% synced
          recordAndEvaluateMove({
            plyIndex,
            fenBefore: currentBoardFen,
            fenAfter: nextFen,
            moveResult: res,
            announceAccent: false
          });

          if (chess.isGameOver()) {
            const over = checkGameOverStatus(chess);
            if (activeRankedSessionRef.current) {
              const opp = activeRankedSessionRef.current.opponent;
              if (chess.isCheckmate()) {
                const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'loss');
                const newOppElo = userService.applyOpponentMatchResult(
                  opp.id,
                  opp.username,
                  opp.elo,
                  matchRes.oldElo,
                  'win'
                );
                setActiveRankedSession((prev) =>
                  prev ? { ...prev, opponent: { ...prev.opponent, elo: newOppElo } } : prev
                );
                setCurrentUser({ ...userService.getCurrentUser() });
                setGameOverMessage(`${over} • ${matchRes.message}`);
                sound.playDefeat();
                setScoreDelta({
                  id: `elo-${Date.now()}`,
                  type: 'elo',
                  title: `Поражение против ${opp.username}`,
                  delta: matchRes.eloChange,
                  oldValue: matchRes.oldElo,
                  newValue: matchRes.newElo,
                  unit: 'ELO',
                  isPositive: false
                });
              } else if (chess.isDraw() || chess.isStalemate()) {
                const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'draw');
                const newOppElo = userService.applyOpponentMatchResult(
                  opp.id,
                  opp.username,
                  opp.elo,
                  matchRes.oldElo,
                  'draw'
                );
                setActiveRankedSession((prev) =>
                  prev ? { ...prev, opponent: { ...prev.opponent, elo: newOppElo } } : prev
                );
                setCurrentUser({ ...userService.getCurrentUser() });
                setGameOverMessage(`${over} • ${matchRes.message}`);
                setScoreDelta({
                  id: `elo-${Date.now()}`,
                  type: 'elo',
                  title: 'Ничья',
                  delta: 0,
                  oldValue: matchRes.oldElo,
                  newValue: matchRes.newElo,
                  unit: 'ELO',
                  isPositive: false,
                  isNeutral: true
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Opponent move error:', err);
      }
    },
    [recordAndEvaluateMove]
  );

  const handleOpponentResign = useCallback(() => {
    if (activeRankedSessionRef.current) {
      const opp = activeRankedSessionRef.current.opponent;
      const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'win');
      if (activeRankedSessionRef.current.isOnlinePvP) {
        const newOppElo = userService.applyOpponentMatchResult(
          opp.id,
          opp.username,
          opp.elo,
          matchRes.oldElo,
          'loss'
        );
        setActiveRankedSession((prev) =>
          prev ? { ...prev, opponent: { ...prev.opponent, elo: newOppElo } } : prev
        );
      }
      setCurrentUser({ ...userService.getCurrentUser() });
      setGameOverMessage(`Соперник ${opp.username} сдался! • ${matchRes.message}`);
      sound.playVictory();
      setScoreDelta({
        id: `elo-${Date.now()}`,
        type: 'elo',
        title: `Победа (соперник сдался)`,
        delta: matchRes.eloChange,
        oldValue: matchRes.oldElo,
        newValue: matchRes.newElo,
        unit: 'ELO',
        isPositive: true
      });
    }
  }, []);

  const handleOpponentTimeout = useCallback(() => {
    if (activeRankedSessionRef.current) {
      const opp = activeRankedSessionRef.current.opponent;
      const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'win');
      if (activeRankedSessionRef.current.isOnlinePvP) {
        const newOppElo = userService.applyOpponentMatchResult(
          opp.id,
          opp.username,
          opp.elo,
          matchRes.oldElo,
          'loss'
        );
        setActiveRankedSession((prev) =>
          prev ? { ...prev, opponent: { ...prev.opponent, elo: newOppElo } } : prev
        );
      }
      setCurrentUser({ ...userService.getCurrentUser() });
      setGameOverMessage(`У соперника ${opp.username} истекло время! • ${matchRes.message}`);
      sound.playVictory();
      sound.speak(`Время соперника вышло! Победа!`);
      setScoreDelta({
        id: `elo-${Date.now()}`,
        type: 'elo',
        title: `Победа по времени над ${opp.username}`,
        delta: matchRes.eloChange,
        oldValue: matchRes.oldElo,
        newValue: matchRes.newElo,
        unit: 'ELO',
        isPositive: true
      });
    }
  }, []);

  const handleResignCurrentGame = useCallback(() => {
    if (gameOverMessage) return;
    userService.clearActiveGame();
    localStorage.removeItem(STORAGE_ACTIVE_RANKED_MATCH);
    setRemoteActiveGamePrompt(null);

    if (gameMode === 'ranked' && activeRankedSession) {
      if (activeRankedSession.isOnlinePvP) {
        multiplayerService.sendResign();
      }
      const opp = activeRankedSession.opponent;
      const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'loss');
      if (activeRankedSession.isOnlinePvP) {
        const newOppElo = userService.applyOpponentMatchResult(
          opp.id,
          opp.username,
          opp.elo,
          matchRes.oldElo,
          'win'
        );
        setActiveRankedSession((prev) =>
          prev ? { ...prev, opponent: { ...prev.opponent, elo: newOppElo } } : prev
        );
      }
      setCurrentUser({ ...userService.getCurrentUser() });
      setGameOverMessage(`Вы сдались • ${matchRes.message}`);
      sound.playDefeat();
      setScoreDelta({
        id: `elo-${Date.now()}`,
        type: 'elo',
        title: `Поражение (сдача)`,
        delta: matchRes.eloChange,
        oldValue: matchRes.oldElo,
        newValue: matchRes.newElo,
        unit: 'ELO',
        isPositive: false
      });
    } else if (gameMode === 'vs-ai') {
      userService.recordCasualMatch('loss');
      setCurrentUser({ ...userService.getCurrentUser() });
      setGameOverMessage('Вы сдались в тренировочном матче');
      sound.playDefeat();
    }
  }, [gameOverMessage, gameMode, activeRankedSession]);

  const handleOpponentDrawOffer = useCallback((fromUsername: string) => {
    sound.speak(`Соперник ${fromUsername} предлагает ничью.`);
    setIncomingDrawOffer({ fromUser: fromUsername });
  }, []);

  const handleOpponentDrawAccept = useCallback(() => {
    if (activeRankedSessionRef.current) {
      const opp = activeRankedSessionRef.current.opponent;
      const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'draw');
      if (activeRankedSessionRef.current.isOnlinePvP) {
        userService.applyOpponentMatchResult(
          opp.id,
          opp.username,
          opp.elo,
          matchRes.oldElo,
          'draw'
        );
      }
      setCurrentUser({ ...userService.getCurrentUser() });
      sound.playVictory();
      sound.speak('Соперник принял ничью. Партия завершилась миром.');
      setGameOverMessage(`Ничья по соглашению сторон • ${matchRes.message}`);
    }
  }, []);

  const handleOfferDraw = useCallback(() => {
    if (gameOverMessage || fens.length <= 4) return;

    if (gameMode === 'vs-ai') {
      const currentFenStr = fensRef.current[currentPlyRef.current] || fensRef.current[fensRef.current.length - 1];
      const currentEval = positionEvalCacheRef.current.get(currentFenStr)?.cp ?? quickEvaluateFen(currentFenStr).cp;

      // Stockfish accepts draw if position is balanced (|eval| <= 80) and at least 10 plies played
      if (Math.abs(currentEval) <= 80 && fens.length >= 10) {
        userService.recordCasualMatch('draw');
        setCurrentUser({ ...userService.getCurrentUser() });
        sound.playVictory();
        sound.speak('ИИ согласен на ничью. Партия завершилась миром.');
        setGameOverMessage('Ничья по соглашению сторон • 1/2 - 1/2');
      } else {
        sound.playBlunder();
        sound.speak('ИИ отклонил предложение ничьей и продолжает борьбу!');
        setScoreDelta({
          id: `draw-declined-${Date.now()}`,
          type: 'elo',
          title: 'ИИ отклонил ничью',
          delta: 0,
          oldValue: currentUser.elo,
          newValue: currentUser.elo,
          unit: 'ELO',
          isPositive: false,
          isNeutral: true
        });
      }
      return;
    }

    if (gameMode === 'ranked' && activeRankedSession?.isOnlinePvP) {
      multiplayerService.sendDrawOffer();
      sound.speak('Предложение ничьей отправлено сопернику');
      setScoreDelta({
        id: `draw-offer-${Date.now()}`,
        type: 'elo',
        title: 'Предложение ничьей',
        delta: 0,
        oldValue: currentUser.elo,
        newValue: currentUser.elo,
        unit: 'ELO',
        isPositive: false,
        isNeutral: true
      });
      return;
    }

    if (gameMode === 'pvp') {
      sound.playVictory();
      sound.speak('Ничья по соглашению игроков');
      setGameOverMessage('Ничья по соглашению сторон • 1/2 - 1/2');
    }
  }, [gameOverMessage, fens.length, gameMode, activeRankedSession, currentUser.elo]);

  // 10-Minute / Time-Control Chess Clock Countdown for Competitive Ranked Matches (Online PvP & Ranked AI)
  useEffect(() => {
    if (gameMode !== 'ranked' || !activeRankedSession || Boolean(gameOverMessage)) {
      return;
    }

    const timer = setInterval(() => {
      const latestFen =
        fensRef.current[fensRef.current.length - 1] ||
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      let turn: 'w' | 'b' = 'w';
      try {
        turn = new Chess(latestFen).turn();
      } catch {
        turn = 'w';
      }

      if (turn === 'w') {
        const nextW = Math.max(0, whiteTimeRef.current - 1);
        setWhiteTime(nextW);
        if (nextW <= 0 && activeRankedSessionRef.current) {
          clearInterval(timer);
          const sess = activeRankedSessionRef.current;
          if (sess.myColor === 'w') {
            if (sess.isOnlinePvP) {
              multiplayerService.sendTimeout();
            }
            const matchRes = userService.recordCompetitiveMatchResult(sess.opponent.elo, 'loss');
            setCurrentUser({ ...userService.getCurrentUser() });
            setGameOverMessage(`Ваше время истекло! Поражение • ${matchRes.message}`);
            sound.playDefeat();
            sound.speak('Время вышло. Вы проиграли.');
            setScoreDelta({
              id: `elo-${Date.now()}`,
              type: 'elo',
              title: 'Поражение по времени',
              delta: matchRes.eloChange,
              oldValue: matchRes.oldElo,
              newValue: matchRes.newElo,
              unit: 'ELO',
              isPositive: false
            });
          } else {
            handleOpponentTimeout();
          }
        }
      } else {
        const nextB = Math.max(0, blackTimeRef.current - 1);
        setBlackTime(nextB);
        if (nextB <= 0 && activeRankedSessionRef.current) {
          clearInterval(timer);
          const sess = activeRankedSessionRef.current;
          if (sess.myColor === 'b') {
            if (sess.isOnlinePvP) {
              multiplayerService.sendTimeout();
            }
            const matchRes = userService.recordCompetitiveMatchResult(sess.opponent.elo, 'loss');
            setCurrentUser({ ...userService.getCurrentUser() });
            setGameOverMessage(`Ваше время истекло! Поражение • ${matchRes.message}`);
            sound.playDefeat();
            sound.speak('Время вышло. Вы проиграли.');
            setScoreDelta({
              id: `elo-${Date.now()}`,
              type: 'elo',
              title: 'Поражение по времени',
              delta: matchRes.eloChange,
              oldValue: matchRes.oldElo,
              newValue: matchRes.newElo,
              unit: 'ELO',
              isPositive: false
            });
          } else {
            handleOpponentTimeout();
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameMode, activeRankedSession, gameOverMessage, handleOpponentTimeout]);

  // Generic active game restoration (works for both Ranked and VS AI modes)
  const restoreActiveGame = useCallback(
    (saved: ActiveGameSyncData) => {
      if (!saved || !Array.isArray(saved.fens) || saved.fens.length === 0) return;

      const restoredFens: string[] = saved.fens;
      const latestFen = restoredFens[restoredFens.length - 1];
      const chess = new Chess(latestFen);
      if (chess.isGameOver()) {
        localStorage.removeItem(STORAGE_ACTIVE_RANKED_MATCH);
        userService.clearActiveGame();
        return;
      }

      gameAnalyzer.cancel();
      stockfish.clearQueue();
      setIsAnalyzing(false);
      setIsPlaying(false);
      setGameOverMessage(null);

      if (saved.gameMode === 'ranked' && saved.session) {
        const session: RankedMatchSession = saved.session;
        setActiveRankedSession(session);
        multiplayerService.setCurrentSession(session);
        setGameMode('ranked');
        setPlayerColor(session.myColor);
        setIsFlipped(session.myColor === 'b');
        setFens(restoredFens);
        setCurrentPly(restoredFens.length - 1);
        if (saved.report) {
          setReport(saved.report);
        }

        const wRestored =
          typeof saved.whiteTime === 'number' ? saved.whiteTime : INITIAL_RANKED_TIME_SEC;
        const bRestored =
          typeof saved.blackTime === 'number' ? saved.blackTime : INITIAL_RANKED_TIME_SEC;

        if (session.isOnlinePvP) {
          const elapsedSec = Math.max(
            0,
            Math.floor((Date.now() - (saved.lastTickTimestamp || Date.now())) / 1000)
          );
          const turn = chess.turn();

          setWhiteTime(turn === 'w' ? Math.max(1, wRestored - elapsedSec) : wRestored);
          setBlackTime(turn === 'b' ? Math.max(1, bRestored - elapsedSec) : bRestored);

          multiplayerService.joinGameRoom(
            session.roomId,
            handleOpponentOnlineMove,
            handleOpponentResign,
            () => {},
            handleOpponentTimeout,
            handleOpponentDrawOffer,
            handleOpponentDrawAccept
          );
        } else {
          setWhiteTime(wRestored);
          setBlackTime(bRestored);

          if (session.opponent.aiDifficultyId) {
            const cfg =
              AI_DIFFICULTIES.find((d) => d.id === session.opponent.aiDifficultyId) ||
              AI_DIFFICULTIES[1];
            setAiDepth(cfg.depth);
            stockfish.setSkillLevel(cfg.skillLevel);
          }
          if (chess.turn() !== session.myColor) {
            setTimeout(() => {
              triggerAiMove(latestFen, restoredFens.length - 1);
            }, 800);
          }
        }
      } else if (saved.gameMode === 'vs-ai') {
        setGameMode('vs-ai');
        const color = saved.playerColor || 'w';
        setPlayerColor(color);
        setIsFlipped(color === 'b');
        if (saved.aiDifficultyId) {
          setAiDifficultyId(saved.aiDifficultyId);
          const cfg =
            AI_DIFFICULTIES.find((d) => d.id === saved.aiDifficultyId) || AI_DIFFICULTIES[1];
          setAiDepth(cfg.depth);
          stockfish.setSkillLevel(cfg.skillLevel);
        }
        setFens(restoredFens);
        setCurrentPly(restoredFens.length - 1);
        if (saved.report) {
          setReport(saved.report);
        }
        if (chess.turn() !== color) {
          setTimeout(() => {
            triggerAiMove(latestFen, restoredFens.length - 1);
          }, 800);
        }
      }
    },
    [handleOpponentOnlineMove, handleOpponentResign, handleOpponentTimeout, triggerAiMove]
  );

  // Persist active game to localStorage and central cloud (Cross-Device Continuity)
  useEffect(() => {
    if (gameMode === 'ranked' && activeRankedSession) {
      if (gameOverMessage) {
        localStorage.removeItem(STORAGE_ACTIVE_RANKED_MATCH);
        userService.clearActiveGame();
      } else {
        const gamePayload: ActiveGameSyncData = {
          gameMode: 'ranked',
          session: activeRankedSession,
          fens,
          currentPly,
          playerColor: activeRankedSession.myColor,
          whiteTime,
          blackTime,
          lastTickTimestamp: Date.now(),
          report,
          updatedAt: new Date().toISOString()
        };
        try {
          localStorage.setItem(STORAGE_ACTIVE_RANKED_MATCH, JSON.stringify(gamePayload));
        } catch {
          // Ignore storage quota
        }
        userService.setActiveGame(gamePayload);
      }
    } else if (gameMode === 'vs-ai' && fens.length > 1) {
      if (gameOverMessage) {
        userService.clearActiveGame();
      } else {
        const gamePayload: ActiveGameSyncData = {
          gameMode: 'vs-ai',
          aiDifficultyId,
          playerColor,
          fens,
          currentPly,
          report,
          updatedAt: new Date().toISOString()
        };
        userService.setActiveGame(gamePayload);
      }
    }
  }, [
    gameMode,
    activeRankedSession,
    fens,
    currentPly,
    whiteTime,
    blackTime,
    gameOverMessage,
    report,
    aiDifficultyId,
    playerColor
  ]);

  // Restore active match on initial load from localStorage or authoritative cloud profile
  const hasRestoredRankedRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRankedRef.current) return;
    hasRestoredRankedRef.current = true;

    try {
      // 1. Try cloud active game first
      const cloudGame = currentUser.activeGame;
      if (cloudGame && Array.isArray(cloudGame.fens) && cloudGame.fens.length > 0) {
        const latestFen = cloudGame.fens[cloudGame.fens.length - 1];
        const chess = new Chess(latestFen);
        if (!chess.isGameOver()) {
          restoreActiveGame(cloudGame);
          return;
        }
      }

      // 2. Fallback to localStorage active match
      const raw = localStorage.getItem(STORAGE_ACTIVE_RANKED_MATCH);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.fens) && saved.fens.length > 0) {
        restoreActiveGame(saved);
      }
    } catch (err) {
      console.warn('Could not restore game session:', err);
    }
  }, [currentUser, restoreActiveGame]);

  // Detect remote active game changes while active (PC <-> Smartphone continuation)
  useEffect(() => {
    if (!currentUser.activeGame) {
      setRemoteActiveGamePrompt(null);
      return;
    }

    const remoteGame = currentUser.activeGame;
    const remoteTime = new Date(remoteGame.updatedAt).getTime();
    const isNewerThanLocal = remoteTime > lastLocalActionTimeRef.current + 2500;

    if (isNewerThanLocal) {
      // If we don't have an active match locally or remote has strictly more moves
      const localPly = fens.length - 1;
      const remotePly = remoteGame.fens ? remoteGame.fens.length - 1 : 0;

      if (!activeRankedSession && gameMode !== 'vs-ai') {
        setRemoteActiveGamePrompt(remoteGame);
      } else if (remotePly > localPly) {
        // User made a move on their other device -> seamlessly sync
        restoreActiveGame(remoteGame);
      }
    }
  }, [currentUser, activeRankedSession, gameMode, fens.length, restoreActiveGame]);

  const handleStartRankedSession = useCallback((session: RankedMatchSession) => {
    gameAnalyzer.cancel();
    stockfish.clearQueue();
    setIsAnalyzing(false);
    setIsPlaying(false);
    setGameOverMessage(null);
    setIsPreviewingLine(false);
    setPreviewFen(null);

    const tc = TIME_CONTROLS.find((t) => t.id === session.timeControlId) || TIME_CONTROLS[2];
    setActiveTimeControlId(tc.id);
    setWhiteTime(tc.initialSeconds);
    setBlackTime(tc.initialSeconds);
    setActiveRankedSession(session);
    multiplayerService.setCurrentSession(session);
    setGameMode('ranked');
    setPlayerColor(session.myColor);
    setIsFlipped(session.myColor === 'b');

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setFens([startFen]);
    setCurrentPly(0);

    const counts = {
      white: {} as Record<MoveClassification, number>,
      black: {} as Record<MoveClassification, number>
    };
    (Object.keys(CLASSIFICATION_CONFIGS) as MoveClassification[]).forEach((k) => {
      counts.white[k] = 0;
      counts.black[k] = 0;
    });

    const whiteName = session.myColor === 'w' ? currentUser.username : session.opponent.username;
    const blackName = session.myColor === 'b' ? currentUser.username : session.opponent.username;

    setReport({
      whiteAccuracy: 100,
      blackAccuracy: 100,
      whitePlayer: whiteName,
      blackPlayer: blackName,
      event: session.isOnlinePvP ? `Онлайн матч на рейтинг (${tc.label})` : `Рейтинговый матч против ИИ (${tc.label})`,
      date: new Date().toISOString().slice(0, 10),
      result: '*',
      moves: [],
      classificationSummary: counts
    });

    if (session.isOnlinePvP) {
      multiplayerService.joinGameRoom(
        session.roomId,
        handleOpponentOnlineMove,
        handleOpponentResign,
        () => {},
        handleOpponentTimeout,
        handleOpponentDrawOffer,
        handleOpponentDrawAccept
      );
    } else {
      if (session.opponent.aiDifficultyId) {
        const cfg = AI_DIFFICULTIES.find((d) => d.id === session.opponent.aiDifficultyId) || AI_DIFFICULTIES[1];
        setAiDepth(cfg.depth);
        stockfish.setSkillLevel(cfg.skillLevel);
      }
      if (session.myColor === 'b') {
        setTimeout(() => {
          triggerAiMove(startFen, 0);
        }, 600);
      }
    }
  }, [
    currentUser,
    handleOpponentOnlineMove,
    handleOpponentResign,
    handleOpponentTimeout,
    handleOpponentDrawOffer,
    handleOpponentDrawAccept,
    triggerAiMove
  ]);

  const handleAcceptIncomingChallenge = async (chal: DirectChallengePayload) => {
    setIncomingChallenge(null);
    const session = await multiplayerService.acceptDirectChallenge(
      chal,
      handleOpponentOnlineMove,
      handleOpponentResign,
      () => {},
      handleOpponentTimeout,
      handleOpponentDrawOffer,
      handleOpponentDrawAccept
    );
    handleStartRankedSession(session);
  };

  const handleChallengePlayer = async (targetUser: UserProfile) => {
    try {
      const roomId = await multiplayerService.sendDirectChallenge(targetUser.id);
      const session: RankedMatchSession = {
        roomId,
        isOnlinePvP: true,
        myColor: 'w',
        opponent: {
          id: targetUser.id,
          username: targetUser.username,
          elo: targetUser.elo,
          avatarUrl: targetUser.avatarUrl,
          isAi: false
        }
      };
      await multiplayerService.joinGameRoom(
        roomId,
        handleOpponentOnlineMove,
        handleOpponentResign,
        () => {},
        handleOpponentTimeout,
        handleOpponentDrawOffer,
        handleOpponentDrawAccept
      );
      handleStartRankedSession(session);
    } catch (err) {
      console.error('Challenge player error:', err);
    }
  };

  const handleChangeMode = (newMode: GameMode) => {
    gameAnalyzer.cancel();
    stockfish.clearQueue();
    setIsAnalyzing(false);

    if (newMode === 'ranked') {
      const isGuest = !currentUser.isRegistered || currentUser.authProvider === 'guest';
      if (isGuest) {
        setPendingPostAuthAction('ranked');
        setAuthPromptMessage('Для участия в соревновательном рейтинге и сохранения ELO необходима регистрация или вход в профиль.');
        setIsAuthOpen(true);
        sound.speak('Для входа в рейтинг требуется регистрация.');
        return;
      }
      setGameMode(newMode);
      if (!activeRankedSession || Boolean(gameOverMessage)) {
        setIsMatchmakingOpen(true);
      }
      return;
    }

    setGameMode(newMode);
    if (newMode === 'vs-ai') {
      startVsAiGame(playerColor);
    } else if (newMode === 'pvp') {
      startPvpGame();
    } else if (newMode === 'learn' || newMode === 'puzzles') {
      if (activeLearnTab === 'openings') {
        applyOpeningStep(currentOpening, openingStepIndex);
      } else {
        startPuzzlesMode(currentPuzzleIndex);
      }
    } else {
      setGameOverMessage(null);
      loadPgnIntoState(currentPgn, gameTitle);
      runAnalysis(currentPgn, analysisDepth);
    }
  };

  const handleTogglePreviewLine = () => {
    if (isPreviewingLine) {
      setIsPreviewingLine(false);
      setPreviewFen(null);
      return;
    }

    if (currentPly > 0 && report && report.moves[currentPly - 1]) {
      const move = report.moves[currentPly - 1];
      if (move.bestMoveUci) {
        try {
          const tempChess = new Chess(move.fenBefore);
          tempChess.move({
            from: move.bestMoveUci.substring(0, 2),
            to: move.bestMoveUci.substring(2, 4),
            promotion: move.bestMoveUci.length > 4 ? move.bestMoveUci.substring(4, 5) : undefined
          });
          setPreviewFen(tempChess.fen());
          setIsPreviewingLine(true);
        } catch {
          setIsPreviewingLine(false);
        }
      }
    }
  };

  const handleLoadNewPgn = (newPgn: string, depth: number) => {
    setCurrentPgn(newPgn);
    setAnalysisDepth(depth);
    setReport(null);
    setGameMode('review');
    loadPgnIntoState(newPgn, 'Пользовательская партия');
    runAnalysis(newPgn, depth);
  };

  const handleReset = () => {
    userService.clearActiveGame();
    localStorage.removeItem(STORAGE_ACTIVE_RANKED_MATCH);
    setRemoteActiveGamePrompt(null);

    if (gameMode === 'ranked') {
      setIsMatchmakingOpen(true);
    } else if (gameMode === 'vs-ai') {
      startVsAiGame(playerColor);
    } else if (gameMode === 'pvp') {
      startPvpGame();
    } else if (gameMode === 'learn' || gameMode === 'puzzles') {
      if (activeLearnTab === 'openings') {
        handleResetOpening();
      } else {
        handleRandomPuzzle();
      }
    } else {
      gameAnalyzer.cancel();
      stockfish.clearQueue();
      setReport(null);
      setGameOverMessage(null);
      loadPgnIntoState(currentPgn);
    }
  };

  const currentMove: MoveAnalysis | undefined =
    currentPly > 0 && report?.moves ? report.moves[currentPly - 1] : undefined;

  const currentFen = previewFen || fens[currentPly] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Always-live evaluation for EvalBar ("полоса доминации") across all modes
  const cachedCurrentEval = positionEvalCacheRef.current.get(currentFen);
  const fallbackQuickEval = quickEvaluateFen(currentFen);
  const evalCp = currentMove
    ? currentMove.evalAfter
    : cachedCurrentEval
    ? cachedCurrentEval.cp
    : currentPly === 0 && gameMode !== 'puzzles'
    ? 0
    : fallbackQuickEval.cp;
  const mate = currentMove
    ? currentMove.mateAfter
    : cachedCurrentEval
    ? cachedCurrentEval.mate
    : fallbackQuickEval.mate;

  const canUndoMove =
    ((gameMode === 'review' || gameMode === 'vs-ai' || gameMode === 'pvp') &&
      currentPly > 0 &&
      !(gameMode === 'vs-ai' && playerColor === 'b' && currentPly <= 1)) ||
    (gameMode === 'learn' && activeLearnTab === 'openings' && openingStepIndex > 0);

  const openingsArrow =
    gameMode === 'learn' && activeLearnTab === 'openings' && currentOpening?.moves[openingStepIndex]
      ? {
          from: currentOpening.moves[openingStepIndex].from,
          to: currentOpening.moves[openingStepIndex].to
        }
      : null;

  const currentTurnColor: 'w' | 'b' = (() => {
    const latestFen = fens[fens.length - 1] || currentFen;
    return (latestFen.split(' ')[1] as 'w' | 'b') || 'w';
  })();

  const isClockActive = gameMode === 'ranked' && Boolean(activeRankedSession);
  const myColor: 'w' | 'b' = gameMode === 'ranked' && activeRankedSession
    ? activeRankedSession.myColor
    : gameMode === 'vs-ai'
      ? playerColor
      : isFlipped
        ? 'b'
        : 'w';
  const opponentColor: 'w' | 'b' = myColor === 'w' ? 'b' : 'w';

  const currentAiDiff = AI_DIFFICULTIES.find((d) => d.id === aiDifficultyId) || AI_DIFFICULTIES[0];

  const opponentBarInfo: BoardPlayerBarInfo = (() => {
    if (gameMode === 'ranked' && activeRankedSession) {
      return {
        id: activeRankedSession.opponent.id,
        name: activeRankedSession.opponent.username,
        elo: activeRankedSession.opponent.elo,
        isAi: activeRankedSession.opponent.isAi,
        color: opponentColor,
        timeRemaining: isClockActive ? (opponentColor === 'w' ? whiteTime : blackTime) : null,
        isTurn: !gameOverMessage && currentTurnColor === opponentColor
      };
    }
    if (gameMode === 'vs-ai') {
      return {
        id: `ai-${currentAiDiff.id}`,
        name: `Stockfish (${currentAiDiff.name})`,
        elo: currentAiDiff.eloApprox,
        isAi: true,
        color: opponentColor,
        timeRemaining: null,
        isTurn: !gameOverMessage && currentTurnColor === opponentColor
      };
    }
    if (gameMode === 'pvp') {
      return {
        name: opponentColor === 'w' ? 'Игрок 1 (Белые)' : 'Игрок 2 (Черные)',
        isAi: false,
        color: opponentColor,
        timeRemaining: null,
        isTurn: !gameOverMessage && currentTurnColor === opponentColor
      };
    }
    if (gameMode === 'puzzles') {
      const currentPuzzle = PUZZLES[currentPuzzleIndex] || PUZZLES[0];
      return {
        name: `Задача: ${currentPuzzle.title}`,
        elo: currentPuzzle.rating,
        isAi: true,
        color: opponentColor,
        timeRemaining: null,
        isTurn: false
      };
    }
    return {
      name: opponentColor === 'w' ? (report?.whitePlayer || 'Белые') : (report?.blackPlayer || 'Черные'),
      isAi: false,
      color: opponentColor,
      timeRemaining: null,
      isTurn: currentTurnColor === opponentColor
    };
  })();

  const playerBarInfo: BoardPlayerBarInfo = (() => {
    if (gameMode === 'pvp') {
      return {
        name: myColor === 'w' ? 'Игрок 1 (Белые)' : 'Игрок 2 (Черные)',
        isAi: false,
        color: myColor,
        timeRemaining: null,
        isTurn: !gameOverMessage && currentTurnColor === myColor
      };
    }
    return {
      id: currentUser.id,
      name: currentUser.username,
      elo: currentUser.elo,
      isAi: false,
      color: myColor,
      timeRemaining: isClockActive ? (myColor === 'w' ? whiteTime : blackTime) : null,
      isTurn: !gameOverMessage && currentTurnColor === myColor
    };
  })();

  const isOpponentFriend = Boolean(
    opponentBarInfo.id && !opponentBarInfo.isAi && (currentUser.friends || []).includes(opponentBarInfo.id)
  );

  const handleToggleOpponentFriend = () => {
    if (!opponentBarInfo.id || opponentBarInfo.isAi) return;
    const isNowFriend = userService.toggleFriend(opponentBarInfo.id);
    setCurrentUser({ ...userService.getCurrentUser() });
    if (isNowFriend) {
      sound.playMove();
    }
  };

  const handleOpenOpponentProfile = () => {
    if (!opponentBarInfo.id || opponentBarInfo.isAi) {
      setLeaderboardTab('friends');
      setIsLeaderboardOpen(true);
      return;
    }
    const found = userService.getUserById(opponentBarInfo.id);
    if (found) {
      setSelectedProfileUser(found);
    } else {
      setSelectedProfileUser({
        id: opponentBarInfo.id,
        username: opponentBarInfo.name,
        isRegistered: true,
        elo: opponentBarInfo.elo || 100,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 1 },
        createdAt: new Date().toISOString()
      });
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0A0A0A] text-[#EDEDED] font-sans relative">
      <ScoreDeltaNotification data={scoreDelta} onDismiss={() => setScoreDelta(null)} />
      <Header
        gameMode={gameMode}
        onChangeMode={handleChangeMode}
        playerColor={playerColor}
        onChangePlayerColor={(color) => {
          setPlayerColor(color);
          startVsAiGame(color);
        }}
        aiDifficultyId={aiDifficultyId}
        onChangeAiDifficulty={handleChangeAiDifficulty}
        onOpenLoadModal={() => setIsLoadModalOpen(true)}
        onReset={handleReset}
        isEngineReady={isEngineReady}
        gameTitle={gameTitle}
        isAiThinking={isAiThinking}
        currentUser={currentUser}
        scoreDelta={scoreDelta}
        isCloudConnected={isCloudConnected}
        onOpenLeaderboard={() => {
          setLeaderboardTab('elo');
          setIsLeaderboardOpen(true);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        canUndoMove={canUndoMove}
        onUndoMove={handleUndoMove}
      />

      {/* Floating cross-device game resume notification */}
      {remoteActiveGamePrompt && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 p-3 rounded-xl bg-[#141414] border border-[#1baca6] shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top max-w-md w-[92%] sm:w-full">
          <RotateCw className="w-4 h-4 text-[#1baca6] shrink-0" />
          <div className="flex-1 truncate">
            <span className="text-xs font-mono text-white block truncate">
              Партия с другого устройства ({remoteActiveGamePrompt.gameMode === 'ranked' ? 'Рейтинг' : 'Игра с ИИ'}, Ход {remoteActiveGamePrompt.currentPly})
            </span>
            <span className="text-[10px] font-mono text-[#888888] block">
              Синхронизировано из облака Supabase
            </span>
          </div>
          <button
            onClick={() => {
              restoreActiveGame(remoteActiveGamePrompt);
              setRemoteActiveGamePrompt(null);
            }}
            className="px-2.5 py-1 rounded bg-[#1baca6] text-black font-mono font-bold text-xs hover:bg-[#20c2bc] transition-colors shrink-0"
          >
            Продолжить
          </button>
          <button
            onClick={() => setRemoteActiveGamePrompt(null)}
            className="px-2 py-1 rounded bg-[#222222] text-[#888888] font-mono text-xs hover:text-white transition-colors shrink-0"
          >
            Скрыть
          </button>
        </div>
      )}

      {/* Floating incoming friend challenge notification */}
      {incomingChallenge && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 p-3 rounded-xl bg-[#141414] border border-[#1baca6] shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top max-w-sm w-[92%] sm:w-full">
          <Swords className="w-4 h-4 text-[#1baca6] shrink-0" />
          <div className="flex-1 truncate">
            <span className="text-xs font-mono text-white block truncate">
              Вызов от <strong>{incomingChallenge.fromUser.username}</strong>
            </span>
            <span className="text-[10px] font-mono text-[#888888]">
              {incomingChallenge.fromUser.elo} ELO
            </span>
          </div>
          <button
            onClick={() => handleAcceptIncomingChallenge(incomingChallenge)}
            className="px-2.5 py-1 rounded bg-[#1baca6] text-black font-mono font-bold text-xs hover:bg-[#20c2bc] transition-colors shrink-0"
          >
            Принять
          </button>
          <button
            onClick={() => setIncomingChallenge(null)}
            className="px-2 py-1 rounded bg-[#222222] text-[#888888] font-mono text-xs hover:text-white transition-colors shrink-0"
          >
            Отклонить
          </button>
        </div>
      )}

      {/* Floating incoming draw offer notification */}
      {incomingDrawOffer && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 p-3 rounded-xl bg-[#141414] border border-[#1baca6] shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top max-w-sm w-[92%] sm:w-full">
          <Handshake className="w-4 h-4 text-[#1baca6] shrink-0" />
          <div className="flex-1 truncate">
            <span className="text-xs font-mono text-white block truncate">
              <strong>{incomingDrawOffer.fromUser}</strong> предлагает ничью
            </span>
            <span className="text-[10px] font-mono text-[#888888]">
              Согласиться на ничью в текущей партии?
            </span>
          </div>
          <button
            onClick={() => {
              multiplayerService.sendDrawAccept();
              if (activeRankedSession) {
                const opp = activeRankedSession.opponent;
                const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'draw');
                if (activeRankedSession.isOnlinePvP) {
                  userService.applyOpponentMatchResult(
                    opp.id,
                    opp.username,
                    opp.elo,
                    matchRes.oldElo,
                    'draw'
                  );
                }
                setCurrentUser({ ...userService.getCurrentUser() });
                sound.playVictory();
                sound.speak('Вы приняли ничью.');
                setGameOverMessage(`Ничья по соглашению сторон • ${matchRes.message}`);
              }
              setIncomingDrawOffer(null);
            }}
            className="px-2.5 py-1 rounded bg-[#1baca6] text-black font-mono font-bold text-xs hover:bg-[#20c2bc] transition-colors shrink-0"
          >
            Принять
          </button>
          <button
            onClick={() => setIncomingDrawOffer(null)}
            className="px-2 py-1 rounded bg-[#222222] text-[#888888] font-mono text-xs hover:text-white transition-colors shrink-0"
          >
            Отклонить
          </button>
        </div>
      )}

      <main className="flex-1 grid grid-cols-1 grid-rows-[auto_1fr] landscape:grid-rows-1 landscape:grid-cols-[1fr_360px] md:landscape:grid-cols-[1fr_420px] lg:grid-rows-1 lg:grid-cols-[1fr_450px] xl:grid-cols-[1fr_490px] overflow-hidden">
        <section className="relative h-full flex items-center justify-center overflow-hidden bg-[#0A0A0A] px-1 py-1 sm:p-2">
          <ChessboardArea
            fen={currentFen}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped((prev) => !prev)}
            currentMove={isMistakeReplayActive ? undefined : (currentMove || undefined)}
            currentPly={currentPly}
            totalPlies={Math.max(0, fens.length - 1)}
            onGoToStart={() => handleSelectPly(0)}
            onGoToPrev={() => handleSelectPly(currentPly - 1)}
            onGoToNext={() => handleSelectPly(currentPly + 1)}
            onGoToEnd={() => handleSelectPly(fens.length - 1)}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((prev) => !prev)}
            soundEnabled={soundEnabled}
            onToggleSound={() => {
              setSoundEnabled(!soundEnabled);
              sound.enabled = !soundEnabled;
            }}
            evalCp={evalCp}
            mate={mate}
            bestMoveUci={isMistakeReplayActive ? undefined : currentMove?.bestMoveUci}
            onPieceDrop={handlePieceDrop}
            isAiThinking={isAiThinking}
            gameOverMessage={isMistakeReplayActive ? null : gameOverMessage}
            onRestartGame={() => handleReset()}
            moveAccent={isMistakeReplayActive ? null : moveAccent}
            showEngineArrows={!isMistakeReplayActive && gameMode !== 'ranked' && gameMode !== 'pvp' && !gameOverMessage}
            openingsArrow={isMistakeReplayActive ? null : openingsArrow}
            topPlayer={opponentBarInfo}
            bottomPlayer={playerBarInfo}
            isOpponentFriend={isOpponentFriend}
            onToggleOpponentFriend={handleToggleOpponentFriend}
            onOpenTopPlayerProfile={handleOpenOpponentProfile}
            canResign={!isMistakeReplayActive && (gameMode === 'ranked' || gameMode === 'vs-ai') && !gameOverMessage && fens.length > 1}
            onResignGame={handleResignCurrentGame}
            canOfferDraw={!isMistakeReplayActive && (gameMode === 'vs-ai' || gameMode === 'ranked' || gameMode === 'pvp') && !gameOverMessage && fens.length > 4}
            onOfferDraw={handleOfferDraw}
            canUndoMove={!isMistakeReplayActive && canUndoMove}
            onUndoMove={handleUndoMove}
            mistakeCount={playerMistakes.length}
            onStartMistakeReplay={handleStartMistakeReplay}
            activeMistake={activeMistake}
            onNextMistake={handleNextMistake}
            onRevealMistakePieceHint={handleRevealMistakePieceHint}
            onRevealMistakeSolution={handleRevealMistakeSolution}
            onExitMistakeReplay={handleExitMistakeReplay}
            timeControlBadge={activeTimeControl?.label}
          />
        </section>

        <section className="h-full overflow-hidden">
          {gameMode === 'learn' || gameMode === 'puzzles' ? (
            <LearnPanel
              activeTab={activeLearnTab}
              onTabChange={(tab) => {
                setActiveLearnTab(tab);
                if (tab === 'openings') {
                  applyOpeningStep(currentOpening, openingStepIndex);
                } else {
                  startPuzzlesMode(currentPuzzleIndex);
                }
              }}
              puzzle={PUZZLES[currentPuzzleIndex] || PUZZLES[0]}
              puzzleStatus={puzzleStatus}
              puzzleCurrentStep={puzzleStep}
              mistakeAnalysis={puzzleMistakeAnalysis}
              onNextPuzzle={handleNextPuzzle}
              onRandomPuzzle={handleRandomPuzzle}
              onRetryPuzzle={handleRetryPuzzle}
              onShowPuzzleSolution={handleShowSolution}
              solvedCount={solvedPuzzlesCount}
              totalAttempted={totalAttemptedPuzzles}
              filterDifficulty={puzzleDifficultyFilter}
              onChangeFilter={setPuzzleDifficultyFilter}
              currentOpening={currentOpening}
              openingStepIndex={openingStepIndex}
              onSelectOpening={handleSelectOpening}
              onOpeningStepChange={handleOpeningStepChange}
              onResetOpening={handleResetOpening}
            />
          ) : (
            <AnalysisPanel
              report={report}
              currentPly={currentPly}
              onSelectPly={handleSelectPly}
              progress={progress}
              isAnalyzing={isAnalyzing}
              onCancelAnalysis={() => gameAnalyzer.cancel()}
              isPreviewingLine={isPreviewingLine}
              onTogglePreviewLine={handleTogglePreviewLine}
              hideEngineHints={false}
              mistakeCount={playerMistakes.length}
              onStartMistakeReplay={handleStartMistakeReplay}
            />
          )}
        </section>
      </main>

      <LoadGameModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoadPgn={handleLoadNewPgn}
        currentDepth={analysisDepth}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUser={currentUser}
        onSelectUser={(u) => setSelectedProfileUser(u)}
        initialTab={leaderboardTab}
        onChallengePlayer={handleChallengePlayer}
        onUserChanged={(u) => setCurrentUser(u)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthPromptMessage(null);
          setPendingPostAuthAction(null);
        }}
        currentUser={currentUser}
        promptMessage={authPromptMessage}
        onUserChanged={(u) => {
          setCurrentUser({ ...u });
          if (u.isRegistered && u.authProvider !== 'guest' && pendingPostAuthAction === 'ranked') {
            setPendingPostAuthAction(null);
            setAuthPromptMessage(null);
            setIsAuthOpen(false);
            setGameMode('ranked');
            setIsMatchmakingOpen(true);
            sound.speak('Добро пожаловать в рейтинг!');
          }
        }}
      />

      <MatchmakingModal
        isOpen={isMatchmakingOpen}
        onClose={() => setIsMatchmakingOpen(false)}
        currentUser={currentUser}
        onStartMatch={handleStartRankedSession}
      />

      <UserProfileModal
        isOpen={Boolean(selectedProfileUser)}
        onClose={() => setSelectedProfileUser(null)}
        targetUser={selectedProfileUser}
        currentUser={currentUser}
        onChallengePlayer={handleChallengePlayer}
      />
    </div>
  );
};

export default App;
