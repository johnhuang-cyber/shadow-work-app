import { streamChat } from '../src/ai/deepseek';

function fakeStreamResponse(lines: string[]) {
  let i = 0;
  const encoder = new TextEncoder();
  return {
    ok: true, status: 200,
    body: { getReader() { return { read: async () =>
      i < lines.length ? { done: false, value: encoder.encode(lines[i++]) } : { done: true, value: undefined } }; } },
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
  const full = await streamChat({ apiKey: 'sk-x', model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }] }, (c) => chunks.push(c), fakeFetch as any);
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
  await expect(streamChat({ apiKey: 'bad', model: 'deepseek-chat', messages: [] }, () => {}, fakeFetch as any)).rejects.toThrow(/401/);
});
