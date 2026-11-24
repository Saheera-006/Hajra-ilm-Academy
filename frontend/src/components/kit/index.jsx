// Shared design system for the Admin Control Center and the Student Portal.
// Colours come from CSS variables (see styles/portal.css) so one kit serves dark admin and light/dark student themes.
import { useEffect, useRef } from 'react';
import { Loader2, X, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }) {
  const variants = {
    primary: 'bg-[var(--p-accent)] text-[var(--p-accent-fg)] hover:bg-[var(--p-accent-hover)] shadow-[0_6px_18px_-8px_var(--p-accent)]',
    secondary: 'border border-[var(--p-border)] bg-[var(--p-surface-2)] text-[var(--p-text)] hover:border-[var(--p-accent)]/60 hover:bg-[var(--p-surface-3)]',
    ghost: 'text-[var(--p-muted)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-text)]',
    danger: 'border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  };
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' };
  return (
    <button
      disabled={disabled || loading}
      className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--p-accent)] disabled:cursor-not-allowed disabled:opacity-50', variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ className, children, as: Tag = 'div', ...rest }) {
  return <Tag className={cn('rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-5 shadow-[0_1px_0_rgba(255,255,255,.03)_inset]', className)} {...rest}>{children}</Tag>;
}

const tones = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  danger: 'border-red-500/30 bg-red-500/10 text-red-300',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  neutral: 'border-[var(--p-border)] bg-[var(--p-surface-3)] text-[var(--p-muted)]',
};
export function Badge({ tone = 'neutral', className, children }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', tones[tone], className)}>{children}</span>;
}

export const inputClass = 'h-11 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] px-3.5 text-sm text-[var(--p-text)] placeholder:text-[var(--p-muted)]/70 transition focus:border-[var(--p-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--p-accent)]/25 disabled:opacity-60';

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="grid gap-1.5">
      {label && <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-[var(--p-muted)]">{label}</label>}
      {children}
      {hint && !error && <p className="text-xs text-[var(--p-muted)]">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/** Accessible toggle switch (role="switch"). */
export function Switch({ checked, onChange, disabled, label, onLabel = 'On', offLabel = 'Off', id }) {
  return (
    <button
      type="button" role="switch" id={id} aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('group inline-flex items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--p-accent)] disabled:opacity-60')}
    >
      <span className={cn('relative h-7 w-12 rounded-full border transition-colors duration-200', checked ? 'border-emerald-400/60 bg-emerald-500' : 'border-[var(--p-border)] bg-[var(--p-surface-3)]')}>
        <span className={cn('absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-all duration-200', checked ? 'left-[22px]' : 'left-0.5')} style={{ height: 22, width: 22 }} />
      </span>
      <span className={cn('text-sm font-semibold', checked ? 'text-emerald-400' : 'text-[var(--p-muted)]')}>{checked ? onLabel : offLabel}</span>
    </button>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-[var(--p-surface-3)]', className)} aria-hidden />;
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--p-border)] px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--p-surface-3)] text-[var(--p-accent)]"><Icon className="h-6 w-6" /></span>
      <h3 className="text-base font-semibold text-[var(--p-text)]">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-[var(--p-muted)]">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button aria-label="Close dialog" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`relative flex max-h-[calc(100dvh-2rem)] w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} flex-col rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-4 sm:p-6 shadow-2xl outline-none`}>
        <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
          <h2 className="font-sans text-lg font-semibold text-[var(--p-text)]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[var(--p-muted)] hover:bg-[var(--p-surface-3)]"><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain text-sm text-[var(--p-text)]">{children}</div>
        {footer && <div className="mt-4 flex shrink-0 justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-[var(--p-text)] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-[var(--p-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatusMessage({ error, notice }) {
  if (error) return <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>;
  if (notice) return <p role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p>;
  return null;
}
