import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedSupabase } from './supabaseClient';
import type { UserProfile } from './userService';

export interface RankedMatchSession {
  roomId: string;
  isOnlinePvP: boolean;
  myColor: 'w' | 'b';
  opponent: {
    id: string;
    username: string;
    elo: number;
    avatarUrl?: string;
    isAi?: boolean;
    aiDifficultyId?: string;
  };
}

export interface MovePayload {
  from: string;
  to: string;
  promotion?: string;
  fen: string;
  san?: string;
  whiteTime?: number;
  blackTime?: number;
}

export interface DirectChallengePayload {
  challengeId: string;
  fromUser: {
    id: string;
    username: string;
    elo: number;
  };
  toUserId: string;
  roomId: string;
}

type OnMatchFound = (session: RankedMatchSession) => void;
type OnOpponentMove = (move: MovePayload) => void;
type OnOpponentResign = () => void;
type OnOpponentDraw = () => void;
type OnDirectChallenge = (challenge: DirectChallengePayload) => void;

class MultiplayerService {
  private supabase: SupabaseClient;
  private lobbyChannel: RealtimeChannel | null = null;
  private gameChannel: RealtimeChannel | null = null;
  private currentSession: RankedMatchSession | null = null;
  private isSearching: boolean = false;
  private myPlayer: UserProfile | null = null;
  private challengeListeners: OnDirectChallenge[] = [];

  constructor() {
    this.supabase = sharedSupabase;
    this.initGlobalLobby();
  }

  /**
   * Initializes persistent lobby channel for friend challenges & notifications
   */
  private initGlobalLobby() {
    try {
      this.lobbyChannel = this.supabase.channel('kiral_ranked_lobby', {
        config: { broadcast: { self: false } }
      });

      this.lobbyChannel
        .on('broadcast', { event: 'direct_challenge' }, ({ payload }) => {
          if (payload && this.myPlayer && payload.toUserId === this.myPlayer.id) {
            this.challengeListeners.forEach((fn) => fn(payload as DirectChallengePayload));
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('Lobby init warning:', err);
    }
  }

  public setPlayer(player: UserProfile) {
    this.myPlayer = player;
  }

  public onDirectChallenge(listener: OnDirectChallenge): () => void {
    this.challengeListeners.push(listener);
    return () => {
      this.challengeListeners = this.challengeListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Sends a direct game challenge to another online player
   */
  public async sendDirectChallenge(toUserId: string): Promise<string> {
    if (!this.myPlayer) throw new Error('Player not initialized');
    const roomId = `room_pvp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const challenge: DirectChallengePayload = {
      challengeId: `chal_${Date.now()}`,
      fromUser: {
        id: this.myPlayer.id,
        username: this.myPlayer.username,
        elo: this.myPlayer.elo
      },
      toUserId,
      roomId
    };

    if (this.lobbyChannel) {
      await this.lobbyChannel.send({
        type: 'broadcast',
        event: 'direct_challenge',
        payload: challenge
      });
    }

    return roomId;
  }

  /**
   * Accepts a direct challenge and starts game
   */
  public async acceptDirectChallenge(
    challenge: DirectChallengePayload,
    onMove: OnOpponentMove,
    onResign: OnOpponentResign,
    onDraw: OnOpponentDraw
  ): Promise<RankedMatchSession> {
    const session: RankedMatchSession = {
      roomId: challenge.roomId,
      isOnlinePvP: true,
      myColor: 'b',
      opponent: {
        id: challenge.fromUser.id,
        username: challenge.fromUser.username,
        elo: challenge.fromUser.elo,
        isAi: false
      }
    };

    this.currentSession = session;
    await this.joinGameRoom(challenge.roomId, onMove, onResign, onDraw);

    // Notify opponent that challenge was accepted
    if (this.gameChannel) {
      this.gameChannel.send({
        type: 'broadcast',
        event: 'challenge_accepted',
        payload: { roomId: challenge.roomId }
      });
    }

    return session;
  }

  /**
   * Starts searching for a live opponent with similar Elo
   */
  public async startMatchmaking(
    player: UserProfile,
    onMatchFound: OnMatchFound
  ) {
    this.myPlayer = player;
    this.isSearching = true;

    const searchChannel = this.supabase.channel('kiral_matchmaking_queue', {
      config: { broadcast: { self: false } }
    });

    const searchTicket = {
      playerId: player.id,
      username: player.username,
      elo: player.elo,
      avatarUrl: player.avatarUrl,
      timestamp: Date.now()
    };

    let intervalId: any = null;

    const cleanup = () => {
      this.isSearching = false;
      if (intervalId) clearInterval(intervalId);
      searchChannel.unsubscribe();
      this.supabase.removeChannel(searchChannel);
    };

    searchChannel
      .on('broadcast', { event: 'search_ticket' }, async ({ payload }) => {
        if (!this.isSearching || !payload || payload.playerId === player.id) return;

        // Found another candidate searching!
        // To prevent both clients creating conflicting rooms, the player with the lower ID coordinates
        if (player.id < payload.playerId) {
          const roomId = `room_pvp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const iAmWhite = Math.random() > 0.5;

          const matchPayload = {
            roomId,
            player1: {
              id: player.id,
              username: player.username,
              elo: player.elo,
              color: iAmWhite ? 'w' : 'b'
            },
            player2: {
              id: payload.playerId,
              username: payload.username,
              elo: payload.elo,
              color: iAmWhite ? 'b' : 'w'
            }
          };

          await searchChannel.send({
            type: 'broadcast',
            event: 'match_created',
            payload: matchPayload
          });

          cleanup();

          const session: RankedMatchSession = {
            roomId,
            isOnlinePvP: true,
            myColor: iAmWhite ? 'w' : 'b',
            opponent: {
              id: payload.playerId,
              username: payload.username,
              elo: payload.elo,
              avatarUrl: payload.avatarUrl,
              isAi: false
            }
          };
          this.currentSession = session;
          onMatchFound(session);
        }
      })
      .on('broadcast', { event: 'match_created' }, ({ payload }) => {
        if (!this.isSearching || !payload) return;
        if (payload.player2?.id === player.id) {
          cleanup();
          const session: RankedMatchSession = {
            roomId: payload.roomId,
            isOnlinePvP: true,
            myColor: payload.player2.color,
            opponent: {
              id: payload.player1.id,
              username: payload.player1.username,
              elo: payload.player1.elo,
              isAi: false
            }
          };
          this.currentSession = session;
          onMatchFound(session);
        }
      });

    await searchChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Broadcast our ticket immediately
        await searchChannel.send({
          type: 'broadcast',
          event: 'search_ticket',
          payload: searchTicket
        });

        // Broadcast every 2.5s while searching
        intervalId = setInterval(() => {
          if (!this.isSearching) return;
          searchChannel.send({
            type: 'broadcast',
            event: 'search_ticket',
            payload: searchTicket
          });
        }, 2500);
      }
    });

