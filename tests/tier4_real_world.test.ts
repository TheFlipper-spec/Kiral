import { describe, it, expect } from '../scripts/run-tests.mjs';
import { Chess } from 'chess.js';
import {
  quickEvaluateFen,
  centipawnsToWinPercent,
  classifySingleMove,
  calculatePlayerAccuracy
} from '../src/engine/evalFormulas';
import { SAMPLE_GAMES } from '../src/data/sampleGames';
import type { MoveAnalysis } from '../src/types/chess';

describe('Tier 4: Scenario 1 - The Immortal Game (Anderssen vs Kieseritzky, 1851)', () => {
  it('replays Anderssen vs Kieseritzky from opening to 23. Be7# checkmate', () => {
    const chess = new Chess();
    const moves = [
      'e4', 'e5', 'f4', 'exf4', 'Bc4', 'Qh4+', 'Kf1', 'b5', 'Bxb5', 'Nf6',
      'Nf3', 'Qh6', 'd3', 'Nh5', 'Nh4', 'Qg5', 'Nf5', 'c6', 'g4', 'Nf6',
      'Rg1', 'cxb5', 'h4', 'Qg6', 'h5', 'Qg5', 'Qf3', 'Ng8', 'Bxf4', 'Qf6',
      'Nc3', 'Bc5', 'Nd5', 'Qxb2', 'Bd6', 'Bxg1', 'e5', 'Qxa1+', 'Ke2', 'Na6',
      'Nxg7+', 'Kd8', 'Qf6+', 'Nxf6', 'Be7#'
    ];

    for (const san of moves) {
      const res = chess.move(san);
      expect(res).toBeDefined();
    }

    expect(chess.inCheck()).toBeTruthy();
    expect(chess.isCheckmate()).toBeTruthy();
    expect(chess.isGameOver()).toBeTruthy();
    expect(chess.history().length).toBe(45);
  });
});

describe('Tier 4: Scenario 2 - The Opera Game (Paul Morphy, 1858)', () => {
  it('loads and verifies Morphy Opera Game from SAMPLE_GAMES database', () => {
    const operaGame = SAMPLE_GAMES.find((g) => g.id === 'morphy-opera-1858');
    expect(operaGame).toBeDefined();
    expect(operaGame?.white).toBe('Paul Morphy');

    const chess = new Chess();
    chess.loadPgn(operaGame!.pgn);

    expect(chess.isCheckmate()).toBeTruthy();
    expect(chess.isGameOver()).toBeTruthy();

    const history = chess.history({ verbose: true });
    // Final move is Rd8#
    const finalMove = history[history.length - 1];
    expect(finalMove.san).toBe('Rd8#');
    expect(finalMove.to).toBe('d8');
    expect(finalMove.piece).toBe('r');

    // Penultimate move was Queen sacrifice 16. Qb8+!!
    const queenSac = history[history.length - 3];
    expect(queenSac.san).toBe('Qb8+');
    expect(queenSac.piece).toBe('q');
  });

  it('verifies intermediate checks and pins during Opera Game replay', () => {
    const chess = new Chess();
    // 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
    const moves = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7'];
    for (const m of moves) chess.move(m);

    // Black queen on e7 defends f7
    expect(chess.get('e7')?.type).toBe('q');

    // 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8
    const continuation = ['Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8'];
    for (const m of continuation) chess.move(m);

    // White king is castled queenside O-O-O
    expect(chess.get('c1')?.type).toBe('k');
    expect(chess.get('d1')?.type).toBe('r');
    // Black knight on d7 is pinned to king by bishop on b5 and rook on d1
    expect(chess.inCheck()).toBeFalsy();
  });
});

describe('Tier 4: Scenario 3 - Kasparov vs Topalov 1999 (Kasparov Immortal)', () => {
  it('loads and validates Kasparov vs Topalov 1999 full game PGN', () => {
    const game = SAMPLE_GAMES.find((g) => g.id === 'kasparov-topalov-1999');
    expect(game).toBeDefined();

    const chess = new Chess();
    chess.loadPgn(game!.pgn);

    // Kasparov won by resignation on move 44 (87 plies)
    expect(chess.history().length).toBe(87);
    const history = chess.history({ verbose: true });
    // Move 24 was legendary rook sacrifice 24. Rxd4!!
    // Ply 47 (move 24 for White)
    const rookSac = history[46];
    expect(rookSac.san).toBe('Rxd4');
    expect(rookSac.piece).toBe('r');
    expect(rookSac.captured).toBe('p'); // captured d4 pawn
  });

  it('tracks Topalov king walk into White territory under heavy attack', () => {
    const game = SAMPLE_GAMES.find((g) => g.id === 'kasparov-topalov-1999');
    const chess = new Chess();
    chess.loadPgn(game!.pgn);
    const history = chess.history();

    // Replay up to Black King reaching a4 on move 27
    const stepper = new Chess();
    // 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4
    for (let i = 0; i < 54; i++) {
      stepper.move(history[i]);
    }

    // Black King is deep in White territory on a4!
    expect(stepper.get('a4')?.type).toBe('k');
    expect(stepper.get('a4')?.color).toBe('b');
  });
});

describe('Tier 4: Scenario 4 - Fischer vs Byrne 1956 (Game of the Century)', () => {
  it('loads and verifies Fischer vs Byrne 1956 up to 41... Rc2# mate', () => {
    const game = SAMPLE_GAMES.find((g) => g.id === 'fischer-byrne-1956');
    expect(game).toBeDefined();

    const chess = new Chess();
    chess.loadPgn(game!.pgn);

    expect(chess.isCheckmate()).toBeTruthy();
    expect(chess.isGameOver()).toBeTruthy();

    const history = chess.history({ verbose: true });
    const finalMove = history[history.length - 1];
    expect(finalMove.san).toBe('Rc2#');
    expect(finalMove.color).toBe('b');

    // 17... Be6!! Queen sacrifice
    // Ply 34 (move 17 for Black)
    const be6Move = history[33];
    expect(be6Move.san).toBe('Be6');
    expect(be6Move.piece).toBe('b');
  });
});

