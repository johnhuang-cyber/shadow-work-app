import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('shadowwork.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY, createdAt INTEGER, trigger TEXT, admitText TEXT, nameText TEXT, ventText TEXT, reassureText TEXT, partLabel TEXT
    );
    CREATE TABLE IF NOT EXISTS coach_messages (
      id TEXT PRIMARY KEY, entryId TEXT, role TEXT, content TEXT, createdAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS beliefs (
      id TEXT PRIMARY KEY, createdAt INTEGER, limitingBelief TEXT, source TEXT, empoweringBelief TEXT, mantra TEXT
    );
    CREATE TABLE IF NOT EXISTS meditation_sessions (
      id TEXT PRIMARY KEY, createdAt INTEGER, scriptId TEXT, durationSec INTEGER, completed INTEGER
    );
  `);
  return _db;
}

export const genId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
