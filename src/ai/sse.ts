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
          buffer = line + '\n' + buffer;
          break;
        }
      }
      return out;
    },
  };
}
