import { createSseAccumulator } from './sse';
import type { ChatMsg } from './prompts';
import type { DeepseekModel } from '../types';

export interface StreamChatParams {
  apiKey: string;
  model: DeepseekModel;
  messages: ChatMsg[];
}

type FetchLike = (url: string, init: any) => Promise<any>;

export async function streamChat(
  { apiKey, model, messages }: StreamChatParams,
  onDelta: (text: string) => void,
  fetchImpl: FetchLike
): Promise<string> {
  const res = await fetchImpl('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
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

// Runtime wrappers — expo/fetch imported LAZILY so tests (node) don't try to resolve it.
export async function runCoach(userText: string, history: ChatMsg[], onDelta: (t: string) => void): Promise<string> {
  const { getApiKey, getModel } = await import('../services/settingsService');
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('尚未配置 DeepSeek API Key，请到「我的」里填写。');
  const model = await getModel();
  const { buildCoachMessages } = await import('./prompts');
  const { fetch: expoFetch } = await import('expo/fetch');
  return streamChat({ apiKey, model, messages: buildCoachMessages(userText, history) }, onDelta, expoFetch as any);
}

export async function runReframe(limitingBelief: string, onDelta: (t: string) => void): Promise<string> {
  const { getApiKey } = await import('../services/settingsService');
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('尚未配置 DeepSeek API Key，请到「我的」里填写。');
  const { buildReframeMessages } = await import('./prompts');
  const { fetch: expoFetch } = await import('expo/fetch');
  return streamChat({ apiKey, model: 'deepseek-reasoner', messages: buildReframeMessages(limitingBelief) }, onDelta, expoFetch as any);
}
