import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { portal } from '@/services/portalApi';

/** Loads one GET endpoint; failures are reported per request, never faked into empty data. */
export function useApi(path, enabled = true) {
  const [state, setState] = useState({ data: null, loading: enabled, error: '' });
  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try { setState({ data: await portal(path), loading: false, error: '' }); }
    catch (e) { setState({ data: null, loading: false, error: e.message }); }
  }, [path]);
  useEffect(() => { if (enabled) void reload(); }, [reload, enabled]);
  return { ...state, reload };
}

export const StudentDataContext = createContext(null);
export const useStudentData = () => useContext(StudentDataContext);

export const fmtDate = (v, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', opts);
};
