export interface JournalStepDef {
  key: 'trigger' | 'admit' | 'vent' | 'accept' | 'reassure';
  title: string; prompt: string;
}
export const JOURNAL_STEPS: JournalStepDef[] = [
  { key: 'trigger', title: '触发点', prompt: '什么触发了你？用一句话描述。' },
  { key: 'admit', title: '看见', prompt: '此刻你感到什么？它在你身体的哪个部位？像几岁的你？' },
  { key: 'vent', title: '宣泄', prompt: '让这个部分把话说完，不评判。' },
  { key: 'accept', title: '接纳', prompt: '对这份感受说三次"没关系"。' },
  { key: 'reassure', title: '安抚', prompt: '写给这个部分的话，并给它一个新的正向角色。' },
];
export const nextStep = (i: number) => Math.min(i + 1, JOURNAL_STEPS.length - 1);
export const prevStep = (i: number) => Math.max(i - 1, 0);
export const isLastStep = (i: number) => i === JOURNAL_STEPS.length - 1;
