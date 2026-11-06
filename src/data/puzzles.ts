export interface ChessPuzzle {
  id: string;
  title: string;
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  rating: number;
  fen: string;
  turn: 'w' | 'b';
  solutionMoves: string[]; // UCI format e.g. ['d1d8', 'a8d8', 'e1e8']
  solutionSans: string[];  // SAN format e.g. ['Qd8+', 'Rxd8', 'Re8#']
  explanation: string;
  hints: string[];
}

export const PUZZLES: ChessPuzzle[] = [
  {
    id: 'back-rank-1',
    title: 'Мат по 8-й горизонтали',
    theme: 'Слабость последней горизонтали',
    difficulty: 'easy',
    rating: 750,
    fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
    turn: 'w',
    solutionMoves: ['b1b8'],
    solutionSans: ['Rb8#'],
    explanation: 'Черный король заперт собственными пешками (f7, g7, h7). Белая ладья вторгается на b8, объявляя форсированный мат.',
    hints: [
      'Обратите внимание на пешечный щит черного короля.',
      'Ладья белых может атаковать короля напрямую по 8-й линии.'
    ]
  },
  {
    id: 'fork-knight-1',
    title: 'Королевская вилка',
    theme: 'Вилка конём',
    difficulty: 'easy',
    rating: 850,
    fen: 'r3k2r/ppp2ppp/2n5/3q4/3P4/2N5/PP3PPP/R2Q1RK1 w kq - 0 1',
    turn: 'w',
    solutionMoves: ['c3d5'],
    solutionSans: ['Nxd5'],
    explanation: 'Черный ферзь неосторожно вышел в центр без защиты. Конь c3 забирает ферзя на d5 бесплатно.',
    hints: [
      'У черных незащищена одна из самых ценных фигур.',
      'Конь c3 может нанести решающий удар.'
    ]
  },
  {
    id: 'fork-knight-c7',
    title: 'Двойной удар на короля и ладью',
    theme: 'Вилка конём',
    difficulty: 'easy',
    rating: 900,
    fen: 'r3kb1r/pppnpppp/5n2/q7/2B3b1/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 1 7',
    turn: 'w',
    solutionMoves: ['c4f7', 'e8f7'],
    solutionSans: ['Bxf7+', 'Kxf7'],
    explanation: 'Тактический удар на f7 разрушает рокировку соперника и лишает черных координации.',
    hints: [
      'Слабейший пункт в лагере черных до рокировки — поле f7.',
      'Слон c4 нацелен прямо на это поле.'
    ]
  },
  {
    id: 'pin-bishop-queen',
    title: 'Смертельная связка',
    theme: 'Абсолютная связка',
    difficulty: 'easy',
    rating: 950,
    fen: 'r1b1k2r/pppp1ppp/2n5/4q3/1bP5/2N1P3/PP1B1PPP/R2QKB1R w KQkq - 0 9',
    turn: 'w',
    solutionMoves: ['c3d5', 'b4d2'],
    solutionSans: ['Nd5', 'Bxd2+'],
    explanation: 'Конь атакует ферзя и освобождает поле с угрозой вилки на c7.',
    hints: [
      'Фигуры белых могут использовать неудачное положение черного ферзя.',
      'Конь c3 готов прыгнуть вперед.'
    ]
  },
  {
    id: 'opera-mate',
    title: 'Мат Морфи в Опере',
    theme: 'Отвлечение и мат связкой',
    difficulty: 'medium',
    rating: 1300,
    fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 18',
    turn: 'w',
    solutionMoves: ['b3b8', 'd7b8', 'd1d8'],
    solutionSans: ['Qb8+', 'Nxb8', 'Rd8#'],
    explanation: 'Классическая комбинация Пола Морфи: ферзь жертвуется на b8, отвлекая единственного защитника (коня d7), после чего ладья ставит чистый мат на d8 при поддержке слона g5.',
    hints: [
      'Конь d7 перегружен защитой последнего ряда.',
      'Пожертвуйте самую ценную фигуру, чтобы вскрыть линию d.'
    ]
  },
  {
    id: 'smothered-mate',
    title: 'Спёртый мат Филидора',
    theme: 'Спёртый мат',
    difficulty: 'medium',
    rating: 1400,
    fen: '6k1/5Npp/8/8/8/8/1Q4PP/6K1 w - - 0 1',
    turn: 'w',
    solutionMoves: ['f7h6', 'g8h8', 'b2g7'],
    solutionSans: ['Nh6+', 'Kh8', 'Qg7#'],
    explanation: 'Двойной шах конем и последующий мат: король заперт собственными пешками и не может скрыться.',
    hints: [
      'Конь может объявить шах с двух разных полей.',
      'Используйте беззащитность короля в углу.'
    ]
  },
  {
    id: 'anastasia-mate',
    title: 'Мат Анастасии',
    theme: 'Мат ладьей и конём',
    difficulty: 'medium',
    rating: 1450,
    fen: '5rk1/1p3ppp/8/3N4/8/8/5PPP/1R4K1 w - - 0 1',
    turn: 'w',
    solutionMoves: ['d5e7', 'g8h8', 'b1b7'],
    solutionSans: ['Ne7+', 'Kh8', 'Rxb7'],
    explanation: 'Конь на e7 контролирует поля отхода короля g8 и g6, позволяя белым забрать материал с решающим перевесом.',
    hints: [
      'Конь может загнать короля в угол доски.',
      'Шах на e7 отнимает критически важные поля.'
    ]
  },
  {
    id: 'arabian-mate',
    title: 'Арабский мат',
    theme: 'Взаимодействие ладьи и коня',
    difficulty: 'medium',
    rating: 1350,
    fen: '5rk1/6pp/5N2/8/8/8/8/1R4K1 w - - 0 1',
    turn: 'w',
    solutionMoves: ['f6d7', 'f8d8', 'b1b8'],
    solutionSans: ['Nd7', 'Rd8', 'Rb8'],
    explanation: 'Связка и упрощение позиции ведут к форсированному выигрышу ладьи соперника.',
    hints: [
      'Свяжите ладью черных с королем.',
      'Белая ладья доминирует на открытой вертикали.'
    ]
  },
  {
    id: 'discovered-attack-queen',
    title: 'Вскрытое нападение',
    theme: 'Вскрытый шах',
    difficulty: 'hard',
    rating: 1650,
    fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/4n3/2P2N2/PPP2PPP/R1BQR1K1 w kq - 0 8',
    turn: 'w',
    solutionMoves: ['e1e4', 'd7d6', 'b5c6'],
    solutionSans: ['Rxe4', 'd6', 'Bxc6+'],
    explanation: 'Белые забирают коня ладьей. На попытку защититься d6 белые портят черным пешечную структуру и сохраняют фигуру.',
    hints: [
      'Черный конь на e4 находится под рентгеном ладьи.',
      'Ладья может устранить зависшую фигуру.'
    ]
  },
  {
    id: 'deflection-queen-sacrifice',
    title: 'Жертва ферзя с отвлечением',
    theme: 'Отвлечение',
    difficulty: 'hard',
    rating: 1750,
    fen: 'r4rk1/ppp2ppp/8/3q4/3n4/8/PPP1QPPP/R1B1R1K1 w - - 0 15',
    turn: 'w',
    solutionMoves: ['e2d3', 'a8d8', 'c1e3'],
    solutionSans: ['Qd3', 'Rad8', 'Be3'],
    explanation: 'Белый ферзь уходит из-под удара с одновременной контратакой на незащищенного коня черных.',
    hints: [
      'Ферзь белых атакован, но может отойти с двойной угрозой.',
      'Поле d3 связывает действия черных.'
    ]
  },
  {
    id: 'back-rank-deflection',
    title: 'Прорыв по первой линии',
    theme: 'Слабость 1-й горизонтали',
    difficulty: 'easy',
    rating: 800,
    fen: '3r2k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1',
    turn: 'w',
    solutionMoves: ['e2e7', 'd8f8', 'e7f8'],
    solutionSans: ['Qe7', 'Rf8', 'Qxf8+'],
    explanation: 'Ферзь вторгается на 7-ю горизонталь с атакой ладьи и неизбежным матом.',
    hints: [
      'Ладья черных не защищена другими фигурами.',
      'Ферзь белых может вторгнуться в лагерь соперника.'
    ]
  },
  {
    id: 'double-attack-fork',
    title: 'Пешечная вилка',
    theme: 'Двойной удар пешкой',
    difficulty: 'easy',
    rating: 700,
    fen: 'r1bqk2r/pppp1ppp/8/4n3/2B1n3/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
    turn: 'w',
    solutionMoves: ['d2d3', 'e4d6', 'c4b3'],
    solutionSans: ['d3', 'Nd6', 'Bb3'],
    explanation: 'Пешечный тычок прогоняет черных коней и обеспечивает белым преимущество в пространстве.',
    hints: [
      'Пешка d2 может атаковать фигуры черных.',
      'Используйте незащищенность черных коней.'
    ]
  }
];
