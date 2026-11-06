import { Chess } from 'chess.js';
import type { MoveClassification, MoveAnalysis } from '../types/chess';
import { isOpeningBook } from './bookMoves';

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 300,
  b: 320,
  r: 500,
  q: 900,
  k: 0
};

/**
 * Calculates Expected Points / Win Probability from centipawns
 * Standard Lichess / Chess.com Sigmoid formula:
 * Win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * centipawns)) - 1)
 */
export function centipawnsToWinPercent(cp: number, mate: number | null = null): number {
  if (mate !== null) {
    if (mate > 0) {
      // Mate in N for White
      return Math.max(99.0, 100 - mate * 0.1);
    } else {
      // Mate in N for Black
      return Math.min(1.0, Math.abs(mate) * 0.1);
    }
  }

  // Constrain cp to realistic bounds [-2500, 2500] to prevent exp overflow
  const clampedCp = Math.max(-2500, Math.min(2500, cp));
  const k = -0.00368208;
  const sigmoid = 2 / (1 + Math.exp(k * clampedCp)) - 1;
  const winPercent = 50 + 50 * sigmoid;

  return Math.max(0, Math.min(100, winPercent));
}

/**
 * Counts total material for a given color from a FEN string
 */
export function countMaterial(fen: string, color: 'w' | 'b'): number {
  const position = fen.split(' ')[0];
  let total = 0;
  for (const char of position) {
    if (color === 'w' && char >= 'A' && char <= 'Z') {
      const p = char.toLowerCase();
      total += PIECE_VALUES[p] || 0;
    } else if (color === 'b' && char >= 'a' && char <= 'z') {
      const p = char.toLowerCase();
      total += PIECE_VALUES[p] || 0;
    }
  }
  return total;
}

/**
 * Detects if a move is a genuine material sacrifice:
 * Piece is offered or captured with lower net balance, yet the resulting eval remains strong.
 */
function isSacrifice(
  fenBefore: string,
  fenAfter: string,
  turn: 'w' | 'b',
  _capturedPiece?: string,
  movedPiece?: string
): boolean {
  const matBefore = countMaterial(fenBefore, turn);
  const matAfter = countMaterial(fenAfter, turn);
  const diff = matBefore - matAfter;

  // If player voluntarily gave up a major piece without capture
  if (diff >= 300) return true;

  // Or if moving piece is a Queen/Rook/Minor attacking square where it's en-prise
  if (movedPiece && ['q', 'r', 'b', 'n'].includes(movedPiece)) {
    const oppColor = turn === 'w' ? 'b' : 'w';
    const oppMatBefore = countMaterial(fenBefore, oppColor);
    const oppMatAfter = countMaterial(fenAfter, oppColor);
    const oppLoss = oppMatBefore - oppMatAfter;
    // Moving piece value > opponent piece taken
    const movedVal = PIECE_VALUES[movedPiece] || 0;
    if (movedVal - oppLoss >= 200) {
      return true;
    }
  }

  return false;
}

export interface ClassifyInput {
  ply: number;
  turn: 'w' | 'b';
  san: string;
  uci: string;
  piece: string;
  captured?: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number; // centipawns from White's perspective
  evalAfter: number;  // centipawns from White's perspective
  mateBefore: number | null;
  mateAfter: number | null;
  bestMoveUci: string;
  secondLineEval?: number;
  secondLineUci?: string;
  previousMoveClassification?: MoveClassification;
}

