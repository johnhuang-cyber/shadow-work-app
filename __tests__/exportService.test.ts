/**
 * @jest-environment node
 */
import { formatExportMarkdown } from '../src/services/exportService';
import type { JournalEntry, CoachMessage, Belief, MeditationSession } from '../src/types';

const T1 = new Date(2026, 6, 10, 9, 30).getTime();
const T2 = new Date(2026, 6, 11, 20, 15).getTime();

const entryA: JournalEntry = {
  id: 'e1', createdAt: T1,
  trigger: '开会时被打断', admitText: '我感到委屈', nameText: '',
  ventText: '为什么总是这样', reassureText: '谢谢你保护我', partLabel: '怕被忽视的小孩',
};
const entryB: JournalEntry = {
  id: 'e2', createdAt: T2,
  trigger: '', admitText: '有点累', nameText: '',
  ventText: '', reassureText: '', partLabel: '',
};

const msgs: Record<string, CoachMessage[]> = {
  e1: [
    { id: 'm1', entryId: 'e1', role: 'user', content: '我总觉得自己不重要', createdAt: T1 + 1 },
    { id: 'm2', entryId: 'e1', role: 'assistant', content: '我在听，慢慢说。', createdAt: T1 + 2 },
  ],
};

const beliefs: Belief[] = [
  { id: 'b1', createdAt: T1, limitingBelief: '我不擅长理财', source: '小时候被否定', empoweringBelief: '我可以慢慢学会打理自己的钱', mantra: '每天进步一点点' },
];

const sessions: MeditationSession[] = [
  { id: 's1', createdAt: T2, scriptId: 'grounding', durationSec: 300, completed: true },
];

test('包含标题、日记文本、命名的部分与频率卡内容', () => {
  const md = formatExportMarkdown({ entries: [entryA], messagesByEntry: msgs, beliefs, sessions });
  expect(md).toContain('# 频率 · 我的数据');
  expect(md).toContain('导出时间');
  expect(md).toContain('开会时被打断');
  expect(md).toContain('我感到委屈');
  expect(md).toContain('为什么总是这样');
  expect(md).toContain('谢谢你保护我');
  expect(md).toContain('怕被忽视的小孩');
  expect(md).toContain('我不擅长理财');
  expect(md).toContain('我可以慢慢学会打理自己的钱');
  expect(md).toContain('每天进步一点点');
});

test('对话按引用行归组到对应日记下，空字段不输出', () => {
  const md = formatExportMarkdown({ entries: [entryA, entryB], messagesByEntry: msgs, beliefs: [], sessions: [] });
  // e1 的对话在 e1 段落里（出现在 e2 段落之前——entries 顺序保持）
  const idxDialog = md.indexOf('我总觉得自己不重要');
  const idxEntryB = md.indexOf('有点累');
  expect(idxDialog).toBeGreaterThan(-1);
  expect(idxEntryB).toBeGreaterThan(idxDialog);
  // 引用行格式
  expect(md).toMatch(/> 我：我总觉得自己不重要/);
  expect(md).toMatch(/> 教练：我在听，慢慢说。/);
  // entryB 只有「看见」，不应出现空的触发点/宣泄/安抚标签行
  const entryBSection = md.slice(Math.max(0, idxEntryB - 200), idxEntryB + 100);
  expect(entryBSection).toContain('看见');
  expect(md.split('触发点').length).toBe(2); // 只有 entryA 的一处
});

test('冥想记录含次数与列表', () => {
  const md = formatExportMarkdown({ entries: [], messagesByEntry: {}, beliefs: [], sessions });
  expect(md).toContain('冥想记录');
  expect(md).toMatch(/共\s*1\s*次/);
  expect(md).toContain('5 分钟');
});

test('空数据也能优雅导出', () => {
  const md = formatExportMarkdown({ entries: [], messagesByEntry: {}, beliefs: [], sessions: [] });
  expect(md).toContain('# 频率 · 我的数据');
  expect(md).toContain('还没有');
});
