import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export function createAudioCache() {
  let uri: string | null = null;
  const clear = async () => {
    const previous = uri;
    uri = null;
    if (!previous) return;
    if (Platform.OS === 'web') URL.revokeObjectURL(previous);
    else await FileSystem.deleteAsync(previous, { idempotent: true });
  };
  return {
    clear,
    async prepare(buffer: ArrayBuffer) {
      await clear();
      if (buffer.byteLength > 2 * 1024 * 1024 || !buffer.byteLength) throw new Error('audio');
      if (Platform.OS === 'web') {
        uri = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
      } else {
        if (!FileSystem.cacheDirectory) throw new Error('cache');
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        uri = `${FileSystem.cacheDirectory}speech-${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(uri, btoa(binary), { encoding: FileSystem.EncodingType.Base64 });
      }
      return uri;
    }
  };
}
