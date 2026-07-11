/**
 * @jest-environment node
 */
import { JOURNAL_STEPS, nextStep, prevStep, isLastStep } from '../src/domain/journalSteps';
test('五步顺序正确', () => {
  expect(JOURNAL_STEPS.map(s => s.key)).toEqual(['trigger','admit','accept','name','vent','reassure']);
});
test('nextStep 前进且不越界', () => { expect(nextStep(0)).toBe(1); expect(nextStep(5)).toBe(5); });
test('prevStep 后退且不越界', () => { expect(prevStep(3)).toBe(2); expect(prevStep(0)).toBe(0); });
test('isLastStep', () => { expect(isLastStep(5)).toBe(true); expect(isLastStep(4)).toBe(false); });
