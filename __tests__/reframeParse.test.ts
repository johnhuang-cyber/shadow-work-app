/**
 * @jest-environment node
 */
import { parseReframe } from '../src/ai/reframeParse';
test('解析四段结构化输出', () => {
  const raw = ['原信念：我不擅长理财','来源：小时候常听父母为钱吵架','新信念：我在一点点变得更会管钱','复述：我每天都在把钱管得更好'].join('\n');
  expect(parseReframe(raw)).toEqual({
    limitingBelief: '我不擅长理财', source: '小时候常听父母为钱吵架',
    empoweringBelief: '我在一点点变得更会管钱', mantra: '我每天都在把钱管得更好',
  });
});
test('缺字段时对应值为空字符串，不抛异常', () => {
  const r = parseReframe('新信念：我在进步');
  expect(r.empoweringBelief).toBe('我在进步');
  expect(r.limitingBelief).toBe('');
});
