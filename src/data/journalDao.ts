import { getDb, genId } from './db';
import type { JournalEntry, CoachMessage } from '../types';

export async function createEntry(): Promise<JournalEntry> {
  const e: JournalEntry = { id: genId(), createdAt: Date.now(), trigger: '', admitText: '', nameText: '', ventText: '', reassureText: '', partLabel: '' };
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO journal_entries (id,createdAt,trigger,admitText,nameText,ventText,reassureText,partLabel) VALUES (?,?,?,?,?,?,?,?)`,
    [e.id, e.createdAt, e.trigger, e.admitText, e.nameText, e.ventText, e.reassureText, e.partLabel]
  );
  return e;
}

export async function saveEntry(e: JournalEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE journal_entries SET trigger=?,admitText=?,nameText=?,ventText=?,reassureText=?,partLabel=? WHERE id=?`,
    [e.trigger, e.admitText, e.nameText, e.ventText, e.reassureText, e.partLabel, e.id]
  );
}

export async function getEntry(id: string): Promise<JournalEntry | null> {
  const db = await getDb();
  return db.getFirstAsync<JournalEntry>(`SELECT * FROM journal_entries WHERE id=?`, [id]);
}

export async function listEntries(): Promise<JournalEntry[]> {
  const db = await getDb();
  return db.getAllAsync<JournalEntry>(`SELECT * FROM journal_entries ORDER BY createdAt DESC`);
}

export async function addCoachMessage(m: Omit<CoachMessage, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(`INSERT INTO coach_messages (id,entryId,role,content,createdAt) VALUES (?,?,?,?,?)`, [genId(), m.entryId, m.role, m.content, Date.now()]);
}

export async function listCoachMessages(entryId: string): Promise<CoachMessage[]> {
  const db = await getDb();
  return db.getAllAsync<CoachMessage>(`SELECT * FROM coach_messages WHERE entryId=? ORDER BY createdAt ASC`, [entryId]);
}