    return () => {
      cleanup();
    };
  }

  /**
   * Creates a calibrated Ranked AI match matched to user's Elo
   */
  public createRankedAiMatch(player: UserProfile): RankedMatchSession {
    const elo = player.elo;
    let aiDifficultyId = 'casual';
    let aiElo = elo;

    if (elo <= 200) {
      aiDifficultyId = 'novice';
      aiElo = Math.max(50, Math.round(elo + (Math.random() * 10 - 5)));
    } else if (elo <= 450) {
      aiDifficultyId = 'beginner';
      aiElo = Math.round(elo + (Math.random() * 20 - 10));
    } else if (elo <= 800) {
      aiDifficultyId = 'casual';
      aiElo = Math.round(elo + (Math.random() * 30 - 15));
    } else if (elo <= 1200) {
      aiDifficultyId = 'fast';
      aiElo = Math.round(elo + (Math.random() * 40 - 20));
    } else if (elo <= 1600) {
      aiDifficultyId = 'club';
      aiElo = Math.round(elo + (Math.random() * 50 - 25));
    } else if (elo <= 2000) {
      aiDifficultyId = 'expert';
      aiElo = Math.round(elo + (Math.random() * 40 - 20));
    } else {
      aiDifficultyId = 'master';
      aiElo = Math.round(elo + 15);
    }

    const session: RankedMatchSession = {
      roomId: `ai_${Date.now()}`,
      isOnlinePvP: false,
      myColor: Math.random() > 0.5 ? 'w' : 'b',
      opponent: {
        id: `bot_ranked_${aiDifficultyId}`,
        username: `ИИ ${aiDifficultyId === 'novice' ? 'Ученик' : aiDifficultyId === 'beginner' ? 'Новичок' : 'Бот'} (${aiElo} ELO)`,
        elo: aiElo,
        isAi: true,
        aiDifficultyId
      }
    };

    this.currentSession = session;
    return session;
  }

  /**
   * Joins a game room for live moves sync
   */
  public async joinGameRoom(
    roomId: string,
    onMove: OnOpponentMove,
    onResign: OnOpponentResign,
    onDraw: OnOpponentDraw,
    onTimeout?: () => void
  ) {
    this.leaveGameRoom();

    this.gameChannel = this.supabase.channel(`game_${roomId}`, {
      config: { broadcast: { self: false } }
    });

    this.gameChannel
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        if (payload) onMove(payload as MovePayload);
      })
      .on('broadcast', { event: 'resign' }, () => {
        onResign();
      })
      .on('broadcast', { event: 'timeout' }, () => {
        if (onTimeout) onTimeout();
        else onResign();
      })
      .on('broadcast', { event: 'draw' }, () => {
        onDraw();
      });

    await this.gameChannel.subscribe();
  }

  /**
   * Sends move to opponent in the room
   */
  public async sendMove(move: MovePayload) {
    if (!this.gameChannel) return;
    await this.gameChannel.send({
      type: 'broadcast',
      event: 'move',
      payload: move
    });
  }

  /**
   * Sends resignation to opponent
   */
  public async sendResign() {
    if (!this.gameChannel) return;
    await this.gameChannel.send({
      type: 'broadcast',
      event: 'resign',
      payload: { playerId: this.myPlayer?.id }
    });
  }

  /**
   * Sends timeout notification to opponent when local clock reaches 0
   */
  public async sendTimeout() {
    if (!this.gameChannel) return;
    await this.gameChannel.send({
      type: 'broadcast',
      event: 'timeout',
      payload: { playerId: this.myPlayer?.id }
    });
  }

  public setCurrentSession(session: RankedMatchSession | null) {
    this.currentSession = session;
  }

  public leaveGameRoom() {
    if (this.gameChannel) {
      this.gameChannel.unsubscribe();
      this.supabase.removeChannel(this.gameChannel);
      this.gameChannel = null;
    }
    this.currentSession = null;
  }

  public getCurrentSession(): RankedMatchSession | null {
    return this.currentSession;
  }
}

export const multiplayerService = new MultiplayerService();
