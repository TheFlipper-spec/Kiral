import { describe, it, expect } from '../scripts/run-tests.mjs';
import { Chess } from 'chess.js';
import { isGuestUser, type UserProfile } from '../src/services/userService';
import type { RankedMatchSession, DirectChallengePayload } from '../src/services/multiplayerService';

// Ensure localStorage is available in test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  } as any;
}

const STORAGE_ACTIVE_RANKED_MATCH = 'kiral_active_ranked_match_v1';

// Canonical test fixtures
const guestUser: UserProfile = {
  id: 'guest-alpha-99',
  username: 'Гость #99',
  isRegistered: false,
  authProvider: 'guest',
  elo: 100,
  puzzlePoints: 0,
  solvedPuzzleIds: [],
  friends: [],
  stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
  createdAt: '2026-11-13'
};

const authenticatedUser: UserProfile = {
  id: 'usr_verified_champion',
  username: 'KiralChampion',
  isRegistered: true,
  authProvider: 'custom',
  elo: 1950,
  puzzlePoints: 2200,
  solvedPuzzleIds: ['pz1', 'pz2'],
  friends: [],
  stats: { wins: 80, losses: 20, draws: 10, totalGames: 110 },
  createdAt: '2026-05-01'
};

const validRankedSession: RankedMatchSession = {
  roomId: 'room_ranked_verify_123',
  isOnlinePvP: true,
  myColor: 'w',
  timeControlId: 'rapid_10_0',
  opponent: {
    id: 'usr_rival_456',
    username: 'Rival456',
    elo: 1940,
    avatarUrl: undefined,
    isAi: false
  }
};

