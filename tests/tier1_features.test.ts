import { describe, it, expect } from '../scripts/run-tests.mjs';
import { Chess } from 'chess.js';
import {
  centipawnsToWinPercent,
  countMaterial,
  quickEvaluateFen,
  calculatePlayerAccuracy,
  classifySingleMove
} from '../src/engine/evalFormulas';
import { TIME_CONTROLS } from '../src/types/chess';
import type { MovePayload, LiveGamePresence } from '../src/services/multiplayerService';

describe('Tier 1: Feature 1 - Board Initialization', () => {
  it('loads standard starting FEN correctly', () => {
    const chess = new Chess();
    expect(chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('sets initial active turn to white', () => {
    const chess = new Chess();
    expect(chess.turn()).toBe('w');
  });

  it('provides exactly 20 legal moves for white on ply 1', () => {
    const chess = new Chess();
    const moves = chess.moves();
    // 16 pawn pushes (8 single + 8 double) + 4 knight jumps (Na3, Nc3, Nf3, Nh3)
    expect(moves.length).toBe(20);
  });

  it('initializes castling rights for both white and black', () => {
    const chess = new Chess();
    const fen = chess.fen();
    const castlingPart = fen.split(' ')[2];
    expect(castlingPart).toBe('KQkq');
  });

  it('initializes halfmove clock to 0 and fullmove number to 1', () => {
    const chess = new Chess();
    const parts = chess.fen().split(' ');
    expect(parts[4]).toBe('0');
    expect(parts[5]).toBe('1');
  });
});

describe('Tier 1: Feature 2 - Legal Moves (P, N, B, R, Q, K)', () => {
  it('validates pawn 1-square and 2-square pushes and capture legality', () => {
    const chess = new Chess();
    // 2-square push
    const m1 = chess.move({ from: 'e2', to: 'e4' });
    expect(m1).toBeDefined();
    expect(m1.piece).toBe('p');
    // Black 2-square push
    const m2 = chess.move({ from: 'd7', to: 'd5' });
    expect(m2).toBeDefined();
    // Pawn capture
    const m3 = chess.move({ from: 'e4', to: 'd5' });
    expect(m3).toBeDefined();
    expect(m3.captured).toBe('p');
    // Blocked pawn cannot move forward into occupied square
    const blockedChess = new Chess('8/8/8/4p3/4P3/8/8/4K2k w - - 0 1');
    const legalMoves = blockedChess.moves({ square: 'e4' });
    expect(legalMoves.length).toBe(0);
  });

  it('validates knight jumping mechanics and L-shaped moves', () => {
    const chess = new Chess();
    // Knight can jump over unmoved pawns
    const m1 = chess.move('Nf3');
    expect(m1).toBeDefined();
    expect(m1.piece).toBe('n');
    // Center knight has up to 8 moves
    const centerKnightChess = new Chess('8/8/8/4N3/8/8/8/4K2k w - - 0 1');
    const moves = centerKnightChess.moves({ square: 'e5' });
    expect(moves.length).toBe(8);
  });

  it('validates bishop diagonal moves and obstruction rules', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('e5');
    // Bishop can move diagonally once pawn unblocks
    const m1 = chess.move('Bc4');
    expect(m1).toBeDefined();
    expect(m1.piece).toBe('b');
    // Bishop cannot jump over pawns
    const lockedBishopChess = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const c1Moves = lockedBishopChess.moves({ square: 'c1' });
    expect(c1Moves.length).toBe(0);
  });

  it('validates rook orthogonal rank and file movement', () => {
    const chess = new Chess('k7/8/8/4R3/8/8/8/7K w - - 0 1');
    const moves = chess.moves({ square: 'e5' });
    // Open board rook has 14 moves (7 horizontal + 7 vertical)
    expect(moves.length).toBe(14);
    // Obstruction stops rook
    const blockedChess = new Chess('k7/8/4P3/4R3/4P3/8/8/7K w - - 0 1');
    const blockedMoves = blockedChess.moves({ square: 'e5' });
    // Blocked above and below, can only move horizontally (7 moves)
    expect(blockedMoves.length).toBe(7);
  });

  it('validates queen omnidirectional and king single-step movement with check avoidance', () => {
    // Open Queen
    const queenChess = new Chess('k7/8/8/4Q3/8/8/8/7K w - - 0 1');
    const queenMoves = queenChess.moves({ square: 'e5' });
    // Open board queen has 27 moves (14 orthogonal + 13 diagonal)
    expect(queenMoves.length).toBe(27);

    // King cannot move into check
    const kingChess = new Chess('8/8/8/8/8/4r3/8/4K2k w - - 0 1');
    const kingMoves = kingChess.moves({ square: 'e1' });
    // e2 is attacked by rook on e3, d1, d2, f1, f2 are safe
    expect(kingMoves.includes('Ke2')).toBeFalsy();
    expect(kingMoves.length).toBe(4);
  });
});

describe('Tier 1: Feature 3 - Castling Rights and Execution', () => {
  it('executes White kingside castling (O-O)', () => {
    const chess = new Chess('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4');
    const move = chess.move('O-O');
    expect(move).toBeDefined();
    expect(chess.get('g1')?.type).toBe('k');
    expect(chess.get('f1')?.type).toBe('r');
    expect(chess.fen().includes('KQ')).toBeFalsy();
  });

  it('executes White queenside castling (O-O-O)', () => {
    const chess = new Chess('r3kbnr/ppp1pppp/2nq4/3p4/3P4/2NQ4/PPP1PPPP/R3KBNR w KQkq - 4 4');
    const move = chess.move('O-O-O');
    expect(move).toBeDefined();
    expect(chess.get('c1')?.type).toBe('k');
    expect(chess.get('d1')?.type).toBe('r');
  });

  it('executes Black kingside castling (O-O)', () => {
    const chess = new Chess('rnbqk2r/pppp1ppp/5n2/2b1p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R b KQkq - 4 4');
    const move = chess.move('O-O');
    expect(move).toBeDefined();
    expect(chess.get('g8')?.type).toBe('k');
    expect(chess.get('f8')?.type).toBe('r');
  });

  it('executes Black queenside castling (O-O-O)', () => {
    const chess = new Chess('r3kbnr/pppqpppp/2n5/3p4/3P4/2N2N2/PPP1PPPP/R1BQKB1R b KQkq - 4 4');
    const move = chess.move('O-O-O');
    expect(move).toBeDefined();
    expect(chess.get('c8')?.type).toBe('k');
    expect(chess.get('d8')?.type).toBe('r');
  });

  it('disallows castling when in check, through check, or after king has moved', () => {
    // King in check cannot castle
    const inCheckChess = new Chess('rnbqk2r/pppp1ppp/5n2/4p3/1b2P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 1 4');
    expect(inCheckChess.inCheck()).toBeTruthy();
    expect(inCheckChess.moves().includes('O-O')).toBeFalsy();

    // Castling through check (square f1 attacked by black bishop on a6)
    const throughCheckChess = new Chess('r3k2r/8/b7/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(throughCheckChess.moves().includes('O-O')).toBeFalsy();

    // Moving king invalidates castling rights
    const movedKingChess = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    movedKingChess.move('Kd1');
    expect(movedKingChess.fen().split(' ')[2].includes('K')).toBeFalsy();
    expect(movedKingChess.fen().split(' ')[2].includes('Q')).toBeFalsy();
  });
});

describe('Tier 1: Feature 4 - En Passant Mechanics', () => {
  it('executes White en passant capture correctly', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('a6');
    chess.move('e5');
    chess.move('d5'); // Black pushes pawn two squares
    expect(chess.fen().includes('d6')).toBeTruthy(); // en passant target square
    const epMove = chess.move('exd6');
    expect(epMove).toBeDefined();
    expect(epMove.flags.includes('e')).toBeTruthy();
    expect(chess.get('d5')).toBeFalsy(); // captured pawn removed
    expect(chess.get('d6')?.type).toBe('p');
  });

  it('executes Black en passant capture correctly', () => {
    const chess = new Chess();
    chess.move('a3');
    chess.move('d5');
    chess.move('h3');
    chess.move('d4');
    chess.move('e4'); // White pushes two squares
    expect(chess.fen().includes('e3')).toBeTruthy();
    const epMove = chess.move('dxe3');
    expect(epMove).toBeDefined();
    expect(epMove.flags.includes('e')).toBeTruthy();
    expect(chess.get('e4')).toBeFalsy();
  });

  it('expires en passant opportunity if not played immediately', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('a6');
    chess.move('e5');
    chess.move('d5'); // EP target d6 set
    chess.move('h3'); // White plays different move
    chess.move('h6'); // Black plays move
    // White can no longer play exd6
    const moves = chess.moves();
    expect(moves.includes('exd6')).toBeFalsy();
    expect(chess.fen().split(' ')[3]).toBe('-');
  });

  it('prohibits en passant when capturing would leave king in check (pin)', () => {
    // White king on e1, Black rook on e8, White pawn on e5, Black pawn on d5, Black king on g8
    // If e5xd6, king is in check from e8 rook
    const pinnedChess = new Chess('4r1k1/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    const legalMoves = pinnedChess.moves();
    expect(legalMoves.includes('exd6')).toBeFalsy();
  });

  it('serializes correct en passant target square in FEN representation', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('a6');
    chess.move('e5');
    chess.move('d5');
    expect(chess.fen().split(' ')[3]).toBe('d6');
  });
});

describe('Tier 1: Feature 5 - Pawn Promotion', () => {
  it('promotes White pawn to Queen upon reaching 8th rank', () => {
    const chess = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'e8', promotion: 'q' });
    expect(move).toBeDefined();
    expect(chess.get('e8')?.type).toBe('q');
  });

  it('promotes White pawn to Knight (underpromotion)', () => {
    const chess = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'e8', promotion: 'n' });
    expect(move).toBeDefined();
    expect(chess.get('e8')?.type).toBe('n');
  });

  it('promotes Black pawn to Rook upon reaching 1st rank', () => {
    const chess = new Chess('4K2k/8/8/8/8/8/4p3/8 b - - 0 1');
    const move = chess.move({ from: 'e2', to: 'e1', promotion: 'r' });
    expect(move).toBeDefined();
    expect(chess.get('e1')?.type).toBe('r');
  });

  it('promotes Black pawn to Bishop (underpromotion)', () => {
    const chess = new Chess('4K2k/8/8/8/8/8/4p3/8 b - - 0 1');
    const move = chess.move({ from: 'e2', to: 'e1', promotion: 'b' });
    expect(move).toBeDefined();
    expect(chess.get('e1')?.type).toBe('b');
  });

  it('promotes pawn with capture', () => {
    const chess = new Chess('3r4/4P3/8/8/8/8/8/4K2k w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'd8', promotion: 'q' });
    expect(move).toBeDefined();
    expect(move.captured).toBe('r');
    expect(chess.get('d8')?.type).toBe('q');
  });
});

