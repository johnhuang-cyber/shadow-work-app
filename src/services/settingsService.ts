import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { DeepseekModel } from '../types';

const KEY_API = 'deepseek_api_key';
const KEY_MODEL = 'deepseek_model';
const KEY_AI_CONSENT = 'ai_send_consent';

// expo-secure-store 在 Web 上没有实现。为了能在 Mac 浏览器里做开发预览，
// Web 回退到 localStorage（不加密，仅用于本地预览）；真机（iOS/Android）仍走加密的 SecureStore。
const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return (globalThis as any).localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    (globalThis as any).localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getApiKey(): Promise<string | null> {
  return getItem(KEY_API);
}

export async function setApiKey(key: string): Promise<void> {
  await setItem(KEY_API, key.trim());
}

export async function getModel(): Promise<DeepseekModel> {
  const m = await getItem(KEY_MODEL);
  return m === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
}

export async function setModel(m: DeepseekModel): Promise<void> {
  await setItem(KEY_MODEL, m);
}

/** 是否已同意「内容将发送给 DeepSeek」——只在第一次发送前询问一次。 */
export async function getAiConsent(): Promise<boolean> {
  return (await getItem(KEY_AI_CONSENT)) === '1';
}

export async function setAiConsent(): Promise<void> {
  await setItem(KEY_AI_CONSENT, '1');
}

/** 今日力量感（设计稿 08）：按天存 1-10 的分值，key 形如 power_2026-07-12。 */
export async function getPowerScore(dateKey: string): Promise<number | null> {
  const v = await getItem(`power_${dateKey}`);
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function setPowerScore(dateKey: string, v: number): Promise<void> {
  await setItem(`power_${dateKey}`, String(v));
}

/** 主题偏好：system 跟随系统 / dark 强制深色 / light 强制浅色。 */
export type ThemePref = 'system' | 'dark' | 'light';

export async function getThemePref(): Promise<ThemePref> {
  const v = await getItem('theme_pref');
  return v === 'dark' || v === 'light' ? v : 'system';
}

export async function setThemePref(pref: ThemePref): Promise<void> {
  await setItem('theme_pref', pref);
}

/** 频率卡「每日提醒」开关（设计稿 07/25b）：key 形如 reminder_<beliefId>。 */
export async function getReminderFlag(beliefId: string): Promise<boolean> {
  return (await getItem(`reminder_${beliefId}`)) === '1';
}

export async function setReminderFlag(beliefId: string, on: boolean): Promise<void> {
  await setItem(`reminder_${beliefId}`, on ? '1' : '0');
}
