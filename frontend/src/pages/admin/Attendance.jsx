import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Check, X, RotateCcw, Save, Users, ArrowRight, Info } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Skeleton, StatusMessage, inputClass } from '@/components/kit';
import { portal } from '@/services/portalApi';
import { cn } from '@/lib/utils';
import { StudentIdCell, TableWrap, Td, Th, fmt, useApi } from './shared';

/** Three-state control: unmarked (neither side lit) / Present (green) / Absent (red). */
function StatusSwitch({ value, onChange, name }) {
  const base = 'inline-flex h-9 items-center gap-1.5 px-3.5 text-xs font-bold transition-colors';
  return (
    <div role="radiogroup" aria-label={`Attendance for ${name}`} className="inline-flex overflow-hidden rounded-full border border-[var(--p-border)] bg-[var(--p-input)]">
      <button type="button" role="radio" aria-checked={value === 'PRESENT'} onClick={() => onChange('PRESENT')} className={cn(base, value === 'PRESENT' ? 'bg-blue-500 text-blue-950' : 'text-[var(--p-muted)] hover:bg-blue-500/10 hover:text-blue-300')}><Check className="h-3.5 w-3.5" />Present</button>
      <button type="button" role="radio" aria-checked={value === 'ABSENT'} onClick={() => onChange('ABSENT')} className={cn(base, value === 'ABSENT' ? 'bg-red-500 text-white' : 'text-[var(--p-muted)] hover:bg-red-500/10 hover:text-red-300')}><X className="h-3.5 w-3.5" />Absent</button>
    </div>
  );
}

