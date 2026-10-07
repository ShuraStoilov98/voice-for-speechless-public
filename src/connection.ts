export type Connection = { url: string; token: string };

export function normalizeUrl(value: string, development: boolean): string {
  const url = new URL(value.trim());
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('url');
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]' || /^10\.\d+\.\d+\.\d+$/.test(url.hostname) ||
    /^192\.168\.\d+\.\d+$/.test(url.hostname) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(url.hostname);
  if (url.protocol !== 'https:' && !(development && local && url.protocol === 'http:')) throw new Error('url');
  return url.origin;
}

export function validateConnection(url: string, token: string, development: boolean): Connection {
  const normalized = normalizeUrl(url, development);
  if (!/^[a-f0-9]{64}$/i.test(token.trim())) throw new Error('token');
  return { url: normalized, token: token.trim() };
}

export async function backendRequest(connection: Connection, route: string, text: string, language: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${connection.url}/v1/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${connection.token}` },
      body: JSON.stringify({ text, language }),
      redirect: 'error', signal: controller.signal
    });
    if (!response.ok) throw new Error(response.status === 401 ? 'auth' : response.status === 429 ? 'limit' : 'network');
    return response;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
