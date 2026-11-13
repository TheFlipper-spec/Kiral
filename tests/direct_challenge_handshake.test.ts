import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect } from '../scripts/run-tests.mjs';
import type { UserProfile } from '../src/services/userService';
import {
  MultiplayerService,
  type DirectChallengePayload,
  type DirectChallengeResponsePayload
} from '../src/services/multiplayerService';

interface MockChannelRecord {
  name: string;
  handlers: Map<string, Array<(arg: { payload: unknown }) => void>>;
}

/**
 * Creates a pair of mock Supabase clients connected over a shared in-memory broadcast bus
 * so two MultiplayerService instances can perform full real-time handshakes.
 */
function createInMemorySupabasePair(): { clientA: SupabaseClient; clientB: SupabaseClient } {
  const topics = new Map<string, Set<MockChannelRecord>>();

  const makeClient = (): SupabaseClient => {
    const mock = {
      channel(name: string) {
        const record: MockChannelRecord = {
          name,
          handlers: new Map()
        };
        if (!topics.has(name)) {
          topics.set(name, new Set());
        }
        topics.get(name)!.add(record);

        const api = {
          on(_type: string, filter: { event: string }, callback: (arg: { payload: unknown }) => void) {
            const list = record.handlers.get(filter.event) || [];
            list.push(callback);
            record.handlers.set(filter.event, list);
            return api;
          },
          async send(msg: { type: string; event: string; payload: unknown }) {
            const subscribers = topics.get(name);
            if (!subscribers) return 'ok';
            for (const sub of subscribers) {
              if (sub === record) continue; // self: false
              const callbacks = sub.handlers.get(msg.event) || [];
              for (const cb of callbacks) {
                cb({ payload: msg.payload });
              }
            }
            return 'ok';
          },
          subscribe(cb?: (status: string) => void) {
            if (cb) cb('SUBSCRIBED');
            return api;
          },
          async unsubscribe() {
            topics.get(name)?.delete(record);
            return 'ok';
          }
        };
        return api;
      },
      async removeChannel(ch: { unsubscribe?: () => Promise<unknown> }) {
        if (ch && ch.unsubscribe) {
          await ch.unsubscribe();
        }
        return 'ok';
      }
    };
    return mock as unknown as SupabaseClient;
  };

  return { clientA: makeClient(), clientB: makeClient() };
}

const makeRegisteredPlayer = (id: string, username: string, elo: number): UserProfile => ({
  id,
  username,
  isRegistered: true,
  elo,
  puzzlePoints: 10,
  solvedPuzzleIds: [],
  friends: [],
  stats: { wins: 3, losses: 1, draws: 0, totalGames: 4 },
  authProvider: 'custom',
  createdAt: '2026-11-13'
});

