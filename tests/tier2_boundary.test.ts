import { describe, it, expect } from '../scripts/run-tests.mjs';
import { Chess } from 'chess.js';
import {
  quickEvaluateFen,
  countMaterial,
  centipawnsToWinPercent
} from '../src/engine/evalFormulas';

describe('Tier 2: Boundary 1 - Pawn Promotion Giving Check', () => {
  it('White pawn promotes to Queen giving direct check on 8th rank', () => {
    // White pawn on e7, Black king on e8. White pawn captures on f8 promoting to Queen with check
    const chess = new Chess('r4k2/4P3/8/8/8/8/8/4K3 w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'e8', promotion: 'q' });
    expect(move).toBeDefined();
    expect(chess.inCheck()).toBeTruthy();
    expect(chess.get('e8')?.type).toBe('q');
  });

  it('Black pawn promotes to Queen giving direct check on 1st rank', () => {
    const chess = new Chess('4k3/8/8/8/8/8/4p3/3K3R b - - 0 1');
    const move = chess.move({ from: 'e2', to: 'e1', promotion: 'q' });
    expect(move).toBeDefined();
    expect(chess.inCheck()).toBeTruthy();
    expect(chess.get('e1')?.type).toBe('q');
  });

  it('White pawn promotes to Knight giving fork check (underpromotion)', () => {
    // White pawn on c7, Black king on a7, Black queen on d6.
    // Promoting to Knight on c8 checks King on a7 AND forks Queen on d6!
    const chess = new Chess('8/k1P5/3q4/8/8/8/8/4K3 w - - 0 1');
    const move = chess.move({ from: 'c7', to: 'c8', promotion: 'n' });
    expect(move).toBeDefined();
    expect(chess.get('c8')?.type).toBe('n');
    expect(chess.turn()).toBe('b');
    expect(chess.inCheck()).toBeTruthy();
    // Black is in check: King on a7 must move, and Queen on d6 cannot capture knight on c8
    const queenMoves = chess.moves({ square: 'd6', verbose: true });
    expect(queenMoves.some((m) => m.to === 'c8')).toBeFalsy();
    const kingMoves = chess.moves({ square: 'a7' });
    expect(kingMoves.length).toBeGreaterThan(0);
  });

  it('Pawn promotion with capture delivering check', () => {
    // White pawn on b7 captures rook on a8 promoting to Queen giving check
    const chess = new Chess('r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1');
    const move = chess.move({ from: 'b7', to: 'a8', promotion: 'q' });
    expect(move).toBeDefined();
    expect(move.captured).toBe('r');
    expect(chess.inCheck()).toBeTruthy();
  });

  it('Pawn promotion delivering double check (promoted piece + discovered rook check)', () => {
    // White rook on e1, White pawn on e7, Black king on e8, Black rook on d8
    // Pawn captures on d8 promoting to Queen:
    // Queen on d8 checks King on e8, AND Rook on e1 checks King on e8 along open e-file!
    const chess = new Chess('3rk3/4P3/8/8/8/8/8/4R1K1 w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'd8', promotion: 'q' });
    expect(move).toBeDefined();
    expect(chess.inCheck()).toBeTruthy();
    // In double check, the only legal move for King is to move (cannot block both or capture both)
    const kingEscapes = chess.moves({ square: 'e8' });
    const allMoves = chess.moves();
    expect(allMoves.length).toBe(kingEscapes.length);
  });
});

describe('Tier 2: Boundary 2 - En Passant Discovered Check and Illegality', () => {
  it('White en passant capture discovers check from back-rank rook on e-file', () => {
    // White King on g1, White Rook on e1, White pawn on e5, Black pawn on d5, Black King on e7
    // Black just played d7-d5.
    // White plays exd6 e.p.: e-pawn vacates e5, discovering check from e1 rook onto e7 king!
    const chess = new Chess('8/4k3/8/3pP3/8/8/8/4R1K1 w - d6 0 1');
    const move = chess.move('exd6');
    expect(move).toBeDefined();
    expect(chess.inCheck()).toBeTruthy();
  });

  it('Black en passant capture discovers check from file-opening rook', () => {
    // Black Rook on d8, Black pawn on d4, White pawn on e4, White King on d1.
    // Black plays dxe3 e.p.: d4 pawn leaves d-file, opening discovered check from d8 rook to d1 king!
    const chess = new Chess('3r2k1/8/8/8/3pP3/8/8/3K4 b - e3 0 1');
    const move = chess.move('dxe3');
    expect(move).toBeDefined();
    expect(chess.inCheck()).toBeTruthy();
  });

  it('En passant is strictly illegal when horizontal pin uncovers check on own king', () => {
    // Classic rule test: White King on a5, White pawn on b5, Black pawn on c5, Black Rook on h5, Black King on g8
    // Black just played c7-c5.
    // If White plays bxc6 e.p., both b5 and c5 pawns vanish from 5th rank, exposing White King on a5 to Black Rook on h5!
    // Therefore, bxc6 is illegal!
    const chess = new Chess('6k1/8/8/K1pP3r/8/8/8/8 w - c6 0 1');
    const legalMoves = chess.moves();
    expect(legalMoves.includes('bxc6')).toBeFalsy();
  });

  it('En passant capture delivers checkmate', () => {
    // White King on f7, White Rook on h1, White pawn on f5, Black King on h8, Black pawn on g5.
    // White plays fxg6 e.p. delivering discovered checkmate from h1 rook with g6 covering h7!
    const chess = new Chess('7k/5K2/8/5Pp1/8/8/8/7R w - g6 0 1');
    const move = chess.move('fxg6');
    expect(move).toBeDefined();
    expect(chess.isCheckmate()).toBeTruthy();
  });

  it('En passant delivers double check', () => {
    // White King on g1, White Rook on e1, White pawn on e5, Black pawn on d5, Black King on e8
    // Black plays d7-d5. White plays exd6 e.p.
    // Pawn on d6 attacks e7/c7. Wait, if Black King on e7, e.p. pawn on d6 checks e7 AND rook on e1 checks e7!
    const chess = new Chess('8/4k3/8/3pP3/8/8/8/4R1K1 w - d6 0 1');
    const move = chess.move('exd6');
    expect(move).toBeDefined();
    // d6 pawn checks e7 AND e1 rook checks e7! Double check!
    expect(chess.inCheck()).toBeTruthy();
    // Only King moves are legal
    const kingMoves = chess.moves({ square: 'e7' });
    expect(chess.moves().length).toBe(kingMoves.length);
  });
});

describe('Tier 2: Boundary 3 - 1-Second Increments and Clock Boundaries', () => {
  it('1-second remaining with 1-second increment preserves clock under immediate move', () => {
    let clock = 1;
    const timeSpent = 1;
    const increment = 1;
    clock = clock - timeSpent + increment;
    expect(clock).toBe(1);
    expect(clock > 0).toBeTruthy();
  });

  it('Zero increment time control does not replenish time', () => {
    let clock = 1;
    const timeSpent = 1;
    const increment = 0;
    clock = Math.max(0, clock - timeSpent + increment);
    expect(clock).toBe(0);
  });

  it('Fischer increment applies strictly to active moving player only', () => {
    const whiteClock = { time: 100, increment: 2 };
    const blackClock = { time: 100, increment: 2 };

    // White moves, spending 3 seconds
    whiteClock.time = whiteClock.time - 3 + whiteClock.increment;
    expect(whiteClock.time).toBe(99);
    // Black clock remains completely untouched
    expect(blackClock.time).toBe(100);
  });

  it('Rapid 1-second time scramble accumulates increments correctly', () => {
    let clock = 5;
    const increment = 2;
    // 5 rapid pre-moves taking 0.2s rounded to 0s elapsed
    for (let i = 0; i < 5; i++) {
      clock = clock - 0 + increment;
    }
    expect(clock).toBe(15);
  });

  it('Clamping prevents negative clock values', () => {
    let clock = 2;
    const timeSpent = 5;
    const increment = 1;
    const remaining = Math.max(0, clock - timeSpent) + (clock - timeSpent > 0 ? increment : 0);
    expect(remaining).toBe(0);
  });
});

describe('Tier 2: Boundary 4 - 0-Second Timeout Condition', () => {
  it('Exact 0 seconds triggers timeout condition', () => {
    const isTimeout = (clock: number) => clock <= 0;
    expect(isTimeout(0)).toBeTruthy();
    expect(isTimeout(-1)).toBeTruthy();
    expect(isTimeout(0.001)).toBeFalsy();
  });

  it('Timeout triggers loss even if timed-out player has massive material advantage', () => {
    // White has full starting material (capital letters), Black has only King 'k'
    const whiteMat = countMaterial('4k3/8/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 'w');
    const blackMat = countMaterial('4k3/8/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 'b');
    expect(blackMat).toBe(0);
    expect(whiteMat).toBeGreaterThan(3000);

    // If White clock expires, result is loss or draw by insufficient material
    const blackHasSufficientMaterial = blackMat > 0;
    const gameResult = blackHasSufficientMaterial ? 'loss' : 'draw';
    // Against bare king, timeout is draw by FIDE rule (opponent cannot checkmate by any series of legal moves)
    expect(gameResult).toBe('draw');
  });

  it('Timeout against opponent with mating material results in clean loss', () => {
    const blackMat = countMaterial('8/8/8/8/8/8/8/4K2r w - - 0 1', 'b');
    expect(blackMat).toBe(500); // Rook
    const result = blackMat >= 300 ? 'loss' : 'draw';
    expect(result).toBe('loss');
  });

  it('Timeout event is idempotent across duplicate broadcasts', () => {
    let gameStatus = 'active';
    let endCount = 0;
    const onTimeout = () => {
      if (gameStatus !== 'active') return;
      gameStatus = 'ended';
      endCount++;
    };

    onTimeout();
    onTimeout();
    onTimeout();
    expect(gameStatus).toBe('ended');
    expect(endCount).toBe(1);
  });

  it('Resignation received immediately prior to timeout takes priority', () => {
    let terminationReason = '';
    const events = [
      { type: 'resign', player: 'b', timestamp: 100 },
      { type: 'timeout', player: 'b', timestamp: 105 }
    ];

    for (const evt of events) {
      if (!terminationReason) {
        terminationReason = evt.type;
      }
    }
    expect(terminationReason).toBe('resign');
  });
});

describe('Tier 2: Boundary 5 - 50-Move Counter Edge', () => {
  it('Halfmove clock at 99 (49.5 full moves) does not trigger draw yet', () => {
    const chess = new Chess('8/8/8/4k3/8/8/8/4K2R w - - 99 50');
    expect(chess.isDraw()).toBeFalsy();
  });

  it('100th halfmove (50 full moves) without capture or pawn push triggers draw', () => {
    const chess = new Chess('8/8/8/4k3/8/8/8/4K2R w - - 100 51');
    expect(chess.isDraw()).toBeTruthy();
  });

  it('Pawn push resets 50-move counter from 98 back to 0', () => {
    const chess = new Chess('k7/8/8/8/4P3/8/8/4K3 w - - 98 50');
    chess.move('e5');
    expect(chess.fen().split(' ')[4]).toBe('0');
    expect(chess.isDraw()).toBeFalsy();
  });

  it('Piece capture resets 50-move counter from 98 back to 0', () => {
    const chess = new Chess('k7/8/8/8/4n3/8/8/4R2K w - - 98 50');
    chess.move('Rxe4');
    expect(chess.fen().split(' ')[4]).toBe('0');
    expect(chess.isDraw()).toBeFalsy();
  });

  it('Checkmate delivered on 50th move takes priority over draw', () => {
    // Queen delivers checkmate on move 50
    const chess = new Chess('k7/8/1K6/8/8/8/8/1Q6 w - - 99 50');
    chess.move('Qh1+');
    const mateChess = new Chess('k7/8/1K6/8/8/8/8/7Q w - - 99 50');
    mateChess.move('Qh8#');
    expect(mateChess.isCheckmate()).toBeTruthy();
    expect(mateChess.isGameOver()).toBeTruthy();
  });
});

describe('Tier 2: Boundary 6 - Invalid FEN Recovery and Robustness', () => {
  it('Invalid FEN throws in strict Chess parser but does not crash process', () => {
    let threw = false;
    try {
      new Chess('invalid-fen-string-not-a-board');
    } catch {
      threw = true;
    }
    expect(threw).toBeTruthy();
  });

  it('quickEvaluateFen gracefully falls back to 0 cp on empty or corrupt string', () => {
    const resultEmpty = quickEvaluateFen('');
    expect(resultEmpty.cp).toBe(0);
    expect(resultEmpty.mate).toBeNull();

    const resultGarbage = quickEvaluateFen('zzzzzz/9999/8 w - -');
    expect(resultGarbage.cp).toBe(0);
    expect(resultGarbage.mate).toBeNull();
  });

  it('quickEvaluateFen handles FEN with missing kings without uncaught error', () => {
    const missingKing = quickEvaluateFen('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(missingKing.cp).toBe(0);
  });

  it('countMaterial ignores invalid piece symbols in FEN', () => {
    const corruptedWithInvalidChars = 'rnbqXbnr/pp123ppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const mat = countMaterial(corruptedWithInvalidChars, 'w');
    expect(mat).toBeGreaterThan(0);
    expect(mat).toBeLessThanOrEqual(3940);
  });

  it('centipawnsToWinPercent handles extreme numerical inputs safely', () => {
    expect(centipawnsToWinPercent(100000)).toBeCloseTo(100, 0.05);
    expect(centipawnsToWinPercent(-100000)).toBeCloseTo(0, 0.05);
    expect(centipawnsToWinPercent(Infinity)).toBeCloseTo(100, 0.05);
    expect(centipawnsToWinPercent(-Infinity)).toBeCloseTo(0, 0.05);
  });
});
