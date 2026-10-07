import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Connection } from './connection';

const key = 'voice-for-speechless.connection';
export async function loadConnection(): Promise<Connection | null> {
  if (Platform.OS === 'web') return null;
  const value = await SecureStore.getItemAsync(key);
  if (!value) return null;
  try {
    const result = JSON.parse(value);
    return typeof result.url === 'string' && typeof result.token === 'string' ? result : null;
  } catch { return null; }
}
export async function storeConnection(connection: Connection | null) {
  if (Platform.OS === 'web') return;
  if (connection) await SecureStore.setItemAsync(key, JSON.stringify(connection), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(key);
}
