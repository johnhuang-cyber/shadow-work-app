# 阴影工作 + 显化 个人成长 App（MVP）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Expo 做一个自用的中文个人成长 App：引导式阴影日记 + 引导冥想，两处可手动触发的 DeepSeek AI（响应式教练、信念改写），数据本地优先。

**Architecture:** 分层——UI（screens/components）只做展示与交互；domain（services）做业务与存储；单一 `aiService` 负责唯一的网络出口（DeepSeek OpenAI 兼容接口）。纯逻辑（prompt 构造、SSE 解析、reframe 解析、冥想步进 reducer）用 TDD；SQLite 与 UI 用实现任务 + Expo Go 真机验收。

**Tech Stack:** Expo (React Native) · TypeScript · expo-router · expo-sqlite · expo-secure-store · expo-speech · expo/fetch(SSE 流式) · DeepSeek(`deepseek-chat` / `deepseek-reasoner`) · Jest(jest-expo) + @testing-library/react-native

**参考 spec:** `../../../docs/superpowers/specs/2026-07-11-shadow-work-app-design.md`（位于父目录 claude-research 下）

---

## 文件结构（先锁定边界）

```
shadow-work-app/
├── app/                          # expo-router 路由
│   ├── _layout.tsx               # 根布局 + DB 初始化
│   ├── (tabs)/_layout.tsx        # 底部 4 Tab
│   ├── (tabs)/index.tsx          # 今天（日记入口）
│   ├── (tabs)/meditate.tsx       # 冥想列表
│   ├── (tabs)/beliefs.tsx        # 信念
│   ├── (tabs)/me.tsx             # 我的（历史+设置）
│   ├── journal/[id].tsx          # 阴影日记五步流程
│   └── meditate/[scriptId].tsx   # 冥想播放页
├── src/
│   ├── data/
│   │   ├── db.ts                 # SQLite 打开 + 版本化迁移
│   │   ├── journalDao.ts
│   │   ├── beliefDao.ts
│   │   └── meditationDao.ts
│   ├── services/
│   │   ├── settingsService.ts    # secure-store: API key / 模型偏好
│   │   ├── journalService.ts
│   │   ├── beliefService.ts
│   │   └── meditationService.ts
│   ├── ai/
│   │   ├── prompts.ts            # coach / reframe 的 system prompt + 消息构造（纯）
│   │   ├── sse.ts               # SSE 流解析（纯）
│   │   ├── reframeParse.ts      # 信念改写结构化解析（纯）
│   │   └── deepseek.ts          # 调 DeepSeek（唯一网络出口）
│   ├── domain/
│   │   ├── journalSteps.ts       # 五步定义 + 类型（纯）
│   │   └── meditationScripts.ts  # 冥想脚本常量 + 步进 reducer（纯）
│   └── types.ts                  # 共享类型
├── __tests__/                    # 纯逻辑单测
├── app.json / package.json / tsconfig.json / jest 配置
```

原则：`aiService(deepseek.ts)` 是唯一发网络请求的模块；API Key 只经 `settingsService` 从 secure-store 读，永不进 SQLite、永不写日志。

---

## Task 1：初始化 Expo + TypeScript 工程

**Files:**
- Create: `shadow-work-app/`（Expo 工程文件）

- [ ] **Step 1: 在项目目录创建 Expo 工程**

Run:
```bash
cd /Users/makemoneymac/Documents/claude-research/shadow-work-app
npx create-expo-app@latest . --template blank-typescript
```
Expected: 生成 `package.json` / `App.tsx` / `tsconfig.json` / `app.json`，无报错。

- [ ] **Step 2: 安装运行期依赖**

Run:
```bash
npx expo install expo-router expo-sqlite expo-secure-store expo-speech react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```
Expected: 依赖写入 `package.json`。

- [ ] **Step 3: 安装测试依赖**

Run:
```bash
npm i -D jest jest-expo @testing-library/react-native @types/jest
```
Expected: devDependencies 写入。

- [ ] **Step 4: 配置 jest 与 expo-router entry**

Edit `package.json`：把 `"main"` 改为 `"expo-router/entry"`，并加入：
```json
{
  "scripts": {
    "start": "expo start",
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))"
    ]
  }
}
```
Edit `app.json`：在 `expo` 下加 `"scheme": "shadowwork"`，并在 `plugins` 加 `["expo-router"]`。

- [ ] **Step 5: 冒烟测试工程可跑**

Run:
```bash
npx expo start --no-dev --offline 2>&1 | head -20 || true
npm test -- --watchAll=false 2>&1 | tail -20 || true
```
Expected: expo 能启动打包器；`jest` 显示 "No tests found"（尚无测试，属正常）。

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "chore: scaffold Expo + TypeScript + jest"
```

---

## Task 2：共享类型 + 底部导航骨架

**Files:**
- Create: `src/types.ts`
- Create: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/meditate.tsx`, `app/(tabs)/beliefs.tsx`, `app/(tabs)/me.tsx`

- [ ] **Step 1: 定义共享类型**

Create `src/types.ts`:
```typescript
export interface JournalEntry {
  id: string;
  createdAt: number;
  trigger: string;
  admitText: string;
  nameText: string;
  ventText: string;
  reassureText: string;
  partLabel: string;
}

export interface CoachMessage {
  id: string;
  entryId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface Belief {
  id: string;
  createdAt: number;
  limitingBelief: string;
  source: string;
  empoweringBelief: string;
  mantra: string;
}

export interface MeditationSession {
  id: string;
  createdAt: number;
  scriptId: string;
  durationSec: number;
  completed: boolean;
}

export type DeepseekModel = 'deepseek-chat' | 'deepseek-reasoner';
```

