import { getDb, genId } from './db';
import type { MeditationSession } from '../types';

export async function addSession(s: Omit<MeditationSession, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(`INSERT INTO meditation_sessions (id,createdAt,scriptId,durationSec,completed) VALUES (?,?,?,?,?)`, [genId(), Date.now(), s.scriptId, s.durationSec, s.completed ? 1 : 0]);
}

export async function listSessions(): Promise<MeditationSession[]> {
  const db = await getDb();
  return db.getAllAsync<MeditationSession>(`SELECT * FROM meditation_sessions ORDER BY createdAt DESC`);
}
