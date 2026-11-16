import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/routes/AppRoutes';
import { SiteProvider } from '@/context/SiteContext';
import { AuthProvider } from '@/context/AuthContext';
export default function App() {
    return (<BrowserRouter>
      <SiteProvider>
        <AuthProvider><AppRoutes /></AuthProvider>
      </SiteProvider>
    </BrowserRouter>);
}
