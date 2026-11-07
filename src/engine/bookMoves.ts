// Common opening theoretical ECO positions and moves for Book move detection
export const BOOK_MOVES: Set<string> = new Set([
  // Initial moves
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -:e4",
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -:d4",
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -:c4",
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -:Nf3",
  
  // After 1. e4
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:e5",
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:c5",
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:e6",
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:c6",
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:d6",
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:d5",
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:Nf6",

  // After 1. d4
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3:d5",
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3:Nf6",
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3:e6",
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3:f5",
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3:g6",

  // 1. e4 e5
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6:Nf3",
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6:Nc3",
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6:Bc4",
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6:f4",

  // 1. e4 e5 2. Nf3
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -:Nc6",
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -:Nf6",
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -:d6",

  // Italian / Ruy Lopez
  "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -:Bb5",
  "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -:Bc4",
  "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -:d4",
  "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -:a6",
  "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -:Nf6",
  "r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq -:O-O",

  // Sicilian lines
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6:Nf3",
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6:Nc3",
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6:c3",
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -:d6",
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -:Nc6",
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -:e6",
  "rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3:cxd4",
  "rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -:Nf6",
  "rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N8/PPP2PPP/R1BQKB1R b KQkq -:a6",
  "rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N8/PPP2PPP/R1BQKB1R b KQkq -:g6",

  // French
  "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -:d4",
  "rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3:d5",
  "rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq -:Nf6",
  "rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq -:Bb4",

  // Caro-Kann
  "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -:d4",
  "rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3:d5",
  "rnbqkbnr/pp2pppp/2p5/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq -:dxe4",

  // 1. d4 Nf6
  "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -:c4",
  "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -:Nf3",
  "rnbqkb1r/pppppppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq -:g6",
  "rnbqkb1r/pppppppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq -:e6",
  "rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3:g6",
  "rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3:e6",
  "rnbqkb1r/pppppppp/5n2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -:d5",

  // Scandinavian
  "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6:exd5",
  "rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq -:Qxd5",
  "rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq -:Qa5",

  // Scotch
  "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3:exd4",
  "r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -:Bc5",
  "r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -:Nf6",

  // London System
  "rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq -:Nf6",
  "rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/4P3/PPP2PPP/RN1QKBNR b KQkq -:c5",
  "rnbqkb1r/pp2pppp/5n2/2pp4/3P1B2/2P1P3/PP3PPP/RN1QKBNR b KQkq -:Nc6",

  // King's Indian
  "rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -:Nc3",
  "rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -:Bg7",
  "rnbq1rk1/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP2BPPP/R1BQK1NR w KQ -:Nf3",

  // English Opening
  "rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w KQkq e6:Nc3",
  "rnbqkbnr/pppp1ppp/8/4p3/2P5/2N5/PP1PPPPP/R1BQKBNR b KQkq -:Nf6",
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2P5/2N3P1/PP1PPP1P/R1BQKBNR b KQkq -:d5",

  // Vienna
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq -:Nf6",
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2N5/PPPP1PPP/R1BQK1NR b KQkq -:Nxe4",
  "rnbqkb1r/pppp1ppp/5n2/4p3/2B1PP2/2N5/PPPP2PP/R1BQK1NR b KQkq f3:d5"
]);

export function detectOpeningNameFromMoves(fens: string[]): string | null {
  if (!fens || fens.length < 2) return null;
  const recent = fens.slice(0, 10).join(' ');

  if (recent.includes('2p5/4P3') || recent.includes('c5')) return 'Сицилианская защита';
  if (recent.includes('4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -:Bc4') || recent.includes('Bc4')) return 'Итальянская партия';
  if (recent.includes('1B2p3') || recent.includes('Bb5')) return 'Испанская партия';
  if (recent.includes('d4/3PP3') && recent.includes('exd4')) return 'Шотландская партия';
  if (recent.includes('4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:e6') || recent.includes('4P3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3:d5')) return 'Французская защита';
  if (recent.includes('4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:c6')) return 'Защита Каро-Канн';
  if (recent.includes('4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3:d5') || recent.includes('Qxd5')) return 'Скандинавская защита';
  if (recent.includes('2PP4') && recent.includes('d5') && recent.includes('c4')) return 'Ферзевый гамбит';
  if (recent.includes('3P1B2') || recent.includes('Bf4')) return 'Лондонская система';
  if (recent.includes('5np1') || recent.includes('Bg7')) return 'Староиндийская защита';
  if (recent.includes('2P5/8/PP1PPPPP') || recent.includes('2P5')) return 'Английское начало';
  if (recent.includes('2N5/PPPP1PPP') && recent.includes('f4')) return 'Венская партия';
  return null;
}

export function isOpeningBook(fen: string, san: string, ply: number): boolean {
  if (ply > 16) return false;
  // Normalize fen to board + active color + castling + ep
  const parts = fen.split(" ");
  const normalizedKey = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}:${san}`;
  return BOOK_MOVES.has(normalizedKey);
}
