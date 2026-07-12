import type { Quote, QuoteTheme } from '../content/quotes';

/** 一年中的第几天（1 月 1 日 = 1），与首页每日引导语的轮换口径一致。 */
export function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
}

/** 每日一句：按年内天数取模，同一天恒定，逐日轮换。 */
export function dailyQuote(date: Date, quotes: Quote[]): Quote {
  return quotes[dayOfYear(date) % quotes.length];
}

/**
 * 按主题取一句：过滤主题后按 seed 取模。
 * 纯函数——同样的 seed 永远给同一句；调用方自行决定 seed（如 dayOfYear、Date.now()）。
 */
export function themeQuote(theme: QuoteTheme, quotes: Quote[], seed: number): Quote {
  const pool = quotes.filter((q) => q.theme === theme);
  if (pool.length === 0) return quotes[Math.abs(seed) % quotes.length];
  return pool[Math.abs(seed) % pool.length];
}
