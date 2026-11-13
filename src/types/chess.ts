export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'forced'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'miss';

export interface ClassificationMeta {
  type: MoveClassification;
  symbol: string;
  nameRu: string;
  nameEn: string;
  color: string;
  badgeBg: string;
  textColor: string;
  description: string;
}

export const CLASSIFICATION_CONFIGS: Record<MoveClassification, ClassificationMeta> = {
  brilliant: {
    type: 'brilliant',
    symbol: '!!',
    nameRu: 'Блестящий',
    nameEn: 'Brilliant',
    color: '#1baca6',
    badgeBg: '#1baca6',
    textColor: '#ffffff',
    description: 'Жертва материала, являющаяся лучшим ходом в сложной позиции'
  },
  great: {
    type: 'great',
    symbol: '!',
    nameRu: 'Отличный',
    nameEn: 'Great',
    color: '#5c8bb0',
    badgeBg: '#5c8bb0',
    textColor: '#ffffff',
    description: 'Единственный ход, удерживающий позицию или наказывающий за ошибку'
  },
  best: {
    type: 'best',
    symbol: '★',
    nameRu: 'Лучший',
    nameEn: 'Best',
    color: '#96bc4b',
    badgeBg: '#96bc4b',
    textColor: '#ffffff',
    description: 'Первая линия движка Stockfish'
  },
  excellent: {
    type: 'excellent',
    symbol: '✓',
    nameRu: 'Прекрасный',
    nameEn: 'Excellent',
    color: '#96bc4b',
    badgeBg: 'transparent',
    textColor: '#96bc4b',
    description: 'Почти лучший ход с минимальной потерей перевеса'
  },
  good: {
    type: 'good',
    symbol: '○',
    nameRu: 'Хороший',
    nameEn: 'Good',
    color: '#6b7280',
    badgeBg: 'transparent',
    textColor: '#9ca3af',
    description: 'Надежный ход, сохраняющий характер позиции'
  },
  book: {
    type: 'book',
    symbol: '📖',
    nameRu: 'Теория',
    nameEn: 'Book',
    color: '#a88865',
    badgeBg: '#a88865',
    textColor: '#ffffff',
    description: 'Ход из стандартной дебютной теории'
  },
  forced: {
    type: 'forced',
    symbol: '—',
    nameRu: 'Вынужденный',
    nameEn: 'Forced',
    color: '#52525b',
    badgeBg: 'transparent',
    textColor: '#71717a',
    description: 'Единственный возможный легальный ход'
  },
  inaccuracy: {
    type: 'inaccuracy',
    symbol: '?!',
    nameRu: 'Неточность',
    nameEn: 'Inaccuracy',
    color: '#f0c15c',
    badgeBg: '#f0c15c',
    textColor: '#1a1a1a',
    description: 'Небольшая неточность, ухудшающая позицию'
  },
  mistake: {
    type: 'mistake',
    symbol: '?',
    nameRu: 'Ошибка',
    nameEn: 'Mistake',
    color: '#e6912c',
    badgeBg: '#e6912c',
    textColor: '#ffffff',
    description: 'Серьезное ухудшение позиции'
  },
  blunder: {
    type: 'blunder',
    symbol: '??',
    nameRu: 'Зевок',
    nameEn: 'Blunder',
    color: '#ca3431',
    badgeBg: '#ca3431',
    textColor: '#ffffff',
    description: 'Грубая ошибка, потеря материала или пропуск мата'
  },
  miss: {
    type: 'miss',
    symbol: '✕',
    nameRu: 'Упущенный шанс',
    nameEn: 'Miss',
    color: '#ef4444',
    badgeBg: '#ef4444',
    textColor: '#ffffff',
    description: 'Упущенная возможность наказать соперника за грубую ошибку'
  }
};

export interface MoveAnalysis {
  ply: number;
  moveNumber: number;
  turn: 'w' | 'b';
  san: string;
  uci: string;
  from: string;
  to: string;
  piece: string;
  captured?: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number; // centipawns from White perspective
  evalAfter: number;  // centipawns from White perspective
  mateBefore: number | null;
  mateAfter: number | null;
  winPercentBefore: number; // player's perspective (0-100)
  winPercentAfter: number;  // player's perspective (0-100)
  winPercentLoss: number;
  centipawnLoss: number;
  classification: MoveClassification;
  classificationReason: string;
  bestMoveUci: string;
  bestMoveSan: string;
  bestLinePv: string[];
  secondLineEval?: number;
  secondLineUci?: string;
  depth: number;
}

