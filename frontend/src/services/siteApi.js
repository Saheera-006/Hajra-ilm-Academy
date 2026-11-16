import { apiFetch } from '@/services/api';
export const getSite = () => apiFetch('/api/public/site');
