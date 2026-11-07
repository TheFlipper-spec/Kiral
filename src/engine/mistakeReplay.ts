import type { GameReport, MoveClassification } from '../types/chess';

export interface MistakeReviewItem {
  ply: number;
  moveNumber: number;
  turn: 'w' | 'b';
  fenBefore: string;
  playedSan: string;
  playedUci: string;
  classification: MoveClassification;
  reason: string;
  bestMoveSan?: string;
  bestMoveUci?: string;
}

/**
 * Extracts blunders, mistakes and misses made by the specified player
 */
export function extractPlayerMistakes(
  report: GameReport | null,
  playerTurn: 'w' | 'b'
): MistakeReviewItem[] {
  if (!report || !report.moves) return [];
  const mistakes: MistakeReviewItem[] = [];

  report.moves.forEach((m) => {
    if (!m) return;
    const isMistakeType =
      m.classification === 'blunder' ||
      m.classification === 'mistake' ||
      m.classification === 'miss';

    if (m.turn === playerTurn && isMistakeType) {
      const reasonRu =
        m.classification === 'blunder'
          ? 'Грубый зевок, приводящий к резкому ухудшению позиции или потере материала.'
          : m.classification === 'miss'
          ? 'Упущенный шанс получить решающее преимущество.'
          : 'Неточность или ошибка, ухудшающая позицию.';

      mistakes.push({
        ply: m.ply,
        moveNumber: m.moveNumber,
        turn: m.turn,
        fenBefore: m.fenBefore,
        playedSan: m.san,
        playedUci: m.uci,
        classification: m.classification,
        reason: m.classificationReason || reasonRu,
        bestMoveSan: m.bestMoveSan,
        bestMoveUci: m.bestMoveUci
      });
    }
  });

  return mistakes;
}
