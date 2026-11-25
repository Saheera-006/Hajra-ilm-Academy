import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/routes/AppRoutes';
import { SiteProvider } from '@/context/SiteContext';
import { AuthProvider } from '@/context/AuthContext';
let wakeRequested = false;

export default function App() {
    useEffect(() => {
      if (!import.meta.env.PROD || wakeRequested) return;
      wakeRequested = true;
      const backend = import.meta.env.VITE_RENDER_WAKE_ORIGIN || 'https://hajara-ilm-academy-backend.onrender.com';
      // A direct public request wakes Render even if the Pages API proxy is unavailable.
      void fetch(new URL('/api/portal/batches/current', backend), {
        mode: 'no-cors',
        credentials: 'omit',
        cache: 'no-store',
      }).catch(() => {});
    }, []);
    return (<BrowserRouter>
      <SiteProvider>
        <AuthProvider><AppRoutes /></AuthProvider>
      </SiteProvider>
    </BrowserRouter>);
}
