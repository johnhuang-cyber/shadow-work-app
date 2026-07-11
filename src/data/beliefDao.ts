import { getDb, genId } from './db';
import type { Belief } from '../types';

export async function addBelief(b: Omit<Belief, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(`INSERT INTO beliefs (id,createdAt,limitingBelief,source,empoweringBelief,mantra) VALUES (?,?,?,?,?,?)`, [genId(), Date.now(), b.limitingBelief, b.source, b.empoweringBelief, b.mantra]);
}

export async function listBeliefs(): Promise<Belief[]> {
  const db = await getDb();
  return db.getAllAsync<Belief>(`SELECT * FROM beliefs ORDER BY createdAt DESC`);
}
