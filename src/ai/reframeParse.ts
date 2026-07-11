export interface ReframeResult {
  limitingBelief: string; source: string; empoweringBelief: string; mantra: string;
}
const grab = (text: string, label: string): string => {
  const m = text.match(new RegExp(`${label}\\s*[:：]\\s*(.+)`));
  return m ? m[1].trim() : '';
};
export function parseReframe(raw: string): ReframeResult {
  return {
    limitingBelief: grab(raw, '原信念'), source: grab(raw, '来源'),
    empoweringBelief: grab(raw, '新信念'), mantra: grab(raw, '复述'),
  };
}
