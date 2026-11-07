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
 * Instant synchronous heuristic evaluation (centipawns from White perspective)
 * used for 0ms immediate EvalBar feedback while Stockfish worker computes deep search.
 */
export function quickEvaluateFen(fen: string): { cp: number; mate: number | null } {
  try {
    const chess = new Chess(fen);
    if (chess.isCheckmate()) {
      return {
        cp: chess.turn() === 'w' ? -10000 : 10000,
        mate: chess.turn() === 'w' ? -1 : 1
      };
    }
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      return { cp: 0, mate: null };
    }

    const whiteMat = countMaterial(fen, 'w');
    const blackMat = countMaterial(fen, 'b');
    let score = whiteMat - blackMat;

    // Center control & piece development bonus
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (!cell) continue;
        const sign = cell.color === 'w' ? 1 : -1;
        // Center squares d4, e4, d5, e5
        if ((r === 3 || r === 4) && (c === 3 || c === 4)) {
          score += sign * (cell.type === 'p' ? 22 : 18);
        } else if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
          score += sign * 8;
        }
        // Minor piece development off back rank
        if ((cell.type === 'n' || cell.type === 'b') && ((cell.color === 'w' && r < 7) || (cell.color === 'b' && r > 0))) {
          score += sign * 12;
        }
      }
    }

    if (chess.inCheck()) {
      score += chess.turn() === 'w' ? -25 : 25;
    }

    return { cp: score, mate: null };
  } catch {
    return { cp: 0, mate: null };
  }
}

/**
 * Detects if a move is a genuine material sacrifice:
 * Piece is offered en-prise on a square the opponent can legally capture,
 * or net material is sacrificed, yet Stockfish confirms the resulting position is strong.
 */