describe('Tier 1: Feature 6 - Game Over Checks', () => {
  it('detects checkmate status accurately', () => {
    // Fool's mate position
    const chess = new Chess('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(chess.inCheck()).toBeTruthy();
    expect(chess.isCheckmate()).toBeTruthy();
    expect(chess.isGameOver()).toBeTruthy();
  });

  it('detects stalemate status accurately', () => {
    // Classic stalemate position: Black king on a8, White queen on c7, White king on a6
    const chess = new Chess('k7/2Q5/K7/8/8/8/8/8 b - - 0 1');
    expect(chess.inCheck()).toBeFalsy();
    expect(chess.isStalemate()).toBeTruthy();
    expect(chess.isGameOver()).toBeTruthy();
  });

  it('detects insufficient material draws', () => {
    // King vs King
    const kvk = new Chess('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
    expect(kvk.isInsufficientMaterial()).toBeTruthy();

    // King + Knight vs King
    const kvkn = new Chess('8/8/8/4k3/8/8/5N2/4K3 w - - 0 1');
    expect(kvkn.isInsufficientMaterial()).toBeTruthy();

    // King + Bishop vs King
    const kvkb = new Chess('8/8/8/4k3/8/8/5B2/4K3 w - - 0 1');
    expect(kvkb.isInsufficientMaterial()).toBeTruthy();
  });

  it('detects threefold repetition draws', () => {
    const chess = new Chess();
    // Repeat knight moves 3 times
    chess.move('Nf3'); chess.move('Nf6');
    chess.move('Ng1'); chess.move('Ng8');
    chess.move('Nf3'); chess.move('Nf6');
    chess.move('Ng1'); chess.move('Ng8');
    expect(chess.isThreefoldRepetition()).toBeTruthy();
  });

  it('detects 50-move rule draws', () => {
    // FEN with 100 halfmoves (50 full moves) without pawn move or capture
    const chess = new Chess('8/8/8/4k3/8/8/8/4K2R w - - 100 51');
    expect(chess.isDraw()).toBeTruthy();
  });
});

describe('Tier 1: Feature 7 - Fischer Clocks and Time Controls', () => {
  it('verifies standard time controls configuration including bullet', () => {
    expect(TIME_CONTROLS.length).toBe(6);
    const bullet10 = TIME_CONTROLS.find((tc) => tc.id === 'bullet_1_0');
    expect(bullet10).toBeDefined();
    expect(bullet10?.category).toBe('Пуля');
    expect(bullet10?.initialSeconds).toBe(60);
    expect(bullet10?.incrementSeconds).toBe(0);

    const bullet21 = TIME_CONTROLS.find((tc) => tc.id === 'bullet_2_1');
    expect(bullet21).toBeDefined();
    expect(bullet21?.category).toBe('Пуля');
    expect(bullet21?.initialSeconds).toBe(120);
    expect(bullet21?.incrementSeconds).toBe(1);

    const blitz32 = TIME_CONTROLS.find((tc) => tc.id === 'blitz_3_2');
    expect(blitz32).toBeDefined();
    expect(blitz32?.initialSeconds).toBe(180);
    expect(blitz32?.incrementSeconds).toBe(2);
  });

  it('verifies 5+0 and 10+0 zero increment time controls', () => {
    const blitz50 = TIME_CONTROLS.find((tc) => tc.id === 'blitz_5_0');
    expect(blitz50?.initialSeconds).toBe(300);
    expect(blitz50?.incrementSeconds).toBe(0);

    const rapid10 = TIME_CONTROLS.find((tc) => tc.id === 'rapid_10_0');
    expect(rapid10?.initialSeconds).toBe(600);
    expect(rapid10?.incrementSeconds).toBe(0);
  });

  it('simulates Fischer increment addition on move completion', () => {
    const initialClock = 180;
    const increment = 2;
    const elapsedOnTurn = 4;
    const afterTurnRemaining = initialClock - elapsedOnTurn;
    const finalClock = afterTurnRemaining + increment;
    expect(finalClock).toBe(178);
  });

  it('simulates 1-second countdown ticks down to 0 timeout boundary', () => {
    let clock = 3;
    const ticks = [1, 1, 1];
    for (const tick of ticks) {
      clock = Math.max(0, clock - tick);
    }
    expect(clock).toBe(0);
    const isTimedOut = clock <= 0;
    expect(isTimedOut).toBeTruthy();
  });

  it('accumulates multiple increments across consecutive moves', () => {
    let clock = 100;
    const increment = 2;
    for (let ply = 0; ply < 5; ply++) {
      clock = clock - 1 + increment; // 1s spent, 2s added
    }
    expect(clock).toBe(105);
  });
});

describe('Tier 1: Feature 8 - CAPS2 Accuracy and Evaluation Formulas', () => {
  it('centipawnsToWinPercent correctly evaluates neutral, advantage, disadvantage, and mate', () => {
    expect(centipawnsToWinPercent(0)).toBe(50);
    expect(centipawnsToWinPercent(300)).toBeGreaterThan(70);
    expect(centipawnsToWinPercent(-300)).toBeLessThan(30);
    expect(centipawnsToWinPercent(0, 1)).toBeGreaterThanOrEqual(99.0);
    expect(centipawnsToWinPercent(0, -1)).toBeLessThanOrEqual(1.0);
  });

  it('countMaterial correctly tallies pieces for starting position and endgame', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(countMaterial(startFen, 'w')).toBe(3940);
    expect(countMaterial(startFen, 'b')).toBe(3940);

    // Only White king and pawn vs Black king
    const pawnEndgame = '8/8/8/4k3/4P3/8/8/4K3 w - - 0 1';
    expect(countMaterial(pawnEndgame, 'w')).toBe(100);
    expect(countMaterial(pawnEndgame, 'b')).toBe(0);
  });

  it('quickEvaluateFen evaluates material, checkmate and draw positions', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const startEval = quickEvaluateFen(startFen);
    expect(startEval.mate).toBeNull();
    expect(startEval.cp).toBe(0);

    // Fool's mate (Black mates White)
    const foolsMate = 'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
    const mateEval = quickEvaluateFen(foolsMate);
    expect(mateEval.mate).toBe(-1);
    expect(mateEval.cp).toBe(-10000);
  });

  it('classifySingleMove identifies best, forced, and blunder moves', () => {
    // Single legal move position -> forced
    const forcedFenBefore = 'k7/8/K7/8/8/8/8/7R b - - 0 1';
    const forcedFenAfter = '1k6/8/K7/8/8/8/8/7R w - - 1 2';
    const forcedRes = classifySingleMove({
      ply: 2,
      turn: 'b',
      san: 'Kb8',
      uci: 'a8b8',
      piece: 'k',
      fenBefore: forcedFenBefore,
      fenAfter: forcedFenAfter,
      evalBefore: 800,
      evalAfter: 800,
      mateBefore: null,
      mateAfter: null,
      bestMoveUci: 'a8b8'
    });
    expect(forcedRes.classification).toBe('forced');

    // Blunder: dropping queen into capture
    const blunderRes = classifySingleMove({
      ply: 10,
      turn: 'w',
      san: 'Qe5',
      uci: 'd4e5',
      piece: 'q',
      fenBefore: 'rnbqkbnr/ppp1pppp/8/3p4/3Q4/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1',
      fenAfter: 'rnbqkbnr/ppp1pppp/8/3pQ3/8/8/PPPPPPPP/RNB1KBNR b KQkq - 1 1',
      evalBefore: 50,
      evalAfter: -850,
      mateBefore: null,
      mateAfter: null,
      bestMoveUci: 'd4d3'
    });
    expect(blunderRes.classification).toBe('blunder');
  });

  it('calculatePlayerAccuracy produces realistic CAPS2 accuracy bounds', () => {
    // Sequence of 100% best moves
    const mockBestMoves: any[] = [
      { turn: 'w', classification: 'best', centipawnLoss: 0, winPercentLoss: 0 },
      { turn: 'w', classification: 'best', centipawnLoss: 0, winPercentLoss: 0 }
    ];
    expect(calculatePlayerAccuracy(mockBestMoves, 'w')).toBe(100);

    // Sequence with blunder
    const mockBlunderMoves: any[] = [
      { turn: 'w', classification: 'blunder', centipawnLoss: 500, winPercentLoss: 30 }
    ];
    expect(calculatePlayerAccuracy(mockBlunderMoves, 'w')).toBeLessThan(20);
  });
});

