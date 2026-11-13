import { describe, it, expect } from '../scripts/run-tests.mjs';
import { isGuestUser, type UserProfile } from '../src/services/userService';
import { multiplayerService, type DirectChallengePayload } from '../src/services/multiplayerService';

describe('Ranked Auth Gate: 1. Guest Detection (isGuestUser)', () => {
  it('returns true for null or undefined user', () => {
    expect(isGuestUser(null)).toBe(true);
    expect(isGuestUser(undefined)).toBe(true);
  });

  it('returns true for unauthenticated guest with guest-* ID', () => {
    const guest: UserProfile = {
      id: 'guest-1a2b3c',
      username: 'Гость',
      isRegistered: false,
      elo: 100,
      puzzlePoints: 0,
      solvedPuzzleIds: [],
      friends: [],
      stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
      authProvider: 'guest',
      createdAt: '2026-11-13'
    };
    expect(isGuestUser(guest)).toBe(true);
  });

  it('returns true if isRegistered is false even if id is not guest- prefix', () => {
    const unregUser: UserProfile = {
      id: 'usr_anonymous',
      username: 'Anon',
      isRegistered: false,
      elo: 500,
      puzzlePoints: 0,
      solvedPuzzleIds: [],
      friends: [],
      stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
      authProvider: 'guest',
      createdAt: '2026-11-13'
    };
    expect(isGuestUser(unregUser)).toBe(true);
  });

  it('returns true if authProvider is guest even if isRegistered is claimed true', () => {
    const anomalousUser: UserProfile = {
      id: 'usr_temp',
      username: 'GuestCheat',
      isRegistered: true,
      elo: 1000,
      puzzlePoints: 0,
      solvedPuzzleIds: [],
      friends: [],
      stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
      authProvider: 'guest',
      createdAt: '2026-11-13'
    };
    expect(isGuestUser(anomalousUser)).toBe(true);
  });

  it('returns true if id starts with guest- even if authProvider is custom', () => {
    const spoofedUser: UserProfile = {
      id: 'guest-spoofed123',
      username: 'Spoofer',
      isRegistered: true,
      elo: 1200,
      puzzlePoints: 0,
      solvedPuzzleIds: [],
      friends: [],
      stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
      authProvider: 'custom',
      createdAt: '2026-11-13'
    };
    expect(isGuestUser(spoofedUser)).toBe(true);
  });

  it('returns false for legitimately registered custom credentials user', () => {
    const registeredUser: UserProfile = {
      id: 'usr_kasparov',
      username: 'GarryKasparov',
      isRegistered: true,
      elo: 2851,
      puzzlePoints: 3100,
      solvedPuzzleIds: ['p1', 'p2'],
      friends: [],
      stats: { wins: 150, losses: 20, draws: 80, totalGames: 250 },
      authProvider: 'custom',
      createdAt: '2026-01-01'
    };
    expect(isGuestUser(registeredUser)).toBe(false);
  });

  it('returns false for legitimately registered Auth0 SSO user', () => {
    const auth0User: UserProfile = {
      id: 'usr_auth0_magnus',
      username: 'MagnusC',
      isRegistered: true,
      elo: 2882,
      puzzlePoints: 3250,
      solvedPuzzleIds: ['p1'],
      friends: [],
      stats: { wins: 300, losses: 30, draws: 100, totalGames: 430 },
      authProvider: 'auth0',
      createdAt: '2026-02-15'
    };
    expect(isGuestUser(auth0User)).toBe(false);
  });
});

