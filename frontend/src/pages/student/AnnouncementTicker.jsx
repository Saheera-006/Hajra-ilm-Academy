import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Modal, Button } from '@/components/kit';
import { fmtDate } from './useStudentData';

/** Continuously scrolling banner. Pauses on hover/focus; static list when reduced motion is requested (CSS). */
export default function AnnouncementTicker({ items }) {
  const [open, setOpen] = useState(null);
  if (!items?.length) return null;
  const duration = Math.max(20, items.length * 12);
  const row = (suffix, hidden) => items.map((a) => (
    <button key={`${a.id}${suffix}`} tabIndex={hidden ? -1 : 0} aria-hidden={hidden || undefined} onClick={() => setOpen(a)}
      className="mx-6 inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium text-[var(--p-text)] hover:text-[var(--p-accent)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--p-accent)]" />{a.title}
    </button>
  ));
  return (
    <>
      <section aria-label="Announcements" className="portal-marquee flex items-center overflow-hidden rounded-2xl border border-[var(--p-accent)]/30 bg-[var(--p-accent)]/8">
        <span className="z-10 flex shrink-0 items-center gap-2 bg-[var(--p-accent)] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--p-accent-fg)]"><Megaphone className="h-4 w-4" />Latest</span>
        <div className="min-w-0 flex-1 overflow-hidden py-3">
          <div className="portal-marquee-track" style={{ '--marquee-duration': `${duration}s` }}>
            <div className="flex">{row('', false)}</div>
            <div className="portal-marquee-dup flex" aria-hidden>{row('-dup', true)}</div>
          </div>
        </div>
      </section>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title} footer={<Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>}>
        {open?.createdAt && <p className="mb-3 text-xs text-[var(--p-muted)]">{fmtDate(open.createdAt)}</p>}
        <p className="whitespace-pre-line leading-relaxed">{open?.body}</p>
      </Modal>
    </>
  );
}
