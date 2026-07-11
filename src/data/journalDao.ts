import { Platform } from 'react-native';
import { getDb, genId } from './db';
import * as web from './webStore';
import type { JournalEntry, CoachMessage } from '../types';

const isWeb = Platform.OS === 'web';

export async function createEntry(): Promise<JournalEntry> {
  if (isWeb) return web.createEntry();
  const e: JournalEntry = { id: genId(), createdAt: Date.now(), trigger: '', admitText: '', nameText: '', ventText: '', reassureText: '', partLabel: '' };
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO journal_entries (id,createdAt,trigger,admitText,nameText,ventText,reassureText,partLabel) VALUES (?,?,?,?,?,?,?,?)`,
    [e.id, e.createdAt, e.trigger, e.admitText, e.nameText, e.ventText, e.reassureText, e.partLabel]
  );
  return e;
}

export async function saveEntry(e: JournalEntry): Promise<void> {
  if (isWeb) return web.saveEntry(e);
  const db = await getDb();
  await db.runAsync(
    `UPDATE journal_entries SET trigger=?,admitText=?,nameText=?,ventText=?,reassureText=?,partLabel=? WHERE id=?`,
    [e.trigger, e.admitText, e.nameText, e.ventText, e.reassureText, e.partLabel, e.id]
  );
}

export async function getEntry(id: string): Promise<JournalEntry | null> {
  if (isWeb) return web.getEntry(id);
  const db = await getDb();
  return db.getFirstAsync<JournalEntry>(`SELECT * FROM journal_entries WHERE id=?`, [id]);
}

export async function listEntries(): Promise<JournalEntry[]> {
  if (isWeb) return web.listEntries();
  const db = await getDb();
  return db.getAllAsync<JournalEntry>(`SELECT * FROM journal_entries ORDER BY createdAt DESC`);
}

export async function addCoachMessage(m: Omit<CoachMessage, 'id' | 'createdAt'>): Promise<void> {
  if (isWeb) return web.addCoachMessage(m);
  const db = await getDb();
  await db.runAsync(`INSERT INTO coach_messages (id,entryId,role,content,createdAt) VALUES (?,?,?,?,?)`, [genId(), m.entryId, m.role, m.content, Date.now()]);
}

export async function deleteCoachMessage(id: string): Promise<void> {
  if (isWeb) return web.deleteCoachMessage(id);
  const db = await getDb();
  await db.runAsync(`DELETE FROM coach_messages WHERE id=?`, [id]);
}

export async function listCoachMessages(entryId: string): Promise<CoachMessage[]> {
  if (isWeb) return web.listCoachMessages(entryId);
  const db = await getDb();
  return db.getAllAsync<CoachMessage>(`SELECT * FROM coach_messages WHERE entryId=? ORDER BY createdAt ASC`, [entryId]);
}
