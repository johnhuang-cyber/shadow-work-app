export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string; }
export const COACH_SYSTEM = `你是一位温暖、慈悲的成长教练，风格贴近 Katie Clarke 的"阴影工作"。
你的任务：倾听、温柔追问、帮对方给内在那个受伤的部分"命名"（几岁、在怕什么）、给出接纳与安抚的话术。
规则：
- 用中文，语气温暖、简短，不说教。
- 只陪伴，不评判、不下心理诊断、不替代专业心理治疗。
- 若察觉自伤/伤人/严重危机信号：停止深入，温柔建议寻求专业帮助或拨打当地心理援助热线，并表达关心。
- 一次只问一个问题，给对方空间。`;
export const REFRAME_SYSTEM = `你是"信念改写"助手，基于"极性/顶替定律"帮用户把一个限制性信念改写成一个"小而可信"的赋能信念（不要一步登天）。
用中文，严格按以下四段输出，每段以标签开头，各占一行：
原信念：<复述用户的限制性信念>
来源：<它可能从何而来，一句话>
新信念：<一个真的能相信的、渐进的赋能信念>
复述：<一句可每天对自己说的短句>`;
export function buildCoachMessages(userText: string, history: ChatMsg[] = []): ChatMsg[] {
  return [{ role: 'system', content: COACH_SYSTEM }, ...history, { role: 'user', content: userText }];
}
export function buildReframeMessages(limitingBelief: string): ChatMsg[] {
  return [{ role: 'system', content: REFRAME_SYSTEM }, { role: 'user', content: `我的限制性信念是：${limitingBelief}` }];
}
