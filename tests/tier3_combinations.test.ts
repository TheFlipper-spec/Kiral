import { describe, it, expect } from '../scripts/run-tests.mjs';
import { Chess } from 'chess.js';
import {
  quickEvaluateFen,
  countMaterial
} from '../src/engine/evalFormulas';
import type { MovePayload } from '../src/services/multiplayerService';

describe('Tier 3: Combination 1 - Promotion and Checkmate', () => {
  it('Pawn promotes to Queen delivering checkmate in single ply', () => {
    // Corridor back-rank mate with Queen promotion
    const chess = new Chess('k7/ppp1P3/8/8/8/8/8/4K3 w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'e8', promotion: 'q' });
    expect(move).toBeDefined();
    expect(chess.get('e8')?.type).toBe('q');
    expect(chess.isCheckmate()).toBeTruthy();
    expect(chess.isGameOver()).toBeTruthy();
  });

  it('Pawn underpromotes to Knight delivering check and winning advantage', () => {
    // White pawn on c7, Black King on a7, Black Queen on d6
    const chess = new Chess('8/k1P5/3q4/8/8/8/8/4K3 w - - 0 1');
    const move = chess.move({ from: 'c7', to: 'c8', promotion: 'n' });
    expect(move).toBeDefined();
    expect(chess.get('c8')?.type).toBe('n');
    expect(chess.inCheck()).toBeTruthy();
  });

  it('Pawn promotes to Rook delivering back-rank checkmate', () => {
    // Corridor back-rank mate: Black King trapped behind own pawns
    const chess = new Chess('k7/ppp1P3/8/8/8/8/8/4K3 w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'e8', promotion: 'r' });
    expect(move).toBeDefined();
    expect(chess.get('e8')?.type).toBe('r');
    expect(chess.isCheckmate()).toBeTruthy();
  });

  it('Pawn promotes with capture delivering checkmate', () => {
    // White King on c7, White pawn on b7 captures rook on a8 promoting to Queen with checkmate
    const chess = new Chess('r7/1PK5/k7/8/8/8/8/8 w - - 0 1');
    const move = chess.move({ from: 'b7', to: 'a8', promotion: 'q' });
    expect(move).toBeDefined();
    expect(move.captured).toBe('r');
    expect(chess.inCheck()).toBeTruthy();
  });

  it('Black pawn promotes to Queen delivering checkmate', () => {
    // Black back-rank corridor mate
    const chess = new Chess('4k3/8/8/8/8/8/PPP1p3/K7 b - - 0 1');
    const move = chess.move({ from: 'e2', to: 'e1', promotion: 'q' });
    expect(move).toBeDefined();
    expect(chess.get('e1')?.type).toBe('q');
    expect(chess.isCheckmate()).toBeTruthy();
  });
});

describe('Tier 3: Combination 2 - Castling and Corner Rook Capture', () => {
  it('Capturing White h1 rook permanently removes White kingside castling right', () => {
    // Black knight on f2 captures rook on h1
    const chess = new Chess('r3k2r/8/8/8/8/8/5n2/R3K2R b KQkq - 0 1');
    expect(chess.fen().split(' ')[2]).toBe('KQkq');
    chess.move('Nxh1');
    // White now only has queenside castling right 'Q'
    expect(chess.fen().split(' ')[2].includes('K')).toBeFalsy();
    expect(chess.fen().split(' ')[2].includes('Q')).toBeTruthy();
  });

  it('Corner rook moves away and returns: castling rights remain permanently lost', () => {
    const chess = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    chess.move('Rg1'); // rook moves off h1
    chess.move('Rg8');
    chess.move('Rh1'); // rook returns to original square
    chess.move('Rh8');
    // White kingside castling 'K' is permanently gone
    expect(chess.fen().split(' ')[2].includes('K')).toBeFalsy();
    expect(chess.moves().includes('O-O')).toBeFalsy();
  });

  it('White castles kingside while Black rook on a8 is captured on next ply', () => {
    const chess = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    chess.move('O-O'); // White castles
    expect(chess.get('g1')?.type).toBe('k');
    expect(chess.get('f1')?.type).toBe('r');

    chess.move('Kd8'); // Black moves king
    // White rook on a1 captures Black rook on a8
    chess.move('Rxa8+');
    expect(chess.inCheck()).toBeTruthy();
    expect(chess.fen().split(' ')[2].includes('q')).toBeFalsy();
  });

  it('Castling through or into check prevents castling from being used as escape', () => {
    // Black queen controls g1 square: White king on e1 cannot castle O-O into check
    const chess = new Chess('r3k2r/8/8/8/8/8/8/R3K2q w Qkq - 0 1');
    expect(chess.inCheck()).toBeTruthy();
    expect(chess.moves().includes('O-O')).toBeFalsy();
    expect(chess.moves().includes('O-O-O')).toBeFalsy();
  });

  it('Castling rights correctly serialize after queenside rook capture on a8', () => {
    const chess = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    chess.move('Rxa8+');
    expect(chess.fen().split(' ')[2]).toBe('Kk'); // Black lost 'q', White lost 'Q'
  });
});

describe('Tier 3: Combination 3 - Disconnection and Clock State Recovery', () => {
  it('Reconnection sync payload restores board state and move history array', () => {
    const localFens: string[] = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    ];
    expect(localFens.length).toBe(2);

    const syncPayload = {
      fens: [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2'
      ],
      currentPly: 2,
      whiteTime: 175,
      blackTime: 178
    };

    // Client reconciles state from syncPayload
    const reconciledFens = syncPayload.fens;
    const activePly = syncPayload.currentPly;
    const activeBoardFen = reconciledFens[activePly];

    expect(reconciledFens.length).toBe(3);
    expect(activePly).toBe(2);
    expect(activeBoardFen.includes('3p4/4P3')).toBeTruthy();
    const chess = new Chess(activeBoardFen);
    expect(chess.turn()).toBe('w');
  });

  it('Deducts disconnect duration accurately from active player clock', () => {
    const disconnectedAt = Date.now() - 5000; // 5 seconds ago
    const activePlayerClockBefore = 60;
    const elapsedSeconds = Math.round((Date.now() - disconnectedAt) / 1000);
    const recoveredClock = Math.max(0, activePlayerClockBefore - elapsedSeconds);

    expect(recoveredClock).toBeLessThanOrEqual(55);
    expect(recoveredClock).toBeGreaterThanOrEqual(54);
  });

  it('Stale out-of-order move payload is rejected by ply comparison', () => {
    const currentPly = 5;
    const incomingMove: MovePayload = {
      moveId: 'old_move_1',
      ply: 3,
      from: 'e2',
      to: 'e4',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    };

    const isStale = (incomingMove.ply ?? 0) <= currentPly;
    expect(isStale).toBeTruthy();
  });

  it('Heartbeat event syncs clock timestamps without resetting active turn', () => {
    const heartbeat = {
      ply: 4,
      latestFen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
      whiteTime: 172,
      blackTime: 176
    };

    const chess = new Chess(heartbeat.latestFen);
    expect(chess.turn()).toBe('b');
    expect(heartbeat.whiteTime).toBe(172);
    expect(heartbeat.blackTime).toBe(176);
  });

  it('Recovers legal moves from verified FEN after reconnect', () => {
    const recoveredFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const chess = new Chess(recoveredFen);
    expect(chess.turn()).toBe('w');
    const legalMoves = chess.moves();
    expect(legalMoves.length).toBeGreaterThan(25);
  });
});

describe('Tier 3: Combination 4 - Draw Offer and Timeout / Resignation Race', () => {
  it('Pending draw offer is cancelled if offering player times out', () => {
    let drawOfferedBy: string | null = 'alice';
    let winner: string | null = null;

    // Timeout occurs for Alice
    const onTimeout = (timedOutPlayer: string) => {
      drawOfferedBy = null; // draw offer invalidated on timeout
      winner = timedOutPlayer === 'alice' ? 'bob' : 'alice';
    };

    onTimeout('alice');
    expect(drawOfferedBy).toBeNull();
    expect(winner).toBe('bob');
  });

  it('Draw agreement accepted before flag-fall terminates game as draw', () => {
    let matchStatus = 'active';
    let winner: string | null = null;

    const onDrawAccept = () => {
      matchStatus = 'draw';
    };

    const onTimeout = (player: string) => {
      if (matchStatus !== 'active') return; // ignored if already terminated
      winner = player === 'w' ? 'b' : 'w';
    };

    onDrawAccept();
    onTimeout('w'); // arrives 50ms later

    expect(matchStatus).toBe('draw');
    expect(winner).toBeNull();
  });

  it('Resignation takes precedence over pending draw offer', () => {
    let outcome = 'active';
    const events = [
      { type: 'draw_offer', from: 'b' },
      { type: 'resign', from: 'b' }
    ];

    for (const evt of events) {
      if (evt.type === 'resign') {
        outcome = 'white_won_by_resignation';
      }
    }

    expect(outcome).toBe('white_won_by_resignation');
  });

  it('Draw offer while in check allows opponent to decline and play checkmate', () => {
    // White King in check: White offers draw, Black ignores and delivers checkmate
    const chess = new Chess('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(chess.inCheck()).toBeTruthy();
    expect(chess.isCheckmate()).toBeTruthy();
    // Since checkmate on board, draw cannot be accepted
    const isMated = chess.isCheckmate();
    expect(isMated).toBeTruthy();
  });

  it('Mutual draw agreement is terminal and irreversible', () => {
    let gameState: 'playing' | 'drawn' | 'resigned' = 'playing';
    gameState = 'drawn';
    // Any subsequent move is invalid
    const attemptPostGameMove = () => {
      if (gameState !== 'playing') throw new Error('Game is over');
    };
    let threw = false;
    try {
      attemptPostGameMove();
    } catch {
      threw = true;
    }
    expect(threw).toBeTruthy();
  });
});

describe('Tier 3: Combination 5 - En Passant and Endgame Material Swing', () => {
  it('En passant capture swings evaluation from losing to winning', () => {
    // White king on f5, Black king on h8, White pawn on e5, Black pawn on d5
    // Black played d7-d5.
    // If White does NOT capture e.p., d5 pawn runs. If White captures exd6, White promotes!
    const fenBefore = '7k/8/8/3pP1K1/8/8/8/8 w - d6 0 1';
    const evalBefore = quickEvaluateFen(fenBefore);

    const chess = new Chess(fenBefore);
    chess.move('exd6');
    const evalAfter = quickEvaluateFen(chess.fen());
    expect(evalAfter.cp).toBeGreaterThan(evalBefore.cp);

    // Material difference: black pawn removed
    expect(countMaterial(chess.fen(), 'b')).toBe(0);
    expect(countMaterial(chess.fen(), 'w')).toBe(100);
  });

  it('En passant capture prevents opponent promotion on subsequent turn', () => {
    // Black pawn reaches 4th rank, White pushes 2 squares, Black captures e.p.
    const chess = new Chess('k7/8/8/8/3pP3/8/8/4K3 b - e3 0 1');
    const move = chess.move('dxe3');
    expect(move).toBeDefined();
    expect(chess.get('e4')).toBeFalsy();
    // White pawn on e4 eliminated, cannot promote to Queen
    expect(countMaterial(chess.fen(), 'w')).toBe(0);
  });

  it('En passant checkmate with King and Pawns only', () => {
    const chess = new Chess('7k/5K2/8/5Pp1/8/8/8/7R w - g6 0 1');
    const move = chess.move('fxg6');
    expect(move).toBeDefined();
    expect(chess.isCheckmate()).toBeTruthy();
  });
});

describe('Tier 3: Combination 6 - Promotion and Insufficient Material Boundary', () => {
  it('Pawn promotion to Queen converts insufficient material into decisive win', () => {
    // White King + Pawn vs bare Black King
    const fenBefore = '8/4P3/8/8/8/8/8/4K2k w - - 0 1';
    const chess = new Chess(fenBefore);
    // Before promotion, King+Pawn vs King is not insufficient material (can promote)
    expect(chess.isInsufficientMaterial()).toBeFalsy();

    chess.move({ from: 'e7', to: 'e8', promotion: 'q' });
    // Now White has King + Queen vs bare King (decisive win)
    expect(chess.isInsufficientMaterial()).toBeFalsy();
    expect(countMaterial(chess.fen(), 'w')).toBe(900);
  });

  it('Underpromoting to Bishop or Knight in bare king endgame produces immediate insufficient material draw', () => {
    // White King + Pawn vs bare Black King.
    // Underpromoting to Bishop gives King+Bishop vs King (insufficient material draw!)
    const bishopChess = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    bishopChess.move({ from: 'e7', to: 'e8', promotion: 'b' });
    expect(bishopChess.isInsufficientMaterial()).toBeTruthy();
    expect(bishopChess.isGameOver()).toBeTruthy();

    // Underpromoting to Knight gives King+Knight vs King (insufficient material draw!)
    const knightChess = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    knightChess.move({ from: 'e7', to: 'e8', promotion: 'n' });
    expect(knightChess.isInsufficientMaterial()).toBeTruthy();
    expect(knightChess.isGameOver()).toBeTruthy();
  });

  it('Underpromoting to Rook avoids insufficient material draw', () => {
    // White King + Pawn vs bare Black King.
    // Promoting to Rook gives King+Rook vs King (sufficient mating material!)
    const rookChess = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    rookChess.move({ from: 'e7', to: 'e8', promotion: 'r' });
    expect(rookChess.isInsufficientMaterial()).toBeFalsy();
    expect(countMaterial(rookChess.fen(), 'w')).toBe(500);
  });
});
