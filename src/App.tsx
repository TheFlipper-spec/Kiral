import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Header } from './components/Header';
import type { GameMode } from './components/Header';
import { ChessboardArea } from './components/ChessboardArea';
import type { MoveAccentInfo } from './components/ChessboardArea';
import { AnalysisPanel } from './components/AnalysisPanel';
import { PuzzlePanel } from './components/PuzzlePanel';
import { LoadGameModal } from './components/LoadGameModal';
import { gameAnalyzer, uciToSan } from './engine/gameAnalyzer';
import type { AnalysisProgress } from './engine/gameAnalyzer';
import { stockfish } from './engine/stockfishService';
import { sound } from './services/soundService';
import { SAMPLE_GAMES } from './data/sampleGames';
import { PUZZLES } from './data/puzzles';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AuthModal } from './components/AuthModal';
import { ScoreDeltaNotification } from './components/ScoreDeltaNotification';
import type { ScoreDeltaData } from './components/ScoreDeltaNotification';
import { MatchmakingModal } from './components/MatchmakingModal';
import { UserProfileModal } from './components/UserProfileModal';
import { multiplayerService } from './services/multiplayerService';
import type { RankedMatchSession, MovePayload, DirectChallengePayload } from './services/multiplayerService';
import { Swords } from 'lucide-react';
import { userService } from './services/userService';
import type { UserProfile } from './services/userService';
import { cloudDatabase } from './services/cloudDatabase';
import { classifySingleMove, calculatePlayerAccuracy } from './engine/evalFormulas';
import { CLASSIFICATION_CONFIGS, AI_DIFFICULTIES } from './types/chess';
import type { GameReport, MoveAnalysis, MoveClassification, EngineEvaluation } from './types/chess';

