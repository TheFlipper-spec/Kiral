import { describe, it, expect } from '../scripts/run-tests.mjs';
import { centipawnsToWinPercent, countMaterial } from '../src/engine/evalFormulas';

describe('Sample Test Suite', () => {
  it('centipawnsToWinPercent handles 0 cp', () => {
    expect(centipawnsToWinPercent(0)).toBe(50);
  });

  it('countMaterial correctly counts starting pieces', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(countMaterial(startFen, 'w')).toBe(3940);
    expect(countMaterial(startFen, 'b')).toBe(3940);
  });
});

