import { Chess, Move } from 'chess.js';
import type { GameReport, MoveAnalysis, MoveClassification } from '../types/chess';
import { CLASSIFICATION_CONFIGS } from '../types/chess';
import { stockfish } from './stockfishService';
import { classifySingleMove, calculatePlayerAccuracy, quickEvaluateFen } from './evalFormulas';

export interface AnalysisProgress {
  currentPly: number;
  totalPlies: number;
  depth: number;
  currentMoveSan?: string;
  reportSoFar?: GameReport;
}

export function uciToSan(fen: string, uci: string): string {
  if (!uci || uci.length < 4) return uci;
  try {
    const c = new Chess(fen);
    const m = c.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci.substring(4, 5) : undefined
    });
    return m ? m.san : uci;
  } catch {
    return uci;
  }
}

export class GameAnalyzer {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
    stockfish.stop();
  }

  public async analyzePgn(
    pgn: string,
    depth = 14,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<GameReport> {
    this.isCancelled = false;

    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
    } catch {
      throw new Error('Некорректная PGN-запись партии');
    }

    const header = chess.header();
    const whitePlayer = header['White'] || 'Белые';
    const blackPlayer = header['Black'] || 'Черные';
    const event = header['Event'] || 'Товарищеская партия';
    const date = header['Date'] || new Date().toISOString().slice(0, 10);
    const result = header['Result'] || '*';

    const historyMoves: Move[] = chess.history({ verbose: true });
    const totalPlies = historyMoves.length;

    // Reset to start and traverse ply by ply
    const replayChess = new Chess();
    const fens: string[] = [replayChess.fen()];

    for (const move of historyMoves) {
      replayChess.move(move);
      fens.push(replayChess.fen());
    }

    const movesAnalysis: MoveAnalysis[] = [];
    const classificationCounts = {
      white: {} as Record<MoveClassification, number>,
      black: {} as Record<MoveClassification, number>
    };

    (Object.keys(CLASSIFICATION_CONFIGS) as MoveClassification[]).forEach((key) => {
      classificationCounts.white[key] = 0;
      classificationCounts.black[key] = 0;
    });

    // Stage 1: Instant 0ms preliminary report so UI immediately shows all moves, eval bar, and summary
    const initialQuickMoves: MoveAnalysis[] = [];
    const quickCounts = {
      white: { ...classificationCounts.white },
      black: { ...classificationCounts.black }
    };
    let prevQuick = quickEvaluateFen(fens[0]);
    for (let i = 0; i < totalPlies; i++) {
      const m = historyMoves[i];
      const fBefore = fens[i];
      const fAfter = fens[i + 1];
      const curQuick = quickEvaluateFen(fAfter);
      const uciStr = `${m.from}${m.to}${m.promotion || ''}`;
      const qClass = classifySingleMove({
        ply: i,
        turn: m.color,
        san: m.san,
        uci: uciStr,
        piece: m.piece,
        captured: m.captured,
        fenBefore: fBefore,
        fenAfter: fAfter,
        evalBefore: prevQuick.cp,
        evalAfter: curQuick.cp,
        mateBefore: prevQuick.mate,
        mateAfter: curQuick.mate,
        bestMoveUci: ''
      });
      const qAnalysis: MoveAnalysis = {
        ply: i,
        moveNumber: Math.floor(i / 2) + 1,
        turn: m.color,
        san: m.san,
        uci: uciStr,
        from: m.from,
        to: m.to,
        piece: m.piece,
        captured: m.captured,
        fenBefore: fBefore,
        fenAfter: fAfter,
        evalBefore: prevQuick.cp,
        evalAfter: curQuick.cp,
        mateBefore: prevQuick.mate,
        mateAfter: curQuick.mate,
        winPercentBefore: qClass.winBefore,
        winPercentAfter: qClass.winAfter,
        winPercentLoss: qClass.winLoss,
        centipawnLoss: qClass.cpLoss,
        classification: qClass.classification,
        classificationReason: qClass.reason,
        bestMoveUci: uciStr,
        bestMoveSan: m.san,
        bestLinePv: [],
        depth: 1
      };
      initialQuickMoves.push(qAnalysis);
      if (m.color === 'w') quickCounts.white[qAnalysis.classification]++;
      else quickCounts.black[qAnalysis.classification]++;
      prevQuick = curQuick;
    }

    onProgress?.({
      currentPly: 0,
      totalPlies,
      depth,
      currentMoveSan: 'Start',
      reportSoFar: {
        whiteAccuracy: calculatePlayerAccuracy(initialQuickMoves, 'w'),
        blackAccuracy: calculatePlayerAccuracy(initialQuickMoves, 'b'),
        whitePlayer,
        blackPlayer,
        event,
        date,
        result,
        moves: initialQuickMoves,
        classificationSummary: quickCounts
      }
    });

    let prevEvaluation = await stockfish.evaluate(fens[0], Math.min(depth, 10));

    for (let ply = 0; ply < totalPlies; ply++) {
      if (this.isCancelled) {
        break;
      }

      const move = historyMoves[ply];
      const fenBefore = fens[ply];
      const fenAfter = fens[ply + 1];
      const moveNumber = Math.floor(ply / 2) + 1;
      const turn = move.color;
      const uci = `${move.from}${move.to}${move.promotion || ''}`;

      const currentEvaluation = await stockfish.evaluate(fenAfter, Math.min(depth, 10));

      const bestMoveUci = prevEvaluation.bestMove || '';
      const bestMoveSan = bestMoveUci ? uciToSan(fenBefore, bestMoveUci) : move.san;

      const prevMoveClass =
        movesAnalysis.length > 0 ? movesAnalysis[movesAnalysis.length - 1].classification : undefined;

      const classificationResult = classifySingleMove({
        ply,
        turn,
        san: move.san,
        uci,
        piece: move.piece,
        captured: move.captured,
        fenBefore,
        fenAfter,
        evalBefore: prevEvaluation.cp,
        evalAfter: currentEvaluation.cp,
        mateBefore: prevEvaluation.mate,
        mateAfter: currentEvaluation.mate,
        bestMoveUci,
        secondLineEval: prevEvaluation.secondBest?.cp,
        secondLineUci: prevEvaluation.secondBest?.bestMove,
        previousMoveClassification: prevMoveClass
      });

      const moveAnalysis: MoveAnalysis = {
        ply,
        moveNumber,
        turn,
        san: move.san,
        uci,
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured,
        fenBefore,
        fenAfter,
        evalBefore: prevEvaluation.cp,
        evalAfter: currentEvaluation.cp,
        mateBefore: prevEvaluation.mate,
        mateAfter: currentEvaluation.mate,
        winPercentBefore: classificationResult.winBefore,
        winPercentAfter: classificationResult.winAfter,
        winPercentLoss: classificationResult.winLoss,
        centipawnLoss: classificationResult.cpLoss,
        classification: classificationResult.classification,
        classificationReason: classificationResult.reason,
        bestMoveUci,
        bestMoveSan,
        bestLinePv: currentEvaluation.pv,
        secondLineEval: prevEvaluation.secondBest?.cp,
        secondLineUci: prevEvaluation.secondBest?.bestMove,
        depth
      };

      movesAnalysis.push(moveAnalysis);

      if (turn === 'w') {
        classificationCounts.white[moveAnalysis.classification]++;
      } else {
        classificationCounts.black[moveAnalysis.classification]++;
      }

      const combinedMoves = [
        ...movesAnalysis,
        ...initialQuickMoves.slice(movesAnalysis.length)
      ];
      const combinedCounts = {
        white: {} as Record<MoveClassification, number>,
        black: {} as Record<MoveClassification, number>
      };
      (Object.keys(CLASSIFICATION_CONFIGS) as MoveClassification[]).forEach((k) => {
        combinedCounts.white[k] = 0;
        combinedCounts.black[k] = 0;
      });
      combinedMoves.forEach((m) => {
        if (m.turn === 'w') combinedCounts.white[m.classification]++;
        else combinedCounts.black[m.classification]++;
      });

      const partialReport: GameReport = {
        whiteAccuracy: calculatePlayerAccuracy(combinedMoves, 'w'),
        blackAccuracy: calculatePlayerAccuracy(combinedMoves, 'b'),
        whitePlayer,
        blackPlayer,
        event,
        date,
        result,
        moves: combinedMoves,
        classificationSummary: combinedCounts
      };

      onProgress?.({
        currentPly: ply + 1,
        totalPlies,
        depth,
        currentMoveSan: move.san,
        reportSoFar: partialReport
      });

      prevEvaluation = currentEvaluation;
    }

    return {
      whiteAccuracy: calculatePlayerAccuracy(movesAnalysis, 'w'),
      blackAccuracy: calculatePlayerAccuracy(movesAnalysis, 'b'),
      whitePlayer,
      blackPlayer,
      event,
      date,
      result,
      moves: movesAnalysis,
      classificationSummary: classificationCounts
    };
  }
}

export const gameAnalyzer = new GameAnalyzer();
