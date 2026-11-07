import { Chess } from 'chess.js';

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
  coachBrief?: string;
  hints: string[];
}

export interface PuzzleMistakeAnalysis {
  wrongMoveSan: string;
  whyWrong: string;
  opponentReplySan?: string;
  coachAdvice: string;
}

const PIECE_NAMES_RU: Record<string, string> = {
  p: 'пешкой',
  n: 'конём',
  b: 'слоном',
  r: 'ладьёй',
  q: 'ферзём',
  k: 'королём'
};

const PIECE_NOMINATIVE_RU: Record<string, string> = {
  p: 'пешку',
  n: 'коня',
  b: 'слона',
  r: 'ладью',
  q: 'ферзя',
  k: 'короля'
};

export function analyzePuzzleMistake(
  puzzle: ChessPuzzle,
  stepIndex: number,
  fenBefore: string,
  wrongMoveSan: string,
  wrongMoveUci: string,
  fenAfterWrong: string
): PuzzleMistakeAnalysis {
  const expectedUci = puzzle.solutionMoves[stepIndex] || '';
  const expectedFrom = expectedUci.substring(0, 2);
  const wrongFrom = wrongMoveUci.substring(0, 2);
  const wrongTo = wrongMoveUci.substring(2, 4);

  let whyWrong = `Ход ${wrongMoveSan} не решает тактическую задачу позиции и выпускает перевес.`;
  let opponentReplySan: string | undefined;

  try {
    const chessBefore = new Chess(fenBefore);
    const chessAfter = new Chess(fenAfterWrong);

    const expectedMoveObj = chessBefore.moves({ verbose: true }).find(
      (m) => `${m.from}${m.to}${m.promotion || ''}` === expectedUci
    );

    const opponentReplies = chessAfter.moves({ verbose: true });
    // Check if opponent can immediately checkmate
    const mateReply = opponentReplies.find((m) => m.san.includes('#'));
    // Check if opponent can capture the piece we just moved
    const recaptureOnTo = opponentReplies.find((m) => m.to === wrongTo && m.captured);
    // Check if opponent can capture any high-value piece
    const highValueCapture = opponentReplies.find(
      (m) => m.captured && ['q', 'r', 'b', 'n'].includes(m.captured)
    );
    const checkReply = opponentReplies.find((m) => m.san.includes('+'));

    if (mateReply) {
      opponentReplySan = mateReply.san;
      whyWrong = `Грубая ошибка! После хода ${wrongMoveSan} соперник немедленно ставит вам мат ходом ${mateReply.san}.`;
    } else if (recaptureOnTo) {
      opponentReplySan = recaptureOnTo.san;
      const capName = PIECE_NOMINATIVE_RU[recaptureOnTo.captured || 'p'] || 'фигуру';
      whyWrong = `Поле ${wrongTo} контролируется соперником! На ваш ход ${wrongMoveSan} последует взятие ${recaptureOnTo.san}, и вы теряете ${capName} без компенсации.`;
    } else if (highValueCapture) {
      opponentReplySan = highValueCapture.san;
      const capName = PIECE_NOMINATIVE_RU[highValueCapture.captured || 'p'] || 'фигуру';
      whyWrong = `Ход ${wrongMoveSan} слишком медленный и оставляет вашу ${capName} под боем — соперник отвечает ${highValueCapture.san}.`;
    } else if (checkReply) {
      opponentReplySan = checkReply.san;
      whyWrong = `После ${wrongMoveSan} соперник перехватывает инициативу встречным шахом ${checkReply.san}.`;
    } else if (expectedMoveObj) {
      if (expectedMoveObj.san.includes('#')) {
        whyWrong = `В этой позиции есть форсированный мат в 1 ход, а ход ${wrongMoveSan} даёт королю соперника время на защиту.`;
      } else if (expectedMoveObj.san.includes('+') && !wrongMoveSan.includes('+')) {
        whyWrong = `Здесь необходим форсирующий ход с шахом, чтобы не дать сопернику передышки. Тихий ход ${wrongMoveSan} позволяет защититься.`;
      } else if (expectedMoveObj.captured && !wrongMoveSan.includes('x')) {
        const targetName = PIECE_NOMINATIVE_RU[expectedMoveObj.captured] || 'фигуру';
        whyWrong = `Вы упустили выгодное тактическое взятие: в позиции нужно было атаковать или забрать ${targetName} соперника.`;
      } else if (wrongFrom === expectedFrom) {
        const pName = PIECE_NAMES_RU[expectedMoveObj.piece] || 'фигурой';
        whyWrong = `Вы выбрали правильную фигуру (ход ${pName} с поля ${expectedFrom}), но направили её не на то поле! Поищите более сильную клетку для удара.`;
      } else {
        const pName = PIECE_NAMES_RU[expectedMoveObj.piece] || 'другой фигурой';
        whyWrong = `Ход ${wrongMoveSan} не создаёт решающей угрозы. В этой задаче на тему «${puzzle.theme}» ключевой удар наносится ${pName}.`;
      }
    }
  } catch {
    // Fallback
  }

  const coachAdvice =
    puzzle.hints[Math.min(stepIndex, puzzle.hints.length - 1)] ||
    `Обратите внимание на тему задачи: «${puzzle.theme}». Ищите форсированные ходы — шахи, взятия и двойные нападения.`;

  return {
    wrongMoveSan,
    whyWrong,
    opponentReplySan,
    coachAdvice
  };
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
    explanation: 'Черный король заперт собственными пешками (f7, g7, h7), у него нет «форточки». Белая ладья вторгается на 8-ю горизонталь (Rb8#), объявляя чистый линейный мат.',
    coachBrief: 'Посмотрите на позицию черного короля на g8: пешки f7, g7 и h7 стоят стеной и не пускают его вперед, а 8-я горизонталь совершенно пуста. Как белым использовать открытую линию b?',
    hints: [
      'Обратите внимание на пешечный щит черного короля — ему некуда шагнуть на 7-й ряд.',
      'Ладья белых на b1 может вторгнуться на 8-ю горизонталь с шахом и матом.'
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
    explanation: 'Черный ферзь на d5 оказался в центре доски без прикрытия и под прямым боем белого коня c3. Взятие Nxd5 выигрывает ферзя бесплатно и одновременно создает угрозу вилки на c7.',
    coachBrief: 'Оцените расположение тяжелых фигур черных: ферзь вышел в самый центр на d5, но ни одна черная фигура его не защищает. Какая фигура белых готова немедленно наказать соперника?',
    hints: [
      'У черных в центре доски стоит незащищенный ферзь на d5.',
      'Конь c3 атакует поле d5 и при прыжке туда грозит еще и вилкой на c7.'
    ]
  },
  {
    id: 'fork-knight-c7',
    title: 'Двойной удар на короля и ладью',
    theme: 'Атака пункта f7',
    difficulty: 'easy',
    rating: 900,
    fen: 'r3kb1r/pppnpppp/5n2/q7/2B3b1/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 1 7',
    turn: 'w',
    solutionMoves: ['c4f7', 'e8f7'],
    solutionSans: ['Bxf7+', 'Kxf7'],
    explanation: 'Классический тактический удар слоном по слабому полю f7 (Bxf7+): черный король защищает эту пешку в одиночку, вынужден забрать слона (Kxf7) и навсегда теряет право на рокировку, попадая под атаку.',
    coachBrief: 'Черный король застрял в центре на e8, а пункт f7 защищен только самим королем. Найдите форсирующий удар, который выманит короля из укрытия и лишит его рокировки!',
    hints: [
      'Слабейший пункт в лагере черных до рокировки — пешка f7.',
      'Слон c4 нацелен прямо на поле f7 с шахом королю.'
    ]
  },
  {
    id: 'pin-bishop-queen',
    title: 'Смертельная связка',
    theme: 'Атака ферзя и пункт c7',
    difficulty: 'easy',
    rating: 950,
    fen: 'r1b1k2r/pppp1ppp/2n5/4q3/1bP5/2N1P3/PP1B1PPP/R2QKB1R w KQkq - 0 9',
    turn: 'w',
    solutionMoves: ['c3d5', 'b4d2'],
    solutionSans: ['Nd5', 'Bxd2+'],
    explanation: 'Прыжок коня на d5 работает с двойным темпом: конь уходит из-под связки слона b4, одновременно атакует черного ферзя e5, нападает на слона b4 и создает смертельную угрозу вилки на c7.',
    coachBrief: 'Черный слон на b4 связывает вашего коня c3, но черный ферзь на e5 и пешка c7 уязвимы. Поскольку на d2 стоит ваш слон (а не король), связка не абсолютная — конь c3 имеет право прыгнуть в атаку!',
    hints: [
      'Связка коня c3 относительная, так как на d2 стоит слон, защищенный ферзем.',
      'Прыжок коня на d5 одновременно атакует ферзя e5, слона b4 и пункт c7.'
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
    explanation: 'Знаменитый финал «Оперной партии» Пола Морфи (Париж, 1858): жертва ферзя Qb8+! вынуждает коня d7 забрать на b8, отвлекая его от защиты поля d8. Следующим ходом ладья ставит мат Rd8# под защитой слона g5.',
    coachBrief: 'Перед вами легендарная позиция Пола Морфи! Черный король на e8 зажат, а вертикаль d полностью простреливается белой ладьей d1. Единственный защитник поля d8 — черный конь на d7. Как отвлечь этого коня жертвой?',
    hints: [
      'Конь d7 перегружен: он одновременно защищает поле d8 и поле b8.',
      'Пожертвуйте ферзя на b8 с шахом (Qb8+), чтобы увести коня d7 с контроля над полем d8!'
    ]
  },
  {
    id: 'smothered-mate',
    title: 'Спёртый мат в углу',
    theme: 'Взаимодействие ферзя и коня',
    difficulty: 'medium',
    rating: 1400,
    fen: '6k1/5Npp/8/8/8/8/1Q4PP/6K1 w - - 0 1',
    turn: 'w',
    solutionMoves: ['f7h6', 'g8h8', 'b2g7'],
    solutionSans: ['Nh6+', 'Kh8', 'Qg7#'],
    explanation: 'Белый конь отпрыгивает на h6 с шахом (Nh6+), открывая диагональ для ферзя b2 и загоняя черного короля в угол h8. После Kh8 ферзь наносит решающий удар Qg7# под прикрытием коня h6.',
    coachBrief: 'Ваш ферзь на b2 стоит на одной большой диагонали с черным королем g8, а конь на f7 мешает линии огня, но готов отскочить с шахом! В какую сторону должен прыгнуть конь, чтобы загнать короля в угол?',
    hints: [
      'Отскок коня должен быть с шахом, чтобы черные не успели защитить пункт g7.',
      'Сыграйте Nh6+!, загоняя короля на h8, после чего ферзь ставит мат на g7.'
    ]
  },
  {
    id: 'anastasia-mate',
    title: 'Королевский зажим и обжорный ряд',
    theme: 'Взаимодействие ладьи и коня',
    difficulty: 'medium',
    rating: 1450,
    fen: '5rk1/1p3ppp/8/3N4/8/8/5PPP/1R4K1 w - - 0 1',
    turn: 'w',
    solutionMoves: ['d5e7', 'g8h8', 'b1b7'],
    solutionSans: ['Ne7+', 'Kh8', 'Rxb7'],
    explanation: 'Прыжок коня на e7 с шахом (Ne7+) загоняет черного короля в угол на h8, после чего белая ладья захватывает 7-й («обжорный») ряд ходом Rxb7 с выигранным окончанием.',
    coachBrief: 'Белый конь в центре на d5 готов прыгнуть на e7 с шахом, оттесняя короля черных в угол. Как использовать этот темп, чтобы ладья b1 ворвалась на 7-ю горизонталь?',
    hints: [
      'Объявите шах конем на e7, чтобы загнать короля на h8.',
      'После отхода короля заберите беззащитную пешку b7 ладьей.'
    ]
  },
  {
    id: 'arabian-mate',
    title: 'Доминация по 8-й горизонтали',
    theme: 'Вторжение ладьи и связка',
    difficulty: 'medium',
    rating: 1350,
    fen: '5rk1/6pp/5N2/8/8/8/8/1R4K1 w - - 0 1',
    turn: 'w',
    solutionMoves: ['f6d7', 'f8d8', 'b1b8'],
    solutionSans: ['Nd7', 'Rd8', 'Rb8'],
    explanation: 'Конь переходит на d7 с нападением на ладью f8. Когда черная ладья отступает на d8, белые вторгаются ладьей на b8 (Rb8), намертво связывая ладью d8 под защитой коня d7.',
    coachBrief: 'У белых лишний конь на f6 и открытая вертикаль b. Найдите маневр конем, который заставит черную ладью встать под смертельную связку по 8-му ряду!',
    hints: [
      'Атакуйте черную ладью f8 конем с поля d7.',
      'На отход ладьи на d8 вторгнитесь своей ладьей на b8 — ладья черных связана!'
    ]
  },
  {
    id: 'discovered-attack-queen',
    title: 'Уничтожение центрального форпоста',
    theme: 'Удар по неприятельскому коню',
    difficulty: 'hard',
    rating: 1650,
    fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/4n3/2P2N2/PPP2PPP/R1BQR1K1 w kq - 0 8',
    turn: 'w',
    solutionMoves: ['e1e4', 'd7d6', 'b5c6'],
    solutionSans: ['Rxe4', 'd6', 'Bxc6+'],
    explanation: 'Черный конь на e4 остался без защиты после рокировки белых. Ладья забирает коня (Rxe4), а после d6 белые разменивают слона на c6 с шахом (Bxc6+), разрушая пешечный фланг черных и оставаясь с лишней фигурой.',
    coachBrief: 'Черный конь активно забрался на e4, но обратите внимание на линию e: там уже стоит ваша ладья e1, а конь c6 связан слоном b5! Как наказать черных за незащищенную фигуру?',
    hints: [
      'Черный конь на e4 ничем не защищен.',
      'Заберите коня ладьей (Rxe4), а затем пробейте слоном на c6 с шахом.'
    ]
  },
  {
    id: 'deflection-queen-sacrifice',
    title: 'Двойная угроза из-под удара',
    theme: 'Темповый отход ферзя',
    difficulty: 'hard',
    rating: 1750,
    fen: 'r4rk1/ppp2ppp/8/3q4/3n4/8/PPP1QPPP/R1B1R1K1 w - - 0 15',
    turn: 'w',
    solutionMoves: ['e2d3', 'a8d8', 'c1e3'],
    solutionSans: ['Qd3', 'Rad8', 'Be3'],
    explanation: 'Белый ферзь на e2 находится под боем коня d4, но отходит на d3 с контратакой на самого коня d4 и прицелом на пешку h7. На защиту Rad8 белые выводят слона на e3, усиливая связку и давление.',
    coachBrief: 'Черный конь на d4 напал на вашего ферзя e2! Куда отойти ферзем так, чтобы одновременно самому напасть на коня d4 и создать угрозу королевскому флангу черных?',
    hints: [
      'Не уходите ферзем пассивно — найдите клетку, откуда ферзь атакует коня d4.',
      'Сыграйте Qd3, а на защиту ладьей подключите слона ходом Be3.'
    ]
  },
  {
    id: 'back-rank-deflection',
    title: 'Вторжение ферзя по 7-й горизонтали',
    theme: 'Двойной удар на мат и ладью',
    difficulty: 'easy',
    rating: 800,
    fen: '3r2k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1',
    turn: 'w',
    solutionMoves: ['e2e7', 'd8f8', 'e7f8'],
    solutionSans: ['Qe7', 'Rf8', 'Qxf8+'],
    explanation: 'Ферзь вторгается на e7 (Qe7), одновременно атакуя черную ладью d8 и угрожая матом на e8. На вынужденное отступление Rf8 следует взятие Qxf8+ с переходом в абсолютно выигранный эндшпиль.',
    coachBrief: 'У белых могучий ферзь против одинокой ладьи черных, а король черных на g8 зажат пешками. Найдите ход ферзем, который одновременно нападает на ладью d8 и грозит матом на 8-м ряду!',
    hints: [
      'Ладья черных на d8 не защищена, а поле e8 слабое.',
      'Вторгнитесь ферзем на e7 (Qe7) с двойным ударом.'
    ]
  },
  {
    id: 'double-attack-fork',
    title: 'Оттеснение центральных коней',
    theme: 'Захват центра пешкой',
    difficulty: 'easy',
    rating: 700,
    fen: 'r1bqk2r/pppp1ppp/8/4n3/2B1n3/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
    turn: 'w',
    solutionMoves: ['d2d3', 'e4d6', 'c4b3'],
    solutionSans: ['d3', 'Nd6', 'Bb3'],
    explanation: 'Ход пешкой d3 с темпом прогоняет передового черного коня с поля e4. На отскок Nd6 с нападением на слона белые аккуратно отводят слона на b3, сохраняя мощную диагональ a2-g8.',
    coachBrief: 'Два черных коня выскочили в центр (e4 и e5), но конь на e4 не имеет надежной опоры. Каким простым ходом пешки можно прогнать коня e4 и открыть диагональ для своего чернопольного слона?',
    hints: [
      'Атакуйте черного коня e4 пешкой d2.',
      'После d3 и отхода коня на d6 сохраните своего слона на рабочей диагонали ходом Bb3.'
    ]
  }
];
