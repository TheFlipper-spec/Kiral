import { cloudDatabase } from './cloudDatabase';

export interface UserProfile {
  id: string;
  username: string;
  elo: number;
  puzzlePoints: number;
  solvedPuzzleIds: string[];
  stats: {
    wins: number;
    losses: number;
    draws: number;
    totalGames: number;
  };
  authProvider?: 'guest' | 'auth0' | 'custom';
  avatarUrl?: string;
  email?: string;
  createdAt: string;
  lastActiveAt?: string;
}

const STORAGE_USERS_KEY = 'kiral_real_chess_users_v2';
const STORAGE_CURRENT_USER_ID = 'kiral_chess_current_user_id_v2';

class UserService {
  private users: UserProfile[] = [];
  private currentUserId: string = '';

  constructor() {
    this.loadState();
    this.initCloudSync();
  }

  private loadState() {
    if (typeof window === 'undefined') return;

    try {
      const rawUsers = localStorage.getItem(STORAGE_USERS_KEY);
      if (rawUsers) {
        this.users = JSON.parse(rawUsers);
      } else {
        this.users = [];
      }

      const savedCurrentId = localStorage.getItem(STORAGE_CURRENT_USER_ID);
      if (savedCurrentId && this.users.some(u => u.id === savedCurrentId)) {
        this.currentUserId = savedCurrentId;
      } else {
        // Create initial real player
        let defaultPlayer = this.users[0];
        if (!defaultPlayer) {
          defaultPlayer = {
            id: `player-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            username: 'Игрок',
            elo: 1200,
            puzzlePoints: 0,
            solvedPuzzleIds: [],
            stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
            authProvider: 'guest',
            createdAt: new Date().toISOString().slice(0, 10),
            lastActiveAt: new Date().toISOString()
          };
          this.users.push(defaultPlayer);
          this.saveUsers();
        }
        this.currentUserId = defaultPlayer.id;
        localStorage.setItem(STORAGE_CURRENT_USER_ID, this.currentUserId);
      }
    } catch {
      this.users = [];
    }
  }

  private async initCloudSync() {
    try {
      const remotePlayers = await cloudDatabase.fetchGlobalPlayers();
      if (remotePlayers && remotePlayers.length > 0) {
        this.mergePlayers(remotePlayers);
      }
      const current = this.getCurrentUser();
      if (current) {
        cloudDatabase.syncPlayer(current);
      }
    } catch (err) {
      console.warn('Initial cloud sync warning:', err);
    }
  }

  public async refreshFromCloud(): Promise<UserProfile[]> {
    try {
      const remote = await cloudDatabase.fetchGlobalPlayers();
      if (remote && remote.length > 0) {
        this.mergePlayers(remote);
      }
    } catch (e) {
      console.warn('Cloud refresh failed:', e);
    }
    return this.getAllUsers();
  }

  private mergePlayers(remotePlayers: UserProfile[]) {
    const map = new Map<string, UserProfile>();
    this.users.forEach((u) => map.set(u.id, u));

    remotePlayers.forEach((rem) => {
      const existing = map.get(rem.id);
      if (!existing) {
        map.set(rem.id, rem);
      } else {
        const higherElo = Math.max(existing.elo, rem.elo);
        const higherPoints = Math.max(existing.puzzlePoints, rem.puzzlePoints);
        const allSolved = Array.from(new Set([...existing.solvedPuzzleIds, ...rem.solvedPuzzleIds]));
        map.set(rem.id, {
          ...existing,
          ...rem,
          elo: higherElo,
          puzzlePoints: higherPoints,
          solvedPuzzleIds: allSolved
        });
      }
    });

    this.users = Array.from(map.values());
    this.saveUsers();
  }

  private saveUsers() {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(this.users));
    } catch (e) {
      console.warn('Failed to save users:', e);
    }
  }

  public getCurrentUser(): UserProfile {
    const user = this.users.find(u => u.id === this.currentUserId);
    if (user) return user;
    return this.users[0] || {
      id: 'default',
      username: 'Игрок',
      elo: 1200,
      puzzlePoints: 0,
      solvedPuzzleIds: [],
      stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
      createdAt: new Date().toISOString().slice(0, 10)
    };
  }

  public getAllUsers(): UserProfile[] {
    return [...this.users];
  }

  public loginUser(rawUsername: string): UserProfile {
    const username = rawUsername.trim() || 'Игрок';
    let user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      user = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username,
        elo: 1200,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        authProvider: 'custom',
        createdAt: new Date().toISOString().slice(0, 10),
        lastActiveAt: new Date().toISOString()
      };
      this.users.push(user);
    } else {
      user.lastActiveAt = new Date().toISOString();
    }

    this.currentUserId = user.id;
    localStorage.setItem(STORAGE_CURRENT_USER_ID, user.id);
    this.saveUsers();
    cloudDatabase.syncPlayer(user);
    return user;
  }

  public syncAuth0User(auth0User: {
    sub?: string;
    nickname?: string;
    name?: string;
    email?: string;
    picture?: string;
  }): UserProfile {
    const id = auth0User.sub || `auth0-${Date.now().toString(36)}`;
    const username = auth0User.nickname || auth0User.name || auth0User.email?.split('@')[0] || 'Игрок';

    let user = this.users.find(u => u.id === id || u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      user = {
        id,
        username,
        elo: 1200,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        authProvider: 'auth0',
        email: auth0User.email,
        avatarUrl: auth0User.picture,
        createdAt: new Date().toISOString().slice(0, 10),
        lastActiveAt: new Date().toISOString()
      };
      this.users.push(user);
    } else {
      user.id = id;
      user.authProvider = 'auth0';
      if (auth0User.picture) user.avatarUrl = auth0User.picture;
      if (auth0User.email) user.email = auth0User.email;
      user.lastActiveAt = new Date().toISOString();
    }

    this.currentUserId = user.id;
    localStorage.setItem(STORAGE_CURRENT_USER_ID, user.id);
    this.saveUsers();
    cloudDatabase.syncPlayer(user);
    return user;
  }

  public switchUser(userId: string): UserProfile | null {
    const user = this.users.find(u => u.id === userId);
    if (!user) return null;
    this.currentUserId = user.id;
    localStorage.setItem(STORAGE_CURRENT_USER_ID, user.id);
    return user;
  }

  /**
   * Calculates Elo change based on match outcome vs Stockfish bot
   * Draw gives 0 change as requested: "ничья ничего"
   */
  public recordMatchResult(
    botElo: number,
    result: 'win' | 'loss' | 'draw'
  ): { eloChange: number; oldElo: number; newElo: number; message: string } {
    const user = this.getCurrentUser();
    const oldElo = user.elo;

    // Standard Chess Elo K-factor
    const K = 32;
    // Expected score E = 1 / (1 + 10^((botElo - playerElo) / 400))
    const expected = 1 / (1 + Math.pow(10, (botElo - user.elo) / 400));

    let delta = 0;
    if (result === 'win') {
      // Reward scale: at least +10, up to +36 for defeating hard bot
      delta = Math.max(10, Math.min(40, Math.round(K * (1 - expected))));
      user.stats.wins++;
    } else if (result === 'loss') {
      // Penalty scale: at least -8, max -32
      delta = -Math.max(8, Math.min(32, Math.round(K * expected)));
      user.stats.losses++;
    } else {
      // Draw gives nothing (0 delta) as requested
      delta = 0;
      user.stats.draws++;
    }

    user.stats.totalGames++;
    user.elo = Math.max(200, user.elo + delta);
    user.lastActiveAt = new Date().toISOString();
    this.saveUsers();

    // Persist to central cloud database
    cloudDatabase.syncPlayer(user);

    let message = '';
    if (result === 'win') {
      message = `Победа! +${delta} ELO (${user.elo})`;
    } else if (result === 'loss') {
      message = `Поражение. ${delta} ELO (${user.elo})`;
    } else {
      message = `Ничья. 0 ELO (${user.elo})`;
    }

    return { eloChange: delta, oldElo, newElo: user.elo, message };
  }

  /**
   * Awards puzzle points based on puzzle rating
   * Easy: 15 pts, Medium: 30 pts, Hard: 50 pts
   */
  public recordPuzzleSolved(
    puzzleId: string,
    puzzleRating: number
  ): { pointsAwarded: number; oldTotalPoints: number; isFirstTime: boolean; newTotalPoints: number } {
    const user = this.getCurrentUser();
    const oldTotalPoints = user.puzzlePoints;
    const isFirstTime = !user.solvedPuzzleIds.includes(puzzleId);

    // Calculate points based on puzzle difficulty rating
    let basePoints = 15;
    if (puzzleRating >= 1600) basePoints = 45;
    else if (puzzleRating >= 1200) basePoints = 30;

    let pointsAwarded = 0;
    if (isFirstTime) {
      pointsAwarded = basePoints;
      user.solvedPuzzleIds.push(puzzleId);
      user.puzzlePoints += pointsAwarded;
    } else {
      // Minor bonus for repeating
      pointsAwarded = 5;
      user.puzzlePoints += pointsAwarded;
    }

    user.lastActiveAt = new Date().toISOString();
    this.saveUsers();

    // Persist to central cloud database
    cloudDatabase.syncPlayer(user);

    return { pointsAwarded, oldTotalPoints, isFirstTime, newTotalPoints: user.puzzlePoints };
  }

  public getEloLeaderboard(): UserProfile[] {
    return [...this.users].sort((a, b) => b.elo - a.elo);
  }

  public getPuzzlesLeaderboard(): UserProfile[] {
    return [...this.users].sort((a, b) => {
      if (b.puzzlePoints !== a.puzzlePoints) {
        return b.puzzlePoints - a.puzzlePoints;
      }
      return b.solvedPuzzleIds.length - a.solvedPuzzleIds.length;
    });
  }
}

export const userService = new UserService();