- [ ] **Step 2: 根布局（Stack）**

Create `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: 底部 4 Tab**

Create `app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#7A5Fb0' }}>
      <Tabs.Screen name="index" options={{ title: '今天' }} />
      <Tabs.Screen name="meditate" options={{ title: '冥想' }} />
      <Tabs.Screen name="beliefs" options={{ title: '信念' }} />
      <Tabs.Screen name="me" options={{ title: '我的' }} />
    </Tabs>
  );
}
```

- [ ] **Step 4: 四个占位屏**

Create `app/(tabs)/index.tsx`（其余三个同构，各自把标题换成 冥想/信念/我的）:
```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function TodayScreen() {
  return (
    <View style={styles.c}><Text style={styles.t}>今天</Text></View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  t: { fontSize: 20 },
});
```
同样创建 `meditate.tsx`（“冥想”）、`beliefs.tsx`（“信念”）、`me.tsx`（“我的”）。

- [ ] **Step 5: 真机验收 + 提交**

Run: `npx expo start` → 手机 Expo Go 扫码，确认底部 4 个 Tab 可切换。
```bash
git add -A && git commit -m "feat: bottom tab navigation skeleton + shared types"
```

---

## Task 3：五步定义（纯逻辑，TDD）

**Files:**
- Create: `src/domain/journalSteps.ts`
- Test: `__tests__/journalSteps.test.ts`

- [ ] **Step 1: 写失败测试**

Create `__tests__/journalSteps.test.ts`:
```typescript
import { JOURNAL_STEPS, nextStep, prevStep, isLastStep } from '../src/domain/journalSteps';

test('五步顺序正确', () => {
  expect(JOURNAL_STEPS.map(s => s.key)).toEqual(
    ['trigger', 'admit', 'accept', 'name', 'vent', 'reassure']
  );
});

test('nextStep 前进且不越界', () => {
  expect(nextStep(0)).toBe(1);
  expect(nextStep(5)).toBe(5);
});

test('prevStep 后退且不越界', () => {
  expect(prevStep(3)).toBe(2);
  expect(prevStep(0)).toBe(0);
});

