import { describe, it, expect } from '../scripts/run-tests.mjs';
import { isGuestUser, type UserProfile } from '../src/services/userService';
import { multiplayerService, type DirectChallengePayload } from '../src/services/multiplayerService';

describe('Adversarial Stress: Guest Auth Gate Hardening', () => {
  // Test matrix of adversarial and invalid user profiles
  const adversarialProfiles: Array<{ name: string; user: any }> = [
    { name: 'null user', user: null },
    { name: 'undefined user', user: undefined },
    {
      name: 'canonical guest profile',
      user: {
        id: 'guest-100a',
        username: 'Гость #100',
        isRegistered: false,
        authProvider: 'guest',
        elo: 100,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        createdAt: '2026-11-13'
      }
    },
    {
      name: 'tampered: guest- ID + authProvider guest + forged isRegistered=true',
      user: {
        id: 'guest-hacker99',
        username: 'HackerGuest',
        isRegistered: true,
        authProvider: 'guest',
        elo: 1500,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        createdAt: '2026-11-13'
      }
    },
    {
      name: 'tampered: usr- ID + authProvider custom + forged isRegistered=false',
      user: {
        id: 'usr-fake-custom',
        username: 'FakeCustom',
        isRegistered: false,
        authProvider: 'custom',
        elo: 1200,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        createdAt: '2026-11-13'
      }
    },
    {
      name: 'tampered: guest- ID + authProvider custom + isRegistered=true (spoofed provider)',
      user: {
        id: 'guest-spoof-provider',
        username: 'SpoofProvider',
        isRegistered: true,
        authProvider: 'custom',
        elo: 1300,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        createdAt: '2026-11-13'
      }
    },
    {
      name: 'tampered: usr- ID + authProvider guest + isRegistered=true (spoofed id format)',
      user: {
        id: 'usr-spoofed-id',
        username: 'SpoofedId',
        isRegistered: true,
        authProvider: 'guest',
        elo: 1400,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        createdAt: '2026-11-13'
      }
    },
    {
      name: 'tampered: guest- ID + authProvider auth0 + isRegistered=false',
      user: {
        id: 'guest-auth0-hybrid',
        username: 'HybridGuest',
        isRegistered: false,
        authProvider: 'auth0',
        elo: 1100,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        createdAt: '2026-11-13'
      }
    },
    {
      name: 'tampered: empty object {}',
      user: {}
    }
  ];

  const validCustomUser: UserProfile = {
    id: 'usr-valid-custom-42',
    username: 'LegitCustomUser',
    isRegistered: true,
    authProvider: 'custom',
    elo: 1650,
    puzzlePoints: 1200,
    solvedPuzzleIds: ['pz1', 'pz2'],
    friends: [],
    stats: { wins: 45, losses: 20, draws: 10, totalGames: 75 },
    createdAt: '2026-03-01'
  };

  const validAuth0User: UserProfile = {
    id: 'auth0|648a9f1234567890abcdef12',
    username: 'LegitAuth0User',
    isRegistered: true,
    authProvider: 'auth0',
    elo: 1980,
    puzzlePoints: 2400,
    solvedPuzzleIds: ['pz1', 'pz2', 'pz3'],
    friends: [],
    stats: { wins: 120, losses: 35, draws: 25, totalGames: 180 },
    createdAt: '2026-04-15'
  };

  describe('1. Adversarial isGuestUser Evaluation', () => {
    for (const testCase of adversarialProfiles) {
      it(`blocks ${testCase.name} as a guest`, () => {
        expect(isGuestUser(testCase.user)).toBe(true);
      });
    }

    it('permits valid custom authenticated user', () => {
      expect(isGuestUser(validCustomUser)).toBe(false);
    });

    it('permits valid Auth0 authenticated user', () => {
      expect(isGuestUser(validAuth0User)).toBe(false);
    });
  });

  describe('2. Adversarial multiplayerService.startMatchmaking Gate', () => {
    for (const testCase of adversarialProfiles) {
      it(`rejects matchmaking for ${testCase.name} without starting search`, async () => {
        let matchCallbackTriggered = false;
        const cleanup = await multiplayerService.startMatchmaking(
          testCase.user,
          () => {
            matchCallbackTriggered = true;
          },
          'rapid_10_0'
        );

        // Verification: returns safe cleanup function
        expect(typeof cleanup).toBe('function');
        // multiplayerService should NOT be searching
        expect(multiplayerService.isSearching).toBe(false);
        // Clean up
        cleanup();
        expect(matchCallbackTriggered).toBe(false);
      });
    }

    it('allows startMatchmaking for valid custom authenticated user', async () => {
      let matchCallbackTriggered = false;
      const cleanup = await multiplayerService.startMatchmaking(
        validCustomUser,
        () => {
          matchCallbackTriggered = true;
        },
        'blitz_5_3'
      );

      expect(typeof cleanup).toBe('function');
      expect(multiplayerService.isSearching).toBe(true);
      // Calling cleanup stops searching
      cleanup();
      expect(multiplayerService.isSearching).toBe(false);
      expect(matchCallbackTriggered).toBe(false);
    });

    it('allows startMatchmaking for valid Auth0 authenticated user', async () => {
      let matchCallbackTriggered = false;
      const cleanup = await multiplayerService.startMatchmaking(
        validAuth0User,
        () => {
          matchCallbackTriggered = true;
        },
        'rapid_10_0'
      );

      expect(typeof cleanup).toBe('function');
      expect(multiplayerService.isSearching).toBe(true);
      cleanup();
      expect(multiplayerService.isSearching).toBe(false);
      expect(matchCallbackTriggered).toBe(false);
    });
  });

  describe('3. Adversarial multiplayerService.createRankedAiMatch Gate', () => {
    for (const testCase of adversarialProfiles) {
      it(`throws explicit guest rejection error for ${testCase.name}`, () => {
        let threw = false;
        try {
          multiplayerService.createRankedAiMatch(testCase.user, 'rapid_10_0');
        } catch (err: any) {
          threw = true;
          expect(err.message).toContain('Ranked AI match rejected: guest access prohibited.');
        }
        expect(threw).toBe(true);
      });
    }

    it('successfully creates calibrated ranked AI match for valid custom user', () => {
      const session = multiplayerService.createRankedAiMatch(validCustomUser, 'rapid_10_0');
      expect(session).toBeDefined();
      expect(session.isOnlinePvP).toBe(false);
      expect(session.opponent.isAi).toBe(true);
      expect(session.opponent.aiDifficultyId).toBe('expert');
      expect(session.timeControlId).toBe('rapid_10_0');
      // Rating calibrated around user's 1650 ELO
      expect(session.opponent.elo).toBeGreaterThanOrEqual(1600);
      expect(session.opponent.elo).toBeLessThanOrEqual(1750);
    });

    it('successfully creates calibrated ranked AI match for valid Auth0 user', () => {
      const session = multiplayerService.createRankedAiMatch(validAuth0User, 'blitz_3_2');
      expect(session).toBeDefined();
      expect(session.isOnlinePvP).toBe(false);
      expect(session.opponent.isAi).toBe(true);
      expect(session.opponent.aiDifficultyId).toBe('expert');
      expect(session.timeControlId).toBe('blitz_3_2');
      // Rating calibrated around user's 1980 ELO
      expect(session.opponent.elo).toBeGreaterThanOrEqual(1940);
      expect(session.opponent.elo).toBeLessThanOrEqual(2050);
    });
  });

  describe('4. Adversarial multiplayerService.sendDirectChallenge Gate', () => {
    for (const testCase of adversarialProfiles) {
      it(`blocks sendDirectChallenge for ${testCase.name}`, async () => {
        multiplayerService.setPlayer(testCase.user);
        let threw = false;
        try {
          await multiplayerService.sendDirectChallenge('usr-target-opponent');
        } catch (err: any) {
          threw = true;
          const msg = err.message || '';
          const isExpected =
            msg.includes('Ranked direct challenge rejected: guest access prohibited.') ||
            msg.includes('Player not initialized');
          expect(isExpected).toBe(true);
        }
        expect(threw).toBe(true);
      });
    }

    it('allows sendDirectChallenge for valid custom user', async () => {
      multiplayerService.setPlayer(validCustomUser);
      const roomId = await multiplayerService.sendDirectChallenge('usr-target-custom');
      expect(typeof roomId).toBe('string');
      expect(roomId.startsWith('room_pvp_')).toBe(true);
    });

    it('allows sendDirectChallenge for valid Auth0 user', async () => {
      multiplayerService.setPlayer(validAuth0User);
      const roomId = await multiplayerService.sendDirectChallenge('usr-target-auth0');
      expect(typeof roomId).toBe('string');
      expect(roomId.startsWith('room_pvp_')).toBe(true);
    });
  });

  describe('5. Adversarial multiplayerService.acceptDirectChallenge Gate', () => {
    const dummyChallenge: DirectChallengePayload = {
      challengeId: 'chal_stress_999',
      fromUser: { id: 'usr-challenger-99', username: 'Challenger', elo: 1700 },
      toUserId: 'target-id',
      roomId: 'room_pvp_stress_test'
    };

    for (const testCase of adversarialProfiles) {
      it(`blocks acceptDirectChallenge for ${testCase.name}`, async () => {
        multiplayerService.setPlayer(testCase.user);
        let threw = false;
        try {
          await multiplayerService.acceptDirectChallenge(
            dummyChallenge,
            () => {},
            () => {},
            () => {}
          );
        } catch (err: any) {
          threw = true;
          expect(err.message).toContain('Ranked challenge acceptance rejected: guest access prohibited.');
        }
        expect(threw).toBe(true);
      });
    }

    it('allows acceptDirectChallenge for valid custom user', async () => {
      multiplayerService.setPlayer(validCustomUser);
      const session = await multiplayerService.acceptDirectChallenge(
        dummyChallenge,
        () => {},
        () => {},
        () => {}
      );
      expect(session).toBeDefined();
      expect(session.isOnlinePvP).toBe(true);
      expect(session.myColor).toBe('b');
      expect(session.opponent.id).toBe(dummyChallenge.fromUser.id);
      expect(session.opponent.username).toBe(dummyChallenge.fromUser.username);
    });

    it('allows acceptDirectChallenge for valid Auth0 user', async () => {
      multiplayerService.setPlayer(validAuth0User);
      const session = await multiplayerService.acceptDirectChallenge(
        dummyChallenge,
        () => {},
        () => {},
        () => {}
      );
      expect(session).toBeDefined();
      expect(session.isOnlinePvP).toBe(true);
      expect(session.myColor).toBe('b');
      expect(session.opponent.id).toBe(dummyChallenge.fromUser.id);
      expect(session.opponent.username).toBe(dummyChallenge.fromUser.username);
    });
  });
});
