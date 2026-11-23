import { apiFetch } from '@/services/api';
export const getSite = (signal) => apiFetch('/api/public/site', { signal });
