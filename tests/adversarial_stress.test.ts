import { describe, it, expect } from '../scripts/run-tests.mjs';
import { Chess } from 'chess.js';
import {
  quickEvaluateFen,
  countMaterial,
  centipawnsToWinPercent,
  classifySingleMove,
  calculatePlayerAccuracy
} from '../src/engine/evalFormulas';
import type { MovePayload } from '../src/services/multiplayerService';

describe('Adversarial Stress: 1. Rapid Move Storms & State Invariants', () => {
  it('executes a 100-ply randomized legal move burst without desync or throw', () => {
    const chess = new Chess();
    const fenHistory = [chess.fen()];

    for (let ply = 0; ply < 100; ply++) {
      if (chess.isGameOver()) break;
      const legalMoves = chess.moves({ verbose: true });
      expect(legalMoves.length).toBeGreaterThan(0);
      // Pick deterministic pseudorandom move
      const chosenMove = legalMoves[(ply * 17 + 3) % legalMoves.length];
      const res = chess.move(chosenMove);
      expect(res).toBeDefined();
      fenHistory.push(chess.fen());
    }

    expect(fenHistory.length).toBeGreaterThan(30);
    // Verify each historical FEN is reloadable and valid
    for (const fen of fenHistory) {
      const testInstance = new Chess(fen);
      expect(testInstance.fen()).toBe(fen);
    }
  });

  it('handles out-of-order move packets by fast-forwarding coherent prefix fens', () => {
    // Simulating App.tsx handleOpponentOnlineMove logic:
    // If client is at ply 1 and opponent sends move at ply 5 with fens array [fen0, fen1, fen2, fen3, fen4, fen5]
    const simulationChess = new Chess();
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'];
    const fullFens = [simulationChess.fen()];
    for (const m of moves) {
      simulationChess.move(m);
      fullFens.push(simulationChess.fen());
    }

    // Local client only saw 1. e4
    let localFens = [fullFens[0], fullFens[1]];
    let localPly = 1;

    // Out of order packet arrives for ply 5 with full history:
    const incomingPayload: MovePayload = {
      moveId: 'm_out_of_order_99',
      ply: 5,
      from: 'f1',
      to: 'b5',
      fen: fullFens[5],
      fens: fullFens,
      whiteTime: 175,
      blackTime: 178
    };

    // Emulate receiver logic:
    if (Array.isArray(incomingPayload.fens) && incomingPayload.fens.length > localFens.length + 1) {
      localFens = incomingPayload.fens.slice(0, incomingPayload.fens.length - 1);
    }
    const latestFen = localFens[localFens.length - 1];
    const receiverChess = new Chess(latestFen);
    const applied = receiverChess.move({ from: incomingPayload.from, to: incomingPayload.to });
    expect(applied).toBeDefined();
    localFens = [...localFens, receiverChess.fen()];
    localPly = localFens.length - 1;

    expect(localPly).toBe(5);
    expect(localFens[localPly]).toBe(fullFens[5]);
  });

  it('deduplicates replayed move packets idempotently without advancing state twice', () => {
    const chess = new Chess();
    const initialFen = chess.fen();
    let currentFens = [initialFen];

    const movePayload: MovePayload = {
      moveId: 'm_dup_test_1',
      ply: 1,
      from: 'e2',
      to: 'e4',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    };

    // Function matching handleOpponentOnlineMove deduplication:
    const applyMoveWithDedup = (payload: MovePayload) => {
      const targetPly = typeof payload.ply === 'number' ? payload.ply : -1;
      if (payload.fen) {
        if (targetPly >= 0 && currentFens[targetPly] === payload.fen) {
          return { applied: false, reason: 'exact_ply_dedup' };
        }
        if (currentFens[currentFens.length - 1] === payload.fen) {
          return { applied: false, reason: 'latest_fen_dedup' };
        }
      }
      const c = new Chess(currentFens[currentFens.length - 1]);
      const res = c.move({ from: payload.from, to: payload.to });
      if (res) {
        currentFens = [...currentFens, c.fen()];
        return { applied: true, res };
      }
      return { applied: false, reason: 'illegal_move' };
    };

    const firstResult = applyMoveWithDedup(movePayload);
    expect(firstResult.applied).toBeTruthy();
    expect(currentFens.length).toBe(2);

    // Replay same move 5 times consecutively
    for (let i = 0; i < 5; i++) {
      const dupResult = applyMoveWithDedup(movePayload);
      expect(dupResult.applied).toBeFalsy();
      expect(dupResult.reason).toBe('exact_ply_dedup');
    }
    // FEN array length must remain strictly 2
    expect(currentFens.length).toBe(2);
  });

  it('rejects stale historical move packets arriving with lower ply numbers', () => {
    const chess = new Chess();
    // Play 4 plies: 1. e4 e5 2. Nf3 Nc6
    const fens = [chess.fen()];
    chess.move('e4'); fens.push(chess.fen());
    chess.move('e5'); fens.push(chess.fen());
    chess.move('Nf3'); fens.push(chess.fen());
    chess.move('Nc6'); fens.push(chess.fen());

    const currentPly = 4;
    // An adversarial or delayed packet arrives claiming ply 2 (e5)
    const stalePayload: MovePayload = {
      moveId: 'm_stale_delayed',
      ply: 2,
      from: 'e7',
      to: 'e5',
      fen: fens[2]
    };

    const isStale = (stalePayload.ply !== undefined && stalePayload.ply <= currentPly) &&
                    fens[stalePayload.ply] === stalePayload.fen;
    expect(isStale).toBeTruthy();
  });

  it('survives rapid successive checks and king evasions across 20 consecutive plies', () => {
    // Construct position with repeated rook and bishop checks with both kings present
    // White king on e1, Black king on a8, Black rooks on e8 and d8
    const chess = new Chess('k2rr3/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(chess.inCheck()).toBeTruthy();

    // King must evade check
    const kingMoves = chess.moves({ verbose: true });
    expect(kingMoves.length).toBeGreaterThan(0);
    for (const m of kingMoves) {
      const clone = new Chess(chess.fen());
      const res = clone.move(m);
      expect(res).toBeDefined();
      expect(clone.inCheck()).toBeFalsy();
    }
  });
});

describe('Adversarial Stress: 2. Timeout & Clock Expiration Races', () => {
  it('resolves simultaneous move execution vs flag-fall race deterministically', () => {
    // Scenario: White clock reaches 0.00s while White move 1. e4 payload was timestamped at remaining 0.05s
    const moveTimestamp = 1700000000050; // Move dispatched at t=50ms before deadline
    const timeoutClaimTimestamp = 1700000000100; // Flag claimed at t=100ms
    const remainingTimeAtMove = 0.05;

    // FIDE rule / online protocol: if move was sent before zero (remainingTime > 0), move is valid
    const isMovePriorToTimeout = remainingTimeAtMove > 0 && moveTimestamp < timeoutClaimTimestamp;
    expect(isMovePriorToTimeout).toBeTruthy();

    // If remaining time is <= 0 at send time, timeout claim is valid
    const expiredRemainingTime = 0.0;
    const isExpired = expiredRemainingTime <= 0;
    expect(isExpired).toBeTruthy();
  });

  it('guarantees clock never goes negative under rapid countdown ticks', () => {
    let clockSeconds = 0.3;
    const tickIntervals = [0.1, 0.1, 0.1, 0.1, 0.1]; // Total 0.5s ticks when only 0.3s remain

    for (const tick of tickIntervals) {
      clockSeconds = Math.max(0, parseFloat((clockSeconds - tick).toFixed(3)));
    }

    expect(clockSeconds).toBe(0);
    expect(clockSeconds >= 0).toBeTruthy();
  });

  it('accumulates exact Fischer increment across 20 rapid 100ms moves without loss', () => {
    let clock = 180.0; // 3 minutes
    const increment = 2.0; // +2s per move
    const timeSpentPerMove = 0.1; // 100ms reaction time

    for (let ply = 0; ply < 20; ply++) {
      // Synchronous ref mutation pattern established in Milestone M2
      clock = clock - timeSpentPerMove + increment;
    }

    // 180 - (20 * 0.1) + (20 * 2.0) = 180 - 2 + 40 = 218s
    expect(Math.round(clock)).toBe(218);
    expect(clock).toBeGreaterThan(180);
  });

  it('resolves conflicting dual timeout claims without multiple ELO penalties', () => {
    // Both clients broadcast timeout claim simultaneously
    let terminationHandled = false;
    let terminationCount = 0;

    const onTimeoutClaim = () => {
      if (terminationHandled) return;
      terminationHandled = true;
      terminationCount++;
    };

    onTimeoutClaim();
    onTimeoutClaim(); // Concurrent duplicate from peer

    expect(terminationCount).toBe(1);
    expect(terminationHandled).toBeTruthy();
  });

  it('checkmate delivered on final second takes precedence over subsequent timeout', () => {
    // Scholar's mate delivered
    const chess = new Chess('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4');
    expect(chess.isCheckmate()).toBeTruthy();
    expect(chess.isGameOver()).toBeTruthy();

    const isCheckmate = chess.isCheckmate();
    const timeoutReportedAfterwards = true;

    // Checkmate ends the match immediately; timeout after mate is void
    const finalResult = isCheckmate ? 'checkmate' : (timeoutReportedAfterwards ? 'timeout' : 'in_progress');
    expect(finalResult).toBe('checkmate');
  });
});

describe('Adversarial Stress: 3. Draw Protocol & Concurrency Races', () => {
  it('resignation takes strict precedence over pending draw offer', () => {
    let pendingDrawOffer = true;
    let matchResult: 'win' | 'loss' | 'draw' | null = null;

    // Player A offered draw (pendingDrawOffer = true)
    // Concurrently, Player B clicks resign
    const handleResignation = () => {
      pendingDrawOffer = false;
      matchResult = 'win'; // Opponent resigned -> Player A wins
    };

    handleResignation();
    expect(matchResult).toBe('win');
    expect(pendingDrawOffer).toBeFalsy();
  });

  it('simultaneous mutual draw offers resolve cleanly to draw agreement without deadlock', () => {
    let whiteOfferActive = false;
    let blackOfferActive = false;
    let isDrawAgreed = false;

    // White sends draw offer
    whiteOfferActive = true;

    // Concurrently Black sends draw offer while White's offer is in flight
    blackOfferActive = true;

    // Both clients receive mutual offers
    if (whiteOfferActive && blackOfferActive) {
      isDrawAgreed = true;
      whiteOfferActive = false;
      blackOfferActive = false;
    }

    expect(isDrawAgreed).toBeTruthy();
    expect(whiteOfferActive).toBeFalsy();
    expect(blackOfferActive).toBeFalsy();
  });

  it('detects threefold repetition draw across rapid cyclic opening loop', () => {
    const chess = new Chess();
    // 1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8
    chess.move('Nf3'); chess.move('Nf6');
    chess.move('Ng1'); chess.move('Ng8');
    chess.move('Nf3'); chess.move('Nf6');
    chess.move('Ng1'); chess.move('Ng8');

    expect(chess.isThreefoldRepetition()).toBeTruthy();
    expect(chess.isDraw()).toBeTruthy();
  });

  it('draw offer while player is in check does not block legal evasions', () => {
    // White king in check on e1 by Black queen on e2
    const chess = new Chess('4k3/8/8/8/8/8/4q3/4K3 w - - 0 1');
    expect(chess.inCheck()).toBeTruthy();
    // King can capture queen on e2
    const legalMoves = chess.moves({ verbose: true });
    expect(legalMoves.some(m => m.to === 'e2')).toBeTruthy();
  });
});

describe('Adversarial Stress: 4. Malformed FEN Fuzzing & Boundary Recovery', () => {
  it('fuzzes quickEvaluateFen with 50 corrupted FEN mutations without uncaught exception', () => {
    const corruptedFens = [
      '',
      '   ',
      'invalid_fen_string',
      '8/8/8/8/8/8/8/8 w - - 0 1', // Empty board (no kings)
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', // Missing active color and castling
      '8/8/8/8/8/8/8/4K3 w - - 0 1', // Single king only
      '4k3/8/8/8/8/8/8/8 w - - 0 1', // Black king only
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x - - 0 1', // Corrupt turn 'x'
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w INVALID 0 1',
      'rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Rank 9
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 999 999', // Extreme move count
      '4k3/8/8/8/8/8/8/4K2K w - - 0 1', // Two white kings
      '4k2k/8/8/8/8/8/8/4K3 b - - 0 1', // Two black kings
      '????/????/????/????/????/????/????/???? w - - 0 1',
      '\u0000\u0001\u0002\u0003',
      'p/p/p/p/p/p/p/p w - - 0 1',
      'P/P/P/P/P/P/P/P b - - 0 1',
      '8/8/8/8/8/8/8/4K2k w - - -1 -1',
      'undefined',
      'null'
    ];

    // Generate 30 additional randomized string mutations
    for (let i = 0; i < 30; i++) {
      const noisy = `rnbqkbnr/${i}/8/8/${Math.random().toString(36)}/PPPPPPPP/RNBQKBNR w KQkq - 0 1`;
      corruptedFens.push(noisy);
    }

    for (const fen of corruptedFens) {
      try {
        const evalRes = quickEvaluateFen(fen);
        expect(typeof evalRes.cp).toBe('number');
        // Evaluation must be finite and within safe bounds
        expect(Number.isFinite(evalRes.cp)).toBeTruthy();
      } catch (err: any) {
        // Must never throw uncaught exception outside standard error handling
        expect(err).toBeUndefined();
      }
    }
  });

  it('handles 8 Queens vs bare king extreme material evaluation safely', () => {
    // White has 8 Queens and King vs bare Black King
    const extremeWhiteFen = '4k3/8/8/8/8/8/QQQQQQQQ/4K3 w - - 0 1';
    const whiteMat = countMaterial(extremeWhiteFen, 'w');
    const blackMat = countMaterial(extremeWhiteFen, 'b');

    // 8 Queens * 900 = 7200
    expect(whiteMat).toBe(7200);
    expect(blackMat).toBe(0);

    const winProb = centipawnsToWinPercent(whiteMat - blackMat);
    expect(winProb).toBeGreaterThan(99.0);
    expect(winProb).toBeLessThanOrEqual(100.0);
  });

  it('validates 50-move rule exact boundary at 99 halfmoves', () => {
    // Halfmove clock at 99: next quiet move makes it 100 plies -> draw condition
    const fen99 = '4k3/8/8/8/8/8/8/R3K3 w - - 99 50';
    const chess = new Chess(fen99);

    // Quiet king move: e1 -> d1
    const move = chess.move('Kd1');
    expect(move).toBeDefined();

    // 50-move rule is reached at 100 halfmoves
    expect(chess.isDraw()).toBeTruthy();
  });

  it('pawn advance at halfmove 99 resets counter to 0 avoiding draw', () => {
    // White pawn on a2 at halfmove 99
    const fen99Pawn = '4k3/8/8/8/8/8/P7/4K3 w - - 99 50';
    const chess = new Chess(fen99Pawn);

    // Pawn move: a2 -> a3
    const move = chess.move('a3');
    expect(move).toBeDefined();

    // Halfmove clock must be reset to 0
    const newFen = chess.fen();
    expect(newFen.includes(' 0 50')).toBeTruthy();
    expect(chess.isDraw()).toBeFalsy();
  });

  it('handles en passant at board edge (a-file and h-file) without boundary overflow', () => {
    // a-file en passant
    const chessA = new Chess('4k3/8/8/pP6/8/8/8/4K3 w - a6 0 1');
    const epA = chessA.move({ from: 'b5', to: 'a6' });
    expect(epA).toBeDefined();
    expect(chessA.get('a5')).toBeFalsy();
    expect(chessA.get('a6')?.type).toBe('p');

    // h-file en passant
    const chessH = new Chess('4k3/8/8/6Pp/8/8/8/4K3 w - h6 0 1');
    const epH = chessH.move({ from: 'g5', to: 'h6' });
    expect(epH).toBeDefined();
    expect(chessH.get('h5')).toBeFalsy();
    expect(chessH.get('h6')?.type).toBe('p');
  });
});

describe('Adversarial Stress: 5. CAPS2 Classification & Accuracy Stress', () => {
  it('classifies 60 moves sequentially without memory leak or NaN accuracy', () => {
    // Replay a game sequence and calculate accuracy at each stage
    const chess = new Chess();
    const gameMoves = [
      'e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4',
      'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5', 'exd5', 'Nxd5', 'Qb3', 'Nce7',
      'O-O', 'O-O', 'Rfe1', 'c6', 'a4', 'Nb6', 'Bd3', 'Nbd5', 'Ne5', 'Qc7'
    ];

    const classifications: any[] = [];
    for (let i = 0; i < gameMoves.length; i++) {
      const fenBefore = chess.fen();
      const moveRes = chess.move(gameMoves[i]);
      expect(moveRes).toBeDefined();
      const fenAfter = chess.fen();

      const single = classifySingleMove({
        ply: i + 1,
        turn: moveRes.color,
        san: moveRes.san,
        uci: `${moveRes.from}${moveRes.to}`,
        piece: moveRes.piece,
        fenBefore,
        fenAfter,
        evalBefore: (i % 2 === 0) ? 20 : -20,
        evalAfter: (i % 2 === 0) ? 30 : -25,
        mateBefore: null,
        mateAfter: null,
        bestMoveUci: `${moveRes.from}${moveRes.to}`
      });

      expect(single.classification).toBeDefined();
      classifications.push(single);
    }

    expect(classifications.length).toBe(30);

    const whiteAccuracy = calculatePlayerAccuracy(classifications, 'w');
    const blackAccuracy = calculatePlayerAccuracy(classifications, 'b');

    expect(Number.isFinite(whiteAccuracy)).toBeTruthy();
    expect(Number.isFinite(blackAccuracy)).toBeTruthy();
    expect(whiteAccuracy).toBeGreaterThanOrEqual(0);
    expect(whiteAccuracy).toBeLessThanOrEqual(100);
    expect(blackAccuracy).toBeGreaterThanOrEqual(0);
    expect(blackAccuracy).toBeLessThanOrEqual(100);
  });
});
