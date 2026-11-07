import { cloudDatabase } from './cloudDatabase';

export function getDeterministicUserId(username: string): string {
  return `usr_${encodeURIComponent(username.trim().toLowerCase())}`;
}

export interface ActiveGameSyncData {
  gameMode: 'ranked' | 'vs-ai';
  session?: any;
  aiDifficultyId?: string;
  playerColor?: 'w' | 'b';
  fens: string[];
  currentPly: number;
  whiteTime?: number;
  blackTime?: number;
  lastTickTimestamp?: number;
  report?: any;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  password?: string;
  isRegistered: boolean;
  elo: number;
  puzzlePoints: number;
  solvedPuzzleIds: string[];
  friends: string[];
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
  activeGame?: ActiveGameSyncData | null;
}

const STORAGE_USERS_KEY = 'kiral_real_chess_users_v3';
const STORAGE_CURRENT_USER_ID = 'kiral_chess_current_user_id_v3';

class UserService {
  private users: UserProfile[] = [];
  private currentUserId: string = '';
  private userListeners: Array<(user: UserProfile) => void> = [];

  constructor() {
    this.loadState();
    this.initCloudSync();
    this.startCloudPolling();
  }

  public subscribe(listener: (user: UserProfile) => void): () => void {
    this.userListeners.push(listener);
    return () => {
      this.userListeners = this.userListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const current = this.getCurrentUser();
    this.userListeners.forEach((fn) => {
      try {
        fn(current);
      } catch {
        // Ignore listener error
      }
    });
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

      // Reconcile and migrate registered users to deterministic IDs and deduplicate by username
      const dedupMap = new Map<string, UserProfile>();
      this.users.forEach((u) => {
        if (u.isRegistered && u.authProvider !== 'guest' && u.username && u.username !== 'Гость') {
          const canonicalId = getDeterministicUserId(u.username);
          if (this.currentUserId === u.id) {
            this.currentUserId = canonicalId;
          }
          u.id = canonicalId;
          const key = u.username.toLowerCase();
          const existing = dedupMap.get(key);
          if (!existing) {
            dedupMap.set(key, u);
          } else {
            const useCurrent = (u.stats?.totalGames || 0) >= (existing.stats?.totalGames || 0);
            dedupMap.set(key, {
              ...existing,
              ...u,
              id: canonicalId,
              elo: useCurrent ? u.elo : existing.elo,
              stats: useCurrent ? (u.stats || existing.stats) : (existing.stats || u.stats),
              puzzlePoints: Math.max(existing.puzzlePoints || 0, u.puzzlePoints || 0),
              solvedPuzzleIds: Array.from(new Set([...(existing.solvedPuzzleIds || []), ...(u.solvedPuzzleIds || [])]))
            });
          }
        } else {
          dedupMap.set(u.id, u);
        }
      });
      this.users = Array.from(dedupMap.values());

      const savedCurrentId = localStorage.getItem(STORAGE_CURRENT_USER_ID);
      if (savedCurrentId && this.users.some(u => u.id === savedCurrentId)) {
        this.currentUserId = savedCurrentId;
      } else if (this.users.length > 0) {
        this.currentUserId = this.users[0].id;
      } else {
        // Initial guest player (default 100 ELO, not registered)
        const defaultPlayer: UserProfile = {
          id: `guest-${Date.now().toString(36)}`,
          username: 'Гость',
          isRegistered: false,
          elo: 100,
          puzzlePoints: 0,
          solvedPuzzleIds: [],
          friends: [],
          stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
          authProvider: 'guest',
          createdAt: new Date().toISOString().slice(0, 10),
          lastActiveAt: new Date().toISOString()
        };
        this.users.push(defaultPlayer);
        this.currentUserId = defaultPlayer.id;
        this.saveUsers();
      }
      localStorage.setItem(STORAGE_CURRENT_USER_ID, this.currentUserId);
    } catch {
      this.users = [];
    }
  }

