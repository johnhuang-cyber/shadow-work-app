/**
 * @jest-environment node
 */
// 语录库内容完整性：确保精选内容干净（无访谈痕迹）、主题覆盖充分。
import { QUOTES, type QuoteTheme } from '../src/content/quotes';

const THEMES: QuoteTheme[] = ['shadow', 'acceptance', 'frequency', 'belief', 'presence'];

test('数量在 40–60 之间', () => {
  expect(QUOTES.length).toBeGreaterThanOrEqual(40);
  expect(QUOTES.length).toBeLessThanOrEqual(60);
});

test('每一句都有非空的 zh / en 与合法主题', () => {
  for (const q of QUOTES) {
    expect(q.zh.trim().length).toBeGreaterThan(0);
    expect(q.en.trim().length).toBeGreaterThan(0);
    expect(THEMES).toContain(q.theme);
  }
});

test('zh 不含访谈痕迹（>> 与 教练：）', () => {
  for (const q of QUOTES) {
    expect(q.zh).not.toContain('>>');
    expect(q.zh).not.toContain('教练：');
  }
});

test('每个主题至少 6 句', () => {
  for (const theme of THEMES) {
    const count = QUOTES.filter((q) => q.theme === theme).length;
    expect(count).toBeGreaterThanOrEqual(6);
  }
});

test('id 唯一', () => {
  const ids = QUOTES.map((q) => q.id);
  expect(new Set(ids).size).toBe(ids.length);
});