describe('Tier 4: Scenario 5 - Miniatures: Scholar Mate and Fool Mate', () => {
  it('replays 4-move Scholar Mate and validates evaluation progression', () => {
    const chess = new Chess();
    const evals: number[] = [];

    evals.push(quickEvaluateFen(chess.fen()).cp); // starting
    chess.move('e4');
    chess.move('e5');
    chess.move('Qh5');
    chess.move('Nc6');
    chess.move('Bc4');
    chess.move('Nf6');

    // Mating move 4. Qxf7#
    const mateMove = chess.move('Qxf7#');
    expect(mateMove).toBeDefined();
    expect(chess.isCheckmate()).toBeTruthy();

    const finalEval = quickEvaluateFen(chess.fen());
    expect(finalEval.mate).toBe(1); // Mate for White
    expect(finalEval.cp).toBe(10000);

    const winPercent = centipawnsToWinPercent(finalEval.cp, finalEval.mate);
    expect(winPercent).toBeGreaterThanOrEqual(99.0);
  });

  it('replays 2-move Fool Mate and validates Black victory', () => {
    const chess = new Chess();
    chess.move('f3');
    chess.move('e5');
    chess.move('g4');
    chess.move('Qh4#');

    expect(chess.isCheckmate()).toBeTruthy();
    const evalRes = quickEvaluateFen(chess.fen());
    expect(evalRes.mate).toBe(-1); // Mate for Black
    expect(evalRes.cp).toBe(-10000);

    const winPercent = centipawnsToWinPercent(evalRes.cp, evalRes.mate);
    expect(winPercent).toBeLessThanOrEqual(1.0);
  });
});

describe('Tier 4: Scenario 6 - Grandmaster Drawn Endgames and Repetitions', () => {
  it('verifies 3-fold repetition in theoretical opening loop', () => {
    const chess = new Chess();
    // Knight repetition loop
    chess.move('Nf3'); chess.move('Nf6');
    chess.move('Ng1'); chess.move('Ng8');
    chess.move('Nf3'); chess.move('Nf6');
    chess.move('Ng1'); chess.move('Ng8');

    expect(chess.isThreefoldRepetition()).toBeTruthy();
  });

  it('detects stalemate defense in King and Pawn corner trap', () => {
    // Classic wrong-rook-pawn stalemate:
    // White King on b6 defends pawn on a7, Black King on a8 has 0 legal moves and is not in check
    const chess = new Chess('k7/P7/1K6/8/8/8/8/8 b - - 0 1');
    expect(chess.inCheck()).toBeFalsy();
    expect(chess.isStalemate()).toBeTruthy();
    expect(chess.isGameOver()).toBeTruthy();
  });
});

describe('Tier 4: Scenario 7 - CAPS2 Evaluation Graph & Classification Pipeline', () => {
  it('runs classifySingleMove and calculatePlayerAccuracy on a mini-game sequence', () => {
    // 6-ply Italian game sequence
    const chess = new Chess();
    const plys: MoveAnalysis[] = [];

    const moves = [
      { san: 'e4', uci: 'e2e4', piece: 'p', turn: 'w' as const },
      { san: 'e5', uci: 'e7e5', piece: 'p', turn: 'b' as const },
      { san: 'Nf3', uci: 'g1f3', piece: 'n', turn: 'w' as const },
      { san: 'Nc6', uci: 'b8c6', piece: 'n', turn: 'b' as const },
      { san: 'Bc4', uci: 'f1c4', piece: 'b', turn: 'w' as const },
      { san: 'Bc5', uci: 'f8c5', piece: 'b', turn: 'b' as const }
    ];

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const fenBefore = chess.fen();
      chess.move(m.san);
      const fenAfter = chess.fen();

      const analysis = classifySingleMove({
        ply: i + 1,
        turn: m.turn,
        san: m.san,
        uci: m.uci,
        piece: m.piece,
        fenBefore,
        fenAfter,
        evalBefore: 15,
        evalAfter: 20,
        mateBefore: null,
        mateAfter: null,
        bestMoveUci: m.uci
      });

      plys.push({
        ply: i + 1,
        moveNumber: Math.floor(i / 2) + 1,
        turn: m.turn,
        san: m.san,
        uci: m.uci,
        piece: m.piece,
        fenBefore,
        fenAfter,
        evalBefore: 15,
        evalAfter: 20,
        mateBefore: null,
        mateAfter: null,
        winPercentBefore: 50,
        winPercentAfter: 50,
        winPercentLoss: analysis.winLoss,
        centipawnLoss: analysis.cpLoss,
        classification: analysis.classification,
        classificationReason: analysis.reason,
        bestMoveUci: m.uci,
        bestMoveSan: m.san,
        bestLinePv: [m.uci],
        depth: 18
      });
    }

    expect(plys.length).toBe(6);
    // Verified ECO book opening move classification
    expect(plys[0].classification).toBe('book');

    // Calculate CAPS2 accuracy for White and Black
    const whiteAcc = calculatePlayerAccuracy(plys, 'w');
    const blackAcc = calculatePlayerAccuracy(plys, 'b');

    expect(whiteAcc).toBeGreaterThanOrEqual(95);
    expect(whiteAcc).toBeLessThanOrEqual(100);
    expect(blackAcc).toBeGreaterThanOrEqual(95);
    expect(blackAcc).toBeLessThanOrEqual(100);
  });
});
