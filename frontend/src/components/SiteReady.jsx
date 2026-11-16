import { useSite } from '@/context/SiteContext';
import { Button } from '@/components/ui/button';
// Renders children with the loaded site data, or a loading / error state.
export default function SiteReady({ children }) {
    const { status, data, reload } = useSite();
    if (status === 'loading') {
        return <p role="status" className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Loading…</p>;
    }
    if (status === 'error') {
        return (<div role="alert" className="mx-auto max-w-3xl px-4 py-20">
        <p>We could not load this page. Please check your connection and try again.</p>
        <Button className="mt-4" onClick={reload}>Try again</Button>
      </div>);
    }
    return children(data);
}
