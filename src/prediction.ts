export function validWords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((word): word is string => typeof word === 'string' && /^[\p{L}\p{M}'’-]{1,32}$/u.test(word)))].slice(0, 3);
}

// Invalidate in-flight work immediately, including during the debounce interval.
export function createPredictionScheduler(
  fetchWords: (text: string, signal: AbortSignal) => Promise<string[]>,
  update: (words: string[]) => void,
  delay = 400
) {
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  const cancel = () => {
    revision += 1;
    clearTimeout(timer);
    controller?.abort();
  };
  return {
    cancel,
    schedule(text: string) {
      cancel();
      update([]);
      if (!text.trim()) return;
      const current = revision;
      timer = setTimeout(async () => {
        controller = new AbortController();
        try {
          const words = await fetchWords(text, controller.signal);
          if (revision === current) update(validWords(words));
        } catch {
          if (revision === current) update([]);
        }
      }, delay);
    }
  };
}
