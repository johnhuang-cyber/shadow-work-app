/**
 * @jest-environment node
 */
import { dailyQuote, themeQuote, dayOfYear } from '../src/domain/quotePick';
import { QUOTES, type Quote } from '../src/content/quotes';

const FIXTURE: Quote[] = [
  { id: 'a', zh: '甲', en: 'A', theme: 'shadow' },
  { id: 'b', zh: '乙', en: 'B', theme: 'acceptance' },
  { id: 'c', zh: '丙', en: 'C', theme: 'shadow' },
  { id: 'd', zh: '丁', en: 'D', theme: 'presence' },
];

describe('dayOfYear', () => {
  test('1 月 1 日是第 1 天，12 月 31 日是第 365 天（平年）', () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365);
  });
});

describe('dailyQuote', () => {
  test('同一天永远返回同一句（确定性）', () => {
    const d = new Date(2026, 6, 11, 9, 30);
    const again = new Date(2026, 6, 11, 23, 59);
    expect(dailyQuote(d, QUOTES)).toBe(dailyQuote(again, QUOTES));
  });

  test('按年内天数取模索引', () => {
    // 2026-01-01 是第 1 天 → 1 % 4 = 1 → 'b'
    expect(dailyQuote(new Date(2026, 0, 1), FIXTURE).id).toBe('b');
    // 2026-01-04 是第 4 天 → 4 % 4 = 0 → 'a'
    expect(dailyQuote(new Date(2026, 0, 4), FIXTURE).id).toBe('a');
  });

  test('相邻两天轮换到不同的句子', () => {
    const q1 = dailyQuote(new Date(2026, 2, 3), QUOTES);
    const q2 = dailyQuote(new Date(2026, 2, 4), QUOTES);
    expect(q1.id).not.toBe(q2.id);
  });
});

describe('themeQuote', () => {
  test('只从指定主题里挑选', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(themeQuote('acceptance', QUOTES, seed).theme).toBe('acceptance');
      expect(themeQuote('shadow', QUOTES, seed).theme).toBe('shadow');
      expect(themeQuote('presence', QUOTES, seed).theme).toBe('presence');
    }
  });

  test('同一 seed 返回同一句（纯函数）', () => {
    expect(themeQuote('belief', QUOTES, 7)).toBe(themeQuote('belief', QUOTES, 7));
  });

  test('seed 变化会轮换句子', () => {
    // fixture 里 shadow 有两句：seed 0 → 'a'，seed 1 → 'c'
    expect(themeQuote('shadow', FIXTURE, 0).id).toBe('a');
    expect(themeQuote('shadow', FIXTURE, 1).id).toBe('c');
    // 真实语录库：每个主题 ≥6 句，相邻 seed 必然不同
    expect(themeQuote('frequency', QUOTES, 0).id).not.toBe(themeQuote('frequency', QUOTES, 1).id);
  });

  test('负数 seed 也不越界', () => {
    expect(themeQuote('presence', QUOTES, -3).theme).toBe('presence');
  });
});