  private startCloudPolling() {
    if (typeof window === 'undefined') return;
    setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.refreshFromCloud();
      }
    }, 8000);
  }

  private async initCloudSync() {
    try {
      const remotePlayers = await cloudDatabase.fetchGlobalPlayers();
      if (remotePlayers && remotePlayers.length > 0) {
        this.mergePlayers(remotePlayers);
      }
      const current = this.getCurrentUser();
      if (current && current.isRegistered && current.authProvider !== 'guest') {
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
    const oldCurrent = this.getCurrentUser();
    const oldCurrentKey = oldCurrent?.username ? oldCurrent.username.toLowerCase() : '';

    remotePlayers.forEach((rem) => {
      if (rem.authProvider === 'guest' || rem.username === 'Гость' || rem.username === 'Игрок') return;
      const canonicalId = getDeterministicUserId(rem.username);
      const remKey = rem.username.toLowerCase();

      // Find local user by rem.id, canonicalId, or matching username
      const existingIndex = this.users.findIndex(
        (u) => u.id === rem.id || u.id === canonicalId || u.username.toLowerCase() === remKey
      );

      if (existingIndex < 0) {
        this.users.push({
          ...rem,
          id: canonicalId,
          isRegistered: true,
          friends: rem.friends || []
        });
      } else {
        const existing = this.users[existingIndex];
        const isCurrentUser = existing.id === this.currentUserId || existing.username.toLowerCase() === oldCurrentKey;
        const remGames = rem.stats?.totalGames || 0;
        const localGames = existing.stats?.totalGames || 0;
        const remTime = rem.lastActiveAt ? new Date(rem.lastActiveAt).getTime() : 0;
        const localTime = existing.lastActiveAt ? new Date(existing.lastActiveAt).getTime() : 0;

        // Authoritative resolution:
        // Remote wins if it has more played games OR newer timestamp, or if not the current session
        const useRemoteStats = remGames > localGames || (remGames === localGames && remTime >= localTime) || !isCurrentUser;

        const allSolved = Array.from(new Set([...(existing.solvedPuzzleIds || []), ...(rem.solvedPuzzleIds || [])]));
        const mergedFriends = Array.from(new Set([...(existing.friends || []), ...(rem.friends || [])]));

        // Reconcile activeGame
        let resolvedActiveGame = existing.activeGame;
        if (rem.activeGame) {
          if (!existing.activeGame) {
            resolvedActiveGame = rem.activeGame;
          } else {
            const remGameTime = new Date(rem.activeGame.updatedAt).getTime();
            const localGameTime = new Date(existing.activeGame.updatedAt).getTime();
            if (remGameTime >= localGameTime) {
              resolvedActiveGame = rem.activeGame;
            }
          }
        }

        const merged: UserProfile = {
          ...existing,
          ...rem,
          id: canonicalId,
          isRegistered: true,
          elo: useRemoteStats ? rem.elo : existing.elo,
          stats: useRemoteStats ? (rem.stats || existing.stats) : existing.stats,
          puzzlePoints: useRemoteStats ? rem.puzzlePoints : Math.max(existing.puzzlePoints || 0, rem.puzzlePoints || 0),
          solvedPuzzleIds: allSolved,
          friends: mergedFriends,
          activeGame: resolvedActiveGame
        };

        this.users[existingIndex] = merged;

        // If local had strictly more games than remote, sync to cloud so remote gets updated!
        if (localGames > remGames && merged.isRegistered && merged.authProvider !== 'guest') {
          cloudDatabase.syncPlayer(merged);
        }
      }
    });

    // Reconcile current user ID to canonical ID
    const current = this.users.find(
      (u) => u.id === this.currentUserId || (oldCurrentKey && u.username.toLowerCase() === oldCurrentKey)
    );
    if (current && current.isRegistered && current.authProvider !== 'guest') {
      const canonicalId = getDeterministicUserId(current.username);
      current.id = canonicalId;
      this.currentUserId = canonicalId;
      localStorage.setItem(STORAGE_CURRENT_USER_ID, canonicalId);
    }

    this.saveUsers();
    this.notifyListeners();
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
    if (this.users.length > 0) {
      this.currentUserId = this.users[0].id;
      return this.users[0];
    }
    const fresh: UserProfile = {
      id: `guest-${Date.now().toString(36)}`,
      username: 'Гость',
      isRegistered: false,
      elo: 100,
      puzzlePoints: 0,
      solvedPuzzleIds: [],
      friends: [],
      stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
      authProvider: 'guest',
      createdAt: new Date().toISOString().slice(0, 10)
    };
    this.users.push(fresh);
    this.currentUserId = fresh.id;
    this.saveUsers();
    return fresh;
  }

  public getUserById(userId: string): UserProfile | undefined {
    return this.users.find(u => u.id === userId);
  }

  public toggleFriend(targetUserId: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.id === targetUserId) return false;
    if (!currentUser.friends) currentUser.friends = [];

    const idx = currentUser.friends.indexOf(targetUserId);
    let isNowFriend = false;
    if (idx >= 0) {
      currentUser.friends.splice(idx, 1);
      isNowFriend = false;
    } else {
      currentUser.friends.push(targetUserId);
      isNowFriend = true;
    }

    this.saveUsers();
    if (currentUser.isRegistered && currentUser.authProvider !== 'guest') {
      cloudDatabase.syncPlayer(currentUser);
    }
    return isNowFriend;
  }

  public isFriend(targetUserId: string): boolean {
    const currentUser = this.getCurrentUser();
    return Boolean(currentUser?.friends?.includes(targetUserId));
  }

  public getAllUsers(): UserProfile[] {
    return [...this.users];
  }

  public loginUser(rawUsername: string, rawPassword?: string): { success: boolean; user: UserProfile; error?: string } {
    const username = rawUsername.trim();
    if (!username || username.length < 2) {
      return { success: false, user: this.getCurrentUser(), error: 'Имя должно содержать от 2 символов' };
    }

    const password = rawPassword ? rawPassword.trim() : '';
    if (!password || password.length < 3) {
      return { success: false, user: this.getCurrentUser(), error: 'Пароль обязателен (минимум 3 символа)' };
    }

    const canonicalId = getDeterministicUserId(username);
    let user = this.users.find(u => u.id === canonicalId || u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      user = {
        id: canonicalId,
        username,
        password,
        isRegistered: true,
        elo: 100,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        authProvider: 'custom',
        createdAt: new Date().toISOString().slice(0, 10),
        lastActiveAt: new Date().toISOString()
      };
      this.users.push(user);
    } else {
      if (user.password && user.password !== password) {
        return { success: false, user: this.getCurrentUser(), error: 'Неверный пароль для этого аккаунта' };
      }
      user.id = canonicalId;
      user.password = password;
      user.isRegistered = true;
      user.authProvider = 'custom';
      user.lastActiveAt = new Date().toISOString();
    }

    this.currentUserId = user.id;
    localStorage.setItem(STORAGE_CURRENT_USER_ID, user.id);
    this.saveUsers();
    cloudDatabase.syncPlayer(user);

    // Immediately trigger cloud sync so device reconciles stats
    this.refreshFromCloud().then(() => {
      this.notifyListeners();
    });

    return { success: true, user };
  }

  public getActiveGame(): ActiveGameSyncData | null {
    const user = this.getCurrentUser();
    return user?.activeGame || null;
  }

  public setActiveGame(activeGame: ActiveGameSyncData): void {
    const user = this.getCurrentUser();
    if (!user || !user.isRegistered || user.authProvider === 'guest') return;
    user.activeGame = activeGame;
    user.lastActiveAt = new Date().toISOString();
    this.saveUsers();
    cloudDatabase.syncPlayer(user);
  }

  public clearActiveGame(): void {
    const user = this.getCurrentUser();
    if (!user || !user.isRegistered || user.authProvider === 'guest') return;
    if (user.activeGame) {
      user.activeGame = null;
      user.lastActiveAt = new Date().toISOString();
      this.saveUsers();
      cloudDatabase.syncPlayer(user);
    }
  }

  public logoutUser(): UserProfile {
    let guest = this.users.find(u => !u.isRegistered || u.authProvider === 'guest');
    if (!guest) {
      guest = {
        id: `guest-${Date.now().toString(36)}`,
        username: 'Гость',
        isRegistered: false,
        elo: 100,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
        authProvider: 'guest',
        createdAt: new Date().toISOString().slice(0, 10),
        lastActiveAt: new Date().toISOString()
      };
      this.users.push(guest);
    }
    this.currentUserId = guest.id;
    localStorage.setItem(STORAGE_CURRENT_USER_ID, guest.id);
    this.saveUsers();
    return guest;
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

    let existing = this.users.find(u => u.id === id || u.username.toLowerCase() === username.toLowerCase());

    let user: UserProfile;
    if (!existing) {
      user = {
        id,
        username,
        isRegistered: true,
        friends: [],
        elo: 100,
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
      user = existing;
      user.id = id;
      user.isRegistered = true;
      if (!user.friends) user.friends = [];
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
   * Competitive / Ranked matches (Live PvP or Ranked AI) -> Elo updates
   */
  public recordCompetitiveMatchResult(
    opponentElo: number,
    result: 'win' | 'loss' | 'draw'
  ): { eloChange: number; oldElo: number; newElo: number; message: string } {
    const user = this.getCurrentUser();
    const oldElo = user.elo;

    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (opponentElo - user.elo) / 400));

    let delta = 0;
    if (result === 'win') {
      delta = Math.max(8, Math.min(40, Math.round(K * (1 - expected))));
      user.stats.wins++;
    } else if (result === 'loss') {
      delta = -Math.max(6, Math.min(32, Math.round(K * expected)));
      user.stats.losses++;
    } else {
      delta = 0;
      user.stats.draws++;
    }

    user.stats.totalGames++;
    user.elo = Math.max(50, user.elo + delta);
    user.lastActiveAt = new Date().toISOString();
    this.saveUsers();

    if (user.isRegistered && user.authProvider !== 'guest') {
      cloudDatabase.syncPlayer(user);
    }

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
   * Immediately updates cached opponent ELO & stats locally when a live match finishes,
   * and schedules a cloud refresh so both players see identical ELO right away.
   */
  public applyOpponentMatchResult(
    opponentId: string,
    opponentUsername: string,
    opponentOldElo: number,
    myOldElo: number,
    opponentResult: 'win' | 'loss' | 'draw'
  ): number {
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (myOldElo - opponentOldElo) / 400));
    let delta = 0;
    if (opponentResult === 'win') {
      delta = Math.max(8, Math.min(40, Math.round(K * (1 - expected))));
    } else if (opponentResult === 'loss') {
      delta = -Math.max(6, Math.min(32, Math.round(K * expected)));
    }
    const newOpponentElo = Math.max(50, opponentOldElo + delta);

    let opp = this.users.find((u) => u.id === opponentId);
    if (!opp) {
      opp = {
        id: opponentId,
        username: opponentUsername,
        isRegistered: true,
        elo: newOpponentElo,
        puzzlePoints: 0,
        solvedPuzzleIds: [],
        friends: [],
        stats: {
          wins: opponentResult === 'win' ? 1 : 0,
          losses: opponentResult === 'loss' ? 1 : 0,
          draws: opponentResult === 'draw' ? 1 : 0,
          totalGames: 1
        },
        authProvider: 'custom',
        createdAt: new Date().toISOString().slice(0, 10),
        lastActiveAt: new Date().toISOString()
      };
      this.users.push(opp);
    } else {
      opp.elo = newOpponentElo;
      if (!opp.stats) {
        opp.stats = { wins: 0, losses: 0, draws: 0, totalGames: 0 };
      }
      if (opponentResult === 'win') opp.stats.wins++;
      else if (opponentResult === 'loss') opp.stats.losses++;
      else opp.stats.draws++;
      opp.stats.totalGames++;
      opp.lastActiveAt = new Date().toISOString();
    }
    this.saveUsers();

    // Also pull fresh state from Supabase after opponent finishes syncing
    setTimeout(() => {
      this.refreshFromCloud();
    }, 1500);
    setTimeout(() => {
      this.refreshFromCloud();
    }, 4000);

    return newOpponentElo;
  }

  /**
   * Casual practice vs AI - does NOT modify Elo as requested
   */
  public recordCasualMatch(result: 'win' | 'loss' | 'draw'): void {
    const user = this.getCurrentUser();
    if (result === 'win') user.stats.wins++;
    else if (result === 'loss') user.stats.losses++;
    else user.stats.draws++;
    user.stats.totalGames++;
    user.lastActiveAt = new Date().toISOString();
    this.saveUsers();
    if (user.isRegistered && user.authProvider !== 'guest') {
      cloudDatabase.syncPlayer(user);
    }
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
    return this.users
      .filter((u) => u.isRegistered && u.authProvider !== 'guest')
      .sort((a, b) => b.elo - a.elo);
  }

  public getPuzzlesLeaderboard(): UserProfile[] {
    return this.users
      .filter((u) => u.isRegistered && u.authProvider !== 'guest')
      .sort((a, b) => {
        if (b.puzzlePoints !== a.puzzlePoints) {
          return b.puzzlePoints - a.puzzlePoints;
        }
        return b.solvedPuzzleIds.length - a.solvedPuzzleIds.length;
      });
  }
}

export const userService = new UserService();
