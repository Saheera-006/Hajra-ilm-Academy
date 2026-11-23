import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { portal } from '@/services/portalApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const current = await portal('/me');
      setUser(current);
      setConnectionError(false);
      return current;
    } catch (error) {
      if (error?.status === 401) {
        setUser(null);
        setConnectionError(false);
      } else {
        // Network failure is not proof of logout. Preserve the last known user.
        setConnectionError(true);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!connectionError) return;
    const retry = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = setInterval(retry, 30000);
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    return () => { clearInterval(timer); window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', retry); };
  }, [connectionError, refresh]);

  useEffect(() => {
    if (!loading) document.documentElement.classList.remove('student-launching');
  }, [loading]);

  const logout = useCallback(async () => {
    try {
      await portal('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setConnectionError(false);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, connectionError, refresh, logout }), [user, loading, connectionError, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
