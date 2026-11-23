import { fetchWithTimeout } from './requestTimeout';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const transient = new Set([502, 503, 504]);

// Only idempotent reads are retried; writes may have succeeded upstream.
export async function fetchWithRecovery(url, options = {}, timeoutMs = 30000) {
  const method = (options.method || 'GET').toUpperCase();
  const attempts = method === 'GET' || method === 'HEAD' ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      if (!transient.has(response.status) || attempt === attempts - 1) return response;
    } catch (error) {
      if (options.signal?.aborted || attempt === attempts - 1) throw error;
    }
    await delay(2500 * (attempt + 1));
  }
}
