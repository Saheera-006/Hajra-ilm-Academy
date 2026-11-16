// Single place for API configuration and error handling.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export async function apiFetch(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    if (!res.ok) {
        // Never surface raw server details to visitors.
        throw new ApiError(res.status, res.status >= 500 ? 'Something went wrong. Please try again.' : 'Request failed.');
    }
    return res.status === 204 ? null : res.json();
}
