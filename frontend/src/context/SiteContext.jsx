import { createContext, useContext, useEffect, useState } from 'react';
import { publicSite } from '@/data/publicSite';
import { getSite } from '@/services/siteApi';

const SiteContext = createContext(publicSite);
const CACHE_KEY = 'hajara-public-site-v2';
const merge = published => ({
  ...publicSite, ...published,
  course: published.course ?? publicSite.course,
  content: published.content ?? publicSite.content,
  announcements: published.announcements ?? publicSite.announcements,
  // Enrollment and payment status must never be taken from stale cache.
  batch: published.batch ?? null,
});
function cachedSite() {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (value && typeof value === 'object') return { ...merge(value), batch: null };
  } catch { /* Storage may be disabled. */ }
  return publicSite;
}
export function SiteProvider({ children }) {
  const [site, setSite] = useState(cachedSite);
  useEffect(() => {
    let mounted = true;
    let controller;
    const load = async () => {
      if (controller) controller.abort();
      controller = new AbortController();
      try {
        const published = await getSite(controller.signal);
        if (!mounted || !published) return;
        setSite(merge(published));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(published)); } catch { /* optional cache */ }
      } catch { /* Preserve bundled or last-known-good public content. */ }
    };
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60000);
    const online = () => void load();
    window.addEventListener('online', online);
    return () => { mounted = false; controller?.abort(); clearInterval(timer); window.removeEventListener('online', online); };
  }, []);
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}
export const useSite = () => useContext(SiteContext);