export const App: React.FC = () => {
  // User profile & leaderboards
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => userService.getCurrentUser());
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [scoreDelta, setScoreDelta] = useState<ScoreDeltaData | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => cloudDatabase.isConnected);

  useEffect(() => {
    const updateCloud = () => setIsCloudConnected(cloudDatabase.isConnected);
    updateCloud();
    const interval = setInterval(updateCloud, 5000);
    return () => clearInterval(interval);
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

  // Ranked & Multiplayer state
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState<boolean>(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserProfile | null>(null);
  const [activeRankedSession, setActiveRankedSession] = useState<RankedMatchSession | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<DirectChallengePayload | null>(null);
  const activeRankedSessionRef = useRef<RankedMatchSession | null>(null);
  activeRankedSessionRef.current = activeRankedSession;

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
  const [solvedPuzzlesCount, setSolvedPuzzlesCount] = useState<number>(0);
  const [totalAttemptedPuzzles, setTotalAttemptedPuzzles] = useState<number>(0);
  const [puzzleDifficultyFilter, setPuzzleDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

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

  // AI Move Engine
  const triggerAiMove = useCallback(
    async (fenToRespondTo: string, currentPlyCount: number, existingEval?: EngineEvaluation) => {
      const chess = new Chess(fenToRespondTo);
      if (chess.isGameOver()) {
        setGameOverMessage(checkGameOverStatus(chess));
        return;
      }

      setIsAiThinking(true);
      try {
        const evalResult = existingEval || (await stockfish.evaluate(fenToRespondTo, aiDepth));
        let bestMove = evalResult.bestMove;

        // Fallback: If engine didn't return a move, pick legal move
        if (!bestMove || bestMove.length < 4) {
          const legalMoves = chess.moves({ verbose: true });
          if (legalMoves.length > 0) {
            const capture = legalMoves.find((m) => m.captured);
            const chosen = capture || legalMoves[Math.floor(Math.random() * legalMoves.length)];
            bestMove = `${chosen.from}${chosen.to}${chosen.promotion || ''}`;
          }
        }

        if (bestMove && bestMove.length >= 4) {
          const from = bestMove.substring(0, 2);
          const to = bestMove.substring(2, 4);
          const promotion = bestMove.length > 4 ? bestMove[4] : undefined;

          // 1.5 second pause so player sees move accent and hears speech feedback
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const aiMoveResult = chess.move({ from, to, promotion });
          if (aiMoveResult) {
            const newFen = chess.fen();
            const newFens = [...fensRef.current.slice(0, currentPlyCount + 1), newFen];
            setFens(newFens);
            const nextPly = currentPlyCount + 1;
            setCurrentPly(nextPly);

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
              if (gameMode === 'ranked' && activeRankedSessionRef.current) {
                const opp = activeRankedSessionRef.current.opponent;
                if (chess.isCheckmate()) {
                  const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'loss');
                  setCurrentUser(userService.getCurrentUser());
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
                  setCurrentUser(userService.getCurrentUser());
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
              } else if (gameMode === 'vs-ai') {
                // Casual practice vs AI - no ELO modification
                if (chess.isCheckmate()) {
                  userService.recordCasualMatch('loss');
                  setCurrentUser(userService.getCurrentUser());
                  sound.playDefeat();
                  sound.speak('Поражение в тренировочном матче');
                } else if (chess.isDraw() || chess.isStalemate()) {
                  userService.recordCasualMatch('draw');
                  setCurrentUser(userService.getCurrentUser());
                }
                setGameOverMessage(over);
              } else {
                setGameOverMessage(over);
              }
            }

            // Append AI move to report
            const analysis: MoveAnalysis = {
              ply: currentPlyCount,
              moveNumber: Math.floor(currentPlyCount / 2) + 1,
              turn: aiMoveResult.color,
              san: aiMoveResult.san,
              uci: bestMove,
              from: aiMoveResult.from,
              to: aiMoveResult.to,
              piece: aiMoveResult.piece,
              captured: aiMoveResult.captured,
              fenBefore: fenToRespondTo,
              fenAfter: newFen,
              evalBefore: evalResult.cp,
              evalAfter: evalResult.cp,
              mateBefore: evalResult.mate,
              mateAfter: evalResult.mate,
              winPercentBefore: 50,
              winPercentAfter: 50,
              winPercentLoss: 0,
              centipawnLoss: 0,
              classification: 'best',
              classificationReason: 'Ход Stockfish',
              bestMoveUci: bestMove,
              bestMoveSan: aiMoveResult.san,
              bestLinePv: evalResult.pv,
              depth: evalResult.depth
            };

            setReport((prev) => {
              const existingMoves = prev ? [...prev.moves.slice(0, currentPlyCount)] : [];
              existingMoves.push(analysis);

              const counts = {
                white: {} as Record<MoveClassification, number>,
                black: {} as Record<MoveClassification, number>
              };
              (Object.keys(CLASSIFICATION_CONFIGS) as MoveClassification[]).forEach((k) => {
                counts.white[k] = 0;
                counts.black[k] = 0;
              });
              existingMoves.forEach((m) => {
                if (m.turn === 'w') counts.white[m.classification]++;
                else counts.black[m.classification]++;
              });

              return {
                whiteAccuracy: calculatePlayerAccuracy(existingMoves, 'w'),
                blackAccuracy: calculatePlayerAccuracy(existingMoves, 'b'),
                whitePlayer: prev?.whitePlayer || (playerColor === 'w' ? 'Вы' : 'Stockfish'),
                blackPlayer: prev?.blackPlayer || (playerColor === 'b' ? 'Вы' : 'Stockfish'),
                event: 'Матч против Stockfish',
                date: new Date().toISOString().slice(0, 10),
                result: '*',
                moves: existingMoves,
                classificationSummary: counts
              };
            });
          }
        }
      } catch (err) {
        console.error('AI Turn error:', err);
      } finally {
        setIsAiThinking(false);
      }
    },
    [aiDepth, playerColor]
  );

  // Player Move Handler
  const handlePieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (isAiThinkingRef.current) return false;

    const currentBoardFen = previewFen || fens[currentPly] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const chess = new Chess(currentBoardFen);

    // In VS AI mode, restrict moves to player's turn
    if (gameMode === 'vs-ai' && chess.turn() !== playerColor) {
      return false;
    }

    // In Ranked mode, restrict moves to player's turn
    if (gameMode === 'ranked' && chess.turn() !== playerColor) {
      return false;
    }

    // In Puzzle mode, handle puzzle step validation
    if (gameMode === 'puzzles') {
      const activePuzzle = PUZZLES[currentPuzzleIndex] || PUZZLES[0];
      if (!activePuzzle || puzzleStatus === 'solved') return false;

      let pMove: Move | null = null;
      try {
        pMove = chess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q'
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

        if (pMove.captured) sound.playCapture();
        else if (nextFen.includes('+')) sound.playCheck();
        else sound.playMove();

        const opponentStep = puzzleStep + 1;
        if (opponentStep < activePuzzle.solutionMoves.length) {
          setPuzzleStep(opponentStep + 1);
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
                  setCurrentUser(userService.getCurrentUser());
                  sound.playVictory();
                  sound.speak(`Задача решена! Плюс ${pRes.pointsAwarded} баллов.`);
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
          setCurrentUser(userService.getCurrentUser());
          sound.playVictory();
          sound.speak(`Задача решена! Плюс ${pRes.pointsAwarded} баллов.`);
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
        setPuzzleStatus('failed');
        sound.playBlunder();
        sound.speak('Неверный ход');
        return false;
      }
    }

    let moveResult: Move | null = null;
    try {
      moveResult = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });
    } catch {
      return false;
    }

    if (!moveResult) return false;

    // Cancel running review
    if (isAnalyzing) {
      gameAnalyzer.cancel();
      setIsAnalyzing(false);
    }

    const newFen = chess.fen();
    const newFens = [...fens.slice(0, currentPly + 1), newFen];
    setFens(newFens);

    const nextPly = currentPly + 1;
    setCurrentPly(nextPly);
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
        san: moveResult.san
      });
    }

    const overStatus = checkGameOverStatus(chess);
    if (overStatus) {
      if (gameMode === 'ranked' && activeRankedSession) {
        const opp = activeRankedSession.opponent;
        if (chess.isCheckmate()) {
          const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'win');
          setCurrentUser(userService.getCurrentUser());
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
          setCurrentUser(userService.getCurrentUser());
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
        // Casual practice vs AI - no ELO modification
        if (chess.isCheckmate()) {
          userService.recordCasualMatch('win');
          setCurrentUser(userService.getCurrentUser());
          sound.playVictory();
          sound.speak('Победа в тренировочном матче!');
        } else if (chess.isDraw() || chess.isStalemate()) {
          userService.recordCasualMatch('draw');
          setCurrentUser(userService.getCurrentUser());
        }
        setGameOverMessage(overStatus);
      } else {
        setGameOverMessage(overStatus);
      }
    } else {
      setGameOverMessage(null);
      // Trigger AI turn if ranked AI or vs-ai
      if (
        (gameMode === 'vs-ai' || (gameMode === 'ranked' && !activeRankedSession?.isOnlinePvP)) &&
        chess.turn() !== playerColor
      ) {
        setTimeout(() => {
          triggerAiMove(newFen, nextPly);
        }, 300);
      }
    }

    const plyIndex = currentPly;
    const fenBefore = currentBoardFen;
    const fenAfter = newFen;
    const moveSan = moveResult.san;
    const moveUci = `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`;
    const turn = moveResult.color;
    const piece = moveResult.piece;
    const captured = moveResult.captured;

    const currentMoveObj = currentPly > 0 && report?.moves ? report.moves[currentPly - 1] : undefined;
    const prevEval = currentMoveObj ? currentMoveObj.evalAfter : 0;
    const prevMate = currentMoveObj ? currentMoveObj.mateAfter : null;
    const prevBestUci = currentMoveObj?.bestMoveUci || moveUci;

    const evalDepth = gameMode === 'vs-ai' ? aiDepth : 12;

    // Real-time evaluation of player move
    stockfish.evaluate(fenAfter, evalDepth).then((evalResult) => {
      const classResult = classifySingleMove({
        ply: plyIndex,
        turn,
        san: moveSan,
        uci: moveUci,
        piece,
        captured,
        fenBefore,
        fenAfter,
        evalBefore: prevEval,
        evalAfter: evalResult.cp,
        mateBefore: prevMate,
        mateAfter: evalResult.mate,
        bestMoveUci: prevBestUci
      });

      const analysis: MoveAnalysis = {
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
        evalBefore: prevEval,
        evalAfter: evalResult.cp,
        mateBefore: prevMate,
        mateAfter: evalResult.mate,
        winPercentBefore: classResult.winBefore,
        winPercentAfter: classResult.winAfter,
        winPercentLoss: classResult.winLoss,
        centipawnLoss: classResult.cpLoss,
        classification: classResult.classification,
        classificationReason: classResult.reason,
        bestMoveUci: evalResult.bestMove,
        bestMoveSan: uciToSan(fenAfter, evalResult.bestMove),
        bestLinePv: evalResult.pv,
        depth: evalResult.depth
      };

      setReport((prev) => {
        const existingMoves = prev ? [...prev.moves.slice(0, plyIndex)] : [];
        existingMoves.push(analysis);

        const counts = {
          white: {} as Record<MoveClassification, number>,
          black: {} as Record<MoveClassification, number>
        };
        (Object.keys(CLASSIFICATION_CONFIGS) as MoveClassification[]).forEach((k) => {
          counts.white[k] = 0;
          counts.black[k] = 0;
        });
        existingMoves.forEach((m) => {
          if (m.turn === 'w') counts.white[m.classification]++;
          else counts.black[m.classification]++;
        });

        return {
          whiteAccuracy: calculatePlayerAccuracy(existingMoves, 'w'),
          blackAccuracy: calculatePlayerAccuracy(existingMoves, 'b'),
          whitePlayer: prev?.whitePlayer || (gameMode === 'vs-ai' ? (playerColor === 'w' ? 'Вы' : 'Stockfish') : 'Белые'),
          blackPlayer: prev?.blackPlayer || (gameMode === 'vs-ai' ? (playerColor === 'b' ? 'Вы' : 'Stockfish') : 'Черные'),
          event: gameMode === 'vs-ai' ? 'Матч против Stockfish' : prev?.event || 'Интерактивный разбор',
          date: new Date().toISOString().slice(0, 10),
          result: '*',
          moves: existingMoves,
          classificationSummary: counts
        };
      });

      // 1.5s Move Status Accent & Voice announcement
      const isCheck = chess.inCheck();
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
      }, 1500);

      // Voice synthesis via Web Speech API
      let voiceAnnouncement = meta.nameRu;
      if (isCheck) {
        voiceAnnouncement += ', Шах!';
      }
      sound.speak(voiceAnnouncement);

      // In vs-ai mode, trigger AI counter-move
      if (gameMode === 'vs-ai' && !chess.isGameOver()) {
        triggerAiMove(newFen, nextPly, evalResult);
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
      setPuzzleStatus('playing');
      setPuzzleStep(0);
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
      sound.speak('Вот решение задачи');
    } catch (err) {
      console.error(err);
    }
  }, [currentPuzzleIndex]);

  const handleChangeAiDifficulty = (diffId: string) => {
    setAiDifficultyId(diffId);
    const cfg = AI_DIFFICULTIES.find((d) => d.id === diffId);
    if (cfg) {
      setAiDepth(cfg.depth);
      stockfish.setSkillLevel(cfg.skillLevel);
    }
  };

  const handleOpponentOnlineMove = useCallback((movePayload: MovePayload) => {
    const currentBoardFen = fensRef.current[currentPlyRef.current] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const chess = new Chess(currentBoardFen);
    try {
      const res = chess.move({
        from: movePayload.from,
        to: movePayload.to,
        promotion: (movePayload.promotion as any) || undefined
      });
      if (res) {
        const nextFen = chess.fen();
        const updatedFens = [...fensRef.current.slice(0, currentPlyRef.current + 1), nextFen];
        setFens(updatedFens);
        setCurrentPly(updatedFens.length - 1);
        if (res.captured) sound.playCapture();
        else if (nextFen.includes('+') || chess.inCheck()) {
          sound.playCheck();
          sound.speak('Вам шах!');
        } else sound.playMove();

        if (chess.isGameOver()) {
          const over = checkGameOverStatus(chess);
          if (activeRankedSessionRef.current) {
            const opp = activeRankedSessionRef.current.opponent;
            if (chess.isCheckmate()) {
              const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'loss');
              setCurrentUser(userService.getCurrentUser());
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
              setCurrentUser(userService.getCurrentUser());
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
  }, []);

  const handleOpponentResign = useCallback(() => {
    if (activeRankedSessionRef.current) {
      const opp = activeRankedSessionRef.current.opponent;
      const matchRes = userService.recordCompetitiveMatchResult(opp.elo, 'win');
      setCurrentUser(userService.getCurrentUser());
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

  const handleStartRankedSession = useCallback((session: RankedMatchSession) => {
    gameAnalyzer.cancel();
    stockfish.clearQueue();
    setIsAnalyzing(false);
    setIsPlaying(false);
    setGameOverMessage(null);
    setIsPreviewingLine(false);
    setPreviewFen(null);

    setActiveRankedSession(session);
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
      event: session.isOnlinePvP ? 'Онлайн матч на рейтинг' : 'Рейтинговый матч против ИИ',
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
        () => {}
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
  }, [currentUser, handleOpponentOnlineMove, handleOpponentResign, triggerAiMove]);

  const handleAcceptIncomingChallenge = async (chal: DirectChallengePayload) => {
    setIncomingChallenge(null);
    const session = await multiplayerService.acceptDirectChallenge(
      chal,
      handleOpponentOnlineMove,
      handleOpponentResign,
      () => {}
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
        () => {}
      );
      handleStartRankedSession(session);
    } catch (err) {
      console.error('Challenge player error:', err);
    }
  };

  const handleChangeMode = (newMode: GameMode) => {
    setGameMode(newMode);
    if (newMode === 'ranked') {
      setIsMatchmakingOpen(true);
    } else if (newMode === 'vs-ai') {
      startVsAiGame(playerColor);
    } else if (newMode === 'pvp') {
      startPvpGame();
    } else if (newMode === 'puzzles') {
      startPuzzlesMode(currentPuzzleIndex);
    } else {
      gameAnalyzer.cancel();
      stockfish.clearQueue();
      setGameOverMessage(null);
      loadPgnIntoState(currentPgn, gameTitle);
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
    if (gameMode === 'ranked') {
      setIsMatchmakingOpen(true);
    } else if (gameMode === 'vs-ai') {
      startVsAiGame(playerColor);
    } else if (gameMode === 'pvp') {
      startPvpGame();
    } else if (gameMode === 'puzzles') {
      handleRandomPuzzle();
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
  const evalCp = currentMove ? currentMove.evalAfter : 0;
  const mate = currentMove ? currentMove.mateAfter : null;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0A0A0A] text-[#EDEDED] font-sans">
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
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

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

      <main className="flex-1 grid grid-cols-1 landscape:grid-cols-[1fr_340px] md:landscape:grid-cols-[1fr_400px] lg:grid-cols-[1fr_420px] overflow-hidden">
        <section className="relative h-full flex items-center justify-center overflow-hidden bg-[#0A0A0A] p-1 sm:p-2">
          <ScoreDeltaNotification data={scoreDelta} onDismiss={() => setScoreDelta(null)} />
          <ChessboardArea
            fen={currentFen}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped((prev) => !prev)}
            currentMove={currentMove}
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
            bestMoveUci={currentMove?.bestMoveUci}
            onPieceDrop={handlePieceDrop}
            isAiThinking={isAiThinking}
            gameOverMessage={gameOverMessage}
            onRestartGame={() => handleReset()}
            moveAccent={moveAccent}
            showEngineArrows={gameMode !== 'pvp' && gameMode !== 'ranked'}
          />
        </section>

        <section className="h-full overflow-hidden">
          {gameMode === 'puzzles' ? (
            <PuzzlePanel
              puzzle={PUZZLES[currentPuzzleIndex] || PUZZLES[0]}
              status={puzzleStatus}
              currentStep={puzzleStep}
              onNextPuzzle={handleNextPuzzle}
              onRandomPuzzle={handleRandomPuzzle}
              onRetry={handleRetryPuzzle}
              onShowSolution={handleShowSolution}
              solvedCount={solvedPuzzlesCount}
              totalAttempted={totalAttemptedPuzzles}
              filterDifficulty={puzzleDifficultyFilter}
              onChangeFilter={setPuzzleDifficultyFilter}
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
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onUserChanged={(u) => setCurrentUser(u)}
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
