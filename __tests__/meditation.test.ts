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
test('JUMP 跳到指定步骤并清零步内秒数（越界会被夹住）', () => {
  const script = MEDITATION_SCRIPTS[0];
  let st = initMedState(script);
  // 先走几秒，确认 JUMP 会清零 secondsInStep
  for (let i = 0; i < 5; i++) st = medReducer(st, { type: 'TICK' }, script);
  st = medReducer(st, { type: 'JUMP', index: 2 }, script);
  expect(st).toEqual({ stepIndex: 2, secondsInStep: 0, completed: false });
  // 向前跳回
  st = medReducer(st, { type: 'JUMP', index: 1 }, script);
  expect(st).toEqual({ stepIndex: 1, secondsInStep: 0, completed: false });
  // 越界：低于 0 夹到 0
  st = medReducer(st, { type: 'JUMP', index: -3 }, script);
  expect(st.stepIndex).toBe(0);
  expect(st.completed).toBe(false);
  // 越界：超过最后一步夹到最后一步（不直接标记完成）
  st = medReducer(st, { type: 'JUMP', index: script.steps.length + 5 }, script);
  expect(st.stepIndex).toBe(script.steps.length - 1);
  expect(st.secondsInStep).toBe(0);
  expect(st.completed).toBe(false);
});
