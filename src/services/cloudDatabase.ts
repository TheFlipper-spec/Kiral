import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedSupabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';
import type { UserProfile } from './userService';

export interface CloudConfig {
  provider: 'supabase' | 'firebase' | 'rest' | 'none';
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  firebaseDbUrl?: string;
  restEndpoint?: string;
}

const STORAGE_CLOUD_CONFIG_KEY = 'kiral_cloud_config_v1';

// Built-in configured Supabase production cloud database
const DEFAULT_SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
const DEFAULT_SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

class CloudDatabaseService {
  private config: CloudConfig = {
    provider: 'supabase',
    supabaseUrl: DEFAULT_SUPABASE_URL,
    supabaseAnonKey: DEFAULT_SUPABASE_KEY
  };
  private supabase: SupabaseClient | null = null;
  public isConnected: boolean = false;
  public statusMessage: string = 'Инициализация...';
  private listeners: Array<(users: UserProfile[]) => void> = [];

  constructor() {
    this.loadConfig();
    this.initProvider();
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_CLOUD_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.provider === 'supabase' && parsed.supabaseUrl && parsed.supabaseAnonKey) {
          this.config = parsed;
          return;
        }
      }
    } catch {
      // Ignore
    }

    // Default to production Supabase cloud database
    this.config = {
      provider: 'supabase',
      supabaseUrl: DEFAULT_SUPABASE_URL,
      supabaseAnonKey: DEFAULT_SUPABASE_KEY
    };
  }

  public saveConfig(newConfig: CloudConfig) {
    this.config = newConfig;
    try {
      localStorage.setItem(STORAGE_CLOUD_CONFIG_KEY, JSON.stringify(newConfig));
    } catch {
      // Ignore
    }
    this.initProvider();
  }

  public getConfig(): CloudConfig {
    return { ...this.config };
  }

  private initProvider() {
    this.supabase = null;
    this.isConnected = false;

    if (this.config.provider === 'supabase' && this.config.supabaseUrl && this.config.supabaseAnonKey) {
      try {
        this.supabase =
          this.config.supabaseUrl === SUPABASE_URL && this.config.supabaseAnonKey === SUPABASE_ANON_KEY
            ? sharedSupabase
            : createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);
        this.isConnected = true;
        this.statusMessage = 'Подключено к Supabase (PostgreSQL Cloud)';
      } catch (err) {
        this.isConnected = false;
        this.statusMessage = 'Ошибка подключения к Supabase';
        console.warn('Supabase init error:', err);
      }
    } else if (this.config.provider === 'firebase' && this.config.firebaseDbUrl) {
      this.isConnected = true;
      this.statusMessage = 'Подключено к Firebase Realtime DB';
    } else {
      this.isConnected = false;
      this.statusMessage = 'Облачный сервер ожидает настройки учетных данных';
    }
  }

  /**
   * Fetches the global synchronized leaderboard from cloud
   */
  public async fetchGlobalPlayers(): Promise<UserProfile[] | null> {
    // 1. Supabase Postgres backend
    if (this.supabase && this.config.provider === 'supabase') {
      try {
        const { data, error } = await this.supabase
          .from('kiral_players')
          .select('*')
          .neq('auth_provider', 'guest')
          .order('elo', { ascending: false })
          .limit(100);

        if (error) {
          console.warn('Supabase fetch players warning:', error.message);
          return null;
        }

        if (data && Array.isArray(data)) {
          return data
            .filter((row) => row.auth_provider !== 'guest' && row.username !== 'Игрок')
            .map((row) => ({
              id: row.id,
              username: row.username,
              isRegistered: true,
              elo: Number(row.elo) || 100,
              puzzlePoints: Number(row.puzzle_points) || 0,
              solvedPuzzleIds: Array.isArray(row.solved_puzzles) ? row.solved_puzzles : [],
              friends: [],
              stats: {
                wins: Number(row.wins) || 0,
                losses: Number(row.losses) || 0,
                draws: Number(row.draws) || 0,
                totalGames: Number(row.total_games) || 0
              },
              authProvider: row.auth_provider || 'custom',
              avatarUrl: row.avatar_url,
              createdAt: row.created_at || new Date().toISOString().slice(0, 10),
              lastActiveAt: row.last_active_at
            }));
        }
      } catch (err) {
        console.warn('Supabase query failed:', err);
        return null;
      }
    }

    // 2. Firebase Realtime Database
    if (this.config.provider === 'firebase' && this.config.firebaseDbUrl) {
      try {
        const url = `${this.config.firebaseDbUrl.replace(/\/$/, '')}/kiral_players.json`;
        const res = await fetch(url);
        if (res.ok) {
          const raw = await res.json();
          if (raw && typeof raw === 'object') {
            return Object.values(raw) as UserProfile[];
          }
        }
      } catch (err) {
        console.warn('Firebase query failed:', err);
        return null;
      }
    }

    // 3. Custom REST Endpoint
    if (this.config.provider === 'rest' && this.config.restEndpoint) {
      try {
        const res = await fetch(this.config.restEndpoint);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) return list as UserProfile[];
        }
      } catch (err) {
        console.warn('REST query failed:', err);
        return null;
      }
    }

    return null;
  }

  /**
   * Upserts the player's updated profile to the central cloud database
   */
  public async syncPlayer(user: UserProfile): Promise<boolean> {
    if (!user || !user.id || !user.isRegistered || user.authProvider === 'guest') {
      return false;
    }

    // 1. Supabase Postgres
    if (this.supabase && this.config.provider === 'supabase') {
      try {
        const { error } = await this.supabase.from('kiral_players').upsert(
          {
            id: user.id,
            username: user.username,
            elo: user.elo,
            puzzle_points: user.puzzlePoints,
            solved_puzzles: user.solvedPuzzleIds,
            wins: user.stats.wins,
            losses: user.stats.losses,
            draws: user.stats.draws,
            total_games: user.stats.totalGames,
            auth_provider: user.authProvider || 'custom',
            avatar_url: user.avatarUrl || null,
            last_active_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );

        if (error) {
          console.warn('Supabase sync error:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.warn('Supabase sync exception:', err);
        return false;
      }
    }

    // 2. Firebase Realtime Database
    if (this.config.provider === 'firebase' && this.config.firebaseDbUrl) {
      try {
        const url = `${this.config.firebaseDbUrl.replace(/\/$/, '')}/kiral_players/${encodeURIComponent(
          user.id
        )}.json`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
        return res.ok;
      } catch (err) {
        console.warn('Firebase sync exception:', err);
        return false;
      }
    }

    // 3. Custom REST Endpoint
    if (this.config.provider === 'rest' && this.config.restEndpoint) {
      try {
        const res = await fetch(this.config.restEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
        return res.ok;
      } catch (err) {
        console.warn('REST sync exception:', err);
        return false;
      }
    }

    return false;
  }

  public subscribe(listener: (users: UserProfile[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public notifyListeners(users: UserProfile[]) {
    this.listeners.forEach((l) => l(users));
  }
}

export const cloudDatabase = new CloudDatabaseService();
