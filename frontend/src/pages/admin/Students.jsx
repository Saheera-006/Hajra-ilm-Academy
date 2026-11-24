import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { portal } from '@/services/portalApi';
import { ArrowLeft, Users, Award, CalendarCheck, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Skeleton, StatusMessage, inputClass } from '@/components/kit';
import { Pagination, SearchBox, StudentIdCell, TableWrap, Td, Th, fmt, useApi, useDebounced } from './shared';

export default function Students() {
  const [q, setQ] = useState('');
  const [batchId, setBatchId] = useState('');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({name:'',age:'',email:'',phone:'',batchId:'',method:'CASH',amount:''});
  const set = key => e => setForm(f => ({...f,[key]:e.target.value}));
  async function add(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const result = await portal('/admin/students/manual',{method:'POST',body:JSON.stringify({...form,age:Number(form.age),batchId:Number(form.batchId),amount:Number(form.amount)})});
      setNotice(`Student ${result.studentId} added. ${result.welcomeEmailSent ? 'Welcome email sent.' : 'Email delivery failed; student can use Forgot password.'}`);
      setAdding(false); list.reload();
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  const dq = useDebounced(q);
  const batches = useApi('/admin/batches');
  const eligible = (batches.data || []).filter(b => ['OPEN','CLOSED','DRAFT'].includes(b.status));
  const list = useApi(`/admin/students/directory?q=${encodeURIComponent(dq)}&page=${page}&size=15${batchId ? `&batchId=${batchId}` : ''}`);

  return (
    <div>
      <PageHeader title="Students" description="Every enrolled student, by Student ID." actions={<Button onClick={()=>{setError('');setNotice('');setForm({name:'',age:'',email:'',phone:'',batchId:'',method:'CASH',amount:''});setAdding(true);}}>+ Add Student</Button>} />
      {notice && <p role="status" className="mb-4 text-sm">{notice}</p>}
      <Modal open={adding} onClose={()=>{if(!busy)setAdding(false);}} title="Add offline student" wide footer={<><Button variant="ghost" onClick={()=>setAdding(false)} disabled={busy}>Cancel</Button><Button type="submit" form="manual-enrollment" loading={busy} disabled={busy || batches.loading || !eligible.length}>Enroll student</Button></>}>
        <form id="manual-enrollment" onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><StatusMessage error={error}/></div>
          <p className="text-sm sm:col-span-2">Record a fully paid offline enrollment. The student will receive password setup instructions by email.</p>
          {[["name","Full name","text"],["age","Age","number"],["email","Email","email"],["phone","Phone","tel"]].map(([key,label,type])=><label key={key} className="grid gap-1 text-sm">{label}<input required className={inputClass} type={type} value={form[key]} onChange={set(key)} {...(key==='age'?{min:5,max:120}:{})}/></label>)}
          <label className="grid gap-1 text-sm">Batch<select required className={inputClass} value={form.batchId} onChange={e=>{const b=batches.data?.find(b=>String(b.id)===e.target.value);setForm(f=>({...f,batchId:e.target.value,amount:String(b?.course_fee??'')}));}}><option value="">{batches.loading ? "Loading batches…" : "Select batch"}</option>{eligible.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          {(batches.error || (!batches.loading && !eligible.length)) && <div className="sm:col-span-2 text-sm text-amber-300">{batches.error || 'No eligible batches. Check Admin → Batches.'} <Button type="button" variant="ghost" onClick={batches.reload}>Retry</Button></div>}
          <label className="grid gap-1 text-sm">Payment method<select className={inputClass} value={form.method} onChange={set('method')}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK">Bank transfer</option></select></label>
          <label className="grid gap-1 text-sm">Amount received (₹)<input required type="number" min="0" step="0.01" className={inputClass} value={form.amount} onChange={set('amount')}/></label>
          <label className="flex gap-2 text-sm sm:col-span-2"><input required type="checkbox"/>I confirm the full fee has been received and the email belongs to this student.</label>

        </form>
      </Modal>
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Search by Student ID or name" />
        <select aria-label="Filter by batch" className={`${inputClass} w-full sm:w-64`} value={batchId} onChange={(e) => { setBatchId(e.target.value); setPage(0); }}>
          <option value="">All batches</option>
          {batches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <Card className="overflow-hidden p-0">
        <StatusMessage error={list.error} />
        {list.loading && !list.data ? <Skeleton className="m-5 h-48" />
          : !list.data?.items.length ? <div className="p-6"><EmptyState icon={Users} title="No students found" text="Adjust the search or batch filter." /></div>
          : <TableWrap>
            <thead className="border-b border-[var(--p-border)] bg-[var(--p-surface-2)]"><tr><Th>Student ID</Th><Th>Student name</Th><Th>Batch</Th><Th>Status</Th><Th>Contact</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody className="divide-y divide-[var(--p-border)]">
              {list.data.items.map((s) => (
                <tr key={s.userId} className="hover:bg-[var(--p-surface-2)]">
                  <Td><StudentIdCell id={s.studentId} /></Td><Td className="font-medium">{s.name}<div className="text-xs text-[var(--p-muted)]">{s.registrationSource}</div></Td>
                  <Td>{s.batchId ? <Link className="hover:text-[var(--p-accent)]" to={`/admin/batches/${s.batchId}`}>{s.batchName}</Link> : <span className="text-[var(--p-muted)]">—</span>}</Td>
                  <Td>{s.enrollmentStatus ? <Badge tone={s.enrollmentStatus === 'ACTIVE' ? 'success' : 'neutral'}>{s.enrollmentStatus}</Badge> : <Badge>No enrollment</Badge>}</Td>
                  <Td className="text-[var(--p-muted)]"><div>{s.email}</div><div className="text-xs">{s.phone}</div></Td>
                  <Td className="text-right"><Link to={`/admin/students/${s.userId}`} className="text-sm font-semibold text-[var(--p-accent)] hover:underline">View profile</Link></Td>
                </tr>))}
            </tbody></TableWrap>}
        {list.data && <Pagination page={list.data.page} size={list.data.size} total={list.data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}

export function StudentProfile() {
  const { userId } = useParams();
  const p = useApi(`/admin/students/${userId}/profile`);
  const s = p.data?.student;
  const nav = useNavigate();
  const [del, setDel] = useState(false);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState('');
  async function remove() {
    setErr('');
    try { await portal(`/admin/students/${userId}`, { method: 'DELETE' }); nav('/admin/students', { replace: true }); }
    catch (e) { setErr(e.message); }
  }
  return (
    <div>
      <Link to="/admin/students" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--p-muted)] hover:text-[var(--p-text)]"><ArrowLeft className="h-4 w-4" />Back to Students</Link>
      <StatusMessage error={p.error} />
      {!p.data ? (!p.error && <Skeleton className="h-64" />) : (
        <>
          <PageHeader title={s.name} description={<><StudentIdCell id={s.studentId} /> · {s.email} · {s.phone}</>} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1"><h2 className="font-semibold">Enrollment</h2>
              {p.data.enrollments.length ? p.data.enrollments.map((e) => <div key={e.id} className="mt-3 rounded-xl border border-[var(--p-border)] p-3 text-sm"><div className="flex items-center justify-between"><span className="font-medium">{e.batchName || 'No batch'}</span><Badge tone={e.status === 'ACTIVE' ? 'success' : 'neutral'}>{e.status}</Badge></div><p className="mt-1 text-xs text-[var(--p-muted)]">Enrolled {fmt(e.createdAt)}</p></div>) : <p className="mt-2 text-sm text-[var(--p-muted)]">No enrollment.</p>}
            </Card>
            <Card className="lg:col-span-1"><h2 className="flex items-center gap-2 font-semibold"><CalendarCheck className="h-4 w-4 text-[var(--p-accent)]" />Attendance</h2>
              {p.data.attendance.length ? <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto text-sm">{p.data.attendance.map((a) => <li key={a.classDate} className="flex justify-between"><span>{fmt(a.classDate)}</span><Badge tone={a.status === 'PRESENT' ? 'success' : a.status === 'ABSENT' ? 'danger' : 'neutral'}>{a.status}</Badge></li>)}</ul> : <p className="mt-2 text-sm text-[var(--p-muted)]">No attendance recorded.</p>}
            </Card>
            <Card className="lg:col-span-1"><h2 className="flex items-center gap-2 font-semibold"><Award className="h-4 w-4 text-[var(--p-accent)]" />Certificates</h2>
              {p.data.certificates.length ? p.data.certificates.map((c) => <div key={c.id} className="mt-3 text-sm"><p className="font-mono font-semibold">{c.certificateCode}</p><p className="text-xs text-[var(--p-muted)]">Issued {fmt(c.issuedAt)}</p></div>) : <p className="mt-2 text-sm text-[var(--p-muted)]">No certificates issued.</p>}
            </Card>
          </div>
          <Card className="mt-6 border-red-500/30">
            <h2 className="font-semibold text-red-300">Danger zone</h2>
            <p className="mt-1 text-sm text-[var(--p-muted)]">Permanently removes this student and their enrollments, payments, attendance, certificates and notifications. This cannot be undone.</p>
            <Button variant="danger" className="mt-4" onClick={() => { setTyped(''); setErr(''); setDel(true); }}><Trash2 className="h-4 w-4" />Delete student permanently</Button>
          </Card>
          <Modal open={del} onClose={() => setDel(false)} title="Delete student permanently" footer={<><Button variant="ghost" onClick={() => setDel(false)}>Cancel</Button><Button variant="danger" disabled={typed.trim() !== s.email} onClick={remove}>Delete permanently</Button></>}>
            <StatusMessage error={err} />
            <p className="mb-3">Type the student's email to confirm: <b>{s.email}</b></p>
            <input className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Confirm email" />
          </Modal>
        </>)}
    </div>
  );
}
