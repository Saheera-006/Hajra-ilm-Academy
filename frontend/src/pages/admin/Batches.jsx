import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Plus, CalendarDays, Users, Hourglass } from 'lucide-react';
import { Button, Card, EmptyState, Field, inputClass, Modal, PageHeader, Skeleton, StatusMessage } from '@/components/kit';
import { portal } from '@/services/portalApi';
import { BatchStatusBadge, fmt, toDateInput, useApi } from './shared';

export function BatchFormModal({ open, onClose, batch, onSaved }) {
  const edit = !!batch;
  const [f, setF] = useState(() => init(batch));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function init(b) {
    return { name: b?.name ?? '', classesStartAt: toDateInput(b?.classes_start_at), enrollmentClosesAt: toDateInput(b?.enrollment_closes_at), whatsappLink: b?.whatsapp_link ?? '', courseFee: b ? String(b.course_fee ?? '') : '' };
  }
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = 'Batch name is required';
    if (f.whatsappLink && !/^https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\//.test(f.whatsappLink.trim())) errs.whatsappLink = 'Use a https://chat.whatsapp.com/… invite link';
    if (f.courseFee && (Number.isNaN(Number(f.courseFee)) || Number(f.courseFee) < 0)) errs.courseFee = 'Enter a valid amount';
    setErrors(errs); setError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const body = { name: f.name.trim(), classesStartAt: f.classesStartAt, enrollmentClosesAt: f.enrollmentClosesAt, whatsappLink: f.whatsappLink.trim(), courseFee: f.courseFee || '0' };
      const res = await portal(edit ? `/admin/batches/${batch.id}` : '/admin/batches', { method: edit ? 'PUT' : 'POST', body: JSON.stringify(body) });
      onSaved(res);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit batch' : 'Create batch'}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <StatusMessage error={error} />
        <Field label="Batch name *" htmlFor="b-name" error={errors.name}><input id="b-name" className={inputClass} value={f.name} onChange={set('name')} maxLength={150} placeholder="e.g. January 2027 Batch" autoFocus /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Class start date" htmlFor="b-start" hint="Optional — can be set later"><input id="b-start" type="date" className={inputClass} value={f.classesStartAt} onChange={set('classesStartAt')} style={{ colorScheme: 'dark' }} /></Field>
          <Field label="Registration deadline" htmlFor="b-close" hint="Optional"><input id="b-close" type="date" className={inputClass} value={f.enrollmentClosesAt} onChange={set('enrollmentClosesAt')} style={{ colorScheme: 'dark' }} /></Field>
        </div>
        <Field label="WhatsApp group invite link" htmlFor="b-wa" error={errors.whatsappLink} hint="Optional"><input id="b-wa" className={inputClass} value={f.whatsappLink} onChange={set('whatsappLink')} maxLength={500} placeholder="https://chat.whatsapp.com/…" /></Field>
        <Field label="One-time course fee (₹)" htmlFor="b-fee" error={errors.courseFee} hint="Optional — defaults to 0"><input id="b-fee" inputMode="decimal" className={inputClass} value={f.courseFee} onChange={set('courseFee')} placeholder="0" /></Field>
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>{edit ? 'Save changes' : 'Create batch'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Batches() {
  const nav = useNavigate();
  const list = useApi('/admin/batches');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader title="Batches" description="One programme, many batches. Newest first." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Create batch</Button>} />
      <StatusMessage error={list.error} />
      {list.loading && !list.data ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
        : !list.data?.length ? <EmptyState icon={Layers} title="No batches yet" text="Create your first batch to start enrolling students." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Create batch</Button>} />
        : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.data.map((b) => (
            <Link key={b.id} to={`/admin/batches/${b.id}`} className="group">
              <Card className="portal-rise h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[var(--p-accent)]/50 group-hover:shadow-[0_18px_40px_-24px_var(--p-accent)]">
                <div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-[var(--p-surface-3)] px-2.5 py-1 text-xs font-bold text-[var(--p-accent)]">Batch {String(b.batch_number).padStart(2, '0')}</span><BatchStatusBadge status={b.status} /></div>
                <h3 className="mt-4 text-lg font-semibold leading-snug">{b.name}</h3>
                <dl className="mt-5 grid gap-2.5 text-sm text-[var(--p-muted)]">
                  <div className="flex items-center gap-2.5"><Users className="h-4 w-4" /><dd><b className="text-[var(--p-text)]">{b.student_count}</b> students</dd></div>
                  <div className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4" /><dd>Classes start: {b.classes_start_at ? fmt(b.classes_start_at) : 'Not set'}</dd></div>
                  {b.enrollment_closes_at && <div className="flex items-center gap-2.5"><Hourglass className="h-4 w-4" /><dd>Deadline: {fmt(b.enrollment_closes_at)}</dd></div>}
                </dl>
              </Card>
            </Link>
          ))}
        </div>}
      <BatchFormModal key={creating} open={creating} onClose={() => setCreating(false)} onSaved={(r) => { setCreating(false); list.reload(); if (r?.id) nav(`/admin/batches/${r.id}`); }} />
    </div>
  );
}