function isSacrifice(
  fenBefore: string,
  fenAfter: string,
  turn: 'w' | 'b',
  uci: string,
  movedPiece?: string
): boolean {
  const matBefore = countMaterial(fenBefore, turn);
  const matAfter = countMaterial(fenAfter, turn);
  const diff = matBefore - matAfter;

  // If player voluntarily gave up material immediately (e.g., promotion/underpromotion sacrifice)
  if (diff >= 200) return true;

  // Check if the moved piece landed on a square where the opponent can legally capture it next turn
  if (movedPiece && ['q', 'r', 'b', 'n'].includes(movedPiece) && uci && uci.length >= 4) {
    const destSquare = uci.substring(2, 4);
    const oppColor = turn === 'w' ? 'b' : 'w';
    const oppMatBefore = countMaterial(fenBefore, oppColor);
    const oppMatAfter = countMaterial(fenAfter, oppColor);
    const oppLoss = oppMatBefore - oppMatAfter;
    const movedVal = PIECE_VALUES[movedPiece] || 0;

    // Must risk at least 200cp more than what was just captured
    if (movedVal - oppLoss >= 200) {
      try {
        const chessAfter = new Chess(fenAfter);
        const oppCapturesOnDest = chessAfter
          .moves({ verbose: true })
          .filter((m) => m.to === destSquare);
        if (oppCapturesOnDest.length > 0) {
          return true;
        }
      } catch {
        return false;
      }
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

  // Check if fenAfter is immediate checkmate
  let isDeliveredMate = false;
  try {
    const chessAfter = new Chess(fenAfter);
    isDeliveredMate = chessAfter.isCheckmate();
  } catch {
    isDeliveredMate = false;
  }

  if (isDeliveredMate) {
    return {
      classification: 'best',
      reason: 'Шах и мат! Решающий удар, завершающий партию.',
      winBefore,
      winAfter: 100,
      winLoss: 0,
      cpLoss: 0
    };
  }

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

  // Mate perspective for the moving player (>0 means player has forced mate, <0 means opponent has forced mate)
  const playerMateBefore = mateBefore !== null ? (turn === 'w' ? mateBefore : -mateBefore) : null;
  const playerMateAfter = mateAfter !== null ? (turn === 'w' ? mateAfter : -mateAfter) : null;

  // Check if player walked into forced mate
  if ((playerMateBefore === null || playerMateBefore > 0) && playerMateAfter !== null && playerMateAfter < 0) {
    return {
      classification: 'blunder',
      reason: `Грубая ошибка (зевок) — ход позволяет сопернику поставить форсированный мат в ${Math.abs(playerMateAfter)} х.`,
      winBefore,
      winAfter,
      winLoss: Math.max(25, winLoss),
      cpLoss: Math.max(400, cpLoss)
    };
  }

  // Check if player had forced mate and missed it
  if (playerMateBefore !== null && playerMateBefore > 0 && (playerMateAfter === null || playerMateAfter < 0)) {
    if (winAfter >= 68) {
      return {
        classification: 'miss',
        reason: `Упущен форсированный мат в ${Math.abs(playerMateBefore)} х., хотя перевес сохраняется`,
        winBefore,
        winAfter,
        winLoss: Math.max(12, winLoss),
        cpLoss: Math.max(120, cpLoss)
      };
    }
    return {
      classification: 'blunder',
      reason: `Грубая ошибка — упущен форсированный мат в ${Math.abs(playerMateBefore)} х. и потеряно преимущество`,
      winBefore,
      winAfter,
      winLoss: Math.max(22, winLoss),
      cpLoss: Math.max(300, cpLoss)
    };
  }

  // 2. Check Opening Book (only if move does not lose significant eval)
  if (isOpeningBook(fenBefore, san, ply) && cpLoss <= 35 && winLoss <= 3.5) {
    return {
      classification: 'book',
      reason: 'Теоретический дебютный ход из книги гроссмейстеров',
      winBefore,
      winAfter,
      winLoss: 0,
      cpLoss: 0
    };
  }

  // 3. Check Severe Errors FIRST so a high-cpLoss move is NEVER misclassified as Good/Excellent
  // Blunder (??): >= 18% win probability loss OR >= 220 centipawns lost
  if (winLoss >= 18.0 || cpLoss >= 220) {
    const lostPawns = (cpLoss / 100).toFixed(1);
    return {
      classification: 'blunder',
      reason:
        cpLoss >= 280
          ? `Грубая ошибка (зевок материала) — потеряно ${lostPawns} п. оценки`
          : `Грубая ошибка — позиция резко ухудшилась (-${lostPawns} п.)`,
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // Miss (✕): Opponent erred previously and player lost >= 8.5% win prob or >= 95cp failing to punish
  if (
    (previousMoveClassification === 'mistake' || previousMoveClassification === 'blunder') &&
    (winLoss >= 8.5 || cpLoss >= 95)
  ) {
    return {
      classification: 'miss',
      reason: 'Упущен шанс наказать грубую ошибку соперника тактическим ударом',
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // Mistake (?): >= 9.5% win probability loss OR >= 105 centipawns lost
  if (winLoss >= 9.5 || cpLoss >= 105) {
    const lostPawns = (cpLoss / 100).toFixed(1);
    return {
      classification: 'mistake',
      reason: `Ошибка — серьезная потеря темпа или позиционного перевеса (-${lostPawns} п.)`,
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // Inaccuracy (?!): >= 4.5% win probability loss OR >= 50 centipawns lost
  if (winLoss >= 4.5 || cpLoss >= 50) {
    const lostPawns = (cpLoss / 100).toFixed(1);
    return {
      classification: 'inaccuracy',
      reason: `Неточность — потеря части перевеса (-${lostPawns} п.), был более точный план`,
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  const hasValidBestUci = Boolean(bestMoveUci && bestMoveUci.length >= 4);
  const isMoveBest =
    (hasValidBestUci && uci.toLowerCase() === bestMoveUci.toLowerCase()) ||
    (cpLoss <= 5 && winLoss <= 0.5);

  // 4. Check Brilliant (!!) — requires Stockfish best-move confirmation and genuine tactical sacrifice
  if (hasValidBestUci && isMoveBest && winAfter >= 45 && winBefore <= 95) {
    const isSac = isSacrifice(fenBefore, fenAfter, turn, uci, piece);
    if (isSac) {
      return {
        classification: 'brilliant',
        reason: 'Блестящая жертва материала, разрушающая оборону соперника!',
        winBefore,
        winAfter,
        winLoss: 0,
        cpLoss: 0
      };
    }
  }

  // 5. Check Great (!)
  if (isMoveBest && secondLineEval !== undefined) {
    const secondWp = centipawnsToWinPercent(secondLineEval, null);
    const secondWin = turn === 'w' ? secondWp : 100 - secondWp;
    const gap = winAfter - secondWin;

    if (gap >= 11.0 || Math.abs(evalAfter - secondLineEval) >= 140) {
      return {
        classification: 'great',
        reason: 'Отличная находка — единственный сильнейший ход в критической позиции!',
        winBefore,
        winAfter,
        winLoss: 0,
        cpLoss: 0
      };
    }
  }

  // 6. Check Best (★)
  if (isMoveBest) {
    return {
      classification: 'best',
      reason: 'Сильнейший ход по первой линии Stockfish',
      winBefore,
      winAfter,
      winLoss: 0,
      cpLoss: 0
    };
  }

  // 7. Check Excellent (✓) — requires BOTH low winLoss AND low cpLoss
  if (winLoss <= 2.0 && cpLoss <= 22) {
    return {
      classification: 'excellent',
      reason: 'Отличный ход — практически не уступает первой линии движка',
      winBefore,
      winAfter,
      winLoss,
      cpLoss
    };
  }

  // 8. Check Good — moderate loss (< 4.5% winLoss and < 50cp)
  return {
    classification: 'good',
    reason: 'Хороший ход — надежное продолжение, но у движка было точнее',
    winBefore,
    winAfter,
    winLoss,
    cpLoss
  };
}

/**
 * Calculates overall accuracy (CAPS2) for a player (0.0% to 100.0%)
 * Combines centipawn loss, win probability loss, and move classification weights
 */
export function calculatePlayerAccuracy(moves: MoveAnalysis[], turn: 'w' | 'b'): number {
  const playerMoves = moves.filter((m) => m.turn === turn);
  if (playerMoves.length === 0) return 100.0;

  let totalAcc = 0;
  for (const move of playerMoves) {
    let score = 100;
    switch (move.classification) {
      case 'brilliant':
      case 'great':
      case 'best':
      case 'forced':
        score = 100;
        break;
      case 'book':
        score = 98.5;
        break;
      case 'excellent':
        score = Math.max(90, 98.5 - move.centipawnLoss * 0.3);
        break;
      case 'good':
        score = Math.max(76, 89 - move.centipawnLoss * 0.22);
        break;
      case 'inaccuracy':
        score = Math.max(52, 72 - move.centipawnLoss * 0.18);
        break;
      case 'miss':
        score = Math.max(30, 54 - move.winPercentLoss * 0.8);
        break;
      case 'mistake':
        score = Math.max(18, 46 - move.centipawnLoss * 0.11);
        break;
      case 'blunder':
        score = Math.max(2, 20 - move.centipawnLoss * 0.03);
        break;
      default:
        score = Math.max(0, 100 - move.winPercentLoss * 2.5 - move.centipawnLoss * 0.15);
    }
    totalAcc += Math.max(0, Math.min(100, score));
  }

  const avg = totalAcc / playerMoves.length;
  return Math.round(avg * 10) / 10;
}
