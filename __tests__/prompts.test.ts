/**
 * @jest-environment node
 */
import { buildCoachMessages, buildReframeMessages, COACH_SYSTEM, REFRAME_SYSTEM } from '../src/ai/prompts';
test('coach system prompt 含慈悲教练与危机免责关键词', () => {
  expect(COACH_SYSTEM).toContain('教练');
  expect(COACH_SYSTEM).toMatch(/危机|专业帮助|不替代/);
});
test('buildCoachMessages 首条 system，其后历史，末条新用户输入', () => {
  const msgs = buildCoachMessages('我承认我感到不够好', [{ role: 'assistant', content: '我在听。' }]);
  expect(msgs[0]).toEqual({ role: 'system', content: COACH_SYSTEM });
  expect(msgs[1]).toEqual({ role: 'assistant', content: '我在听。' });
  expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: '我承认我感到不够好' });
});
test('buildCoachMessages 传入 context 时拼进唯一的 system 消息', () => {
  const context = '【用户的长期内在部分（按出现次数）】\n- 怕被忽视的小孩（出现 3 次）';
  const msgs = buildCoachMessages('我又有这种感觉了', [{ role: 'assistant', content: '我在听。' }], context);
  expect(msgs[0]).toEqual({ role: 'system', content: `${COACH_SYSTEM}\n\n${context}` });
  // 仍然只有一条 system 消息
  expect(msgs.filter((m) => m.role === 'system')).toHaveLength(1);
  expect(msgs[1]).toEqual({ role: 'assistant', content: '我在听。' });
  expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: '我又有这种感觉了' });
});
test('buildReframeMessages 要求结构化四段输出', () => {
  const msgs = buildReframeMessages('我不擅长理财');
  expect(msgs[0].content).toBe(REFRAME_SYSTEM);
  expect(msgs[1].content).toContain('我不擅长理财');
  expect(REFRAME_SYSTEM).toMatch(/原信念[\s\S]*来源[\s\S]*新信念[\s\S]*复述/);
});
