import { useSite } from '@/context/SiteContext';

export default function SiteReady({ children }) {
    return children(useSite());
}
