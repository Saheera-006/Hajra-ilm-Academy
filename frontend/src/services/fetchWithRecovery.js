import { fetchWithTimeout } from './requestTimeout';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const enrollmentTransient = new Set([520, 522, 524]);
const transient = new Set([502, 503, 504]);

// Only idempotent reads are retried; writes may have succeeded upstream.
export async function fetchWithRecovery(url, options = {}, timeoutMs = 65000, waitForEnrollment = false) {
  const method = (options.method || 'GET').toUpperCase();
  const attempts = method === 'GET' || method === 'HEAD' ? (waitForEnrollment ? 5 : 3) : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    let retryDelay = waitForEnrollment ? Math.min(10000 * (attempt + 1), 30000) : 2500 * (attempt + 1);
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      const loadingPage = waitForEnrollment && response.ok &&
        response.headers.get('Content-Type')?.includes('text/html');
      const rateLimited = waitForEnrollment && response.status === 429;
      if (!loadingPage && !rateLimited && !transient.has(response.status) &&
          !(waitForEnrollment && enrollmentTransient.has(response.status))) return response;
      if (attempt === attempts - 1) return response;
      if (waitForEnrollment) {
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterMs = retryAfter && (/^\d+$/.test(retryAfter)
          ? Number(retryAfter) * 1000
          : Date.parse(retryAfter) - Date.now());
        if (retryAfterMs > 30000) return response;
        retryDelay = Math.max(retryDelay, retryAfterMs || 0);
      }
    } catch (error) {
      if (options.signal?.aborted || attempt === attempts - 1) throw error;
    }
    await delay(retryDelay);
  }
}
