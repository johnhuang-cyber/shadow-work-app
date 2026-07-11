import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { DeepseekModel } from '../types';

const KEY_API = 'deepseek_api_key';
const KEY_MODEL = 'deepseek_model';

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
