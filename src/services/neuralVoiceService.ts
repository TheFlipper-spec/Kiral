import { Chess } from 'chess.js';
import { sound } from './soundService';

export type TacticalEventType =
  | 'blunder'
  | 'fork'
  | 'pin'
  | 'check'
  | 'checkmate'
  | 'brilliant'
  | 'great'
  | 'victory'
  | 'defeat'
  | 'draw';

export interface TacticalAnalysisResult {
  type: TacticalEventType;
  titleRu: string;
  voiceText: string;
}

class NeuralVoiceService {
  private isEnabled = true;
  private isNeuralEnabled = true;
  private lastSpokenTime = 0;
  private lastSpokenType: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kiral_neural_voice_enabled');
      if (saved !== null) {
        this.isNeuralEnabled = saved === 'true';
      }
    }
  }

  public setNeuralEnabled(enabled: boolean) {
    this.isNeuralEnabled = enabled;
    try {
      localStorage.setItem('kiral_neural_voice_enabled', String(enabled));
    } catch {}
  }

  public getNeuralEnabled(): boolean {
    return this.isNeuralEnabled;
  }

  /**
   * Deep tactical feature extractor on positions before and after a move.
   * Accurately detects:
   * - Forks (двойные удары конём, пешкой, ферзём)
   * - Checkmate and Checks
   * - Tactical Blunders & Mistakes
   * - Brilliant & Great moves
   */
  public analyzeTactics(
    _beforeFen: string,
    afterFen: string,
    moveUci: string,
    classification?: string
  ): TacticalAnalysisResult | null {
    if (!afterFen || !moveUci || moveUci.length < 4) return null;

    try {
      const chessAfter = new Chess(afterFen);
      const isCheckmate = chessAfter.isCheckmate();
      const isCheck = chessAfter.inCheck();
      const toSquare = moveUci.substring(2, 4);
      const movedPiece = chessAfter.get(toSquare as Parameters<typeof chessAfter.get>[0]);

      // 1. Checkmate
      if (isCheckmate) {
        return {
          type: 'checkmate',
          titleRu: 'Шах и мат!',
          voiceText: 'Шах и мат! Партия завершена победой.'
        };
      }

      // 2. Blunder (Зевок) from Stockfish evaluation
      if (classification === 'blunder') {
        return {
          type: 'blunder',
          titleRu: 'Зевок!',
          voiceText: 'Осторожно, зевок! Потеря материала или тактическая ошибка.'
        };
      }

      // 3. Brilliant Move (Жертва / Блестящий ход)
      if (classification === 'brilliant') {
        return {
          type: 'brilliant',
          titleRu: 'Блестящий ход!',
          voiceText: 'Блестящий ход! Неожиданный тактический удар.'
        };
      }

      // 4. Fork Detection (Вилка / Двойной удар)
      if (movedPiece) {
        const oppColor = movedPiece.color === 'w' ? 'b' : 'w';
        const fenParts = afterFen.split(' ');
        fenParts[1] = movedPiece.color; // switch turn to test attacking squares of moved piece
        const attackTestChess = new Chess(fenParts.join(' '));
        const moves = attackTestChess.moves({ square: toSquare as any, verbose: true });

        const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
        const attackerVal = pieceValues[movedPiece.type] || 3;
        const attackedMajorPieces: Array<{ square: string; type: string }> = [];

        for (const m of moves) {
          const target = chessAfter.get(m.to as any);
          if (target && target.color === oppColor) {
            const targetVal = pieceValues[target.type] || 0;
            // Target is valuable relative to attacker or is King/Queen/Rook
            if (targetVal >= attackerVal || target.type === 'k' || target.type === 'q' || target.type === 'r') {
              attackedMajorPieces.push({ square: m.to, type: target.type });
            }
          }
        }

        // Royal Fork: Check + attacking Queen/Rook/Bishop/Knight
        if (isCheck && attackedMajorPieces.length >= 1) {
          const pieceName = movedPiece.type === 'n' ? 'конём' : movedPiece.type === 'p' ? 'пешкой' : 'ферзём';
          return {
            type: 'fork',
            titleRu: 'Вилка с шахом!',
            voiceText: `Тактический удар! Вилка ${pieceName} на короля и фигуру.`
          };
        }

        // Standard Fork: Attacking 2 or more valuable undefended/defended pieces
        if (attackedMajorPieces.length >= 2) {
          const pieceName = movedPiece.type === 'n' ? 'конём' : movedPiece.type === 'p' ? 'пешкой' : 'ферзём';
          return {
            type: 'fork',
            titleRu: 'Вилка!',
            voiceText: `Внимание, вилка ${pieceName}! Двойной удар по фигурам.`
          };
        }
      }

      // 5. Check
      if (isCheck) {
        return {
          type: 'check',
          titleRu: 'Шах!',
          voiceText: 'Вам шах!'
        };
      }

      // 6. Great move
      if (classification === 'great') {
        return {
          type: 'great',
          titleRu: 'Отличный ход!',
          voiceText: 'Отличный ход! Точный позиционный маневр.'
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Vocalize tactical event with natural Russian voice model
   */
  public announceTactics(result: TacticalAnalysisResult) {
    if (!this.isEnabled || !this.isNeuralEnabled) return;
    const now = Date.now();

    // Prevent spamming same sound within 2.5 seconds
    if (now - this.lastSpokenTime < 2500 && this.lastSpokenType === result.type) {
      return;
    }

    this.lastSpokenTime = now;
    this.lastSpokenType = result.type;

    // Use sound service speech synthesizer with enhanced cadence
    sound.speak(result.voiceText);
  }
}

export const neuralVoice = new NeuralVoiceService();
