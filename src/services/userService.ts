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
  createdAt: string;
}

const STORAGE_USERS_KEY = 'kiral_chess_users_v1';
const STORAGE_CURRENT_USER_ID = 'kiral_chess_current_user_id_v1';

// Initial realistic community leaderboard contenders
const DEFAULT_COMMUNITY_USERS: UserProfile[] = [
  {
    id: 'user-gm-alex',
    username: 'Grandmaster_A',
    elo: 2340,
    puzzlePoints: 480,
    solvedPuzzleIds: ['back-rank-1', 'fork-knight-1', 'fork-knight-c7', 'pin-bishop-queen', 'opera-mate', 'smothered-mate', 'anastasia-mate', 'arabian-mate', 'discovered-attack-queen', 'deflection-queen-sacrifice', 'back-rank-deflection', 'double-attack-fork'],
    stats: { wins: 42, losses: 5, draws: 9, totalGames: 56 },
    createdAt: '2026-01-10'
  },
  {
    id: 'user-tactics-fox',
    username: 'TacticsFox',
    elo: 1980,
    puzzlePoints: 390,
    solvedPuzzleIds: ['back-rank-1', 'fork-knight-1', 'fork-knight-c7', 'pin-bishop-queen', 'opera-mate', 'smothered-mate', 'anastasia-mate', 'arabian-mate', 'back-rank-deflection', 'double-attack-fork'],
    stats: { wins: 31, losses: 14, draws: 6, totalGames: 51 },
    createdAt: '2026-02-14'
  },
  {
    id: 'user-deep-pawn',
    username: 'DeepPawn',
    elo: 1650,
    puzzlePoints: 310,
    solvedPuzzleIds: ['back-rank-1', 'fork-knight-1', 'fork-knight-c7', 'pin-bishop-queen', 'opera-mate', 'smothered-mate', 'back-rank-deflection', 'double-attack-fork'],
    stats: { wins: 22, losses: 18, draws: 4, totalGames: 44 },
    createdAt: '2026-03-01'
  },
  {
    id: 'user-endgame-hero',
    username: 'EndgameHero',
    elo: 1420,
    puzzlePoints: 240,
    solvedPuzzleIds: ['back-rank-1', 'fork-knight-1', 'fork-knight-c7', 'pin-bishop-queen', 'back-rank-deflection', 'double-attack-fork'],
    stats: { wins: 15, losses: 16, draws: 3, totalGames: 34 },
    createdAt: '2026-03-20'
  },
  {
    id: 'user-casual-player',
    username: 'QuietMove',
    elo: 1180,
    puzzlePoints: 120,
    solvedPuzzleIds: ['back-rank-1', 'fork-knight-1', 'double-attack-fork'],
    stats: { wins: 8, losses: 12, draws: 2, totalGames: 22 },
    createdAt: '2026-04-05'
  }
];

class UserService {
  private users: UserProfile[] = [];
  private currentUserId: string = '';

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof window === 'undefined') return;

    try {
      const rawUsers = localStorage.getItem(STORAGE_USERS_KEY);
      if (rawUsers) {
        this.users = JSON.parse(rawUsers);
      } else {
        this.users = [...DEFAULT_COMMUNITY_USERS];
        this.saveUsers();
      }

      const savedCurrentId = localStorage.getItem(STORAGE_CURRENT_USER_ID);
      if (savedCurrentId && this.users.some(u => u.id === savedCurrentId)) {
        this.currentUserId = savedCurrentId;
      } else {
        // Create or assign default active player
        let defaultPlayer = this.users.find(u => u.id === 'user-guest');
        if (!defaultPlayer) {
          defaultPlayer = {
            id: 'user-guest',
            username: 'Игрок',
            elo: 1200,
            puzzlePoints: 0,
            solvedPuzzleIds: [],
            stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
            createdAt: new Date().toISOString().slice(0, 10)
          };
          this.users.unshift(defaultPlayer);
          this.saveUsers();
        }
        this.currentUserId = defaultPlayer.id;
        localStorage.setItem(STORAGE_CURRENT_USER_ID, this.currentUserId);
      }
    } catch {
      this.users = [...DEFAULT_COMMUNITY_USERS];
    }
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
        createdAt: new Date().toISOString().slice(0, 10)
      };
      this.users.push(user);
    }

    this.currentUserId = user.id;
    localStorage.setItem(STORAGE_CURRENT_USER_ID, user.id);
    this.saveUsers();
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
  ): { eloChange: number; newElo: number; message: string } {
    const user = this.getCurrentUser();

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
    this.saveUsers();

    let message = '';
    if (result === 'win') {
      message = `Победа! +${delta} ELO (${user.elo})`;
    } else if (result === 'loss') {
      message = `Поражение. ${delta} ELO (${user.elo})`;
    } else {
      message = `Ничья. 0 ELO (${user.elo})`;
    }

    return { eloChange: delta, newElo: user.elo, message };
  }

  /**
   * Awards puzzle points based on puzzle rating
   * Easy: 15 pts, Medium: 30 pts, Hard: 50 pts
   */
  public recordPuzzleSolved(
    puzzleId: string,
    puzzleRating: number
  ): { pointsAwarded: number; isFirstTime: boolean; newTotalPoints: number } {
    const user = this.getCurrentUser();
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

    this.saveUsers();
    return { pointsAwarded, isFirstTime, newTotalPoints: user.puzzlePoints };
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
