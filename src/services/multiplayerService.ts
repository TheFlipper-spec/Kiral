import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedSupabase } from './supabaseClient';
import type { UserProfile } from './userService';
import type { TimeControlId } from '../types/chess';

export interface RankedMatchSession {
  roomId: string;
  isOnlinePvP: boolean;
  myColor: 'w' | 'b';
  timeControlId?: TimeControlId;
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
  moveId?: string;
  ply?: number;
  from: string;
  to: string;
  promotion?: string;
  fen: string;
  san?: string;
  fens?: string[];
  whiteTime?: number;
  blackTime?: number;
  isGameOver?: boolean;
  gameOverMessage?: string;
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

export interface LiveGamePresence {
  userId: string;
  username: string;
  elo: number;
  roomId: string;
  opponentName: string;
  timeControlId?: TimeControlId;
  updatedAt: number;
}

type OnMatchFound = (session: RankedMatchSession) => void;
type OnOpponentMove = (move: MovePayload) => void;
type OnOpponentResign = () => void;
type OnOpponentDraw = () => void;
type OnDirectChallenge = (challenge: DirectChallengePayload) => void;
type OnFriendRequestReceived = (req: { id: string; username: string; elo: number; avatarUrl?: string; createdAt: string }) => void;
type OnLiveGamesChange = (games: LiveGamePresence[]) => void;

class MultiplayerService {
  private supabase: SupabaseClient;
  private lobbyChannel: RealtimeChannel | null = null;
  private gameChannel: RealtimeChannel | null = null;
  private currentSession: RankedMatchSession | null = null;
  private isSearching: boolean = false;
  private myPlayer: UserProfile | null = null;
  private challengeListeners: OnDirectChallenge[] = [];
  private friendRequestListeners: OnFriendRequestReceived[] = [];
  private liveGamesMap: Map<string, LiveGamePresence> = new Map();
  private liveGamesListeners: OnLiveGamesChange[] = [];
  private pendingMoves: Map<string, { move: MovePayload; attempts: number; timer?: any }> = new Map();
  private activeRoomId: string | null = null;

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
        .on('broadcast', { event: 'friend_request' }, ({ payload }) => {
          if (payload && this.myPlayer && payload.toUserId === this.myPlayer.id && payload.fromUser) {
            this.friendRequestListeners.forEach((fn) => fn(payload.fromUser));
          }
        })
        .on('broadcast', { event: 'game_presence' }, ({ payload }) => {
          if (payload && payload.userId) {
            if (payload.status === 'playing') {
              this.liveGamesMap.set(payload.userId, {
                userId: payload.userId,
                username: payload.username,
                elo: payload.elo,
                roomId: payload.roomId,
                opponentName: payload.opponentName,
                timeControlId: payload.timeControlId,
                updatedAt: Date.now()
              });
            } else {
              this.liveGamesMap.delete(payload.userId);
            }
            this.notifyLiveGames();
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('Lobby init warning:', err);
    }
  }

  private notifyLiveGames() {
    const list = Array.from(this.liveGamesMap.values());
    this.liveGamesListeners.forEach((fn) => {
      try {
        fn(list);
      } catch {}
    });
  }

  public onLiveGames(listener: OnLiveGamesChange): () => void {
    this.liveGamesListeners.push(listener);
    listener(Array.from(this.liveGamesMap.values()));
    return () => {
      this.liveGamesListeners = this.liveGamesListeners.filter((l) => l !== listener);
    };
  }

  public getLiveGameForUser(userIdOrUsername: string): LiveGamePresence | undefined {
    const key = userIdOrUsername.toLowerCase();
    for (const game of this.liveGamesMap.values()) {
      if (game.userId.toLowerCase() === key || game.username.toLowerCase() === key) {
        // Discard stale game older than 35 mins
        if (Date.now() - game.updatedAt < 35 * 60 * 1000) {
          return game;
        }
      }
    }
    return undefined;
  }

  public async broadcastGamePresence(
    roomId: string,
    opponentName: string,
    status: 'playing' | 'idle',
    timeControlId?: TimeControlId
  ) {
    if (!this.lobbyChannel || !this.myPlayer) return;
    try {
      await this.lobbyChannel.send({
        type: 'broadcast',
        event: 'game_presence',
        payload: {
          userId: this.myPlayer.id,
          username: this.myPlayer.username,
          elo: this.myPlayer.elo,
          roomId,
          opponentName,
          status,
          timeControlId
        }
      });
    } catch {}
  }

  public onFriendRequest(listener: OnFriendRequestReceived): () => void {
    this.friendRequestListeners.push(listener);
    return () => {
      this.friendRequestListeners = this.friendRequestListeners.filter((l) => l !== listener);
    };
  }

  public async sendFriendRequestNotification(toUserId: string, fromUser: any) {
    if (!this.lobbyChannel) return;
    try {
      await this.lobbyChannel.send({
        type: 'broadcast',
        event: 'friend_request',
        payload: { toUserId, fromUser }
      });
    } catch {}
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
    onDraw: OnOpponentDraw,
    onTimeout?: (fromColor?: 'w' | 'b') => void,
    onDrawOffer?: (fromUsername: string) => void,
    onDrawAccept?: () => void
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
    await this.joinGameRoom(
      challenge.roomId,
      onMove,
      onResign,
      onDraw,
      onTimeout,
      onDrawOffer,
      onDrawAccept
    );

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
    onMatchFound: OnMatchFound,
    timeControlId: TimeControlId = 'rapid_10_0'
  ) {
    this.myPlayer = player;
    this.isSearching = true;

    const searchChannel = this.supabase.channel(`kiral_matchmaking_queue_${timeControlId}`, {
      config: { broadcast: { self: false } }
    });

    const searchTicket = {
      playerId: player.id,
      username: player.username,
      elo: player.elo,
      avatarUrl: player.avatarUrl,
      timeControlId,
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
        // Strict queue isolation: only match players with the identical time control
        if (payload.timeControlId !== timeControlId) return;

        // Found another candidate searching!
        // To prevent both clients creating conflicting rooms, the player with the lower ID coordinates
        if (player.id < payload.playerId) {
          const roomId = `room_pvp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const iAmWhite = Math.random() > 0.5;

          const matchPayload = {
            roomId,
            timeControlId,
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

          for (let i = 0; i < 3; i++) {
            searchChannel.send({
              type: 'broadcast',
              event: 'match_created',
              payload: matchPayload
            });
            if (i < 2) await new Promise((r) => setTimeout(r, 150));
          }

          cleanup();

          const session: RankedMatchSession = {
            roomId,
            isOnlinePvP: true,
            myColor: iAmWhite ? 'w' : 'b',
            timeControlId,
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
        if (payload.player2?.id === player.id && payload.timeControlId === timeControlId) {
          cleanup();
          const session: RankedMatchSession = {
            roomId: payload.roomId,
            isOnlinePvP: true,
            myColor: payload.player2.color,
            timeControlId: payload.timeControlId || timeControlId,
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
  public createRankedAiMatch(
    player: UserProfile,
    timeControlId: TimeControlId = 'rapid_10_0'
  ): RankedMatchSession {
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
      timeControlId,
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
   * Joins a game room for live moves sync with ACK, Heartbeat, and Full Sync protocols
   */
  public async joinGameRoom(
    roomId: string,
    onMove: OnOpponentMove,
    onResign: OnOpponentResign,
    onDraw: OnOpponentDraw,
    onTimeout?: (fromColor?: 'w' | 'b') => void,
    onDrawOffer?: (fromUsername: string) => void,
    onDrawAccept?: () => void,
    onRequestSync?: () => void,
    onFullSync?: (payload: any) => void,
    onHeartbeat?: (payload: any) => void
  ) {
    // Idempotency: if already subscribed to this room, avoid destroying and recreating channel
    if (this.gameChannel && this.activeRoomId === roomId) {
      return;
    }

    this.leaveGameRoom();
    this.activeRoomId = roomId;

    this.gameChannel = this.supabase.channel(`game_${roomId}`, {
      config: { broadcast: { self: false } }
    });

    this.gameChannel
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        if (!payload) return;
        const move = payload as MovePayload;
        // Immediate ACK response back to sender
        if (move.moveId) {
          try {
            this.gameChannel?.send({
              type: 'broadcast',
              event: 'move_ack',
              payload: { moveId: move.moveId, ply: move.ply }
            });
          } catch {}
        }
        onMove(move);
      })
      .on('broadcast', { event: 'move_ack' }, ({ payload }) => {
        if (payload && payload.moveId) {
          const pending = this.pendingMoves.get(payload.moveId);
          if (pending) {
            if (pending.timer) clearTimeout(pending.timer);
            this.pendingMoves.delete(payload.moveId);
          }
        }
      })
      .on('broadcast', { event: 'request_sync' }, () => {
        if (onRequestSync) onRequestSync();
      })
      .on('broadcast', { event: 'full_sync' }, ({ payload }) => {
        if (onFullSync && payload) onFullSync(payload);
      })
      .on('broadcast', { event: 'heartbeat' }, ({ payload }) => {
        if (onHeartbeat && payload) onHeartbeat(payload);
      })
      .on('broadcast', { event: 'resign' }, () => {
        onResign();
      })
      .on('broadcast', { event: 'timeout' }, () => {
        if (onTimeout) onTimeout();
        else onResign();
      })
      .on('broadcast', { event: 'draw_offer' }, ({ payload }) => {
        const fromName = (payload && (payload as any).fromUsername) || 'Соперник';
        if (onDrawOffer) onDrawOffer(fromName);
      })
      .on('broadcast', { event: 'draw_accept' }, () => {
        if (onDrawAccept) onDrawAccept();
        else onDraw();
      })
      .on('broadcast', { event: 'draw' }, () => {
        onDraw();
      });

    await this.gameChannel.subscribe();
  }

  /**
   * Joins a game room as a live spectator (read-only real-time feed)
   */
  public async joinSpectatorRoom(
    roomId: string,
    callbacks: {
      onFullSync: (payload: any) => void;
      onMove: (move: MovePayload) => void;
      onResign: () => void;
      onDraw: () => void;
      onTimeout?: () => void;
      onHeartbeat?: (payload: any) => void;
    }
  ): Promise<() => void> {
    this.leaveGameRoom();
    this.activeRoomId = roomId;

    this.gameChannel = this.supabase.channel(`game_${roomId}`, {
      config: { broadcast: { self: false } }
    });

    this.gameChannel
      .on('broadcast', { event: 'full_sync' }, ({ payload }) => {
        if (payload) callbacks.onFullSync(payload);
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        if (payload) callbacks.onMove(payload as MovePayload);
      })
      .on('broadcast', { event: 'heartbeat' }, ({ payload }) => {
        if (callbacks.onHeartbeat && payload) callbacks.onHeartbeat(payload);
      })
      .on('broadcast', { event: 'resign' }, () => {
        callbacks.onResign();
      })
      .on('broadcast', { event: 'draw' }, () => {
        callbacks.onDraw();
      })
      .on('broadcast', { event: 'timeout' }, () => {
        if (callbacks.onTimeout) callbacks.onTimeout();
      });

    await this.gameChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Request active board state from players
        setTimeout(() => {
          this.gameChannel?.send({
            type: 'broadcast',
            event: 'request_sync',
            payload: { isSpectator: true }
          });
        }, 150);
      }
    });

    return () => {
      this.leaveGameRoom();
    };
  }

  /**
   * Sends move with automatic retry and ACK acknowledgment to prevent desync
   */
  public async sendMove(move: MovePayload) {
    if (!this.gameChannel) return;
    const moveId = move.moveId || `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    move.moveId = moveId;

    const executeSend = async () => {
      if (!this.gameChannel) return;
      try {
        await this.gameChannel.send({
          type: 'broadcast',
          event: 'move',
          payload: move
        });
      } catch {}
    };

    await executeSend();

    // Schedule retries every 750ms if ACK not received
    let attempts = 0;
    const retry = () => {
      if (!this.pendingMoves.has(moveId)) return;
      attempts++;
      if (attempts >= 5) {
        this.pendingMoves.delete(moveId);
        return;
      }
      executeSend();
      const timer = setTimeout(retry, 750);
      this.pendingMoves.set(moveId, { move, attempts, timer });
    };

    const timer = setTimeout(retry, 750);
    this.pendingMoves.set(moveId, { move, attempts: 0, timer });
  }

  public async sendHeartbeat(data: {
    ply: number;
    latestFen: string;
    whiteTime?: number;
    blackTime?: number;
    isGameOver?: boolean;
    gameOverMessage?: string;
  }) {
    if (!this.gameChannel) return;
    try {
      await this.gameChannel.send({
        type: 'broadcast',
        event: 'heartbeat',
        payload: data
      });
    } catch {}
  }

  public async sendFullSync(data: {
    fens: string[];
    currentPly: number;
    whiteTime?: number;
    blackTime?: number;
    isGameOver?: boolean;
    gameOverMessage?: string;
  }) {
    if (!this.gameChannel) return;
    try {
      await this.gameChannel.send({
        type: 'broadcast',
        event: 'full_sync',
        payload: data
      });
    } catch {}
  }

  public async requestFullSync() {
    if (!this.gameChannel) return;
    try {
      await this.gameChannel.send({
        type: 'broadcast',
        event: 'request_sync',
        payload: { requesterId: this.myPlayer?.id }
      });
    } catch {}
  }

  /**
   * Sends draw offer to opponent
   */
  public async sendDrawOffer() {
    if (!this.gameChannel) return;
    await this.gameChannel.send({
      type: 'broadcast',
      event: 'draw_offer',
      payload: { playerId: this.myPlayer?.id, fromUsername: this.myPlayer?.username }
    });
  }

  /**
   * Accepts draw and notifies opponent
   */
  public async sendDrawAccept() {
    if (!this.gameChannel) return;
    await this.gameChannel.send({
      type: 'broadcast',
      event: 'draw',
      payload: { playerId: this.myPlayer?.id }
    });
  }

  /**
   * Sends resignation to opponent with triple redundancy
   */
  public async sendResign() {
    if (!this.gameChannel) return;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        try {
          this.gameChannel?.send({
            type: 'broadcast',
            event: 'resign',
            payload: { playerId: this.myPlayer?.id }
          });
        } catch {}
      }, i * 200);
    }
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
    this.pendingMoves.forEach(({ timer }) => {
      if (timer) clearTimeout(timer);
    });
    this.pendingMoves.clear();

    if (this.gameChannel) {
      try {
        this.gameChannel.unsubscribe();
        this.supabase.removeChannel(this.gameChannel);
      } catch {}
      this.gameChannel = null;
    }
    this.activeRoomId = null;
    this.currentSession = null;
  }

  public getCurrentSession(): RankedMatchSession | null {
    return this.currentSession;
  }
}

export const multiplayerService = new MultiplayerService();
