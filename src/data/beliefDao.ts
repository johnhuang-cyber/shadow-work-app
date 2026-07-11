import { Platform } from 'react-native';
import { getDb, genId } from './db';
import * as web from './webStore';
import type { Belief } from '../types';

const isWeb = Platform.OS === 'web';

export async function addBelief(b: Omit<Belief, 'id' | 'createdAt'>): Promise<void> {
  if (isWeb) return web.addBelief(b);
  const db = await getDb();
  await db.runAsync(`INSERT INTO beliefs (id,createdAt,limitingBelief,source,empoweringBelief,mantra) VALUES (?,?,?,?,?,?)`, [genId(), Date.now(), b.limitingBelief, b.source, b.empoweringBelief, b.mantra]);
}

export async function listBeliefs(): Promise<Belief[]> {
  if (isWeb) return web.listBeliefs();
  const db = await getDb();
  return db.getAllAsync<Belief>(`SELECT * FROM beliefs ORDER BY createdAt DESC`);
}