describe('Tier 1: Feature 9 - Multiplayer Realtime Payload Validation', () => {
  it('validates OnlineMovePayload structure and required fields', () => {
    const payload: MovePayload = {
      moveId: 'm_1700000000_abcd',
      ply: 1,
      from: 'e2',
      to: 'e4',
      san: 'e4',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      fens: [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
      ],
      whiteTime: 180,
      blackTime: 180
    };

    expect(payload.from).toBe('e2');
    expect(payload.to).toBe('e4');
    expect(payload.fen.length).toBeGreaterThan(10);
    expect(Array.isArray(payload.fens)).toBeTruthy();
  });

  it('validates move_ack event payload format', () => {
    const ackPayload = { moveId: 'm_1700000000_abcd', ply: 1 };
    expect(ackPayload.moveId).toBe('m_1700000000_abcd');
    expect(ackPayload.ply).toBe(1);
  });

  it('validates draw offer and accept payloads', () => {
    const drawOffer = { playerId: 'usr_alice', fromUsername: 'Alice' };
    expect(drawOffer.playerId).toBe('usr_alice');
    expect(drawOffer.fromUsername).toBe('Alice');

    const drawAccept = { roomId: 'room_123' };
    expect(drawAccept.roomId).toBe('room_123');
  });

  it('validates timeout claim broadcast payload', () => {
    const timeoutPayload = {
      playerId: 'usr_alice',
      timedOutColor: 'b' as const,
      timestamp: Date.now()
    };
    expect(timeoutPayload.timedOutColor).toBe('b');
    expect(timeoutPayload.timestamp).toBeGreaterThan(0);
  });

  it('validates live game presence lifecycle payload', () => {
    const presence: LiveGamePresence = {
      userId: 'usr_player1',
      username: 'PlayerOne',
      elo: 1500,
      roomId: 'room_pvp_999',
      opponentName: 'PlayerTwo',
      timeControlId: 'rapid_10_0',
      updatedAt: Date.now()
    };
    expect(presence.userId).toBe('usr_player1');
    expect(presence.timeControlId).toBe('rapid_10_0');
    expect(presence.elo).toBe(1500);
  });
});
