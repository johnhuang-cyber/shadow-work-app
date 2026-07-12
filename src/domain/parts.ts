import type { JournalEntry } from '../types';

export interface PartSummary {
  /** 用户给内在部分起的名字（已去除首尾空白）。 */
  label: string;
  /** 这个部分被看见（记录）的次数。 */
  count: number;
  /** 最近一次被记录的时间（createdAt 的最大值）。 */
  lastSeen: number;
}

/**
 * 从日记条目里汇总「内在部分」：按去除空白后的 partLabel 分组，
 * 忽略未命名的条目；按出现次数降序，次数相同再按最近出现时间降序。
 */
export function derivePartsSummary(entries: JournalEntry[]): PartSummary[] {
  const byLabel = new Map<string, PartSummary>();
  for (const e of entries) {
    const label = (e.partLabel ?? '').trim();
    if (!label) continue;
    const cur = byLabel.get(label);
    if (cur) {
      cur.count += 1;
      cur.lastSeen = Math.max(cur.lastSeen, e.createdAt);
    } else {
      byLabel.set(label, { label, count: 1, lastSeen: e.createdAt });
    }
  }
  return [...byLabel.values()].sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen);
}
