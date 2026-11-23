import { fetchWithRecovery } from './fetchWithRecovery';
import { fetchWithTimeout } from './requestTimeout';
// API client for the student / admin portal: cookie session + CSRF token handling.
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class PortalError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let csrfToken = null;

async function loadCsrf() {
  const res = await fetchWithTimeout(`${BASE}/api/portal/csrf`, { credentials: 'include' });
  if (!res.ok) throw new PortalError(res.status, 'Could not start a secure session. Please try again.');
  csrfToken = (await res.json()).token;
}

async function readMessage(res) {
  try {
    const body = await res.json();
    if (body && typeof body.message === 'string' && body.message) return body.message;
  } catch {
    /* body was empty or not JSON */
  }
  if (res.status === 401) return 'Please log in again.';
  if (res.status === 403) return 'You do not have permission to do that.';
  if (res.status === 429) return 'Too many requests. Please wait a moment and try again.';
  return res.status >= 500 ? 'Something went wrong. Please try again.' : `Request failed (${res.status}).`;
}

export async function portal(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const unsafe = method !== 'GET' && method !== 'HEAD';
  if (unsafe && !csrfToken) await loadCsrf();

  const send = () =>
    fetchWithRecovery(`${BASE}/api/portal${path}`, {
      credentials: 'include',
      ...options,
      method,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(unsafe ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        ...options.headers,
      },
    });

  let res;
  try { res = await send(); } catch (error) {
    throw new PortalError(503, 'Server is starting or temporarily unavailable. Please retry.');
  }
  // Never automatically replay writes after 403: the request may have had side effects.
  // Clear the stale token so the next explicit user action fetches a fresh one.
  if (res.status === 403 && unsafe) csrfToken = null;
  if (!res.ok) throw new PortalError(res.status, await readMessage(res));
  return res.status === 204 ? null : res.json();
}
