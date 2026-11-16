import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSite } from '@/services/siteApi';
const SiteContext = createContext(null);
export function SiteProvider({ children }) {
    const [state, setState] = useState({ status: 'loading', data: null });
    const load = useCallback(() => {
        setState({ status: 'loading', data: null });
        getSite()
            .then((data) => setState({ status: 'ready', data }))
            .catch(() => setState({ status: 'error', data: null }));
    }, []);
    useEffect(() => { load(); }, [load]);
    return <SiteContext.Provider value={{ ...state, reload: load }}>{children}</SiteContext.Provider>;
}
export const useSite = () => useContext(SiteContext);