describe('Ranked Auth Gate: 2. Multiplayer Matchmaking Defense', () => {
  const guestUser: UserProfile = {
    id: 'guest-test999',
    username: 'Гость',
    isRegistered: false,
    elo: 100,
    puzzlePoints: 0,
    solvedPuzzleIds: [],
    friends: [],
    stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
    authProvider: 'guest',
    createdAt: '2026-11-13'
  };

  const registeredUser: UserProfile = {
    id: 'usr_grandmaster',
    username: 'HikaruN',
    isRegistered: true,
    elo: 2800,
    puzzlePoints: 3200,
    solvedPuzzleIds: [],
    friends: [],
    stats: { wins: 200, losses: 50, draws: 50, totalGames: 300 },
    authProvider: 'custom',
    createdAt: '2026-05-10'
  };

  it('startMatchmaking rejects guest player and returns safe no-op cleanup', async () => {
    let matchFoundCalled = false;
    const cleanup = await multiplayerService.startMatchmaking(
      guestUser,
      () => {
        matchFoundCalled = true;
      },
      'rapid_10_0'
    );

    expect(typeof cleanup).toBe('function');
    cleanup();
    expect(matchFoundCalled).toBe(false);
  });

  it('createRankedAiMatch throws error when invoked with guest player', () => {
    let errorThrown = false;
    try {
      multiplayerService.createRankedAiMatch(guestUser, 'blitz_3_2');
    } catch (err: any) {
      errorThrown = true;
      expect(err.message).toContain('guest access prohibited');
    }
    expect(errorThrown).toBe(true);
  });

  it('createRankedAiMatch succeeds and returns calibrated session for authenticated player', () => {
    const session = multiplayerService.createRankedAiMatch(registeredUser, 'rapid_10_0');
    expect(session).toBeDefined();
    expect(session.isOnlinePvP).toBe(false);
    expect(session.timeControlId).toBe('rapid_10_0');
    expect(session.opponent.isAi).toBe(true);
    expect(session.opponent.aiDifficultyId).toBe('master');
    expect(session.opponent.elo).toBeGreaterThanOrEqual(2800);
  });
});

describe('Ranked Auth Gate: 3. Direct Challenges Protection', () => {
  const guestUser: UserProfile = {
    id: 'guest-challenger',
    username: 'Гость',
    isRegistered: false,
    elo: 100,
    puzzlePoints: 0,
    solvedPuzzleIds: [],
    friends: [],
    stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
    authProvider: 'guest',
    createdAt: '2026-11-13'
  };

  const registeredUser: UserProfile = {
    id: 'usr_challenger_pro',
    username: 'ProPlayer',
    isRegistered: true,
    elo: 1850,
    puzzlePoints: 2100,
    solvedPuzzleIds: [],
    friends: [],
    stats: { wins: 50, losses: 20, draws: 10, totalGames: 80 },
    authProvider: 'custom',
    createdAt: '2026-08-01'
  };

  it('sendDirectChallenge throws error when sender is a guest', async () => {
    multiplayerService.setPlayer(guestUser);
    let errorThrown = false;
    try {
      await multiplayerService.sendDirectChallenge('usr_target_123');
    } catch (err: any) {
      errorThrown = true;
      expect(err.message).toContain('guest access prohibited');
    }
    expect(errorThrown).toBe(true);
  });

  it('acceptDirectChallenge throws error when accepting player is a guest', async () => {
    multiplayerService.setPlayer(guestUser);
    const mockChallenge: DirectChallengePayload = {
      challengeId: 'chal_test_1',
      fromUser: { id: 'usr_sender', username: 'Sender', elo: 1500 },
      toUserId: guestUser.id,
      roomId: 'room_test_123'
    };

    let errorThrown = false;
    try {
      await multiplayerService.acceptDirectChallenge(
        mockChallenge,
        () => {},
        () => {},
        () => {}
      );
    } catch (err: any) {
      errorThrown = true;
      expect(err.message).toContain('guest access prohibited');
    }
    expect(errorThrown).toBe(true);
  });

  it('allows authenticated player to send direct challenge and initializes room', async () => {
    multiplayerService.setPlayer(registeredUser);
    const roomId = await multiplayerService.sendDirectChallenge('usr_friend_456');
    expect(typeof roomId).toBe('string');
    expect(roomId.startsWith('room_pvp_')).toBe(true);
  });
});
