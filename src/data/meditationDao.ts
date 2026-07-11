import { Platform } from 'react-native';
import { getDb, genId } from './db';
import * as web from './webStore';
import type { MeditationSession } from '../types';

const isWeb = Platform.OS === 'web';

export async function addSession(s: Omit<MeditationSession, 'id' | 'createdAt'>): Promise<void> {
  if (isWeb) return web.addSession(s);
  const db = await getDb();
  await db.runAsync(`INSERT INTO meditation_sessions (id,createdAt,scriptId,durationSec,completed) VALUES (?,?,?,?,?)`, [genId(), Date.now(), s.scriptId, s.durationSec, s.completed ? 1 : 0]);
}

export async function listSessions(): Promise<MeditationSession[]> {
  if (isWeb) return web.listSessions();
  const db = await getDb();
  // SQLite 把 completed 存为 0/1，读回来要映射回 boolean，以符合 MeditationSession 的类型契约。
  const rows = await db.getAllAsync<Omit<MeditationSession, 'completed'> & { completed: number }>(
    `SELECT * FROM meditation_sessions ORDER BY createdAt DESC`
  );
  return rows.map(r => ({ ...r, completed: r.completed === 1 }));
}