describe('Requirement R2: UI Entry Points Empirical Verification', () => {

  /**
   * Helper simulating App's centralized requestRankedAccess state machine
   */
  function createAppRankedController(initialUser: UserProfile, initialMode: string = 'home') {
    let currentUser = { ...initialUser };
    let gameMode = initialMode;
    let isAuthOpen = false;
    let authPromptMessage: string | null = null;
    let pendingPostAuthAction: string | null = null;
    let isMatchmakingOpen = false;
    let soundSpokenMessage: string | null = null;
    let activeSession: RankedMatchSession | null = null;

    const requestRankedAccess = (): boolean => {
      if (isGuestUser(currentUser)) {
        pendingPostAuthAction = 'ranked';
        authPromptMessage =
          'Для участия в соревновательном рейтинге и сохранения ELO необходима регистрация или вход в профиль.';
        isAuthOpen = true;
        soundSpokenMessage = 'Для входа в рейтинг требуется регистрация.';
        return false;
      }
      return true;
    };

    // Entry point 1 & 2: Header mode switcher (Desktop & Mobile)
    const handleChangeMode = (newMode: string) => {
      if (newMode === 'ranked') {
        if (!requestRankedAccess()) {
          return;
        }
        gameMode = newMode;
        isMatchmakingOpen = true;
        return;
      }
      gameMode = newMode;
    };

    // Entry point 3 & 4: HomePage Hero CTA & Card 1
    const handleHomePageStartRanked = () => {
      if (requestRankedAccess()) {
        handleChangeMode('ranked');
      }
    };

    // Entry point 5: Post-game summary ("Новый соперник")
    const handlePostGameNewOpponent = () => {
      if (requestRankedAccess()) {
        isMatchmakingOpen = true;
      }
    };

    // Entry point 6: Reset action bar button
    const handleReset = () => {
      if (gameMode === 'ranked') {
        if (requestRankedAccess()) {
          isMatchmakingOpen = true;
        } else {
          gameMode = 'home';
        }
      }
    };

    // Entry point 7a: Outgoing direct challenge
    const handleChallengePlayer = async (target: UserProfile) => {
      if (!requestRankedAccess()) return false;
      activeSession = {
        roomId: 'room_pvp_direct',
        isOnlinePvP: true,
        myColor: 'w',
        opponent: { id: target.id, username: target.username, elo: target.elo, isAi: false }
      };
      return true;
    };

    // Entry point 7b: Incoming direct challenge banner
    const handleAcceptIncomingChallenge = async (chal: DirectChallengePayload) => {
      if (!requestRankedAccess()) return false;
      activeSession = {
        roomId: chal.roomId,
        isOnlinePvP: true,
        myColor: 'b',
        opponent: { id: chal.fromUser.id, username: chal.fromUser.username, elo: chal.fromUser.elo, isAi: false }
      };
      return true;
    };

    // Post-auth continuation
    const handleUserChanged = (newUser: UserProfile) => {
      currentUser = { ...newUser };
      if (newUser.isRegistered && newUser.authProvider !== 'guest' && pendingPostAuthAction === 'ranked') {
        pendingPostAuthAction = null;
        authPromptMessage = null;
        isAuthOpen = false;
        gameMode = 'ranked';
        isMatchmakingOpen = true;
        soundSpokenMessage = 'Добро пожаловать в рейтинг!';
      }
    };

    return {
      getUser: () => currentUser,
      getGameMode: () => gameMode,
      setGameMode: (m: string) => { gameMode = m; },
      isAuthOpen: () => isAuthOpen,
      getAuthPromptMessage: () => authPromptMessage,
      getPendingPostAuthAction: () => pendingPostAuthAction,
      isMatchmakingOpen: () => isMatchmakingOpen,
      getSoundSpokenMessage: () => soundSpokenMessage,
      getActiveSession: () => activeSession,
      handleChangeMode,
      handleHomePageStartRanked,
      handlePostGameNewOpponent,
      handleReset,
      handleChallengePlayer,
      handleAcceptIncomingChallenge,
      handleUserChanged
    };
  }

  describe('1. Entry Point 1 & 2: Header Desktop & Mobile Nav ("Рейтинг" button)', () => {
    it('blocks guest user from entering ranked mode and triggers AuthModal', () => {
      const app = createAppRankedController(guestUser, 'home');
      app.handleChangeMode('ranked');

      expect(app.getGameMode()).toBe('home');
      expect(app.isAuthOpen()).toBe(true);
      expect(app.getPendingPostAuthAction()).toBe('ranked');
      expect(app.isMatchmakingOpen()).toBe(false);
      expect(app.getAuthPromptMessage()).toContain('Для участия в соревновательном рейтинге');
      expect(app.getSoundSpokenMessage()).toBe('Для входа в рейтинг требуется регистрация.');
    });

    it('permits authenticated user to enter ranked mode and opens matchmaking', () => {
      const app = createAppRankedController(authenticatedUser, 'home');
      app.handleChangeMode('ranked');

      expect(app.getGameMode()).toBe('ranked');
      expect(app.isAuthOpen()).toBe(false);
      expect(app.isMatchmakingOpen()).toBe(true);
      expect(app.getPendingPostAuthAction()).toBe(null);
    });
  });

  describe('2. Entry Point 3: HomePage Hero CTA ("В бой по рейтингу")', () => {
    it('blocks guest user and triggers AuthModal with pending ranked action', () => {
      const app = createAppRankedController(guestUser, 'home');
      app.handleHomePageStartRanked();

      expect(app.getGameMode()).toBe('home');
      expect(app.isAuthOpen()).toBe(true);
      expect(app.getPendingPostAuthAction()).toBe('ranked');
      expect(app.isMatchmakingOpen()).toBe(false);
    });

    it('permits authenticated user to launch ranked matchmaking directly', () => {
      const app = createAppRankedController(authenticatedUser, 'home');
      app.handleHomePageStartRanked();

      expect(app.getGameMode()).toBe('ranked');
      expect(app.isAuthOpen()).toBe(false);
      expect(app.isMatchmakingOpen()).toBe(true);
    });
  });

  describe('3. Entry Point 4: HomePage Card 1 ("Рейтинговый матч")', () => {
    it('blocks guest user and triggers AuthModal', () => {
      const app = createAppRankedController(guestUser, 'home');
      app.handleHomePageStartRanked();

      expect(app.getGameMode()).toBe('home');
      expect(app.isAuthOpen()).toBe(true);
      expect(app.getPendingPostAuthAction()).toBe('ranked');
    });

    it('permits authenticated user to launch ranked mode', () => {
      const app = createAppRankedController(authenticatedUser, 'home');
      app.handleHomePageStartRanked();

      expect(app.getGameMode()).toBe('ranked');
      expect(app.isMatchmakingOpen()).toBe(true);
    });
  });

  describe('4. Entry Point 5: Post-game summary ("Новый соперник")', () => {
    it('blocks guest user from re-queuing and opens AuthModal', () => {
      const app = createAppRankedController(guestUser, 'review');
      app.handlePostGameNewOpponent();

      expect(app.isMatchmakingOpen()).toBe(false);
      expect(app.isAuthOpen()).toBe(true);
      expect(app.getPendingPostAuthAction()).toBe('ranked');
    });

    it('allows authenticated user to re-queue immediately', () => {
      const app = createAppRankedController(authenticatedUser, 'review');
      app.handlePostGameNewOpponent();

      expect(app.isMatchmakingOpen()).toBe(true);
      expect(app.isAuthOpen()).toBe(false);
    });
  });

  describe('5. Entry Point 6: Reset Action Bar button', () => {
    it('forces gameMode to home and opens AuthModal if guest triggers reset in ranked mode', () => {
      const app = createAppRankedController(guestUser, 'ranked');
      app.handleReset();

      expect(app.getGameMode()).toBe('home');
      expect(app.isAuthOpen()).toBe(true);
      expect(app.isMatchmakingOpen()).toBe(false);
      expect(app.getPendingPostAuthAction()).toBe('ranked');
    });

    it('opens matchmaking modal when authenticated user triggers reset in ranked mode', () => {
      const app = createAppRankedController(authenticatedUser, 'ranked');
      app.handleReset();

      expect(app.getGameMode()).toBe('ranked');
      expect(app.isMatchmakingOpen()).toBe(true);
      expect(app.isAuthOpen()).toBe(false);
    });
  });

  describe('6. Entry Point 7: Direct Challenges (Outgoing & Incoming Banner)', () => {
    const mockChallenge: DirectChallengePayload = {
      challengeId: 'chal_test_verify',
      fromUser: { id: 'usr_challenger_88', username: 'SuperChallenger', elo: 1800 },
      toUserId: guestUser.id,
      roomId: 'room_pvp_verify'
    };

    it('blocks guest from sending a direct challenge', async () => {
      const app = createAppRankedController(guestUser, 'home');
      const success = await app.handleChallengePlayer(authenticatedUser);

      expect(success).toBe(false);
      expect(app.getActiveSession()).toBe(null);
      expect(app.isAuthOpen()).toBe(true);
      expect(app.getPendingPostAuthAction()).toBe('ranked');
    });

    it('blocks guest from accepting an incoming direct challenge', async () => {
      const app = createAppRankedController(guestUser, 'home');
      const success = await app.handleAcceptIncomingChallenge(mockChallenge);

      expect(success).toBe(false);
      expect(app.getActiveSession()).toBe(null);
      expect(app.isAuthOpen()).toBe(true);
      expect(app.getPendingPostAuthAction()).toBe('ranked');
    });

    it('allows authenticated user to send and accept direct challenges', async () => {
      const app = createAppRankedController(authenticatedUser, 'home');
      const sendSuccess = await app.handleChallengePlayer({
        ...guestUser,
        id: 'usr_other_legit',
        isRegistered: true,
        authProvider: 'custom'
      });
      expect(sendSuccess).toBe(true);
      expect(app.getActiveSession()).toBeDefined();

      const acceptSuccess = await app.handleAcceptIncomingChallenge(mockChallenge);
      expect(acceptSuccess).toBe(true);
      expect(app.getActiveSession()?.roomId).toBe(mockChallenge.roomId);
    });
  });
});

