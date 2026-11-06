import { Chess, Move } from 'chess.js';
import type { GameReport, MoveAnalysis, MoveClassification } from '../types/chess';
import { CLASSIFICATION_CONFIGS } from '../types/chess';
import { stockfish } from './stockfishService';
import { classifySingleMove, calculatePlayerAccuracy } from './evalFormulas';

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

    onProgress?.({
      currentPly: 0,
      totalPlies,
      depth,
      currentMoveSan: 'Start'
    });

    let prevEvaluation = await stockfish.evaluate(fens[0], depth);

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

      const currentEvaluation = await stockfish.evaluate(fenAfter, depth);

      const bestMoveUci = prevEvaluation.bestMove || uci;
      const bestMoveSan = uciToSan(fenBefore, bestMoveUci);

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

      const partialReport: GameReport = {
        whiteAccuracy: calculatePlayerAccuracy(movesAnalysis, 'w'),
        blackAccuracy: calculatePlayerAccuracy(movesAnalysis, 'b'),
        whitePlayer,
        blackPlayer,
        event,
        date,
        result,
        moves: [...movesAnalysis],
        classificationSummary: {
          white: { ...classificationCounts.white },
          black: { ...classificationCounts.black }
        }
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
