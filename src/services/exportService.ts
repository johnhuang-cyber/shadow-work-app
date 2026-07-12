import type { JournalEntry, CoachMessage, Belief, MeditationSession } from '../types';

export interface ExportData {
  entries: JournalEntry[];
  messagesByEntry: Record<string, CoachMessage[]>;
  beliefs: Belief[];
  sessions: MeditationSession[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 本地时间，形如 2026-07-12 09:30。 */
const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 把全部本地数据整理成一份可读的中文 Markdown（纯函数，方便测试）。 */
export function formatExportMarkdown({ entries, messagesByEntry, beliefs, sessions }: ExportData): string {
  const lines: string[] = ['# 频率 · 我的数据', '', `导出时间：${fmtTime(Date.now())}`, ''];

  // ——— 阴影日记 ———
  lines.push('## 阴影日记', '');
  if (entries.length === 0) {
    lines.push('还没有日记。', '');
  } else {
    for (const e of entries) {
      lines.push(`### ${fmtTime(e.createdAt)}`, '');
      const fields: [string, string][] = [
        ['触发点', e.trigger],
        ['看见', e.admitText],
        ['宣泄', e.ventText],
        ['安抚', e.reassureText],
        ['命名的部分', e.partLabel],
      ];
      for (const [label, text] of fields) {
        if (text?.trim()) lines.push(`- ${label}：${text.trim()}`);
      }
      const msgs = messagesByEntry[e.id] ?? [];
      if (msgs.length > 0) {
        lines.push('', '与教练的对话：', '');
        for (const m of msgs) {
          lines.push(`> ${m.role === 'user' ? '我' : '教练'}：${m.content}`);
        }
      }
      lines.push('');
    }
  }

  // ——— 频率卡 ———
  lines.push('## 频率卡', '');
  if (beliefs.length === 0) {
    lines.push('还没有频率卡。', '');
  } else {
    for (const b of beliefs) {
      lines.push(`### ${b.mantra || b.empoweringBelief}`, '');
      if (b.limitingBelief?.trim()) lines.push(`- 旧信念：${b.limitingBelief.trim()}`);
      if (b.empoweringBelief?.trim()) lines.push(`- 新信念：${b.empoweringBelief.trim()}`);
      lines.push('');
    }
  }

  // ——— 冥想记录 ———
  lines.push('## 冥想记录', '');
  if (sessions.length === 0) {
    lines.push('还没有冥想记录。', '');
  } else {
    lines.push(`共 ${sessions.length} 次。`, '');
    for (const s of sessions.slice(0, 20)) {
      const min = Math.max(1, Math.round(s.durationSec / 60));
      lines.push(`- ${fmtTime(s.createdAt)} · ${min} 分钟${s.completed ? ' · 已完成' : ''}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 汇总本地全部数据 → Markdown → 交给系统分享/下载。
 * 原生端写入缓存目录后调起分享面板；Web 端直接触发浏览器下载。
 */
export async function exportAllData(): Promise<void> {
  let markdown: string;
  try {
    const [{ listEntries, listCoachMessages }, { listBeliefs }, { listSessions }] = await Promise.all([
      import('../data/journalDao'),
      import('../data/beliefDao'),
      import('../data/meditationDao'),
    ]);
    const [entries, beliefs, sessions] = await Promise.all([listEntries(), listBeliefs(), listSessions()]);
    const messagesByEntry: Record<string, CoachMessage[]> = {};
    for (const e of entries) {
      const msgs = await listCoachMessages(e.id);
      if (msgs.length > 0) messagesByEntry[e.id] = msgs;
    }
    markdown = formatExportMarkdown({ entries, messagesByEntry, beliefs, sessions });
  } catch {
    throw new Error('整理数据时出了点问题，请稍后再试。');
  }

  const d = new Date();
  const fileName = `pinlv-export-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.md`;

  const { Platform } = await import('react-native');
  if (Platform.OS === 'web') {
    try {
      if (typeof document === 'undefined') throw new Error('no document');
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    } catch {
      throw new Error('浏览器下载没有成功，请换个浏览器再试。');
    }
  }

  try {
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');
    const uri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(uri, markdown, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri, { mimeType: 'text/markdown', dialogTitle: '导出我的数据' });
  } catch {
    throw new Error('导出没有成功，请稍后再试。');
  }
}
