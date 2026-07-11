export interface JournalEntry {
  id: string; createdAt: number; trigger: string; admitText: string;
  nameText: string; ventText: string; reassureText: string; partLabel: string;
}
export interface CoachMessage {
  id: string; entryId: string; role: 'user' | 'assistant'; content: string; createdAt: number;
}
export interface Belief {
  id: string; createdAt: number; limitingBelief: string; source: string; empoweringBelief: string; mantra: string;
}
export interface MeditationSession {
  id: string; createdAt: number; scriptId: string; durationSec: number; completed: boolean;
}
export type DeepseekModel = 'deepseek-chat' | 'deepseek-reasoner';