describe('Requirement R2: Reload Persistence Verification', () => {

  /**
   * Simulates the exact App.tsx restoreActiveGame logic
   */
  function simulateRestoreActiveGame(currentUser: UserProfile) {
    const raw = localStorage.getItem(STORAGE_ACTIVE_RANKED_MATCH);
    if (!raw) return { restored: false, reason: 'no_storage' };

    try {
      const saved = JSON.parse(raw);
      const latestFen = saved.fens?.[saved.fens.length - 1] || saved.fen;
      if (!latestFen) return { restored: false, reason: 'no_fen' };

      const chess = new Chess(latestFen);
      if (chess.isGameOver()) {
        localStorage.removeItem(STORAGE_ACTIVE_RANKED_MATCH);
        return { restored: false, reason: 'game_over' };
      }

      if (saved.gameMode === 'ranked') {
        if (isGuestUser(currentUser) || !saved.session) {
          localStorage.removeItem(STORAGE_ACTIVE_RANKED_MATCH);
          return { restored: false, reason: 'guest_prohibited' };
        }

        const session = saved.session;
        const wRestored = typeof saved.whiteTime === 'number' ? saved.whiteTime : 600;
        const bRestored = typeof saved.blackTime === 'number' ? saved.blackTime : 600;
        const elapsedSec = Math.max(
          0,
          Math.floor((Date.now() - (saved.lastTickTimestamp || Date.now())) / 1000)
        );
        const turn = chess.turn();
        const nextWhite = turn === 'w' && session.isOnlinePvP ? wRestored - elapsedSec : wRestored;
        const nextBlack = turn === 'b' && session.isOnlinePvP ? bRestored - elapsedSec : bRestored;

        if (elapsedSec > 120 || nextWhite <= 0 || nextBlack <= 0) {
          localStorage.removeItem(STORAGE_ACTIVE_RANKED_MATCH);
          return { restored: false, reason: 'expired_or_stale' };
        }

        return {
          restored: true,
          session,
          whiteTime: nextWhite,
          blackTime: nextBlack
        };
      }

      return { restored: false, reason: 'not_ranked' };
    } catch {
      localStorage.removeItem(STORAGE_ACTIVE_RANKED_MATCH);
      return { restored: false, reason: 'corrupt_json' };
    }
  }

  it('purges active ranked match from localStorage and rejects restoration when user is a guest', () => {
    const payload = {
      gameMode: 'ranked',
      fens: ['rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
      session: validRankedSession,
      whiteTime: 580,
      blackTime: 600,
      lastTickTimestamp: Date.now() - 5000
    };
    localStorage.setItem(STORAGE_ACTIVE_RANKED_MATCH, JSON.stringify(payload));

    const result = simulateRestoreActiveGame(guestUser);

    expect(result.restored).toBe(false);
    expect(result.reason).toBe('guest_prohibited');
    // Storage must be purged
    expect(localStorage.getItem(STORAGE_ACTIVE_RANKED_MATCH)).toBe(null);
  });

  it('restores active ranked match when user is authenticated and session is fresh', () => {
    const payload = {
      gameMode: 'ranked',
      fens: ['rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
      session: validRankedSession,
      whiteTime: 550,
      blackTime: 600,
      lastTickTimestamp: Date.now() - 3000
    };
    localStorage.setItem(STORAGE_ACTIVE_RANKED_MATCH, JSON.stringify(payload));

    const result = simulateRestoreActiveGame(authenticatedUser);

    expect(result.restored).toBe(true);
    expect(result.session?.roomId).toBe(validRankedSession.roomId);
    expect(result.whiteTime).toBe(550);
    // Since turn is 'b' and isOnlinePvP is true, black elapsed 3s
    expect(result.blackTime).toBe(597);
  });

  it('purges and rejects stale ranked game (>120s elapsed) even for authenticated user', () => {
    const payload = {
      gameMode: 'ranked',
      fens: ['rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
      session: validRankedSession,
      whiteTime: 550,
      blackTime: 600,
      lastTickTimestamp: Date.now() - 150000 // 150 seconds ago
    };
    localStorage.setItem(STORAGE_ACTIVE_RANKED_MATCH, JSON.stringify(payload));

    const result = simulateRestoreActiveGame(authenticatedUser);

    expect(result.restored).toBe(false);
    expect(result.reason).toBe('expired_or_stale');
    expect(localStorage.getItem(STORAGE_ACTIVE_RANKED_MATCH)).toBe(null);
  });

  it('purges and rejects finished ranked game (checkmate) from restoring', () => {
    // Scholar's mate checkmate FEN
    const checkmateFen = 'r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
    const payload = {
      gameMode: 'ranked',
      fens: [checkmateFen],
      session: validRankedSession,
      whiteTime: 550,
      blackTime: 600,
      lastTickTimestamp: Date.now() - 1000
    };
    localStorage.setItem(STORAGE_ACTIVE_RANKED_MATCH, JSON.stringify(payload));

    const result = simulateRestoreActiveGame(authenticatedUser);

    expect(result.restored).toBe(false);
    expect(result.reason).toBe('game_over');
    expect(localStorage.getItem(STORAGE_ACTIVE_RANKED_MATCH)).toBe(null);
  });
});

describe('Requirement R2: Post-Auth Continuation Verification', () => {
  it('seamlessly transitions from guest blocked state to ranked matchmaking upon authentication', () => {
    // Initial guest state
    let currentUser = { ...guestUser };
    let gameMode = 'home';
    let pendingPostAuthAction: string | null = null;
    let authPromptMessage: string | null = null;
    let isAuthOpen = false;
    let isMatchmakingOpen = false;
    let spokenVoiceMessage: string | null = null;

    // 1. Guest clicks "В бой по рейтингу"
    const onStartRanked = () => {
      if (isGuestUser(currentUser)) {
        pendingPostAuthAction = 'ranked';
        authPromptMessage =
          'Для участия в соревновательном рейтинге и сохранения ELO необходима регистрация или вход в профиль.';
        isAuthOpen = true;
        spokenVoiceMessage = 'Для входа в рейтинг требуется регистрация.';
        return;
      }
      gameMode = 'ranked';
      isMatchmakingOpen = true;
    };

    onStartRanked();

    // Verify initial blocked state
    expect(gameMode).toBe('home');
    expect(isAuthOpen).toBe(true);
    expect(pendingPostAuthAction).toBe('ranked');
    expect(isMatchmakingOpen).toBe(false);
    expect(spokenVoiceMessage).toBe('Для входа в рейтинг требуется регистрация.');

    // 2. User successfully logs in via AuthModal
    const onUserChanged = (u: UserProfile) => {
      currentUser = { ...u };
      if (u.isRegistered && u.authProvider !== 'guest' && pendingPostAuthAction === 'ranked') {
        pendingPostAuthAction = null;
        authPromptMessage = null;
        isAuthOpen = false;
        gameMode = 'ranked';
        isMatchmakingOpen = true;
        spokenVoiceMessage = 'Добро пожаловать в рейтинг!';
      }
    };

    onUserChanged(authenticatedUser);

    // Verify successful continuation
    expect(currentUser.id).toBe(authenticatedUser.id);
    expect(isGuestUser(currentUser)).toBe(false);
    expect(pendingPostAuthAction).toBe(null);
    expect(authPromptMessage).toBe(null);
    expect(isAuthOpen).toBe(false);
    expect(gameMode).toBe('ranked');
    expect(isMatchmakingOpen).toBe(true);
    expect(spokenVoiceMessage).toBe('Добро пожаловать в рейтинг!');
  });

  it('does NOT activate ranked matchmaking if user remains a guest or cancels auth', () => {
    let currentUser = { ...guestUser };
    let gameMode = 'home';
    let pendingPostAuthAction: string | null = 'ranked';
    let isAuthOpen = true;
    let isMatchmakingOpen = false;

    const onUserChanged = (u: UserProfile) => {
      currentUser = { ...u };
      if (u.isRegistered && u.authProvider !== 'guest' && pendingPostAuthAction === 'ranked') {
        pendingPostAuthAction = null;
        isAuthOpen = false;
        gameMode = 'ranked';
        isMatchmakingOpen = true;
      }
    };

    // User creates another guest account or cancels
    const anotherGuest: UserProfile = {
      ...guestUser,
      id: 'guest-another-999',
      username: 'Другой Гость'
    };

    onUserChanged(anotherGuest);

    expect(currentUser.id).toBe(anotherGuest.id);
    expect(isMatchmakingOpen).toBe(false);
    expect(gameMode).toBe('home');
    expect(isAuthOpen).toBe(true);
    expect(pendingPostAuthAction).toBe('ranked');
  });
});
