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
          // 完整的一行（有换行结尾）却解析失败 = 畸形数据，丢弃并继续处理后续行；
          // 跨 chunk 的半行没有换行，不会进到这里（留在 buffer 等下一段）。
          continue;
        }
      }
      return out;
    },
  };
}
