/**
 * @jest-environment node
 */
import { derivePartsSummary } from '../src/domain/parts';
import type { JournalEntry } from '../src/types';

const entry = (partLabel: string, createdAt: number): JournalEntry => ({
  id: `id-${createdAt}-${partLabel}`,
  createdAt,
  trigger: '',
  admitText: '',
  nameText: '',
  ventText: '',
  reassureText: '',
  partLabel,
});

test('空数组返回空', () => {
  expect(derivePartsSummary([])).toEqual([]);
});

test('忽略空 / 纯空白的 partLabel', () => {
  expect(derivePartsSummary([entry('', 1), entry('   ', 2)])).toEqual([]);
});

test('按去除首尾空白后的名字分组，统计次数与最近一次时间', () => {
  const result = derivePartsSummary([
    entry('怕被忽视的小孩', 100),
    entry(' 怕被忽视的小孩 ', 300),
    entry('完美主义者', 200),
  ]);
  expect(result).toEqual([
    { label: '怕被忽视的小孩', count: 2, lastSeen: 300 },
    { label: '完美主义者', count: 1, lastSeen: 200 },
  ]);
});

test('先按次数降序，次数相同再按 lastSeen 降序', () => {
  const result = derivePartsSummary([
    entry('A', 100),
    entry('B', 500),
    entry('C', 200),
    entry('C', 300),
  ]);
  expect(result.map((p) => p.label)).toEqual(['C', 'B', 'A']);
  expect(result[0]).toEqual({ label: 'C', count: 2, lastSeen: 300 });
});