export interface GameReport {
  whiteAccuracy: number;
  blackAccuracy: number;
  whitePlayer: string;
  blackPlayer: string;
  event: string;
  date: string;
  result: string;
  moves: MoveAnalysis[];
  classificationSummary: {
    white: Record<MoveClassification, number>;
    black: Record<MoveClassification, number>;
  };
}

export interface EngineEvaluation {
  cp: number;
  mate: number | null;
  depth: number;
  pv: string[];
  bestMove: string;
  secondBest?: {
    cp: number;
    mate: number | null;
    pv: string[];
    bestMove: string;
  };
}

export interface AiDifficultyConfig {
  id: string;
  name: string;
  depth: number;
  skillLevel: number;
  eloApprox: number;
}

export const AI_DIFFICULTIES: AiDifficultyConfig[] = [
  { id: 'novice', name: 'Ученик', depth: 1, skillLevel: 0, eloApprox: 100 },
  { id: 'beginner', name: 'Новичок', depth: 2, skillLevel: 1, eloApprox: 500 },
  { id: 'casual', name: 'Любитель', depth: 4, skillLevel: 4, eloApprox: 900 },
  { id: 'fast', name: 'Быстрый', depth: 6, skillLevel: 7, eloApprox: 1300 },
  { id: 'club', name: 'Клубный', depth: 10, skillLevel: 12, eloApprox: 1600 },
  { id: 'expert', name: 'Эксперт', depth: 14, skillLevel: 17, eloApprox: 2000 },
  { id: 'master', name: 'Гроссмейстер', depth: 18, skillLevel: 20, eloApprox: 2500 },
  { id: 'impossible', name: 'Невозможно', depth: 24, skillLevel: 20, eloApprox: 3600 }
];

export type TimeControlId =
  | 'bullet_1_0'
  | 'bullet_2_1'
  | 'blitz_3_2'
  | 'blitz_5_0'
  | 'rapid_10_0'
  | 'classical_15_10';

export interface TimeControlConfig {
  id: TimeControlId;
  name: string;
  category: 'Пуля' | 'Блиц' | 'Рапид' | 'Классика';
  initialSeconds: number;
  incrementSeconds: number;
  label: string;
}

export const TIME_CONTROLS: TimeControlConfig[] = [
  {
    id: 'bullet_1_0',
    name: 'Пуля 1+0',
    category: 'Пуля',
    initialSeconds: 60,
    incrementSeconds: 0,
    label: '1 мин'
  },
  {
    id: 'bullet_2_1',
    name: 'Пуля 2+1',
    category: 'Пуля',
    initialSeconds: 120,
    incrementSeconds: 1,
    label: '2 + 1'
  },
  {
    id: 'blitz_3_2',
    name: 'Блиц 3+2',
    category: 'Блиц',
    initialSeconds: 180,
    incrementSeconds: 2,
    label: '3 + 2'
  },
  {
    id: 'blitz_5_0',
    name: 'Блиц 5+0',
    category: 'Блиц',
    initialSeconds: 300,
    incrementSeconds: 0,
    label: '5 мин'
  },
  {
    id: 'rapid_10_0',
    name: 'Рапид 10+0',
    category: 'Рапид',
    initialSeconds: 600,
    incrementSeconds: 0,
    label: '10 мин'
  },
  {
    id: 'classical_15_10',
    name: 'Классика 15+10',
    category: 'Классика',
    initialSeconds: 900,
    incrementSeconds: 10,
    label: '15 + 10'
  }
];

export const getTimeControlConfig = (id?: TimeControlId): TimeControlConfig => {
  return (
    TIME_CONTROLS.find((t) => t.id === id) ||
    TIME_CONTROLS.find((t) => t.id === 'rapid_10_0') ||
    TIME_CONTROLS[0]
  );
};

export interface FriendRequest {
  id: string;
  username: string;
  elo: number;
  avatarUrl?: string;
  createdAt: string;
}

export interface PlayedMatchRecord {
  id: string;
  date: string;
  gameMode: 'ranked' | 'vs-ai' | 'pvp';
  timeControlLabel?: string;
  opponentName: string;
  opponentElo?: number;
  myColor: 'w' | 'b';
  result: 'win' | 'loss' | 'draw';
  eloDelta?: number;
  accuracy?: number;
  movesCount: number;
  fens: string[];
  pgn?: string;
  reason?: string;
}

