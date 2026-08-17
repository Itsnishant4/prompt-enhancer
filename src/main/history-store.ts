import { app } from 'electron';
import path from 'path';
import type { HistoryEntry } from '@shared/types';
import { validateHistorySearch } from '@shared/schemas';

export class HistoryStore {
  private static instance: HistoryStore;
  private changeListeners: Set<() => void> = new Set();
  
  private db: any = null;
  private stmtInsert: any = null;
  private stmtGetAll: any = null;
  private stmtSearch: any = null;
  private stmtDelete: any = null;
  private stmtClear: any = null;
  private stmtCount: any = null;

  // Prepared statements for credentials
  private stmtGetCredential: any = null;
  private stmtSetCredential: any = null;
  private stmtDeleteCredential: any = null;

  static getInstance(): HistoryStore {
    if (!HistoryStore.instance) {
      HistoryStore.instance = new HistoryStore();
    }
    return HistoryStore.instance;
  }

  private initDb(): void {
    if (this.db) return;

    try {
      const Database = require('better-sqlite3');
      const dbPath = path.join(app.getPath('userData'), 'history.db');
      this.db = new Database(dbPath);

      // Optimize database parameters for minimum disk write & lower memory overhead
      this.db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA cache_size = -2000;
        PRAGMA temp_store = MEMORY;
        PRAGMA synchronous = NORMAL;

        CREATE TABLE IF NOT EXISTS enhancements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_text TEXT NOT NULL,
          enhanced_text TEXT NOT NULL,
          model_used TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS credentials (
          provider TEXT PRIMARY KEY,
          encrypted_key TEXT NOT NULL,
          iv TEXT NOT NULL,
          tag TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS stats (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_created_at ON enhancements(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_search ON enhancements(original_text, enhanced_text);
      `);

      this.stmtInsert = this.db.prepare(`
        INSERT INTO enhancements (original_text, enhanced_text, model_used, created_at)
        VALUES (?, ?, ?, ?)
      `);

      this.stmtGetAll = this.db.prepare(`
        SELECT * FROM enhancements ORDER BY created_at DESC LIMIT ? OFFSET ?
      `);

      this.stmtSearch = this.db.prepare(`
        SELECT * FROM enhancements 
        WHERE original_text LIKE ? OR enhanced_text LIKE ?
        ORDER BY created_at DESC LIMIT ?
      `);

      this.stmtDelete = this.db.prepare('DELETE FROM enhancements WHERE id = ?');
      this.stmtClear = this.db.prepare('DELETE FROM enhancements');
      this.stmtCount = this.db.prepare('SELECT COUNT(*) as count FROM enhancements');

      this.stmtGetCredential = this.db.prepare('SELECT * FROM credentials WHERE provider = ?');
      this.stmtSetCredential = this.db.prepare(`
        INSERT OR REPLACE INTO credentials (provider, encrypted_key, iv, tag, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      this.stmtDeleteCredential = this.db.prepare('DELETE FROM credentials WHERE provider = ?');
    } catch (err) {
      console.error('Failed to initialize history database:', err);
    }
  }

  add(entry: Omit<HistoryEntry, 'id'>): number {
    this.initDb();
    if (!this.stmtInsert) return -1;
    const result = this.stmtInsert.run(
      entry.original_text,
      entry.enhanced_text,
      entry.model_used,
      entry.created_at
    );
    this.notifyChanges();
    return result.lastInsertRowid as number;
  }

  get(limit = 50, offset = 0): HistoryEntry[] {
    this.initDb();
    if (!this.stmtGetAll) return [];
    return this.stmtGetAll.all(limit, offset) as HistoryEntry[];
  }

  search(query: string, limit = 20): HistoryEntry[] {
    this.initDb();
    if (!this.stmtSearch) return [];
    const searchTerm = `%${query}%`;
    return this.stmtSearch.all(searchTerm, searchTerm, limit) as HistoryEntry[];
  }

  getWithSearch(params: { query?: string; limit?: number; offset?: number }): HistoryEntry[] {
    this.initDb();
    const { query, limit = 50, offset = 0 } = validateHistorySearch(params);
    if (query?.trim()) {
      return this.search(query, limit);
    }
    return this.get(limit, offset);
  }

  delete(id: number): boolean {
    this.initDb();
    if (!this.stmtDelete) return false;
    const result = this.stmtDelete.run(id);
    this.notifyChanges();
    return result.changes > 0;
  }

  clear(): number {
    this.initDb();
    if (!this.stmtClear) return 0;
    const result = this.stmtClear.run();
    this.setStat('fallback_count', '0');
    this.notifyChanges();
    return result.changes;
  }

  getStat(key: string, defaultValue: string): string {
    this.initDb();
    try {
      const stmt = this.db.prepare('SELECT value FROM stats WHERE key = ?');
      const result = stmt.get(key);
      return result ? result.value : defaultValue;
    } catch (err) {
      console.error(`Failed to get stat ${key}:`, err);
      return defaultValue;
    }
  }

  setStat(key: string, value: string): void {
    this.initDb();
    try {
      const stmt = this.db.prepare('INSERT OR REPLACE INTO stats (key, value) VALUES (?, ?)');
      stmt.run(key, value);
      this.notifyChanges();
    } catch (err) {
      console.error(`Failed to set stat ${key}:`, err);
    }
  }

  getFallbackCount(): number {
    return parseInt(this.getStat('fallback_count', '0'), 10);
  }

  incrementFallbackCount(by = 1): void {
    const current = this.getFallbackCount();
    this.setStat('fallback_count', String(current + by));
  }

  getStats(): { totalRuns: number; fallbackCount: number; timeSavedMinutes: number } {
    this.initDb();
    const totalRuns = this.getCount();
    const fallbackCount = this.getFallbackCount();
    const timeSavedMinutes = Math.round(totalRuns * 1.5);
    return {
      totalRuns,
      fallbackCount,
      timeSavedMinutes,
    };
  }

  getCount(): number {
    this.initDb();
    if (!this.stmtCount) return 0;
    const result = this.stmtCount.get() as { count: number };
    return result.count;
  }

  // Credentials methods
  getCredential(provider: string): { encrypted_key: string; iv: string; tag: string } | null {
    this.initDb();
    if (!this.stmtGetCredential) return null;
    return this.stmtGetCredential.get(provider) || null;
  }

  setCredential(provider: string, encrypted: string, iv: string, tag: string): void {
    this.initDb();
    if (!this.stmtSetCredential) return;
    this.stmtSetCredential.run(provider, encrypted, iv, tag, Date.now());
  }

  deleteCredential(provider: string): void {
    this.initDb();
    if (!this.stmtDeleteCredential) return;
    this.stmtDeleteCredential.run(provider);
  }

  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChanges(): void {
    this.changeListeners.forEach(listener => listener());
  }
}

export const historyStore = HistoryStore.getInstance();