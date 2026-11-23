import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function FullScreenLoader() {
  return (
    <div className="portal-theme flex min-h-screen items-center justify-center" data-theme="dark" role="status" aria-live="polite">
      <Loader2 className="h-7 w-7 animate-spin text-[var(--p-accent)]" aria-label="Checking your session" />
    </div>
  );
}

/** Frontend gate only: every API call is re-checked by the backend (ADMIN role / own enrollment). */
export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (user.role !== 'ADMIN') return <Navigate to="/admin/login" replace state={{ denied: true }} />;
  return children;
}

export function RequireStudent({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return children;
}

/** Login pages send already-signed-in users straight to their own area. */
export function RedirectIfAuthed({ admin = false, children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user && !admin) return <Navigate to="/student" replace />;
  return children;
}
