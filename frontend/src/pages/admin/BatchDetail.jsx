import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Users, CalendarDays, MessageCircle, Hash, CheckCircle2, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Modal, Skeleton, StatusMessage, Switch } from '@/components/kit';
import { portal } from '@/services/portalApi';
import { BatchStatusBadge, Pagination, SearchBox, StudentIdCell, TableWrap, Td, Th, fmt, useApi, useDebounced } from './shared';
import { BatchFormModal } from './Batches';

export default function BatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const batch = useApi(`/admin/batches/${batchId}`);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const dq = useDebounced(q);
  const roster = useApi(`/admin/batches/${batchId}/roster?q=${encodeURIComponent(dq)}&page=${page}&size=15`);
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [flash, setFlash] = useState({ error: '', notice: '' });
  const [optimistic, setOptimistic] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const b = batch.data;
  const open = optimistic ?? b?.status === 'OPEN';
  const test = Number(b?.batch_number) === 0;
  const locked = b?.status === 'COMPLETED';

  async function toggle(next) {
    setOptimistic(next); setToggling(true); setFlash({ error: '', notice: '' });
    try {
      const r = await portal(`/admin/batches/${batchId}/registration`, { method: 'PUT', body: JSON.stringify({ open: next }) });
      setFlash({ error: '', notice: r.message });
      await batch.reload();
    } catch (e) { setFlash({ error: e.message, notice: '' }); } // previous state restored below
    finally { setOptimistic(null); setToggling(false); }
  }

  async function complete() {
    setCompleting(false); setFlash({ error: '', notice: '' });
    try { const r = await portal(`/admin/batches/${batchId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'COMPLETED' }) }); setFlash({ error: '', notice: r.message }); batch.reload(); }
    catch (e) { setFlash({ error: e.message, notice: '' }); }
  }

  async function deleteBatch() {
    setDeletingBusy(true);setFlash({ error: '', notice: '' });
    try { if(test){const r=await portal(`/admin/batches/${batchId}/restart`,{method:'POST'});setDeleting(false);setFlash({error:'',notice:r.message});batch.reload();roster.reload();}else{await portal(`/admin/batches/${batchId}`, { method: 'DELETE' }); navigate('/admin/batches', { replace: true });} }
    catch (e) { setFlash({ error: e.message, notice: '' }); setDeleting(false); }
    finally { setDeletingBusy(false); }
  }

  if (batch.error && !b) return <><Link to="/admin/batches" className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--p-muted)] hover:text-[var(--p-text)]"><ArrowLeft className="h-4 w-4" />Back to Batches</Link><StatusMessage error={batch.error} /></>;
  if (!b) return <Skeleton className="h-64" />;

  return (
    <div>
      <Link to="/admin/batches" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--p-muted)] hover:text-[var(--p-text)]"><ArrowLeft className="h-4 w-4" />Back to Batches</Link>
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--p-accent)]/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3"><span className="rounded-lg bg-[var(--p-surface-3)] px-2.5 py-1 text-xs font-bold text-[var(--p-accent)]"><Hash className="mr-0.5 inline h-3 w-3" />Batch {String(b.batch_number).padStart(2, '0')}</span><BatchStatusBadge status={optimistic === null ? b.status : optimistic ? 'OPEN' : 'CLOSED'} /></div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{b.name}</h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--p-muted)]">
              <span className="flex items-center gap-2"><Users className="h-4 w-4" /><b className="text-[var(--p-text)]">{b.student_count}</b> students</span>
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />Classes start: {b.classes_start_at ? fmt(b.classes_start_at) : 'Not set'}</span>
              {b.enrollment_closes_at && <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />Deadline: {fmt(b.enrollment_closes_at)}</span>}
              {b.whatsapp_link && <a href={b.whatsapp_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[var(--p-accent)] hover:underline"><MessageCircle className="h-4 w-4" />WhatsApp group</a>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="flex gap-2">
              {b.status !== 'COMPLETED' && <Button variant="secondary" onClick={() => setCompleting(true)}><CheckCircle2 className="h-4 w-4" />Complete batch</Button>}
              {<Button variant="secondary" onClick={() => setDeleting(true)}><Trash2 className="h-4 w-4" />{test ? 'Restart Test Batch' : 'Delete batch'}</Button>}
              <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit Batch</Button>
            </div>
            <div className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface-2)] px-4 py-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--p-muted)]">Registration</p>
              <Switch checked={open} onChange={toggle} disabled={toggling || locked} label="Registration" onLabel="Registration Open" offLabel="Registration Closed" />
            </div>
          </div>
        </div>
      </Card>
      <div className="mt-4"><StatusMessage error={flash.error} notice={flash.notice} /></div>
      {!locked && <p className="-mt-1 mb-4 text-xs text-[var(--p-muted)]">Only one batch can be open at a time. Opening this batch closes the currently open one.</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Enrolled students</h2>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Search by Student ID or name" />
      </div>
      <Card className="mt-3 overflow-hidden p-0">
        <StatusMessage error={roster.error} />
        {roster.loading && !roster.data ? <Skeleton className="m-5 h-40" />
          : !roster.data?.items.length ? <div className="p-6"><EmptyState icon={Users} title={dq ? 'No matching students' : 'No students enrolled yet'} text={dq ? 'Try a different ID or name.' : 'Students appear here once their enrollment is confirmed.'} /></div>
          : <TableWrap>
            <thead className="border-b border-[var(--p-border)] bg-[var(--p-surface-2)]"><tr><Th>Student ID</Th><Th>Student name</Th><Th>Status</Th><Th>Contact</Th><Th>Attendance</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody className="divide-y divide-[var(--p-border)]">
              {roster.data.items.map((s) => (
                <tr key={s.enrollmentId} className="hover:bg-[var(--p-surface-2)]">
                  <Td><StudentIdCell id={s.studentId} /></Td><Td className="font-medium">{s.name}</Td>
                  <Td><span className="rounded-full bg-[var(--p-surface-3)] px-2.5 py-0.5 text-xs font-semibold">{s.enrollmentStatus}</span></Td>
                  <Td className="text-[var(--p-muted)]"><div>{s.email}</div><div className="text-xs">{s.phone}</div></Td>
                  <Td>{s.marked ? `${s.present}/${s.marked} present` : <span className="text-[var(--p-muted)]">No records</span>}</Td>
                  <Td className="text-right"><Link to={`/admin/students/${s.userId}`} className="text-sm font-semibold text-[var(--p-accent)] hover:underline">View profile</Link></Td>
                </tr>))}
            </tbody></TableWrap>}
        {roster.data && <Pagination page={roster.data.page} size={roster.data.size} total={roster.data.total} onPage={setPage} />}
      </Card>
      <Modal open={completing} onClose={() => setCompleting(false)} title="Complete this batch?" footer={<><Button variant="ghost" onClick={() => setCompleting(false)}>Cancel</Button><Button onClick={complete}>Complete batch</Button></>}>
        <p>Completing a batch closes registration and enables eligible certificates. You can still correct its metadata later.</p>
      </Modal>
      <Modal open={deleting} onClose={() => setDeleting(false)} title={test ? "Restart Test Batch?" : "Delete unused batch?"} footer={<><Button variant="ghost" onClick={() => setDeleting(false)}>Cancel</Button><Button disabled={deletingBusy} onClick={deleteBatch}>{deletingBusy ? 'Working…' : test ? 'Confirm restart' : 'Delete unused batch'}</Button></>}>
        {test ? <p>All test students and batch-specific content will be removed. Razorpay paid records are retained; no refunds are issued. Registration will be closed.</p> : <p>Only never-used batches (including empty completed batches) can be deleted. Batches with student history are protected, and their numbers cannot be reused.</p>}
      </Modal>
      <BatchFormModal key={String(editing)} open={editing} batch={b} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); batch.reload(); setFlash({ error: '', notice: 'Batch updated' }); }} />
    </div>
  );
}