describe('Direct Challenge Handshake: Require Acceptance Before Match Starts', () => {
  it('sending a direct challenge notifies opponent without joining any game room or creating session', async () => {
    const { clientA, clientB } = createInMemorySupabasePair();
    const challengerSvc = new MultiplayerService(clientA);
    const opponentSvc = new MultiplayerService(clientB);

    const playerA = makeRegisteredPlayer('usr-alice', 'Alice', 1450);
    const playerB = makeRegisteredPlayer('usr-bob', 'Bob', 1420);
    challengerSvc.setPlayer(playerA);
    opponentSvc.setPlayer(playerB);

    const receivedChallenges: DirectChallengePayload[] = [];
    opponentSvc.onDirectChallenge((chal) => receivedChallenges.push(chal));

    const roomId = await challengerSvc.sendDirectChallenge(playerB.id, {
      challengeId: 'chal_wait_1',
      timeControlId: 'blitz_5_3'
    });

    expect(typeof roomId).toBe('string');
    expect(roomId.startsWith('room_pvp_')).toBe(true);
    expect(receivedChallenges.length).toBe(1);
    expect(receivedChallenges[0].challengeId).toBe('chal_wait_1');
    expect(receivedChallenges[0].timeControlId).toBe('blitz_5_3');
    expect(receivedChallenges[0].fromUser.id).toBe(playerA.id);
    // Critical: Challenger has NOT joined the room or started any session while waiting
    expect(challengerSvc.getCurrentSession()).toBeNull();
  });

  it('challenger only receives acceptance after opponent accepts and subscribes to the room', async () => {
    const { clientA, clientB } = createInMemorySupabasePair();
    const challengerSvc = new MultiplayerService(clientA);
    const opponentSvc = new MultiplayerService(clientB);

    const playerA = makeRegisteredPlayer('usr-alice', 'Alice', 1500);
    const playerB = makeRegisteredPlayer('usr-bob', 'Bob', 1510);
    challengerSvc.setPlayer(playerA);
    opponentSvc.setPlayer(playerB);

    let incoming: DirectChallengePayload | null = null;
    const responses: DirectChallengeResponsePayload[] = [];
    opponentSvc.onDirectChallenge((chal) => {
      incoming = chal;
    });
    challengerSvc.onChallengeResponse((resp) => {
      responses.push(resp);
    });

    const roomId = await challengerSvc.sendDirectChallenge(playerB.id, {
      challengeId: 'chal_acc_1',
      timeControlId: 'blitz_3_2'
    });

    expect(Boolean(incoming)).toBe(true);
    expect(incoming!.challengeId).toBe('chal_acc_1');
    expect(responses.length).toBe(0);
    expect(challengerSvc.getCurrentSession()).toBeNull();

    const acceptedSession = await opponentSvc.acceptDirectChallenge(
      incoming!,
      () => {},
      () => {},
      () => {}
    );

    expect(acceptedSession.roomId).toBe(roomId);
    expect(acceptedSession.myColor).toBe('b');
    expect(acceptedSession.timeControlId).toBe('blitz_3_2');
    expect(acceptedSession.opponent.id).toBe(playerA.id);

    expect(responses.length).toBe(1);
    expect(responses[0].status).toBe('accepted');
    expect(responses[0].challengeId).toBe('chal_acc_1');
    expect(responses[0].roomId).toBe(roomId);
    expect(responses[0].toUser.id).toBe(playerB.id);
    expect(responses[0].timeControlId).toBe('blitz_3_2');
  });

  it('opponent declining notifies challenger with declined status and starts no session', async () => {
    const { clientA, clientB } = createInMemorySupabasePair();
    const challengerSvc = new MultiplayerService(clientA);
    const opponentSvc = new MultiplayerService(clientB);

    const playerA = makeRegisteredPlayer('usr-alice', 'Alice', 1300);
    const playerB = makeRegisteredPlayer('usr-bob', 'Bob', 1310);
    challengerSvc.setPlayer(playerA);
    opponentSvc.setPlayer(playerB);

    let incoming: DirectChallengePayload | null = null;
    const responses: DirectChallengeResponsePayload[] = [];
    opponentSvc.onDirectChallenge((chal) => {
      incoming = chal;
    });
    challengerSvc.onChallengeResponse((resp) => {
      responses.push(resp);
    });

    const roomId = await challengerSvc.sendDirectChallenge(playerB.id, {
      challengeId: 'chal_dec_1',
      timeControlId: 'rapid_10_0'
    });

    await opponentSvc.declineDirectChallenge(incoming!);

    expect(responses.length).toBe(1);
    expect(responses[0].status).toBe('declined');
    expect(responses[0].roomId).toBe(roomId);
    expect(challengerSvc.getCurrentSession()).toBeNull();
    expect(opponentSvc.getCurrentSession()).toBeNull();
  });

  it('challenger cancelling notifies opponent so invite can be dismissed cleanly', async () => {
    const { clientA, clientB } = createInMemorySupabasePair();
    const challengerSvc = new MultiplayerService(clientA);
    const opponentSvc = new MultiplayerService(clientB);

    const playerA = makeRegisteredPlayer('usr-alice', 'Alice', 1300);
    const playerB = makeRegisteredPlayer('usr-bob', 'Bob', 1310);
    challengerSvc.setPlayer(playerA);
    opponentSvc.setPlayer(playerB);

    const opponentResponses: DirectChallengeResponsePayload[] = [];
    opponentSvc.onChallengeResponse((resp) => {
      opponentResponses.push(resp);
    });

    const roomId = await challengerSvc.sendDirectChallenge(playerB.id, {
      challengeId: 'chal_can_1',
      timeControlId: 'rapid_10_0'
    });

    await challengerSvc.cancelDirectChallenge({
      challengeId: 'chal_can_1',
      roomId,
      toUserId: playerB.id,
      timeControlId: 'rapid_10_0'
    });

    expect(opponentResponses.length).toBe(1);
    expect(opponentResponses[0].status).toBe('cancelled');
    expect(opponentResponses[0].challengeId).toBe('chal_can_1');
    expect(opponentResponses[0].roomId).toBe(roomId);
  });

  it('App.tsx handleChallengePlayer waits for acceptance and does not start ranked session immediately', () => {
    const appPath = path.resolve(process.cwd(), 'src/App.tsx');
    const source = fs.readFileSync(appPath, 'utf-8');

    const startIdx = source.indexOf('const handleChallengePlayer = async');
    const endIdx = source.indexOf('onChallengeResponse', startIdx);
    expect(startIdx).toBeGreaterThan(-1);
    expect(endIdx).toBeGreaterThan(startIdx);

    const handleChallengeBody = source.slice(startIdx, endIdx);
    expect(handleChallengeBody.includes('setOutgoingChallenge(pending)')).toBe(true);
    expect(handleChallengeBody.includes('handleStartRankedSession')).toBe(false);
    expect(source.includes("if (resp.status === 'accepted')")).toBe(true);
  });
});
