// Web 开发预览用的 localStorage 存储回退（expo-sqlite 在 Web 上支持不完整）。
// 真机（iOS/Android）不会用到本文件——DAO 只在 Platform.OS === 'web' 时委托到这里。
import { genId } from './db';
import type { JournalEntry, CoachMessage, Belief, MeditationSession } from '../types';

const K = { journal: 'sw_journal', coach: 'sw_coach', beliefs: 'sw_beliefs', med: 'sw_med' };
const ls = (): Storage | undefined => (globalThis as any).localStorage;

function read<T>(key: string): T[] {
  try {
    return JSON.parse(ls()?.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}
function write<T>(key: string, rows: T[]): void {
  ls()?.setItem(key, JSON.stringify(rows));
}

// journal
export function createEntry(): JournalEntry {
  const e: JournalEntry = {
    id: genId(), createdAt: Date.now(), trigger: '', admitText: '',
    nameText: '', ventText: '', reassureText: '', partLabel: '',
  };
  const rows = read<JournalEntry>(K.journal);
  rows.push(e);
  write(K.journal, rows);
  return e;
}
export function saveEntry(e: JournalEntry): void {
  write(K.journal, read<JournalEntry>(K.journal).map(r => (r.id === e.id ? e : r)));
}
export function getEntry(id: string): JournalEntry | null {
  return read<JournalEntry>(K.journal).find(r => r.id === id) ?? null;
}
export function listEntries(): JournalEntry[] {
  return read<JournalEntry>(K.journal).sort((a, b) => b.createdAt - a.createdAt);
}
export function addCoachMessage(m: Omit<CoachMessage, 'id' | 'createdAt'>): void {
  const rows = read<CoachMessage>(K.coach);
  rows.push({ ...m, id: genId(), createdAt: Date.now() });
  write(K.coach, rows);
}
export function listCoachMessages(entryId: string): CoachMessage[] {
  return read<CoachMessage>(K.coach)
    .filter(r => r.entryId === entryId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

// beliefs
export function addBelief(b: Omit<Belief, 'id' | 'createdAt'>): void {
  const rows = read<Belief>(K.beliefs);
  rows.push({ ...b, id: genId(), createdAt: Date.now() });
  write(K.beliefs, rows);
}
export function listBeliefs(): Belief[] {
  return read<Belief>(K.beliefs).sort((a, b) => b.createdAt - a.createdAt);
}

// meditation
export function addSession(s: Omit<MeditationSession, 'id' | 'createdAt'>): void {
  const rows = read<MeditationSession>(K.med);
  rows.push({ ...s, id: genId(), createdAt: Date.now() });
  write(K.med, rows);
}
export function listSessions(): MeditationSession[] {
  return read<MeditationSession>(K.med).sort((a, b) => b.createdAt - a.createdAt);
}
