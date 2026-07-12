export interface MedStep { text: string; seconds: number; }
export interface MedScript { id: string; title: string; steps: MedStep[]; }
export const MEDITATION_SCRIPTS: MedScript[] = [
  { id: 'presence-3min', title: '回到当下 · 3 分钟', steps: [
    { text: '闭上眼睛，让身体自然放松。', seconds: 20 },
    { text: '把注意力带到呼吸上，慢慢吸气……慢慢呼气。', seconds: 40 },
    { text: '注意此刻身体的感觉，不评判，只是觉察。', seconds: 40 },
    { text: '如果念头出现，轻轻把它放下，回到呼吸。', seconds: 40 },
    { text: '感受此刻你就在这里。慢慢睁开眼睛。', seconds: 20 },
  ]},
  { id: 'meet-the-part', title: '与被触发的部分对话', steps: [
    { text: '深呼吸三次，让自己安定下来。', seconds: 20 },
    { text: '感受那个被触发的部分在身体的哪个位置。', seconds: 30 },
    { text: '对它说：我看见你了，没关系。', seconds: 30 },
    { text: '问它：你在怕什么？只是倾听。', seconds: 40 },
    { text: '告诉它：我不会再丢下你。慢慢回到当下。', seconds: 20 },
  ]},
];
export interface MedState { stepIndex: number; secondsInStep: number; completed: boolean; }
export type MedAction = { type: 'TICK' } | { type: 'RESET' } | { type: 'JUMP'; index: number };
export const initMedState = (_script: MedScript): MedState => ({ stepIndex: 0, secondsInStep: 0, completed: false });
export function medReducer(state: MedState, action: MedAction, script: MedScript): MedState {
  if (action.type === 'RESET') return initMedState(script);
  if (action.type === 'JUMP') {
    // 上一步/下一步：夹在 [0, 最后一步]，清零步内秒数；跳步不直接触发完成。
    const index = Math.min(Math.max(action.index, 0), script.steps.length - 1);
    return { stepIndex: index, secondsInStep: 0, completed: false };
  }
  if (state.completed) return state;
  const step = script.steps[state.stepIndex];
  const nextSeconds = state.secondsInStep + 1;
  if (nextSeconds >= step.seconds) {
    const nextIndex = state.stepIndex + 1;
    if (nextIndex >= script.steps.length) return { ...state, secondsInStep: nextSeconds, completed: true };
    return { stepIndex: nextIndex, secondsInStep: 0, completed: false };
  }
  return { ...state, secondsInStep: nextSeconds };
}
