import { fetchWithRecovery } from './fetchWithRecovery';
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetchWithRecovery(`${BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(503, 'Server is starting or temporarily unavailable. Please retry.');
  }
  if (!res.ok) throw new ApiError(res.status, res.status >= 500 ? 'Server is temporarily unavailable. Please retry.' : 'Request failed.');
  return res.status === 204 ? null : res.json();
}
