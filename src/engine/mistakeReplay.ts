import { Chess } from 'chess.js';
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
  pieceNameRu: string;
  pieceSquare: string;
  targetSquare: string;
  tacticalHint: string;
}

/**
 * Extracts blunders, mistakes and misses made by the specified player
 * with progressive pedagogical hint metadata.
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
          ? 'Грубый зевок, приводящий к потере материала или ухудшению позиции.'
          : m.classification === 'miss'
          ? 'Упущенный шанс перехватить инициативу или выиграть фигуру.'
          : 'Неточность, снижающая контроль над важными полями.';

      const pieceSquare = m.bestMoveUci && m.bestMoveUci.length >= 4 ? m.bestMoveUci.substring(0, 2) : '';
      const targetSquare = m.bestMoveUci && m.bestMoveUci.length >= 4 ? m.bestMoveUci.substring(2, 4) : '';

      let pieceNameRu = 'фигура';
      if (pieceSquare) {
        try {
          const chess = new Chess(m.fenBefore);
          const piece = chess.get(pieceSquare as any);
          if (piece) {
            const names: Record<string, string> = {
              p: 'пешка',
              n: 'конь',
              b: 'слон',
              r: 'ладья',
              q: 'ферзь',
              k: 'король'
            };
            pieceNameRu = names[piece.type] || 'фигура';
          }
        } catch {
          // fallback
        }
      }

      const tacticalHint = pieceSquare
        ? `Внимание на поле ${pieceSquare} (${pieceNameRu}). Какой активный ход может сделать эта фигура?`
        : 'Найдите возможность создать тактическую угрозу или защитить атакованный пункт.';

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
        bestMoveUci: m.bestMoveUci,
        pieceNameRu,
        pieceSquare,
        targetSquare,
        tacticalHint
      });
    }
  });

  return mistakes;
}