export default function Attendance() {
  const ctx = useApi('/admin/attendance/context');
  const batches = useApi('/admin/batches');
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState('');
  const [sheet, setSheet] = useState(null);      // loaded from server
  const [marks, setMarks] = useState({});        // enrollmentId -> status (working copy)
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState({ error: '', notice: '' });

  // Defaults: registration-open batch (or newest) and today's date in the academy timezone.
  useEffect(() => {
    if (!ctx.data) return;
    setBatchId((b) => b || (ctx.data.defaultBatchId ? String(ctx.data.defaultBatchId) : ''));
    setDate((d) => d || ctx.data.today);
  }, [ctx.data]);

  async function load(e) {
    e?.preventDefault();
    if (!batchId || !date) return;
    setLoading(true); setFlash({ error: '', notice: '' });
    try {
      const s = await portal(`/admin/attendance/sheet?batchId=${batchId}&date=${date}`);
      setSheet(s);
      setMarks(Object.fromEntries(s.students.filter((x) => x.status).map((x) => [x.enrollmentId, x.status])));
    } catch (err) { setFlash({ error: err.message, notice: '' }); setSheet(null); }
    finally { setLoading(false); }
  }

  const saved = useMemo(() => Object.fromEntries((sheet?.students || []).filter((x) => x.status).map((x) => [x.enrollmentId, x.status])), [sheet]);
  const dirty = useMemo(() => Object.keys(marks).filter((k) => marks[k] !== saved[k]).length + Object.keys(saved).filter((k) => !marks[k]).length, [marks, saved]);
  const counts = useMemo(() => {
    const total = sheet?.students.length || 0;
    const p = Object.values(marks).filter((v) => v === 'PRESENT').length, a = Object.values(marks).filter((v) => v === 'ABSENT').length;
    return { total, p, a, unmarked: total - p - a };
  }, [marks, sheet]);

  const setAll = (status) => setMarks(Object.fromEntries(sheet.students.map((s) => [s.enrollmentId, status])));
  const reset = () => setMarks({ ...saved });

  async function save() {
    const records = Object.entries(marks).map(([enrollmentId, status]) => ({ enrollmentId: Number(enrollmentId), status }));
    if (!records.length) { setFlash({ error: 'Mark at least one student before saving.', notice: '' }); return; }
    setSaving(true); setFlash({ error: '', notice: '' });
    try {
      const r = await portal('/admin/attendance/sheet', { method: 'PUT', body: JSON.stringify({ batchId: Number(batchId), date, records }) });
      setFlash({ error: '', notice: `Attendance saved: ${r.created} new, ${r.updated} changed, ${r.unchanged} unchanged.` });
      await load();
      setFlash((f) => (f.error ? f : { error: '', notice: `Attendance saved: ${r.created} new, ${r.updated} changed, ${r.unchanged} unchanged.` }));
    } catch (err) { setFlash({ error: err.message, notice: '' }); } finally { setSaving(false); }
  }

  const selectedBatch = batches.data?.find((b) => String(b.id) === batchId);

  return (
    <div>
      <PageHeader title="Attendance" description="Select a batch and date, load the class list, then mark each student." />
      <StatusMessage error={ctx.error || batches.error} />

      <Card>
        <form onSubmit={load} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <Field label="Step 1 · Batch" htmlFor="att-batch">
            <select id="att-batch" className={inputClass} value={batchId} onChange={(e) => { setBatchId(e.target.value); setSheet(null); }}>
              <option value="" disabled>Select a batch</option>
              {batches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}{b.status === 'OPEN' ? ' (registration open)' : ''}</option>)}
            </select>
          </Field>
          <Field label="Step 2 · Date" htmlFor="att-date"><input id="att-date" type="date" className={inputClass} value={date} max={ctx.data?.today} onChange={(e) => { setDate(e.target.value); setSheet(null); }} style={{ colorScheme: 'dark' }} /></Field>
          <Button type="submit" size="lg" loading={loading} disabled={!batchId || !date}>Load students<ArrowRight className="h-4 w-4" /></Button>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--p-muted)]">
          <Info className="h-3.5 w-3.5" />
          {selectedBatch ? <>Selected: <b className="text-[var(--p-text)]">{selectedBatch.name}</b> · {date ? fmt(date) : '—'}</> : 'No batch selected'}
          {ctx.data?.noOpenBatch && <Badge tone="warning">No batch is open — showing the most recent batch</Badge>}
          {ctx.data && <span>· Timezone {ctx.data.timezone}</span>}
        </div>
      </Card>

      <div className="mt-4"><StatusMessage error={flash.error} notice={flash.notice} /></div>

      {loading && !sheet ? <Skeleton className="mt-4 h-64" />
        : sheet && (!sheet.students.length ? <div className="mt-4"><EmptyState icon={Users} title="No students in this batch" text="Enrolled students will appear here for marking." /></div> : (
          <Card className="mt-2 overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--p-border)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">{counts.p} present</Badge><Badge tone="danger">{counts.a} absent</Badge><Badge>{counts.unmarked} unmarked</Badge>
                {dirty > 0 && <Badge tone="warning">Unsaved changes</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAll('PRESENT')}><Check className="h-4 w-4" />Mark all present</Button>
                <Button variant="secondary" size="sm" onClick={() => setAll('ABSENT')}><X className="h-4 w-4" />Mark all absent</Button>
                <Button variant="ghost" size="sm" onClick={reset} disabled={!dirty}><RotateCcw className="h-4 w-4" />Reset unsaved</Button>
                <Button size="sm" onClick={save} loading={saving} disabled={!dirty}><Save className="h-4 w-4" />Save attendance</Button>
              </div>
            </div>
            <TableWrap>
              <thead className="border-b border-[var(--p-border)] bg-[var(--p-surface-2)]"><tr><Th>Student ID</Th><Th>Student name</Th><Th>Saved</Th><Th className="text-right">Attendance</Th></tr></thead>
              <tbody className="divide-y divide-[var(--p-border)]">
                {sheet.students.map((s) => (
                  <tr key={s.enrollmentId} className="hover:bg-[var(--p-surface-2)]">
                    <Td><StudentIdCell id={s.studentId} /></Td><Td className="font-medium">{s.name}</Td>
                    <Td>{s.status ? <Badge tone={s.status === 'PRESENT' ? 'success' : 'danger'}>{s.status === 'PRESENT' ? 'Present' : 'Absent'}</Badge> : <span className="text-xs text-[var(--p-muted)]">Not recorded</span>}</Td>
                    <Td className="text-right"><StatusSwitch value={marks[s.enrollmentId]} name={s.name} onChange={(v) => setMarks((m) => ({ ...m, [s.enrollmentId]: v }))} /></Td>
                  </tr>))}
              </tbody>
            </TableWrap>
          </Card>))}
      {!sheet && !loading && <div className="mt-4"><EmptyState icon={CalendarCheck} title="Choose a batch and date" text="Then press Load students to open the class list." /></div>}
    </div>
  );
}