export function classifySingleMove(input: ClassifyInput): {
  classification: MoveClassification;
  reason: string;
  winBefore: number;
  winAfter: number;
  winLoss: number;
  cpLoss: number;
} {
  const {
    ply,
    turn,
    san,
    uci,
    piece,
    captured,
    fenBefore,
    fenAfter,
    evalBefore,
    evalAfter,
    mateBefore,
    mateAfter,
    bestMoveUci,
    secondLineEval,
    previousMoveClassification
  } = input;

  // Calculate Win Probability from White's perspective
  const whiteWpBefore = centipawnsToWinPercent(evalBefore, mateBefore);
  const whiteWpAfter = centipawnsToWinPercent(evalAfter, mateAfter);

  // Player's perspective
  const winBefore = turn === 'w' ? whiteWpBefore : 100 - whiteWpBefore;
  const winAfter = turn === 'w' ? whiteWpAfter : 100 - whiteWpAfter;

  const winLoss = Math.max(0, winBefore - winAfter);

  // Centipawn loss from player's perspective
  const cpLoss =
    turn === 'w'
      ? Math.max(0, evalBefore - evalAfter)
      : Math.max(0, evalAfter - evalBefore);

  // Check legal moves count in fenBefore
  const chess = new Chess(fenBefore);
  const legalMoves = chess.moves();
  const isForced = legalMoves.length === 1;

  // 1. Check Forced move
  if (isForced) {
    return {
      classification: 'forced',
      reason: 'Единственный легальный ход в позиции',
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // 2. Check Opening Book
  if (isOpeningBook(fenBefore, san, ply)) {
    return {
      classification: 'book',
      reason: 'Теоретический дебютный ход',
      winBefore,
      winAfter,
      winLoss: 0,
      cpLoss: 0
    };
  }

  const isMoveBest = uci.toLowerCase() === bestMoveUci.toLowerCase() || winLoss <= 0.005;

  // 3. Check Brilliant (!!)
  // Best move + Material sacrifice + position is still solid (winAfter >= 45%) + not already blowout winning (winBefore <= 95%)
  if (isMoveBest && winAfter >= 45 && winBefore <= 96) {
    const isSac = isSacrifice(fenBefore, fenAfter, turn, captured, piece);
    if (isSac) {
      return {
        classification: 'brilliant',
        reason: 'Блестящая жертва материала, поддерживающая сильнейшую инициативу',
        winBefore,
        winAfter,
        winLoss: 0,
        cpLoss: 0
      };
    }
  }

  // 4. Check Great (!)
  // Move is best move AND either:
  // - There is a big gap between 1st and 2nd engine line (e.g. >= 140cp or >= 12% win prob)
  // - Or it's a sole defensive hold in a critical position
  if (isMoveBest && secondLineEval !== undefined) {
    const secondWp = centipawnsToWinPercent(secondLineEval, null);
    const secondWin = turn === 'w' ? secondWp : 100 - secondWp;
    const gap = winAfter - secondWin;

    if (gap >= 12.0 || Math.abs(evalAfter - secondLineEval) >= 150) {
      return {
        classification: 'great',
        reason: 'Критически важный ход — единственный путь удержать перевес или равенство',
        winBefore,
        winAfter,
        winLoss: 0,
        cpLoss: 0
      };
    }
  }

  // 5. Check Miss (✕)
  // Opponent played a Mistake or Blunder previously, but this player failed to capitalize (lost >= 12% win prob)
  if (
    (previousMoveClassification === 'mistake' || previousMoveClassification === 'blunder') &&
    winLoss >= 12.0
  ) {
    return {
      classification: 'miss',
      reason: 'Упущен шанс воспользоваться грубой ошибкой соперника',
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // 6. Check Best (★)
  if (isMoveBest || winLoss <= 0.5) {
    return {
      classification: 'best',
      reason: 'Сильнейший ход по первой линии Stockfish',
      winBefore,
      winAfter,
      winLoss: 0,
      cpLoss: 0
    };
  }

  // 7. Check Excellent (✓)
  if (winLoss <= 2.0 || cpLoss <= 18) {
    return {
      classification: 'excellent',
      reason: 'Практически идеальный ход, позиция полностью сохранена',
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // 8. Check Good
  if (winLoss <= 5.0 || cpLoss <= 50) {
    return {
      classification: 'good',
      reason: 'Надежное продолжение, сохраняющее баланс сил',
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // 9. Check Inaccuracy (?!)
  if (winLoss <= 10.0 || cpLoss <= 100) {
    return {
      classification: 'inaccuracy',
      reason: 'Неточность — потеря части позиционного перевеса',
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // 10. Check Mistake (?)
  if (winLoss <= 20.0 || cpLoss <= 200) {
    return {
      classification: 'mistake',
      reason: 'Ошибка — позиция заметно ухудшилась',
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // 11. Check Blunder (??)
  return {
    classification: 'blunder',
    reason: 'Грубая ошибка — потеря материала или упущенный мат',
    winBefore,
    winAfter,
    winLoss,
    cpLoss
  };
}

/**
 * Calculates overall accuracy (CAPS) for a player (0.0% to 100.0%)
 * Calibrated using exponential decay on centipawn loss and win probability loss
 */
export function calculatePlayerAccuracy(moves: MoveAnalysis[], turn: 'w' | 'b'): number {
  const playerMoves = moves.filter((m) => m.turn === turn && m.classification !== 'book');
  if (playerMoves.length === 0) return 100.0;

  let totalAcc = 0;
  for (const move of playerMoves) {
    let score = 100 - move.winPercentLoss * 2.3;
    if (move.classification === 'brilliant' || move.classification === 'best') {
      score = 100;
    } else if (move.classification === 'great') {
      score = 100;
    } else if (move.classification === 'forced') {
      score = 100;
    }
    totalAcc += Math.max(0, Math.min(100, score));
  }

  const avg = totalAcc / playerMoves.length;
  return Math.round(avg * 10) / 10;
}
