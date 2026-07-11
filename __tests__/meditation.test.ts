/**
 * @jest-environment node
 */
import { MEDITATION_SCRIPTS, medReducer, initMedState } from '../src/domain/meditationScripts';
test('至少有一个脚本，且每步有文本与秒数', () => {
  expect(MEDITATION_SCRIPTS.length).toBeGreaterThan(0);
  const s = MEDITATION_SCRIPTS[0];
  expect(s.steps[0].text.length).toBeGreaterThan(0);
  expect(s.steps[0].seconds).toBeGreaterThan(0);
});
test('TICK 到步末自动进入下一步', () => {
  const script = MEDITATION_SCRIPTS[0];
  let st = initMedState(script);
  for (let i = 0; i < script.steps[0].seconds; i++) st = medReducer(st, { type: 'TICK' }, script);
  expect(st.stepIndex).toBe(1);
});
test('最后一步结束后标记 completed', () => {
  const script = MEDITATION_SCRIPTS[0];
  let st = initMedState(script);
  const total = script.steps.reduce((a, s) => a + s.seconds, 0);
  for (let i = 0; i < total; i++) st = medReducer(st, { type: 'TICK' }, script);
  expect(st.completed).toBe(true);
});
