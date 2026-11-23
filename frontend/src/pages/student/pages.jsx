import ProfileEditor from './ProfileEditor';
import { Meetings } from './Resources';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, Award, Download, Eye, ExternalLink, Video, MessageCircle, ChevronRight, ArrowLeft, IdCard, Layers, FileText } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton, StatusMessage } from '@/components/kit';
import { curriculum } from '@/data/curriculum';
import { portal } from '@/services/portalApi';
import AnnouncementTicker from './AnnouncementTicker';
import { fmtDate, useApi, useStudentData } from './useStudentData';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

function summarize(records = []) {
  const c = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  records.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
  const total = records.length;
  return { ...c, total, rate: total ? Math.round(((c.PRESENT + c.LATE) / total) * 100) : null };
}
const statusTone = { PRESENT: 'success', ABSENT: 'danger', LATE: 'warning', EXCUSED: 'info' };

function Stat({ icon: Icon, label, value, sub, loading }) {
  return (
    <Card className="portal-rise">
      <div className="flex items-center gap-3 text-[var(--p-muted)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--p-accent)]/12 text-[var(--p-accent)]"><Icon className="h-[18px] w-[18px]" /></span><span className="text-xs font-semibold uppercase tracking-wider">{label}</span></div>
      {loading ? <Skeleton className="mt-4 h-8 w-24" /> : <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>}
      {sub && <p className="mt-1 text-xs text-[var(--p-muted)]">{sub}</p>}
    </Card>
  );
}

