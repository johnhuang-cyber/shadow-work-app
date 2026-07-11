/**
 * @jest-environment node
 */
import { createSseAccumulator } from '../src/ai/sse';
test('从 OpenAI 兼容 SSE 行提取增量内容', () => {
  const acc = createSseAccumulator();
  expect(acc.push('data: {"choices":[{"delta":{"content":"你"}}]}\n\n')).toBe('你');
  expect(acc.push('data: {"choices":[{"delta":{"content":"好"}}]}\n\n')).toBe('好');
});
test('跨 chunk 半行能正确拼接', () => {
  const acc = createSseAccumulator();
  expect(acc.push('data: {"choices":[{"delta":{"con')).toBe('');
  expect(acc.push('tent":"嗨"}}]}\n\n')).toBe('嗨');
});
test('[DONE] 与空 delta 不产出文本', () => {
  const acc = createSseAccumulator();
  expect(acc.push('data: [DONE]\n\n')).toBe('');
  expect(acc.push('data: {"choices":[{"delta":{}}]}\n\n')).toBe('');
});
