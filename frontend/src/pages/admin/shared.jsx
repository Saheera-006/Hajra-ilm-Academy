import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge, Button, inputClass } from '@/components/kit';
import { cn } from '@/lib/utils';

export { useApi } from '@/pages/student/useStudentData';

export const fmt = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const toDateInput = (v) => (v ? String(v).slice(0, 10) : '');

export function BatchStatusBadge({ status }) {
  const map = { OPEN: ['success', 'Registration Open'], CLOSED: ['neutral', 'Registration Closed'], DRAFT: ['neutral', 'Registration Closed'], COMPLETED: ['info', 'Completed'] };
  const [tone, label] = map[status] || ['neutral', status];
  return <Badge tone={tone}><span className={cn('h-1.5 w-1.5 rounded-full', status === 'OPEN' ? 'bg-blue-400' : 'bg-current opacity-60')} />{label}</Badge>;
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--p-muted)]" />
      <input className={`${inputClass} pl-10`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function Pagination({ page, size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  return (
    <div className="flex items-center justify-between border-t border-[var(--p-border)] px-5 py-3 text-sm text-[var(--p-muted)]">
      <span>{page * size + 1}–{Math.min(total, (page + 1) * size)} of {total}</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <span>Page {page + 1} / {pages}</span>
        <Button variant="secondary" size="sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export const Th = ({ children, className }) => <th className={cn('px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--p-muted)]', className)}>{children}</th>;
export const Td = ({ children, className }) => <td className={cn('px-5 py-3.5 text-sm', className)}>{children}</td>;
export const TableWrap = ({ children }) => <div className="portal-scroll overflow-x-auto"><table className="w-full min-w-[640px] border-collapse">{children}</table></div>;
export const StudentIdCell = ({ id }) => id ? <span className="font-mono text-[13px] font-semibold tracking-wide text-[var(--p-accent)]">{id}</span> : <span className="text-xs text-[var(--p-muted)]">Pending</span>;
