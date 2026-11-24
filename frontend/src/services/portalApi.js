import { fetchWithRecovery } from './fetchWithRecovery';
// API client for the student / admin portal: cookie session + CSRF token handling.
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class PortalError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Share only an in-flight token request, never retain a token across writes.
let csrfPending;
async function loadCsrf() {
  if (!csrfPending) {
    csrfPending = (async () => {
      const res = await fetchWithRecovery(`${BASE}/api/portal/csrf`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new PortalError(res.status, 'Could not start a secure session. The server may still be starting. Please retry.');
      const { token } = await res.json();
      if (typeof token !== 'string' || !token) throw new PortalError(503, 'Could not start a secure session. The server may still be starting. Please retry.');
      return token;
    })().finally(() => { csrfPending = undefined; });
  }
  return csrfPending;
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


  const send = (csrfToken) =>
    fetchWithRecovery(`${BASE}/api/portal${path}`, {
      credentials: 'include',
      ...options,
      method,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
        ...(unsafe ? { 'X-XSRF-TOKEN': csrfToken } : {}),
      },
    });

  let res;
  try {
    res = await send(unsafe ? await loadCsrf() : undefined);
    // Only replay a write explicitly rejected by the CSRF filter before the controller.
    if (unsafe && res.status === 403 && !options.signal?.aborted) {
      const error = await res.clone().json().catch(() => null);
      if (error?.code === 'CSRF_REJECTED') {
        res = await send(await loadCsrf());
      }
    }
  } catch (error) {
    if (error instanceof PortalError || options.signal?.aborted) throw error;
    throw new PortalError(503, 'Server is starting or temporarily unavailable. Please retry.');
  }
  if (!res.ok) throw new PortalError(res.status, await readMessage(res));
  return res.status === 204 ? null : res.json();
}