test('isLastStep', () => {
  expect(isLastStep(5)).toBe(true);
  expect(isLastStep(4)).toBe(false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- journalSteps --watchAll=false`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

Create `src/domain/journalSteps.ts`:
```typescript
export interface JournalStepDef {
  key: 'trigger' | 'admit' | 'accept' | 'name' | 'vent' | 'reassure';
  title: string;
  prompt: string;
}

export const JOURNAL_STEPS: JournalStepDef[] = [
  { key: 'trigger', title: '触发点', prompt: '什么触发了你？用一句话描述。' },
  { key: 'admit', title: '承认', prompt: '此刻你感到什么？“我承认我感到……”' },
  { key: 'accept', title: '接纳', prompt: '对这份感受说三次“没关系”。' },
  { key: 'name', title: '命名', prompt: '它在你身体的哪个部位？像几岁的你？它在怕什么？' },
  { key: 'vent', title: '宣泄', prompt: '让这个部分把话说完，不评判。' },
  { key: 'reassure', title: '安抚', prompt: '写给这个部分的话，并给它一个新的正向角色。' },
];

export const nextStep = (i: number) => Math.min(i + 1, JOURNAL_STEPS.length - 1);
export const prevStep = (i: number) => Math.max(i - 1, 0);
export const isLastStep = (i: number) => i === JOURNAL_STEPS.length - 1;
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- journalSteps --watchAll=false`
Expected: PASS（4 个用例）。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: shadow journal step definitions (TDD)"
```

---

## Task 4：DeepSeek prompt 构造（纯逻辑，TDD）

**Files:**
- Create: `src/ai/prompts.ts`
- Test: `__tests__/prompts.test.ts`

- [ ] **Step 1: 写失败测试**

Create `__tests__/prompts.test.ts`:
```typescript
import { buildCoachMessages, buildReframeMessages, COACH_SYSTEM, REFRAME_SYSTEM } from '../src/ai/prompts';

test('coach system prompt 含慈悲教练与危机免责关键词', () => {
  expect(COACH_SYSTEM).toContain('教练');
  expect(COACH_SYSTEM).toMatch(/危机|专业帮助|不替代/);
});

test('buildCoachMessages 首条为 system，其后为历史对话，末条为新用户输入', () => {
  const msgs = buildCoachMessages(
    '我承认我感到不够好',
    [{ role: 'assistant', content: '我在听。' }]
  );
  expect(msgs[0]).toEqual({ role: 'system', content: COACH_SYSTEM });
  expect(msgs[1]).toEqual({ role: 'assistant', content: '我在听。' });
  expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: '我承认我感到不够好' });
});

test('buildReframeMessages 要求结构化四段输出', () => {
  const msgs = buildReframeMessages('我不擅长理财');
  expect(msgs[0].content).toBe(REFRAME_SYSTEM);
  expect(msgs[1].content).toContain('我不擅长理财');
  expect(REFRAME_SYSTEM).toMatch(/原信念[\s\S]*来源[\s\S]*新信念[\s\S]*复述/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- prompts --watchAll=false`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

Create `src/ai/prompts.ts`:
```typescript
export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string; }

export const COACH_SYSTEM = `你是一位温暖、慈悲的成长教练，风格贴近 Katie Clarke 的“阴影工作”。
你的任务：倾听、温柔追问、帮对方给内在那个受伤的部分“命名”（几岁、在怕什么）、给出接纳与安抚的话术。
规则：
- 用中文，语气温暖、简短，不说教。
- 只陪伴，不评判、不下心理诊断、不替代专业心理治疗。
- 若察觉自伤/伤人/严重危机信号：停止深入，温柔建议寻求专业帮助或拨打当地心理援助热线，并表达关心。
- 一次只问一个问题，给对方空间。`;

export const REFRAME_SYSTEM = `你是“信念改写”助手，基于“极性/顶替定律”帮用户把一个限制性信念改写成一个“小而可信”的赋能信念（不要一步登天）。
用中文，严格按以下四段输出，每段以标签开头，各占一行：
原信念：<复述用户的限制性信念>
来源：<它可能从何而来，一句话>
新信念：<一个真的能相信的、渐进的赋能信念>
复述：<一句可每天对自己说的短句>`;

export function buildCoachMessages(userText: string, history: ChatMsg[] = []): ChatMsg[] {
  return [
    { role: 'system', content: COACH_SYSTEM },
    ...history,
    { role: 'user', content: userText },
  ];
}

export function buildReframeMessages(limitingBelief: string): ChatMsg[] {
  return [
    { role: 'system', content: REFRAME_SYSTEM },
    { role: 'user', content: `我的限制性信念是：${limitingBelief}` },
  ];
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- prompts --watchAll=false`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: DeepSeek prompt builders for coach & reframe (TDD)"
```

---

## Task 5：SSE 流解析（纯逻辑，TDD）

**Files:**
- Create: `src/ai/sse.ts`
- Test: `__tests__/sse.test.ts`

DeepSeek/OpenAI 兼容流每行形如 `data: {json}`，结束是 `data: [DONE]`。本任务实现“把一段 chunk 文本喂进来，吐出增量文本”的解析器。

- [ ] **Step 1: 写失败测试**

Create `__tests__/sse.test.ts`:
```typescript
import { createSseAccumulator } from '../src/ai/sse';

test('从 OpenAI 兼容 SSE 行提取增量内容', () => {
  const acc = createSseAccumulator();
  const out1 = acc.push('data: {"choices":[{"delta":{"content":"你"}}]}\n\n');
  const out2 = acc.push('data: {"choices":[{"delta":{"content":"好"}}]}\n\n');
  expect(out1).toBe('你');
  expect(out2).toBe('好');
});

test('跨 chunk 半行能正确拼接', () => {
  const acc = createSseAccumulator();
  const a = acc.push('data: {"choices":[{"delta":{"con');
  const b = acc.push('tent":"嗨"}}]}\n\n');
  expect(a).toBe('');
  expect(b).toBe('嗨');
});

test('[DONE] 与空 delta 不产出文本', () => {
  const acc = createSseAccumulator();
  expect(acc.push('data: [DONE]\n\n')).toBe('');
  expect(acc.push('data: {"choices":[{"delta":{}}]}\n\n')).toBe('');
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- sse --watchAll=false`
Expected: FAIL。

- [ ] **Step 3: 实现**

Create `src/ai/sse.ts`:
```typescript
export function createSseAccumulator() {
  let buffer = '';
  return {
    push(chunk: string): string {
      buffer += chunk;
      let out = '';
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '' || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') out += delta;
        } catch {
          // 半行 JSON：塞回 buffer 等待后续 chunk
          buffer = line + '\n' + buffer;
          break;
        }
      }
      return out;
    },
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- sse --watchAll=false`
Expected: PASS（3 个用例）。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: OpenAI-compatible SSE accumulator (TDD)"
```

---

## Task 6：信念改写结果解析（纯逻辑，TDD）

**Files:**
- Create: `src/ai/reframeParse.ts`
- Test: `__tests__/reframeParse.test.ts`

- [ ] **Step 1: 写失败测试**

Create `__tests__/reframeParse.test.ts`:
```typescript
import { parseReframe } from '../src/ai/reframeParse';

test('解析四段结构化输出', () => {
  const raw = [
    '原信念：我不擅长理财',
    '来源：小时候常听父母为钱吵架',
    '新信念：我在一点点变得更会管钱',
    '复述：我每天都在把钱管得更好',
  ].join('\n');
  expect(parseReframe(raw)).toEqual({
    limitingBelief: '我不擅长理财',
    source: '小时候常听父母为钱吵架',
    empoweringBelief: '我在一点点变得更会管钱',
    mantra: '我每天都在把钱管得更好',
  });
});

test('缺字段时对应值为空字符串，不抛异常', () => {
  const r = parseReframe('新信念：我在进步');
  expect(r.empoweringBelief).toBe('我在进步');
  expect(r.limitingBelief).toBe('');
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- reframeParse --watchAll=false`
Expected: FAIL。

- [ ] **Step 3: 实现**

Create `src/ai/reframeParse.ts`:
```typescript
export interface ReframeResult {
  limitingBelief: string;
  source: string;
  empoweringBelief: string;
  mantra: string;
}

const grab = (text: string, label: string): string => {
  const m = text.match(new RegExp(`${label}\\s*[:：]\\s*(.+)`));
  return m ? m[1].trim() : '';
};

export function parseReframe(raw: string): ReframeResult {
  return {
    limitingBelief: grab(raw, '原信念'),
    source: grab(raw, '来源'),
    empoweringBelief: grab(raw, '新信念'),
    mantra: grab(raw, '复述'),
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- reframeParse --watchAll=false`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: parse reframe structured output (TDD)"
```

---

## Task 7：冥想脚本 + 步进 reducer（纯逻辑，TDD）

**Files:**
- Create: `src/domain/meditationScripts.ts`
- Test: `__tests__/meditation.test.ts`

- [ ] **Step 1: 写失败测试**

Create `__tests__/meditation.test.ts`:
```typescript
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
  // 快进到第 0 步最后一秒
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- meditation --watchAll=false`
Expected: FAIL。

- [ ] **Step 3: 实现**

Create `src/domain/meditationScripts.ts`:
```typescript
export interface MedStep { text: string; seconds: number; }
export interface MedScript { id: string; title: string; steps: MedStep[]; }

export const MEDITATION_SCRIPTS: MedScript[] = [
  {
    id: 'presence-3min',
    title: '回到当下 · 3 分钟',
    steps: [
      { text: '闭上眼睛，让身体自然放松。', seconds: 20 },
      { text: '把注意力带到呼吸上，慢慢吸气……慢慢呼气。', seconds: 40 },
      { text: '注意此刻身体的感觉，不评判，只是觉察。', seconds: 40 },
      { text: '如果念头出现，轻轻把它放下，回到呼吸。', seconds: 40 },
      { text: '感受此刻你就在这里。慢慢睁开眼睛。', seconds: 20 },
    ],
  },
  {
    id: 'meet-the-part',
    title: '与被触发的部分对话',
    steps: [
      { text: '深呼吸三次，让自己安定下来。', seconds: 20 },
      { text: '感受那个被触发的部分在身体的哪个位置。', seconds: 30 },
      { text: '对它说：我看见你了，没关系。', seconds: 30 },
      { text: '问它：你在怕什么？只是倾听。', seconds: 40 },
      { text: '告诉它：我不会再丢下你。慢慢回到当下。', seconds: 20 },
    ],
  },
];

export interface MedState { stepIndex: number; secondsInStep: number; completed: boolean; }
export type MedAction = { type: 'TICK' } | { type: 'RESET' };

export const initMedState = (_script: MedScript): MedState => ({
  stepIndex: 0, secondsInStep: 0, completed: false,
});

export function medReducer(state: MedState, action: MedAction, script: MedScript): MedState {
  if (action.type === 'RESET') return initMedState(script);
  if (state.completed) return state;
  const step = script.steps[state.stepIndex];
  const nextSeconds = state.secondsInStep + 1;
  if (nextSeconds >= step.seconds) {
    const nextIndex = state.stepIndex + 1;
    if (nextIndex >= script.steps.length) {
      return { ...state, secondsInStep: nextSeconds, completed: true };
    }
    return { stepIndex: nextIndex, secondsInStep: 0, completed: false };
  }
  return { ...state, secondsInStep: nextSeconds };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- meditation --watchAll=false`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: meditation scripts + step reducer (TDD)"
```

---

## Task 8：settingsService（API Key / 模型偏好）

**Files:**
- Create: `src/services/settingsService.ts`

无法在 node 环境单测 secure-store（需原生），本任务为实现 + 真机验收。

- [ ] **Step 1: 实现**

Create `src/services/settingsService.ts`:
```typescript
import * as SecureStore from 'expo-secure-store';
import type { DeepseekModel } from '../types';

const KEY_API = 'deepseek_api_key';
const KEY_MODEL = 'deepseek_model';

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_API);
}
export async function setApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_API, key.trim());
}
export async function getModel(): Promise<DeepseekModel> {
  const m = await SecureStore.getItemAsync(KEY_MODEL);
  return m === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
}
export async function setModel(m: DeepseekModel): Promise<void> {
  await SecureStore.setItemAsync(KEY_MODEL, m);
}
```

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: settingsService with secure-store (api key & model)"
```

---

## Task 9：aiService（DeepSeek 调用，唯一网络出口）

**Files:**
- Create: `src/ai/deepseek.ts`
- Test: `__tests__/deepseek.test.ts`

用 mock 的 fetch-like 读取器验证请求体构造与流式聚合；不打真实网络。

- [ ] **Step 1: 写失败测试**

Create `__tests__/deepseek.test.ts`:
```typescript
import { streamChat } from '../src/ai/deepseek';

function fakeStreamResponse(lines: string[]) {
  let i = 0;
  const encoder = new TextEncoder();
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          read: async () =>
            i < lines.length
              ? { done: false, value: encoder.encode(lines[i++]) }
              : { done: true, value: undefined },
        };
      },
    },
  } as any;
}

test('streamChat 组装正确请求并聚合增量', async () => {
  const calls: any[] = [];
  const fakeFetch = async (url: string, init: any) => {
    calls.push({ url, init });
    return fakeStreamResponse([
      'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"，我在"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);
  };
  const chunks: string[] = [];
  const full = await streamChat(
    { apiKey: 'sk-x', model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }] },
    (c) => chunks.push(c),
    fakeFetch as any
  );
  expect(full).toBe('你好，我在');
  expect(chunks.join('')).toBe('你好，我在');
  expect(calls[0].url).toBe('https://api.deepseek.com/chat/completions');
  expect(calls[0].init.headers.Authorization).toBe('Bearer sk-x');
  const body = JSON.parse(calls[0].init.body);
  expect(body.model).toBe('deepseek-chat');
  expect(body.stream).toBe(true);
});

test('非 2xx 抛出可读错误', async () => {
  const fakeFetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized' } as any);
  await expect(
    streamChat({ apiKey: 'bad', model: 'deepseek-chat', messages: [] }, () => {}, fakeFetch as any)
  ).rejects.toThrow(/401/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- deepseek --watchAll=false`
Expected: FAIL。

- [ ] **Step 3: 实现**

Create `src/ai/deepseek.ts`:
```typescript
import { createSseAccumulator } from './sse';
import type { ChatMsg } from './prompts';
import type { DeepseekModel } from '../types';

export interface StreamChatParams {
  apiKey: string;
  model: DeepseekModel;
  messages: ChatMsg[];
}

type FetchLike = (url: string, init: any) => Promise<any>;

// 注入 fetch 以便测试；运行期传入 expo/fetch 的 fetch
export async function streamChat(
  { apiKey, model, messages }: StreamChatParams,
  onDelta: (text: string) => void,
  fetchImpl: FetchLike
): Promise<string> {
  const res = await fetchImpl('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!res.ok) {
    const detail = res.text ? await res.text() : '';
    throw new Error(`DeepSeek 请求失败（${res.status}）：${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const acc = createSseAccumulator();
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = acc.push(decoder.decode(value, { stream: true }));
    if (text) { full += text; onDelta(text); }
  }
  return full;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- deepseek --watchAll=false`
Expected: PASS（2 个用例）。

- [ ] **Step 5: 加一层运行期封装（供 UI 调用，注入 expo/fetch）**

在 `src/ai/deepseek.ts` 末尾追加：
```typescript
import { fetch as expoFetch } from 'expo/fetch';
import { getApiKey, getModel } from '../services/settingsService';

export async function runCoach(
  userText: string, history: ChatMsg[], onDelta: (t: string) => void
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('尚未配置 DeepSeek API Key，请到「我的」里填写。');
  const model = await getModel();
  const { buildCoachMessages } = await import('./prompts');
  return streamChat({ apiKey, model, messages: buildCoachMessages(userText, history) }, onDelta, expoFetch as any);
}

export async function runReframe(limitingBelief: string, onDelta: (t: string) => void): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('尚未配置 DeepSeek API Key，请到「我的」里填写。');
  const { buildReframeMessages } = await import('./prompts');
  // 信念改写偏好更强推理
  return streamChat({ apiKey, model: 'deepseek-reasoner', messages: buildReframeMessages(limitingBelief) }, onDelta, expoFetch as any);
}
```

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: DeepSeek streaming service + coach/reframe wrappers (TDD)"
```

---

## Task 10：SQLite 数据层（db + DAO）

**Files:**
- Create: `src/data/db.ts`, `src/data/journalDao.ts`, `src/data/beliefDao.ts`, `src/data/meditationDao.ts`

原生模块，无法 node 单测，实现 + 真机验收。

- [ ] **Step 1: db 初始化与建表**

Create `src/data/db.ts`:
```typescript
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('shadowwork.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY, createdAt INTEGER,
      trigger TEXT, admitText TEXT, nameText TEXT,
      ventText TEXT, reassureText TEXT, partLabel TEXT
    );
    CREATE TABLE IF NOT EXISTS coach_messages (
      id TEXT PRIMARY KEY, entryId TEXT, role TEXT, content TEXT, createdAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS beliefs (
      id TEXT PRIMARY KEY, createdAt INTEGER,
      limitingBelief TEXT, source TEXT, empoweringBelief TEXT, mantra TEXT
    );
    CREATE TABLE IF NOT EXISTS meditation_sessions (
      id TEXT PRIMARY KEY, createdAt INTEGER, scriptId TEXT, durationSec INTEGER, completed INTEGER
    );
  `);
  return _db;
}

export const genId = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
```
> 注：`genId` 用于生成本地主键；`Math.random` 在真机可用（只有 Claude Code 沙箱禁用它，运行期 App 不受限）。

- [ ] **Step 2: journalDao**

Create `src/data/journalDao.ts`:
```typescript
import { getDb, genId } from './db';
import type { JournalEntry, CoachMessage } from '../types';

export async function createEntry(): Promise<JournalEntry> {
  const e: JournalEntry = {
    id: genId(), createdAt: Date.now(),
    trigger: '', admitText: '', nameText: '', ventText: '', reassureText: '', partLabel: '',
  };
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO journal_entries (id,createdAt,trigger,admitText,nameText,ventText,reassureText,partLabel)
     VALUES (?,?,?,?,?,?,?,?)`,
    [e.id, e.createdAt, e.trigger, e.admitText, e.nameText, e.ventText, e.reassureText, e.partLabel]
  );
  return e;
}

export async function saveEntry(e: JournalEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE journal_entries SET trigger=?,admitText=?,nameText=?,ventText=?,reassureText=?,partLabel=? WHERE id=?`,
    [e.trigger, e.admitText, e.nameText, e.ventText, e.reassureText, e.partLabel, e.id]
  );
}

export async function getEntry(id: string): Promise<JournalEntry | null> {
  const db = await getDb();
  return db.getFirstAsync<JournalEntry>(`SELECT * FROM journal_entries WHERE id=?`, [id]);
}

export async function listEntries(): Promise<JournalEntry[]> {
  const db = await getDb();
  return db.getAllAsync<JournalEntry>(`SELECT * FROM journal_entries ORDER BY createdAt DESC`);
}

export async function addCoachMessage(m: Omit<CoachMessage, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO coach_messages (id,entryId,role,content,createdAt) VALUES (?,?,?,?,?)`,
    [genId(), m.entryId, m.role, m.content, Date.now()]
  );
}

export async function listCoachMessages(entryId: string): Promise<CoachMessage[]> {
  const db = await getDb();
  return db.getAllAsync<CoachMessage>(
    `SELECT * FROM coach_messages WHERE entryId=? ORDER BY createdAt ASC`, [entryId]
  );
}
```

- [ ] **Step 3: beliefDao**

Create `src/data/beliefDao.ts`:
```typescript
import { getDb, genId } from './db';
import type { Belief } from '../types';

export async function addBelief(b: Omit<Belief, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO beliefs (id,createdAt,limitingBelief,source,empoweringBelief,mantra) VALUES (?,?,?,?,?,?)`,
    [genId(), Date.now(), b.limitingBelief, b.source, b.empoweringBelief, b.mantra]
  );
}

export async function listBeliefs(): Promise<Belief[]> {
  const db = await getDb();
  return db.getAllAsync<Belief>(`SELECT * FROM beliefs ORDER BY createdAt DESC`);
}
```

- [ ] **Step 4: meditationDao**

Create `src/data/meditationDao.ts`:
```typescript
import { getDb, genId } from './db';
import type { MeditationSession } from '../types';

export async function addSession(s: Omit<MeditationSession, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO meditation_sessions (id,createdAt,scriptId,durationSec,completed) VALUES (?,?,?,?,?)`,
    [genId(), Date.now(), s.scriptId, s.durationSec, s.completed ? 1 : 0]
  );
}

export async function listSessions(): Promise<MeditationSession[]> {
  const db = await getDb();
  return db.getAllAsync<MeditationSession>(`SELECT * FROM meditation_sessions ORDER BY createdAt DESC`);
}
```

- [ ] **Step 5: 在根布局初始化 DB**

Edit `app/_layout.tsx`：在组件内加 `useEffect(() => { getDb(); }, [])`（import `getDb`）。

- [ ] **Step 6: 真机验收 + 提交**

Run: `npx expo start` → App 能启动不报 DB 错。
```bash
git add -A && git commit -m "feat: expo-sqlite data layer (db + DAOs)"
```

---

## Task 11：设置页（我的 → API Key 录入 + 模型切换 + 隐私说明）

**Files:**
- Modify: `app/(tabs)/me.tsx`

- [ ] **Step 1: 实现设置页**

Replace `app/(tabs)/me.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Switch, StyleSheet, Alert, ScrollView } from 'react-native';
import { getApiKey, setApiKey, getModel, setModel } from '../../src/services/settingsService';

export default function MeScreen() {
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [reasoner, setReasoner] = useState(false);

  useEffect(() => {
    getApiKey().then(k => setHasKey(!!k));
    getModel().then(m => setReasoner(m === 'deepseek-reasoner'));
  }, []);

  const save = async () => {
    if (!key.trim()) return Alert.alert('请输入 API Key');
    await setApiKey(key);
    setHasKey(true); setKey('');
    Alert.alert('已保存', 'API Key 已加密存在本机。');
  };

  const toggle = async (v: boolean) => {
    setReasoner(v);
    await setModel(v ? 'deepseek-reasoner' : 'deepseek-chat');
  };

  return (
    <ScrollView contentContainerStyle={styles.c}>
      <Text style={styles.h}>DeepSeek API Key</Text>
      <Text style={styles.hint}>{hasKey ? '✅ 已配置（仅存本机）' : '尚未配置'}</Text>
      <TextInput
        style={styles.input} placeholder="粘贴 sk-..." value={key}
        onChangeText={setKey} autoCapitalize="none" secureTextEntry
      />
      <Button title="保存 Key" onPress={save} />
      <View style={styles.row}>
        <Text>用更强推理模型（deepseek-reasoner）</Text>
        <Switch value={reasoner} onValueChange={toggle} />
      </View>
      <Text style={styles.privacy}>
        隐私：日记、冥想、信念只存在你手机本地。仅当你主动点“问教练/改写信念”时，才把相关文本发送给 DeepSeek。
      </Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  c: { padding: 16, gap: 12 },
  h: { fontSize: 18, fontWeight: '600' },
  hint: { color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  privacy: { color: '#888', fontSize: 12, marginTop: 16, lineHeight: 18 },
});
```

- [ ] **Step 2: 真机验收 + 提交**

真机：粘贴一个 key → 保存 → 重开 App 显示“已配置”。
```bash
git add -A && git commit -m "feat: settings screen (api key entry, model toggle, privacy note)"
```

---

## Task 12：阴影日记五步流程页 + 教练面板（流式）

**Files:**
- Modify: `app/(tabs)/index.tsx`（新建/继续入口）
- Create: `app/journal/[id].tsx`（五步 + 教练）

- [ ] **Step 1: 今天页——新建/继续**

Replace `app/(tabs)/index.tsx`:
```tsx
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { createEntry, listEntries } from '../../src/data/journalDao';
import type { JournalEntry } from '../../src/types';

export default function TodayScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  useFocusEffect(useCallback(() => { listEntries().then(setEntries); }, []));

  const start = async () => {
    const e = await createEntry();
    router.push(`/journal/${e.id}`);
  };

  return (
    <View style={styles.c}>
      <Button title="开始一条阴影日记" onPress={start} />
      <Text style={styles.h}>历史</Text>
      <FlatList
        data={entries}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push(`/journal/${item.id}`)}>
            <Text numberOfLines={1}>{item.trigger || '（未命名）'}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 12 },
  h: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  date: { color: '#999' },
});
```

- [ ] **Step 2: 五步流程 + 教练面板**

Create `app/journal/[id].tsx`:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { JOURNAL_STEPS, nextStep, prevStep, isLastStep } from '../../src/domain/journalSteps';
import { getEntry, saveEntry, addCoachMessage, listCoachMessages } from '../../src/data/journalDao';
import { runCoach } from '../../src/ai/deepseek';
import type { JournalEntry, CoachMessage } from '../../src/types';

const FIELD: Record<string, keyof JournalEntry> = {
  trigger: 'trigger', admit: 'admitText', accept: 'admitText',
  name: 'nameText', vent: 'ventText', reassure: 'reassureText',
};

export default function JournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getEntry(id!).then(e => setEntry(e));
    listCoachMessages(id!).then(setMessages);
  }, [id]);

  if (!entry) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const step = JOURNAL_STEPS[stepIdx];
  const field = FIELD[step.key];
  const value = (entry[field] as string) ?? '';

  const update = (text: string) => setEntry({ ...entry, [field]: text });
  const persist = async () => { await saveEntry(entry); };

  const askCoach = async () => {
    const text = value.trim();
    if (!text) return Alert.alert('先写点内容再问教练');
    Alert.alert('发送确认', '这段内容将发送给 DeepSeek。', [
      { text: '取消', style: 'cancel' },
      { text: '发送', onPress: async () => {
        setLoading(true); setStreaming('');
        await addCoachMessage({ entryId: id!, role: 'user', content: text });
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        try {
          const full = await runCoach(text, history, (d) => setStreaming(s => s + d));
          await addCoachMessage({ entryId: id!, role: 'assistant', content: full });
          setMessages(await listCoachMessages(id!));
        } catch (e: any) {
          Alert.alert('教练暂时无法回应', e.message ?? String(e));
        } finally { setStreaming(''); setLoading(false); }
      }},
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.c}>
      <Text style={styles.step}>第 {stepIdx + 1}/{JOURNAL_STEPS.length} 步 · {step.title}</Text>
      <Text style={styles.prompt}>{step.prompt}</Text>
      <TextInput
        style={styles.input} multiline value={value}
        onChangeText={update} onBlur={persist} placeholder="在这里书写…"
      />
      <View style={styles.nav}>
        <Button title="上一步" onPress={() => { persist(); setStepIdx(prevStep(stepIdx)); }} disabled={stepIdx === 0} />
        <Button title="问教练" onPress={askCoach} />
        <Button title={isLastStep(stepIdx) ? '完成' : '下一步'} onPress={() => { persist(); setStepIdx(nextStep(stepIdx)); }} />
      </View>

      <Text style={styles.h}>教练对话</Text>
      {messages.map(m => (
        <Text key={m.id} style={m.role === 'assistant' ? styles.ai : styles.me}>
          {m.role === 'assistant' ? '教练：' : '我：'}{m.content}
        </Text>
      ))}
      {loading && <Text style={styles.ai}>教练：{streaming}<ActivityIndicator /></Text>}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  c: { padding: 16, gap: 10 },
  step: { color: '#7A5Fb0', fontWeight: '600' },
  prompt: { fontSize: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 120, textAlignVertical: 'top' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  h: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  ai: { backgroundColor: '#F3EEFA', padding: 8, borderRadius: 8 },
  me: { backgroundColor: '#EEF3FA', padding: 8, borderRadius: 8 },
});
```

- [ ] **Step 3: 真机验收 + 提交**

真机：新建日记 → 五步能写能存能返回 → 配置好 key 后“问教练”能看到**流式**中文回应 → 回应入库、重进可见。
```bash
git add -A && git commit -m "feat: shadow journal 5-step flow + streaming coach panel"
```

---

## Task 13：信念改写页

**Files:**
- Modify: `app/(tabs)/beliefs.tsx`

- [ ] **Step 1: 实现**

Replace `app/(tabs)/beliefs.tsx`:
```tsx
import { useState, useCallback } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { runReframe } from '../../src/ai/deepseek';
import { parseReframe } from '../../src/ai/reframeParse';
import { addBelief, listBeliefs } from '../../src/data/beliefDao';
import type { Belief } from '../../src/types';

export default function BeliefsScreen() {
  const [input, setInput] = useState('');
  const [stream, setStream] = useState('');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Belief[]>([]);
  useFocusEffect(useCallback(() => { listBeliefs().then(setList); }, []));

  const reframe = async () => {
    if (!input.trim()) return Alert.alert('先写下一个限制性信念');
    Alert.alert('发送确认', '这句信念将发送给 DeepSeek。', [
      { text: '取消', style: 'cancel' },
      { text: '发送', onPress: async () => {
        setLoading(true); setStream('');
        try {
          const raw = await runReframe(input.trim(), d => setStream(s => s + d));
          const r = parseReframe(raw);
          await addBelief(r);
          setInput(''); setStream('');
          setList(await listBeliefs());
          Alert.alert('已改写并保存', r.mantra);
        } catch (e: any) {
          Alert.alert('改写失败', e.message ?? String(e));
        } finally { setLoading(false); }
      }},
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.c}>
      <Text style={styles.h}>信念改写</Text>
      <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="写下一个限制你的信念，如“我不擅长理财”" multiline />
      <Button title="改写成赋能信念" onPress={reframe} />
      {loading && <View style={styles.card}><Text>{stream}</Text><ActivityIndicator /></View>}
      <Text style={styles.h}>我的赋能信念</Text>
      {list.map(b => (
        <View key={b.id} style={styles.card}>
          <Text style={styles.mantra}>{b.mantra}</Text>
          <Text style={styles.small}>原：{b.limitingBelief}</Text>
          <Text style={styles.small}>新：{b.empoweringBelief}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  c: { padding: 16, gap: 10 },
  h: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 70, textAlignVertical: 'top' },
  card: { backgroundColor: '#F3EEFA', borderRadius: 8, padding: 10, gap: 4 },
  mantra: { fontSize: 15, fontWeight: '600' },
  small: { color: '#666', fontSize: 12 },
});
```

- [ ] **Step 2: 真机验收 + 提交**

真机：输入限制性信念 → 改写 → 见到四段结果、保存进列表。
```bash
git add -A && git commit -m "feat: belief reframing screen"
```

---

## Task 14：冥想列表 + 播放页（TTS + 计时）

**Files:**
- Modify: `app/(tabs)/meditate.tsx`
- Create: `app/meditate/[scriptId].tsx`

- [ ] **Step 1: 冥想列表**

Replace `app/(tabs)/meditate.tsx`:
```tsx
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { MEDITATION_SCRIPTS } from '../../src/domain/meditationScripts';

export default function MeditateScreen() {
  const router = useRouter();
  return (
    <FlatList
      contentContainerStyle={styles.c}
      data={MEDITATION_SCRIPTS}
      keyExtractor={s => s.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => router.push(`/meditate/${item.id}`)}>
          <Text style={styles.t}>{item.title}</Text>
          <Text style={styles.sub}>{item.steps.length} 步 · 约 {Math.round(item.steps.reduce((a, s) => a + s.seconds, 0) / 60)} 分钟</Text>
        </TouchableOpacity>
      )}
    />
  );
}
const styles = StyleSheet.create({
  c: { padding: 16, gap: 10 },
  row: { padding: 16, borderRadius: 10, backgroundColor: '#F3EEFA' },
  t: { fontSize: 16, fontWeight: '600' },
  sub: { color: '#666', marginTop: 4 },
});
```

- [ ] **Step 2: 播放页（TTS + 每秒 TICK）**

Create `app/meditate/[scriptId].tsx`:
```tsx
import { useEffect, useReducer, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MEDITATION_SCRIPTS, medReducer, initMedState } from '../../src/domain/meditationScripts';
import { addSession } from '../../src/data/meditationDao';

export default function PlayerScreen() {
  const { scriptId } = useLocalSearchParams<{ scriptId: string }>();
  const router = useRouter();
  const script = MEDITATION_SCRIPTS.find(s => s.id === scriptId)!;
  const [running, setRunning] = useState(true);
  const [state, dispatch] = useReducer(
    (s: any, a: any) => medReducer(s, a, script), script, initMedState
  );
  const spokenStep = useRef(-1);
  const startedAt = useRef(Date.now());

  // 朗读当前步（切步时触发一次）
  useEffect(() => {
    if (state.stepIndex !== spokenStep.current && !state.completed) {
      spokenStep.current = state.stepIndex;
      Speech.speak(script.steps[state.stepIndex].text, { language: 'zh-CN' });
    }
  }, [state.stepIndex, state.completed]);

  // 计时
  useEffect(() => {
    if (!running || state.completed) return;
    const t = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(t);
  }, [running, state.completed]);

  // 完成 → 记录
  useEffect(() => {
    if (state.completed) {
      Speech.stop();
      addSession({
        scriptId: script.id,
        durationSec: Math.round((Date.now() - startedAt.current) / 1000),
        completed: true,
      });
    }
  }, [state.completed]);

  return (
    <View style={styles.c}>
      <Text style={styles.title}>{script.title}</Text>
      {state.completed ? (
        <>
          <Text style={styles.done}>练习完成 🌿</Text>
          <Button title="返回" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Text style={styles.text}>{script.steps[state.stepIndex].text}</Text>
          <Text style={styles.step}>第 {state.stepIndex + 1}/{script.steps.length} 步</Text>
          <View style={styles.row}>
            <Button title={running ? '暂停' : '继续'} onPress={() => setRunning(r => !r)} />
            <Button title="重来" onPress={() => { Speech.stop(); spokenStep.current = -1; startedAt.current = Date.now(); dispatch({ type: 'RESET' }); setRunning(true); }} />
            <Button title="结束" onPress={() => { Speech.stop(); router.back(); }} />
          </View>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: '#7A5Fb0' },
  text: { fontSize: 22, textAlign: 'center', lineHeight: 34 },
  step: { textAlign: 'center', color: '#999' },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24 },
  done: { fontSize: 20, textAlign: 'center' },
});
```

- [ ] **Step 3: 真机验收 + 提交**

真机：进冥想 → 选脚本 → 文字逐步显示、TTS 朗读、可暂停/重来/结束、完成后记录。
```bash
git add -A && git commit -m "feat: meditation list + player (TTS + timer)"
```

---

## Task 15：收尾——错误与空态 + 验收清单

**Files:**
- Modify: 各屏（空态文案）

- [ ] **Step 1: 空态与提示**

为“今天/信念/我的”历史列表加空态文案（如“还没有记录，开始第一条吧”）。确认未配置 key 时点 AI 会引导去“我的”。

- [ ] **Step 2: 走查验收清单（Expo Go 真机）**

- [ ] 4 个 Tab 正常切换
- [ ] 阴影日记：五步可写、可存、可返回续写
- [ ] 教练：配置 key 后流式回应中文、入库、重进可见；未配置 key 有引导
- [ ] 信念改写：产出四段并保存
- [ ] 冥想：逐步显示 + TTS + 计时 + 完成记录
- [ ] 隐私：仅“问教练/改写”联网，其余离线可用

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "polish: empty states, error guidance, acceptance pass"
```

---

## Self-Review 记录

- **Spec 覆盖**：五步日记(Task 3/12)、冥想文字+TTS+计时(Task 7/14)、教练(Task 4/5/9/12)、信念改写(Task 4/6/9/13)、本地存储(Task 10)、密钥 secure-store(Task 8/11)、隐私“手动才联网+发送确认”(Task 12/13/11)、DeepSeek OpenAI 兼容+流式(Task 9)、导航(Task 2) —— 均有对应任务。
- **占位符**：无 TBD/“稍后实现”；每个代码步骤含完整代码。
- **类型一致性**：`ChatMsg`(prompts.ts) 贯穿 deepseek.ts；`streamChat` 注入 fetch 供测试、运行期封装 `runCoach/runReframe` 注入 `expo/fetch`；DAO 与 `src/types.ts` 字段一致。
- **已知取舍**：SQLite/secure-store/UI 为原生模块，用真机验收替代 node 单测；纯逻辑(步骤、prompt、SSE、reframe、冥想 reducer)走 TDD。
- **升级点**：自用 MVP 直连 DeepSeek、key 在客户端；公开发布前必须改后端代理（已在 spec 与 Task 9 注明）。
