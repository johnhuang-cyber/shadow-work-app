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