export function Dashboard() {
  const { user, enrollments, identity, announcements } = useStudentData();
  const attendance = useApi('/my-attendance');
  const batch = useApi('/batches/current');
  const config = useApi('/config');
  const whatsapp = useApi('/my-whatsapp-group');
  const [msg, setMsg] = useState({ error: '', notice: '' });
  const active = enrollments.data?.find((e) => e.active);
  const stats = useMemo(() => summarize(attendance.data || []), [attendance.data]);

  async function enroll() {
    setMsg({ error: '', notice: '' });
    try {
      const r = await portal('/demo-checkout', { method: 'POST', body: JSON.stringify({ courseId: Number(batch.data?.course_id), plan: 'COURSE', renewalMode: 'MANUAL' }) });
      setMsg({ error: '', notice: r.message });
      enrollments.reload(); identity.reload();
    } catch (e) { setMsg({ error: e.message, notice: '' }); }
  }

  return (
    <div className="space-y-6">
      <AnnouncementTicker items={announcements.data} />
      <Card className="portal-rise relative overflow-hidden border-[var(--p-accent)]/25 bg-gradient-to-br from-[var(--p-accent)]/15 via-[var(--p-surface)] to-[var(--p-surface)] p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[var(--p-accent)]/10 blur-3xl" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-[.22em] text-[var(--p-accent)]">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{user?.name}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {identity.data?.studentId ? <Badge tone="success" className="px-3 py-1 text-xs"><IdCard className="h-3.5 w-3.5" />{identity.data.studentId}</Badge> : <Badge tone="warning" className="px-3 py-1 text-xs">Student ID issued after enrollment is confirmed</Badge>}
          {active && <Badge tone="info" className="px-3 py-1 text-xs">Access active</Badge>}
        </div>
        {active && <div className="mt-5">
          {whatsapp.data?.available && whatsapp.data?.inviteUrl ? (
            <a href={whatsapp.data.inviteUrl} target="_blank" rel="noopener noreferrer"><Button><MessageCircle className="h-4 w-4" />Join WhatsApp Group</Button></a>
          ) : !whatsapp.loading && !whatsapp.error ? (
            <p className="text-sm text-[var(--p-muted)]">Your batch WhatsApp invitation is not available yet.</p>
          ) : null}
        </div>}
        {active?.meetUrl && <div className="mt-6"><a href={active.meetUrl} target="_blank" rel="noopener noreferrer"><Button><Video className="h-4 w-4" />Join class on Google Meet</Button></a></div>}
      </Card>

      <StatusMessage error={enrollments.error || msg.error} notice={msg.notice} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={IdCard} label="Student ID" value={identity.data?.studentId || '—'} loading={identity.loading} />
        <Stat icon={Layers} label="Assigned batch" value={active ? `#${active.batchId ?? '—'}` : '—'} sub={active ? active.course : 'Not enrolled yet'} loading={enrollments.loading} />
        <Stat icon={CalendarCheck} label="Attendance" value={stats.rate === null ? '—' : `${stats.rate}%`} sub={stats.total ? `${stats.PRESENT + stats.LATE} of ${stats.total} classes attended` : 'No classes recorded yet'} loading={attendance.loading} />
        <Stat icon={Award} label="Certificates" value={<CertCount />} />
      </div>

      {active && <Meetings compact />}
      <section aria-labelledby="areas">
        <div className="mb-4 flex items-center justify-between"><h2 id="areas" className="text-lg font-semibold">Learning areas</h2><Link to="/student/learning" className="text-sm font-semibold text-[var(--p-accent)] hover:underline">Open learning →</Link></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {curriculum.map((a) => (
            <Link key={a.id} to={active ? `/student/learning?area=${a.id}` : '/student/learning'} className="group">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[var(--p-accent)]/50">
                <div className="flex items-start justify-between"><span className="text-xs font-bold text-[var(--p-accent)]">{a.number}</span><ChevronRight className="h-4 w-4 text-[var(--p-muted)] transition group-hover:translate-x-0.5" /></div>
                <h3 className="mt-3 font-semibold">{a.title}</h3>
                <p lang="ar" dir="rtl" className="mt-1 text-sm text-[var(--p-muted)]">{a.arabic}</p>
                <p className="mt-3 text-xs text-[var(--p-muted)]">View curriculum topics</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {!active && !enrollments.loading && (
        <Card>
          <h2 className="text-lg font-semibold">Enrollment</h2>
          {batch.data?.id
            ? <p className="mt-2 text-sm text-[var(--p-muted)]">Registration is open for <b className="text-[var(--p-text)]">{batch.data.name}</b>. One-time fee: ₹{batch.data.course_fee}.</p>
            : <p className="mt-2 text-sm text-[var(--p-muted)]">Registration is closed. Please wait for the academy to open the next batch.</p>}
          {config.data?.demoPayments
            ? <div className="mt-4"><p className="mb-3 text-xs text-amber-400">Demo mode: simulated payment, no money is collected.</p><Button disabled={!batch.data?.id} onClick={enroll}>Simulate payment and enroll</Button></div>
            : <p className="mt-3 text-sm text-[var(--p-muted)]">Online payment is not connected yet. Contact the academy to complete payment; the administrator confirms your enrollment.</p>}
        </Card>
      )}
    </div>
  );
}

function CertCount() {
  const certs = useApi('/my-certificates');
  return certs.loading ? '…' : certs.data?.length ?? 0;
}

export function Learning() {
  const { enrollments } = useStudentData();
  const params = new URLSearchParams(window.location.search);
  const [areaId,setAreaId] = useState(params.get('area'));
  const data = useApi('/curriculum');
  const areas = data.data || [];
  const active = enrollments.data?.find(e=>e.active);
  const area = areas.find(a=>a.id===areaId);
  if(enrollments.loading || data.loading) return <Skeleton className="h-64 w-full"/>;
  if(!active) return <><PageHeader title="My Learning"/><EmptyState icon={BookOpen} title="Learning opens after enrollment" text="Once your enrollment is confirmed, all four learning areas unlock here."/></>;
  if(data.error) return <StatusMessage error={data.error}/>;
  return <div className="space-y-5"><PageHeader title="Programme Curriculum" description="Learn · Reflect · Grow — Islamic Learning Programme"/>
  {!area?<><div className="rounded-2xl bg-[#172d43] p-6 text-white"><h2 className="text-2xl font-semibold">One integrated programme. Four areas of Islamic learning.</h2><p className="mt-3 text-sm text-slate-200">A six-month learning journey · Live online classes · Tamil instruction · Women & girls</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{areas.map((a,i)=>{const Icon=[BookOpen,Layers,FileText,Award][i]||BookOpen;return <button key={a.id} onClick={()=>{setAreaId(a.id);window.scrollTo(0,0)}} className="group h-full text-left"><article className="relative h-full overflow-hidden rounded-[1.5rem] border border-[var(--p-border)] bg-[var(--p-surface)] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#c5a66a] hover:shadow-lg"><span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-[#c5a66a]/25"/><div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d9b879]/15 text-[#c9a568]"><Icon className="h-6 w-6"/></span><span className="font-heading text-3xl text-[var(--p-muted)]/45">{a.number}</span></div><h3 className="mt-6 text-xl font-semibold leading-snug">{a.title}</h3><p lang="ar" dir="rtl" className="mt-2 text-xl text-[#c9a568]">{a.arabic}</p><p lang="ta" className="mt-2 text-sm leading-6 text-[var(--p-muted)]">{a.tamil}</p><p className="mt-4 text-sm leading-6 text-[var(--p-muted)]">{a.intro}</p><p className="mt-5 text-sm font-bold text-[#c9a568]">{a.sections.reduce((n,s)=>n+s.topics.length,0)} topics · View topics →</p></article></button>})}</div></>:<><button onClick={()=>{setAreaId(null);window.scrollTo(0,0)}} className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={16}/> All learning areas</button><div className="rounded-2xl bg-[#172d43] p-6 text-white"><p className="text-sm text-amber-200">Learning Area {area.number} · {area.sections.reduce((n,s)=>n+s.topics.length,0)} topics</p><h2 className="mt-2 text-2xl font-semibold">{area.title}</h2><p dir="rtl" lang="ar" className="mt-2 text-xl text-amber-200">{area.arabic}</p><p lang="ta" className="mt-2">{area.tamil}</p><p className="mt-4 text-sm leading-7 text-slate-200">{area.intro}</p></div>{area.sections.map((section,si)=><Card key={si}><div className="mb-4 flex items-start justify-between gap-2"><div><h3 className="text-xl font-semibold">{section.title}</h3><p lang="ta" className="mt-1 text-sm text-[var(--p-muted)]">{section.tamil}</p></div><span className="shrink-0 text-xs font-bold">SECTION {String(si+1).padStart(2,'0')}</span></div><div className="grid gap-3 md:grid-cols-2">{section.topics.map(([title,tamil],ti)=><div key={ti} className="flex gap-3 rounded-xl border border-[#e8e2d6] p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2ead9] text-xs font-bold text-[#725a31]">{String(ti+1).padStart(2,'0')}</span><div><h4 className="font-semibold">{title}</h4><p lang="ta" className="mt-2 text-sm leading-7 text-[var(--p-muted)]">{tamil}</p></div></div>)}</div></Card>)}</>}
  <Button variant="secondary" onClick={data.reload}>Refresh curriculum</Button></div>;
}

export function Attendance() {
  const attendance = useApi('/my-attendance');
  const s = useMemo(() => summarize(attendance.data || []), [attendance.data]);
  return (
    <>
      <PageHeader title="Attendance" description="Your recorded class attendance." />
      <StatusMessage error={attendance.error} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[['Present', s.PRESENT], ['Absent', s.ABSENT], ['Late', s.LATE], ['Rate', s.rate === null ? '—' : `${s.rate}%`]].map(([l, v]) => <Card key={l}><p className="text-xs font-semibold uppercase tracking-wider text-[var(--p-muted)]">{l}</p><p className="mt-2 text-2xl font-semibold">{attendance.loading ? '…' : v}</p></Card>)}
      </div>
      {attendance.loading ? <Skeleton className="h-40" /> : !attendance.data?.length ? <EmptyState icon={CalendarCheck} title="No attendance recorded yet" text="Records appear here after your teacher marks a class." />
        : <Card className="overflow-hidden p-0"><table className="w-full text-sm"><thead className="bg-[var(--p-surface-2)] text-left text-xs uppercase tracking-wider text-[var(--p-muted)]"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-[var(--p-border)]">{attendance.data.map((a) => <tr key={a.id}><td className="px-5 py-3">{fmtDate(a.classDate)}</td><td className="px-5 py-3"><Badge tone={statusTone[a.status] || 'neutral'}>{a.status}</Badge></td></tr>)}</tbody></table></Card>}
    </>
  );
}

export function Announcements() {
  const { announcements } = useStudentData();
  return (
    <>
      <PageHeader title="Announcements" description="Messages from the academy." />
      <StatusMessage error={announcements.error} />
      {announcements.loading ? <Skeleton className="h-32" /> : !announcements.data?.length ? <EmptyState title="No announcements yet" text="New academy announcements will appear here." />
        : <div className="space-y-3">{announcements.data.map((a) => <Card key={a.id}><h3 className="font-semibold">{a.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--p-muted)]">{a.body}</p></Card>)}</div>}
    </>
  );
}

async function openCertificatePdf(id, download) {
  // Open a preview tab synchronously so popup blockers do not block it.
  const previewTab = download ? null : window.open('', '_blank');
  if (!download && !previewTab) {
    throw new Error('Please allow pop-ups to view the certificate.');
  }

  try {
    const response = await fetch(
      `${API}/api/portal/my-certificates/${encodeURIComponent(id)}/pdf`,
      { credentials: 'include', headers: { Accept: 'application/pdf' } }
    );
    if (!response.ok) {
      throw new Error(
        response.status === 401 || response.status === 403
          ? 'Please sign in again to access your certificate.'
          : 'Could not open the certificate. Please try again.'
      );
    }

    const pdfBlob = await response.blob();
    const url = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));

    if (download) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Hajara-Ilm-Academy-Certificate-${id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      previewTab.location.replace(url);
      // Keep the blob URL available to the browser's PDF viewer.
      // Revoke it when the student portal page is unloaded.
      window.addEventListener('pagehide', () => URL.revokeObjectURL(url), { once: true });
    }
  } catch (error) {
    if (previewTab && !previewTab.closed) previewTab.close();
    throw error;
  }
}

export function Certificates() {
  const certs = useApi('/my-certificates');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  async function action(id, download) {
    setError(''); setBusy(`${id}-${download}`);
    try { await openCertificatePdf(id, download); }
    catch (e) { setError(e.message); }
    finally { setBusy(null); }
  }
  return (
    <>
      <PageHeader title="My Certificates" description="Your official Islamic Learning Programme completion certificates." />
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <StatusMessage error={certs.error} />
      {certs.loading ? <Skeleton className="h-32" /> : !certs.data?.length ? <EmptyState icon={Award} title="No certificates yet" text="Your certificate will appear after your batch is completed and the academy issues it." />
        : <div className="grid gap-4 sm:grid-cols-2">{certs.data.map(c => (
          <Card key={c.id} className="overflow-hidden border border-amber-300/40">
            <div className="rounded-xl bg-[#122e4b] p-5 text-center text-white">
              <Award className="mx-auto mb-3 h-10 w-10 text-[#e2bf79]" />
              <p className="text-xs font-semibold tracking-[.2em] text-[#e2bf79]">HAJARA ILM ACADEMY</p>
              <h3 className="mt-2 font-serif text-xl">Certificate of Completion</h3>
              <p className="mt-2 text-xs text-slate-200">Islamic Learning Programme</p>
            </div>
            <div className="p-2">
              <Badge tone="success"><Award className="h-3 w-3" />Issued</Badge>
              <p className="mt-3 break-all font-mono text-sm font-semibold">{c.certificateCode}</p>
              <p className="mt-1 text-xs text-[var(--p-muted)]">Issued {fmtDate(c.issuedAt)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => action(c.id, false)}><Eye className="h-4 w-4" /> View PDF</Button>
                <Button size="sm" disabled={busy !== null} onClick={() => action(c.id, true)}><Download className="h-4 w-4" /> Download PDF</Button>
              </div>
            </div>
          </Card>))}</div>}
    </>
  );
}

export function Profile() {
  const { identity, enrollments } = useStudentData();
  return (
    <>
      <PageHeader title="Profile" />
      <ProfileEditor studentId={identity.data?.studentId || 'Issued after enrollment confirmation'} />
      <h2 className="mb-3 mt-8 text-lg font-semibold">Enrollment</h2>
      {enrollments.data?.length ? <div className="grid max-w-2xl gap-3">{enrollments.data.map((e) => <Card key={e.id} className="flex items-center justify-between"><div><p className="font-semibold">{e.course}</p><p className="text-xs text-[var(--p-muted)]">Access until {e.expiresAt ? fmtDate(e.expiresAt) : 'batch completion'}</p></div><Badge tone={e.active ? 'success' : 'neutral'}>{e.active ? 'Active' : 'Inactive'}</Badge></Card>)}</div> : <p className="text-sm text-[var(--p-muted)]">No enrollment yet.</p>}
    </>
  );
}
