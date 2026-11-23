import { useLocation } from 'react-router-dom';
import { Admin, SLUGS } from '@/pages/Portal';

const BY_SLUG = Object.fromEntries(Object.entries(SLUGS).map(([name, slug]) => [slug, name]));

/** Maps /admin/<slug> to the matching management panel. Phases 2-4 replace panels one by one with dedicated pages. */
export default function AdminSection() {
  const slug = useLocation().pathname.replace(/^\/admin\/?/, '').split('/')[0];
  return <Admin tab={BY_SLUG[slug] ?? 'Overview'} />;
}
