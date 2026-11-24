import AudienceField, { audienceLabel, audiencePayload } from './admin/AudienceField';
import { pushConfigured } from '@/services/pushConfig';
import ProgrammeEditor from '@/pages/admin/ProgrammeEditor';
import ManagementSections from './ManagementSections';
import { Menu, X, LogOut, LayoutDashboard, BookOpen, Layers, Users, ClipboardCheck, Wallet, Megaphone, CalendarCheck, LibraryBig, Award, Globe, BarChart3, Bell, ShieldCheck, ChevronRight, Search, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { portal } from '@/services/portalApi';
import { useAuth } from '@/context/AuthContext';

const field = 'w-full rounded-xl border border-[#26364e] bg-[#090d14] px-4 py-3 text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none';
const button = 'rounded-xl border border-blue-600 bg-[#244b88] px-5 py-3 font-semibold text-white hover:bg-[#315fa6] disabled:opacity-50';
const linkButton = 'rounded-lg border border-[#30496b] bg-[#192b48] px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-[#223b61] disabled:opacity-50';

function Panel({ title, children }) {
  return (
    <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 font-heading text-3xl font-semibold text-[#172d43]">{title}</h1>
      {children}
    </div>
  );
}

function Alert({ text }) {
  return text ? <p role="alert" className="my-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{text}</p> : null;
}

function Notice({ text }) {
  return text ? <p role="status" className="my-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{text}</p> : null;
}

/** Loads a portal GET endpoint and lets the page reload it after changes. */
function useLoad(path) {
  const [state, setState] = useState({ data: null, error: '' });
  const refresh = useCallback(async () => {
    try {
      setState({ data: await portal(path), error: '' });
    } catch (e) {
      setState((s) => ({ ...s, error: e.message }));
    }
  }, [path]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data: state.data, error: state.error, refresh };
}

/** Keeps signed-out visitors (and the wrong role) away from private pages. The backend enforces this too. */
export function RequireAuth({ role, loginPath = '/login', children }) {
  const { user, loading } = useAuth();
  if (loading) return <Panel title="Loading…"><p className="text-sm text-slate-600">Checking your session…</p></Panel>;
  if (!user) return <Navigate to={loginPath} replace />;
  if (role && user.role !== role) {
    return <Panel title="Access denied"><p>Administrator permission is required for this page.</p></Panel>;
  }
  return children;
}

const verificationStorageKey = 'hia-enrollment-verification';

function readPendingVerification() {
  try {
    const pending = JSON.parse(sessionStorage.getItem(verificationStorageKey));
    return pending?.checkoutId && pending.expiresAt > Date.now() ? pending : null;
  } catch {
    return null;
  }
}

export function Register() {
  const nav = useNavigate();
  const batch = useLoad('/batches/current');
  const [form, setForm] = useState({ name: '', age: '', email: '', phone: '', password: '' });
  const [checkout, setCheckout] = useState(null);
  const [billing,setBilling]=useState({door:'',street:'',area:'',pin:'',city:'',state:''});
  const billingFields=[['door','Door / House No.',40,'address-line1'],['street','Street / Address Line 1',120,'address-line2'],['area','Area / Address Line 2 (optional)',100,'address-line3'],['pin','PIN Code',6,'postal-code'],['city','City / Town',80,'address-level2'],['state','State',80,'address-level1']];
  const address=[billing.door,billing.street,billing.area,billing.city,billing.state,billing.pin,'India'].map(v=>v.trim()).filter(Boolean).join(', ');
  const billingValid=['door','street','city','state'].every(k=>billing[k].trim()) && /^[1-9][0-9]{5}$/.test(billing.pin) && address.length<=500;
  const [verification, setVerification] = useState(readPendingVerification);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const update = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const open = Boolean(batch.data?.id) && !batch.error;
  const checkingAvailability = batch.data === null && !batch.error;
  const stepHeading = useRef(null);
  useEffect(() => {
    if (stepHeading.current) {
      stepHeading.current.scrollIntoView({ block: 'center' });
      stepHeading.current.focus({ preventScroll: true });
    }
  }, [verification, checkout]);

  function saveVerification(value) {
    setVerification(value);
    try {
      if (value) sessionStorage.setItem(verificationStorageKey, JSON.stringify(value));
      else sessionStorage.removeItem(verificationStorageKey);
    } catch {
      // The active tab still works when session storage is unavailable.
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!open) return;
    setBusy(true); setError('');
    try {
      const data = await portal('/auth/demo-checkout/prepare', {
        method: 'POST', body: JSON.stringify({ ...form, age: Number(form.age) })
      });
      saveVerification({ checkoutId: data.checkoutId, expiresAt: Date.now() + 15 * 60 * 1000 });
      setCode('');
      setForm(old => ({ ...old, password: '' }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function pasteCode() {
    try {
      const digits = (await navigator.clipboard.readText()).replace(/[^0-9]/g, '');
      if (digits.length !== 6) throw new Error();
      setCode(digits);
      setError('');
    } catch {
      setError('Copy just the six-digit code from your email, then paste it into the code field.');
    }
  }

  async function verifyEmail(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await portal('/auth/demo-checkout/verify-email', {
        method: 'POST', body: JSON.stringify({ checkoutId: verification.checkoutId, code })
      });
      setCheckout(data);
      saveVerification(null);
      setCode('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function pay() {
    setBusy(true); setError('');
    try {
      if (!billingValid) throw new Error('Complete your billing address and enter a valid six-digit PIN code.');
      if (!window.Razorpay) await new Promise((resolve,reject)=>{
        const script=document.createElement('script'); script.src='https://checkout.razorpay.com/v1/checkout.js'; script.onload=resolve; script.onerror=()=>reject(new Error('Could not load payment checkout.')); document.head.appendChild(script);
      });
      const order=await portal('/auth/razorpay/order',{method:'POST',body:JSON.stringify({checkoutId:checkout.checkoutId,address,gstin:''})});
      const rz=new window.Razorpay({key:order.key,order_id:order.orderId,amount:order.amount,currency:'INR',name:'Hajara Ilm Academy',description:'Islamic Learning Programme',prefill:{name:order.name,email:order.email,contact:order.phone},theme:{color:'#172d43'},modal:{ondismiss:()=>setBusy(false)},handler:async r=>{
        try {if(r.razorpay_order_id!==order.orderId)throw new Error('Checkout order mismatch.');const data=await portal('/auth/razorpay/verify',{method:'POST',body:JSON.stringify({orderId:order.orderId,paymentId:r.razorpay_payment_id,signature:r.razorpay_signature})});setResult(data);setCheckout(null);}
        catch(e){setCheckout(old=>({...old,confirmationPending:true}));setError('Payment confirmation pending. Do not pay again. Contact the academy with '+r.razorpay_payment_id+'. '+e.message);}finally{setBusy(false);}
      }});rz.on('payment.failed',()=>setError('Payment failed. Check your payment status before retrying.'));rz.open();
    } catch(e){setError(e.message);setBusy(false);}
  }
  async function simulate(success) {
    setBusy(true); setError('');
    try {
      const data = await portal('/auth/demo-checkout/confirm', {
        method: 'POST', body: JSON.stringify({ checkoutId: checkout.checkoutId, simulateSuccess: success })
      });
      setResult(data); setCheckout(null);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const input = 'w-full rounded-xl border border-[#c9d5e1] bg-white px-4 py-3.5 text-[#172d43] placeholder:text-[#607184] shadow-sm outline-none transition focus:border-[#355b82] focus:ring-4 focus:ring-blue-700/15 disabled:bg-[#eef2f6]';
  const fields = [
    ['name', 'Full name', 'text', 'name', 'Enter your full name'],
    ['age', 'Age', 'number', 'off', 'Enter your age'],
    ['phone', 'Phone number', 'tel', 'tel', 'Enter your phone number'],
    ['email', 'Email', 'email', 'email', 'Enter your email address'],
    ['password', 'Password (minimum 10 characters)', 'password', 'new-password', 'Create a secure password'],
  ];
  return <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
    <div className="overflow-hidden rounded-[2rem] border border-[#e1d9c7] bg-[#fffefa] shadow-[0_28px_90px_-55px_rgba(23,45,67,.45)]">
      <div className="border-b border-[#e6e3d8] bg-gradient-to-r from-[#172d43] via-[#203c55] to-[#294c68] px-6 py-9 text-white sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-[#e6cf94]">Student Enrollment</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">Join Hajara Ilm Academy</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#dce5ed]">Islamic Learning Programme · இஸ்லாமியக் கல்விப் பாடத்திட்டம்</p>
      </div>
      <div className="space-y-7 p-6 sm:p-10">
        <div className="grid gap-4 rounded-2xl border border-[#d7e1eb] bg-[#edf3f9] p-5 sm:grid-cols-2">
          <div><p className="text-xs font-bold uppercase tracking-wider text-[#52657b]">Programme</p><h2 className="mt-1 font-heading text-xl font-semibold text-[#172d43]">Islamic Learning Programme</h2><p lang="ta" className="mt-1 text-sm text-[#40566e]">இஸ்லாமியக் கல்விப் பாடத்திட்டம்</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-[#52657b]">Four learning areas</p><p className="mt-1 text-sm leading-6 text-[#40566e]">Quran & Tajweed · Kolkai · Sattathittangal & Ethics · Islamic History</p></div>
        </div>
        {batch.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not check enrollment availability. Please try again later.</div>}
        {checkingAvailability && !verification && !checkout && !result && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-[#172d43]">Checking enrollment availability…</p>}
        {!open && !checkingAvailability && !batch.error && !verification && !checkout && !result && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Enrollment is currently closed.</strong> Please wait for the next enrollment period. Please check back when applications reopen.</div>}
        {open && !verification && !checkout && !result && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-[#172d43]"><strong>Enrollment is open.</strong><p className="mt-1">Fill in your details below. Verify your email to continue to payment.</p></div>}
        {result ? <div className="grid gap-4">
          <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-[#172d43]">{result.message}</p>
          {result.success && <>
            <p className="text-[#172d43]">Student ID: <strong>{result.studentId}</strong></p>
            <p className="text-[#172d43]">{result.welcomeEmailSent ? 'An email was sent to your verified email address.' : 'Email delivery is pending. You can still sign in.'}</p>
            {pushConfigured && <section className="grid gap-3 rounded-xl border border-[#d7e1eb] p-4 text-[#172d43]">
              <h2 className="font-semibold">Get academy notifications on this device</h2>
              <p className="text-sm">Sign in to finish enabling browser notifications.</p>
              <button type="button" className={button} onClick={() => nav('/login', { state: { offerPush: true } })}>Enable notifications</button>
            </section>}
          </>}
          <button type="button" className={button} onClick={() => result.success ? nav('/login') : setResult(null)}>
            {result.success ? (pushConfigured ? 'Maybe later · Continue to login' : 'Continue to student login') : 'Try again'}
          </button>
        </div>
        : checkout ? <div className="grid gap-4 text-[#172d43]"><h2 ref={stepHeading} tabIndex={-1} className="text-2xl font-semibold">Programme payment</h2><p>Islamic Learning Programme</p><p>Total payable: ₹{Number(checkout.amount).toLocaleString('en-IN')}</p>{checkout.razorpay ? <><h3 className="font-semibold">Billing details</h3>{billingFields.map(([key,label,maxLength,autoComplete])=><label key={key}>{label}{key!=='area'?' *':''}<input className={input} maxLength={maxLength} autoComplete={autoComplete} required={key!=='area'} inputMode={key==='pin'?'numeric':'text'} value={billing[key]} onChange={e=>setBilling(old=>({...old,[key]:key==='pin'?e.target.value.replace(/[^0-9]/g,''):e.target.value}))}/></label>)}<label>Country<input className={input} value="India" readOnly/></label>{billing.pin.length>0&&!/^[1-9][0-9]{5}$/.test(billing.pin)&&<p role="alert">Enter a valid six-digit PIN code.</p>}<button className={button} disabled={busy||!billingValid||checkout.confirmationPending} onClick={pay}>Pay securely with Razorpay</button></> : checkout.demoEnabled ? <><p>Demo only — no real money collected.</p><button className={button} disabled={busy} onClick={()=>simulate(true)}>Simulate payment</button><button disabled={busy} onClick={()=>simulate(false)}>Simulate failure</button></> : <p>Online payments are not configured. Contact the academy.</p>}</div>
        : verification ? <form onSubmit={verifyEmail} className="grid gap-4 text-[#172d43]">
          <h2 ref={stepHeading} tabIndex={-1} className="text-2xl font-semibold">Verify your email</h2>
          <p>Enter the six-digit code from your email. It expires in 15 minutes. Stay on the same browser and website address where you started enrollment.</p>
          <label className="grid gap-2">Email verification code
            <input className={input} value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required disabled={busy} />
          </label>
          {typeof navigator.clipboard?.readText === 'function' &&
            <button type="button" className="justify-self-start text-sm font-semibold underline" onClick={pasteCode} disabled={busy}>Paste code</button>}
          <button className={button} disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify email and continue'}</button>
          <button type="button" className="text-sm underline" disabled={busy}
            onClick={() => { saveVerification(null); setCode(''); setError(''); }}>Back to registration to request a new code</button>
        </form>
        : <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          {fields.map(([name,label,type,auto,placeholder]) => <label key={name} className={`grid gap-2 text-sm font-semibold text-[#243d55] ${name==='password'?'sm:col-span-2':''}`}>
            <span>{label}</span><div className="relative"><input className={`${input} ${name==='password'?'pr-24':''}`} name={name} type={name==='password'&&showPassword?'text':type} value={form[name]} onChange={update} autoComplete={auto} placeholder={placeholder} disabled={!open || busy} min={name==='age'?5:undefined} max={name==='age'?120:undefined} minLength={name==='password'?10:undefined} maxLength={name==='password'?72:name==='phone'?30:undefined} required />{name==='password'&&<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-[#30577b]" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Hide':'Show'}</button>}</div>
          </label>)}
          <button className="rounded-xl bg-[#172d43] px-5 py-4 font-bold text-white shadow-md transition hover:bg-[#25435f] disabled:cursor-not-allowed disabled:bg-[#526a82] sm:col-span-2" disabled={!open || busy}>{busy?'Please wait…':'Continue to payment'}</button>
          <p className="text-sm text-[#52657b] sm:col-span-2">Already enrolled? <Link to="/login" className="font-semibold text-[#254b70] underline">Student login</Link></p>
        </form>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      </div>
    </div>
  </div>;
}

function BatchAdmin({batches,courses,run,post}) {
  const fresh = {name:'',courseId:String(courses[0]?.id||''),courseFee:'3000',classesStartAt:'',enrollmentClosesAt:''};
  const [form,setForm]=useState(fresh),[selected,setSelected]=useState(null),[members,setMembers]=useState([]),[editId,setEditId]=useState(null),[creating,setCreating]=useState(false);
  const ordered=[...(batches.data||[])].sort((a,b)=>Number(b.id)-Number(a.id));
  const selectedBatch=ordered.find(b=>b.id===selected);
  const dt=v=>v?String(v).replace(' ','T').slice(0,16):'';
  const date=v=>!v||String(v).startsWith('2099-')?'Not set':new Date(String(v).replace(' ','T')+'Z').toLocaleDateString();
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  async function save(e){e.preventDefault();const payload={...form,courseId:String(form.courseId||courses[0]?.id||''),enrollmentOpensAt:new Date().toISOString().slice(0,16),enrollmentClosesAt:form.enrollmentClosesAt||'2099-12-30T23:59',classesStartAt:form.classesStartAt||'2099-12-31T00:00',classesEndAt:'2099-12-31T23:59'};
    // Existing backend stores required legacy schedule columns; defaults are managed server-side for omitted dates.
    const ok=await run(()=>post(editId?`/admin/batches/${editId}`:'/admin/batches',payload,editId?'PUT':'POST'),editId?'Batch updated':'Batch created',[batches]);
    if(ok){setEditId(null);setCreating(false);setForm(fresh);if(selected)await viewMembers(selected);}
  }
  async function viewMembers(id){try{setMembers(await portal(`/admin/batches/${id}/students`));setSelected(id);}catch(e){window.alert(e.message);}}
  function edit(b){setEditId(b.id);setCreating(true);setForm({name:b.name,courseId:String(b.course_id),courseFee:String(b.course_fee),classesStartAt:String(b.classes_start_at).startsWith('2099-')?'':dt(b.classes_start_at),enrollmentClosesAt:String(b.enrollment_closes_at).startsWith('2099-')?'':dt(b.enrollment_closes_at)});}
  async function toggle(b){if(b.status==='COMPLETED')return;const ok=await run(()=>post(`/admin/batches/${b.id}/status`,{status:b.status==='OPEN'?'CLOSED':'OPEN'},'PUT'),'Registration updated',[batches]);if(ok)await viewMembers(b.id);}
  return <section className="space-y-6 text-white">
    {!selectedBatch?<>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#30496b] bg-gradient-to-br from-[#1b3254] to-[#10151e] p-7"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#a9c9fa]">Academy cohorts</p><h2 className="mt-2 text-3xl font-bold">Your Batches</h2><p className="mt-2 text-sm text-[#c6dcff]">Newest batches first · One registration-open batch at a time</p></div><button type="button" className={button} onClick={()=>{setCreating(v=>!v);setEditId(null);setForm(fresh)}}>+ New Batch</button></div>
      {creating&&<form onSubmit={save} className="grid gap-4 rounded-3xl border border-[#30496b] bg-[#131c2b] p-6 md:grid-cols-2"><div className="md:col-span-2"><h3 className="text-xl font-bold">{editId?'Edit batch':'Create a batch'}</h3><p className="text-sm text-[#a5b4ca]">Each batch represents a six-month student intake. Batch details are internal and are not displayed on the public website. Only the batch name is required; dates can be updated later.</p></div><label className="text-sm text-[#d9e6f8]">Batch name *<input required className={field} value={form.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. Batch 02"/></label><label className="text-sm text-[#d9e6f8]">One-time fee (₹)<input className={field} type="number" min="0" value={form.courseFee} onChange={e=>update('courseFee',e.target.value)}/></label><label className="text-sm text-[#d9e6f8]">Class start date (optional)<input className={field} type="datetime-local" value={form.classesStartAt} onChange={e=>update('classesStartAt',e.target.value)}/></label><label className="text-sm text-[#d9e6f8]">Registration deadline (optional)<input className={field} type="datetime-local" value={form.enrollmentClosesAt} onChange={e=>update('enrollmentClosesAt',e.target.value)}/></label><div className="flex gap-2 md:col-span-2"><button className={button}>{editId?'Save changes':'Create batch'}</button><button type="button" className={linkButton} onClick={()=>setCreating(false)}>Cancel</button></div></form>}
      <div className="grid gap-4 lg:grid-cols-2">{ordered.map(b=><button type="button" key={b.id} onClick={()=>viewMembers(b.id)} className="group rounded-3xl border border-[#26364e] bg-gradient-to-br from-[#192b48] to-[#10151e] p-6 text-left shadow-lg transition hover:-translate-y-1 hover:border-[#8bb5f4]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#a9c9fa]">Batch #{b.id}</p><h3 className="mt-2 text-2xl font-bold text-white">{b.name}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${b.status==='OPEN'?'bg-blue-800 text-blue-100':'bg-[#26364e] text-[#a5b4ca]'}`}>{b.status}</span></div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 p-3"><p className="text-xs text-[#a5b4ca]">Students</p><p className="mt-1 text-xl font-semibold text-white">{b.student_count||0}</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-xs text-[#a5b4ca]">Class starts</p><p className="mt-1 text-sm font-semibold text-white">{date(b.classes_start_at)}</p></div></div><p className="mt-5 text-sm font-semibold text-[#a9c9fa]">Open batch details →</p></button>)}</div>
      {!ordered.length&&<p className="rounded-2xl border border-dashed border-[#26364e] p-8 text-center text-[#a5b4ca]">No batches yet. Create your first batch.</p>}
    </>:<>
      <button type="button" className={linkButton} onClick={()=>{setSelected(null);setCreating(false)}}>← All batches</button>
      <div className="rounded-3xl border border-[#30496b] bg-gradient-to-br from-[#1b3254] via-[#17263d] to-[#10151e] p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.2em] text-[#a9c9fa]">Batch details · #{selectedBatch.id}</p><h2 className="mt-2 text-3xl font-bold">{selectedBatch.name}</h2><p className="mt-2 text-sm text-[#c6dcff]">{members.length} enrolled students · ₹{selectedBatch.course_fee} one-time fee</p></div><span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">{selectedBatch.status}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-black/20 p-4"><p className="text-xs text-[#a5b4ca]">Class start</p><p className="mt-2 font-semibold">{date(selectedBatch.classes_start_at)}</p></div><div className="rounded-xl bg-black/20 p-4"><p className="text-xs text-[#a5b4ca]">Registration deadline</p><p className="mt-2 font-semibold">{date(selectedBatch.enrollment_closes_at)}</p></div><div className="rounded-xl bg-black/20 p-4"><p className="text-xs text-[#a5b4ca]">Registration</p><p className="mt-2 font-semibold">{selectedBatch.status==='OPEN'?'Accepting students':'Not accepting students'}</p></div></div><div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" disabled={selectedBatch.status==='COMPLETED'} onClick={()=>toggle(selectedBatch)} className={`rounded-xl px-5 py-3 font-bold ${selectedBatch.status==='OPEN'?'bg-rose-700 text-white':'bg-blue-600 text-white'} disabled:opacity-40`}>Registration {selectedBatch.status==='OPEN'?'ON · Turn OFF':'OFF · Turn ON'}</button><button type="button" className={linkButton} onClick={()=>edit(selectedBatch)}>Edit batch details</button>{selectedBatch.status==='CLOSED'&&<button type="button" className={linkButton} onClick={()=>{if(window.confirm('Mark batch completed?'))run(()=>post(`/admin/batches/${selectedBatch.id}/status`,{status:'COMPLETED'},'PUT'),'Batch completed',[batches])}}>Mark completed</button>}</div></div>
      {creating&&<form onSubmit={save} className="grid gap-4 rounded-2xl border border-[#30496b] bg-[#131c2b] p-6 md:grid-cols-2"><h3 className="text-lg font-bold md:col-span-2">Edit batch details</h3><label>Batch name<input className={field} value={form.name} required onChange={e=>update('name',e.target.value)}/></label><label>One-time fee<input className={field} type="number" value={form.courseFee} onChange={e=>update('courseFee',e.target.value)}/></label><label>Class start date<input className={field} type="datetime-local" value={form.classesStartAt} onChange={e=>update('classesStartAt',e.target.value)}/></label><label>Registration deadline<input className={field} type="datetime-local" value={form.enrollmentClosesAt} onChange={e=>update('enrollmentClosesAt',e.target.value)}/></label><div className="md:col-span-2 flex gap-2"><button className={button}>Save details</button><button type="button" className={linkButton} onClick={()=>setCreating(false)}>Cancel</button></div></form>}
      <div className="rounded-3xl border border-[#26364e] bg-[#131c2b] p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold">Enrolled Students</h3><p className="mt-1 text-sm text-[#a5b4ca]">Student ID appears before the name</p></div><span className="rounded-xl bg-[#192b48] px-3 py-2 text-sm">{members.length} students</span></div><div className="space-y-2">{members.map((m,i)=><div key={m.enrollmentId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#26364e] bg-[#192b48] p-4"><div className="flex items-center gap-4"><span className="text-xs text-[#a5b4ca]">{String(i+1).padStart(2,'0')}</span><div><p className="font-mono text-sm font-bold text-[#a9c9fa]">{m.studentId||'ID pending'}</p><p className="mt-1 font-semibold text-white">{m.name}</p><p className="text-xs text-[#a5b4ca]">{m.email}</p></div></div><span className="text-xs text-[#a9c9fa]">{m.enrollmentStatus}</span></div>)}{!members.length&&<p className="py-8 text-center text-[#a5b4ca]">No students enrolled in this batch yet.</p>}</div></div>
    </>}
  </section>;
}

function BatchAttendance({batches,records,run,post}) {
 const ordered=[...(batches.data||[])].sort((a,b)=>Number(b.id)-Number(a.id));
 const open=ordered.find(b=>b.status==='OPEN');
 const [batchId,setBatchId]=useState('');const [date,setDate]=useState(()=>new Date().toLocaleDateString('en-CA'));const [members,setMembers]=useState([]);const [statuses,setStatuses]=useState({});const [loading,setLoading]=useState(false);
 useEffect(()=>{if(!batchId&&ordered.length)setBatchId(String(open?.id||ordered[0].id));},[batches.data,batchId]);
 useEffect(()=>{if(!batchId)return;let active=true;setLoading(true);portal(`/admin/batches/${batchId}/students`).then(data=>{if(active)setMembers(data)}).catch(()=>{if(active)setMembers([])}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[batchId]);
 useEffect(()=>{const saved={};for(const m of members){const record=(records.data||[]).find(r=>Number(r.enrollmentId)===Number(m.enrollmentId)&&String(r.classDate).slice(0,10)===date);saved[m.enrollmentId]=record?.status||'PRESENT'}setStatuses(saved)},[members,date,records.data]);
 const [saving,setSaving]=useState(false);
 async function save(){setSaving(true);let errors=[];for(const m of members){try{await post('/admin/attendance',{enrollmentId:Number(m.enrollmentId),date,status:statuses[m.enrollmentId]||'PRESENT'})}catch(e){errors.push(`${m.name}: ${e.message}`)}}records.refresh();setSaving(false);window.alert(errors.length?`Some records failed:\n${errors.join('\n')}`:`Attendance saved for ${members.length} students`)}
 return <section className="space-y-5 text-white"><div className="rounded-3xl border border-[#30496b] bg-gradient-to-r from-[#1b3254] to-[#10151e] p-7"><p className="text-xs uppercase tracking-widest text-[#a9c9fa]">Daily register</p><h2 className="mt-2 text-3xl font-bold">Attendance</h2><p className="mt-2 text-sm text-[#c6dcff]">Open batch and today's date are selected automatically. You can change both.</p></div><div className="grid gap-4 rounded-2xl border border-[#26364e] bg-[#131c2b] p-5 sm:grid-cols-2"><label className="text-sm">Batch<select className={field} value={batchId} onChange={e=>setBatchId(e.target.value)}>{ordered.map(b=><option key={b.id} value={b.id}>{b.name} · {b.status}</option>)}</select></label><label className="text-sm">Class date<input className={field} type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="rounded-2xl border border-[#26364e] bg-[#131c2b] p-5"><div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-semibold">Student register</h3><span className="text-sm text-[#a5b4ca]">{members.length} students</span></div>{loading?<p>Loading students…</p>:members.map(m=><div key={m.enrollmentId} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-4"><div><p className="font-mono text-xs font-bold text-[#a9c9fa]">{m.studentId||'ID pending'}</p><p className="mt-1 font-medium">{m.name}</p></div><button type="button" role="switch" aria-checked={statuses[m.enrollmentId]!=='ABSENT'} onClick={()=>setStatuses(s=>({...s,[m.enrollmentId]:s[m.enrollmentId]==='ABSENT'?'PRESENT':'ABSENT'}))} className={`min-w-32 rounded-full px-4 py-2 text-sm font-bold ${statuses[m.enrollmentId]==='ABSENT'?'bg-rose-900 text-rose-100':'bg-blue-800 text-blue-100'}`}>{statuses[m.enrollmentId]==='ABSENT'?'● Absent':'● Present'}</button></div>)}{!members.length&&!loading&&<p className="py-8 text-center text-[#a5b4ca]">No students in this batch.</p>}<button type="button" disabled={!members.length||saving} onClick={save} className={`${button} mt-5 w-full`}>{saving?'Saving attendance…':`Save attendance · ${date}`}</button></div></section>
}

function BatchCertificates({batches,run,post}) {
 const ordered=[...(batches.data||[])].sort((a,b)=>Number(b.id)-Number(a.id));
 const [selected,setSelected]=useState(null),[members,setMembers]=useState([]),[issued,setIssued]=useState([]),[drafts,setDrafts]=useState([]),[manualDrafts,setManualDrafts]=useState([]),[busy,setBusy]=useState(false),[editing,setEditing]=useState(null);
 async function load(id){setSelected(id);try{const [people,certs,ds,manual]=await Promise.all([portal(`/admin/batches/${id}/students`),portal('/admin/certificates'),portal('/admin/certificate-drafts'),portal('/admin/manual-certificates')]);setMembers(people);setIssued(certs);setDrafts(ds);setManualDrafts(manual)}catch(e){window.alert(e.message)}}
 const batch=ordered.find(b=>b.id===selected);
 async function action(fn){setBusy(true);try{await fn();await load(selected)}catch(e){window.alert(e.message)}finally{setBusy(false)}}
 async function preview(id){try{const response=await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/portal/admin/certificate-drafts/${id}/preview`,{credentials:'include'});if(!response.ok)throw Error('Preview unavailable');const blob=await response.blob();const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){window.alert(e.message)}}
 async function manualUpload(m,file){
  if(!file)return;
  if(file.size>2000000){window.alert('PDF must be 2 MB or less');return;}
  const studentName=window.prompt('Certificate name',m.name);
  if(!studentName)return;
  const completionDate=window.prompt('Completion date (YYYY-MM-DD)',new Date().toLocaleDateString('en-CA'));
  if(!completionDate)return;
  const form=new FormData();form.append('enrollmentId',String(m.enrollmentId));form.append('studentName',studentName);form.append('completionDate',completionDate);form.append('file',file);
  await action(()=>portal('/admin/manual-certificates',{method:'POST',body:form}));
 }
 async function downloadManualQr(id){try{
  const response=await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/portal/admin/manual-certificates/${id}/verification-qr`,{credentials:'include'});
  if(!response.ok)throw Error('QR download failed');
  const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download='certificate-verification-qr.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){window.alert(e.message)}}
 async function previewManual(id){try{
  const response=await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/portal/admin/manual-certificates/${id}/preview`,{credentials:'include'});
  if(!response.ok)throw Error('Manual PDF preview unavailable');
  const url=URL.createObjectURL(await response.blob());window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){window.alert(e.message)}}
 async function edit(d){const studentName=window.prompt('Certificate recipient name',d.student_name);if(studentName===null)return;const completionDate=window.prompt('Completion date (YYYY-MM-DD)',String(d.completion_date).slice(0,10));if(completionDate===null)return;await action(()=>portal(`/admin/certificate-drafts/${d.id}`,{method:'PUT',body:JSON.stringify({studentName,completionDate})}));}
 return <section className="space-y-5 text-white">{!batch?<><h2 className="text-3xl font-bold">Certificates</h2><p>Select a batch to prepare, review and issue completion certificates.</p><div className="grid gap-4 sm:grid-cols-2">{ordered.map(b=><button key={b.id} type="button" onClick={()=>load(b.id)} className="rounded-2xl border border-[#26364e] bg-[#131c2b] p-6 text-left"><h3 className="text-xl font-bold">{b.name}</h3><p className="mt-2 text-sm">{b.student_count||0} students · {b.status}</p></button>)}</div></>:<><button type="button" className={linkButton} onClick={()=>setSelected(null)}>← All batches</button><div className="rounded-2xl border border-[#26364e] bg-[#131c2b] p-6"><h2 className="text-2xl font-bold">{batch.name} · Certificates</h2><p className="mt-2 text-sm text-[#a5b4ca]">Generate drafts, inspect PDF, correct name/date, then issue individually.</p><button className={`${button} mt-4`} type="button" disabled={busy||batch.status!=='COMPLETED'} onClick={()=>action(()=>post(`/admin/certificate-drafts/batch/${selected}`,{}))}>Generate batch drafts</button></div>{batch.status!=='COMPLETED'&&<p className="text-amber-300">Complete this batch before generating certificates.</p>}<div className="rounded-2xl border border-[#26364e] bg-[#131c2b] p-5">{members.map(m=>{const cert=issued.find(c=>Number(c.enrollmentId)===Number(m.enrollmentId));const draft=drafts.find(d=>Number(d.enrollment_id)===Number(m.enrollmentId));const manual=manualDrafts.find(d=>Number(d.enrollment_id)===Number(m.enrollmentId));return <div key={m.enrollmentId} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-4"><div><p className="font-mono text-xs text-[#a9c9fa]">{m.studentId||'ID pending'}</p><p className="font-semibold">{m.name}</p><p className="text-xs text-[#a5b4ca]">{cert?`Issued · ${cert.certificateCode}`:manual?`Manual draft · ${manual.certificate_code}`:draft?`Draft · ${draft.certificate_code}`:'Not generated'}</p></div><div className="flex flex-wrap gap-2">{cert?<button className={linkButton} type="button" onClick={async()=>{const response=await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/portal/admin/certificates/${cert.id}/pdf`,{credentials:'include'});if(response.ok){const url=URL.createObjectURL(await response.blob());window.open(url,'_blank');setTimeout(()=>URL.revokeObjectURL(url),60000)}else window.alert('Unable to view certificate')}}>View PDF</button>:manual?<><button className={linkButton} type="button" onClick={()=>previewManual(manual.id)}>Preview uploaded PDF</button><button className={linkButton} type="button" onClick={()=>downloadManualQr(manual.id)}>Download QR</button><button className={button} type="button" disabled={busy} onClick={()=>{if(window.confirm('Have you included the verification URL or QR code in the PDF, and verified the name? Publish certificate?'))action(()=>portal(`/admin/manual-certificates/${manual.id}/issue`,{method:'POST'}))}}>Publish PDF</button><button className={linkButton} type="button" disabled={busy} onClick={()=>{if(window.confirm('Discard this manual draft?'))action(()=>portal(`/admin/manual-certificates/${manual.id}`,{method:'DELETE'}))}}>Discard</button></>:draft?<><button className={linkButton} type="button" onClick={()=>preview(draft.id)}>Preview</button><button className={linkButton} type="button" disabled={busy} onClick={()=>edit(draft)}>Edit</button><button className={button} type="button" disabled={busy} onClick={()=>{if(window.confirm('Approve and issue this certificate?'))action(()=>post(`/admin/certificate-drafts/${draft.id}/issue`,{}))}}>Approve & Issue</button></>:<button className={button} type="button" disabled={busy||batch.status!=='COMPLETED'} onClick={()=>action(()=>post('/admin/certificate-drafts',{enrollmentId:Number(m.enrollmentId)}))}>Generate draft</button>}{!cert&&batch.status==='COMPLETED'&&<label className={linkButton} style={{cursor:'pointer'}}>Upload PDF<input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={e=>{const file=e.target.files?.[0];e.target.value='';manualUpload(m,file)}} /></label>}</div></div>})}{!members.length&&<p>No students in this batch.</p>}</div></>}</section>
}

const emptyCourse = { title: '', description: '', monthlyPrice: '', yearlyPrice: '', meetUrl: '' };

export const SLUGS = { Overview: '', Programme: 'programme', Batches: 'batches', Students: 'students', Enrollments: 'enrollments', Attendance: 'attendance', Payments: 'payments', Certificates: 'certificates', 'Website Content': 'website', Announcements: 'announcements', Notifications: 'notifications', Reports: 'reports', Security: 'security' };

export function Admin({ tab: tabProp = 'Overview' }) {
  const { logout } = useAuth();
  const nav = useNavigate();
  const students = useLoad('/admin/students');
  const enroll = useLoad('/admin/enrollments');
  const payments = useLoad('/admin/payments');
  const razor = useLoad('/admin/razorpay');
  const courses = useLoad('/admin/courses');
  const news = useLoad('/admin/announcements');
  const currentBatch = useLoad('/batches/current');
  const overview = useLoad('/admin/overview');
  const attendanceRecords = useLoad('/admin/attendance');
  const batches = useLoad('/admin/batches');
  const tab = tabProp;
  const setTab = (name) => nav('/admin/' + (SLUGS[name] || ''));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState(null);
  const [announcement, setAnnouncement] = useState({ title: '', body: '', audience: null });
  const [attendance, setAttendance] = useState({ enrollmentId: '', date: new Date().toISOString().slice(0, 10), status: 'PRESENT' });
  const [grant, setGrant] = useState({ userId: '', batchId: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function run(action, success, after = []) {
    setMsg('');
    setError('');
    try {
      const result = await action();
      setMsg(result?.message || success);
      after.forEach((load) => load.refresh());
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  const post = (path, body, method = 'POST') => portal(path, { method, body: JSON.stringify(body) });

  async function saveCourse(e) {
    e.preventDefault();
    const body = { ...courseForm, monthlyPrice: Number(courseForm.monthlyPrice), yearlyPrice: Number(courseForm.monthlyPrice) };
    const ok = await run(
      () => (editingId ? post(`/admin/courses/${editingId}`, body, 'PUT') : post('/admin/courses', body)),
      'Course saved.', [courses, overview]);
    if (ok) {
      setCourseForm(emptyCourse);
      setEditingId(null);
    }
  }

  function editCourse(c) {
    setEditingId(c.id);
    setCourseForm({ title: c.title, description: c.description ?? '', monthlyPrice: String(c.monthlyPrice), yearlyPrice: String(c.yearlyPrice), meetUrl: c.meetUrl ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function publish(e) {
    e.preventDefault();
    const { title, body, audience } = announcement;
    const ok = await run(() => post('/admin/announcements', { title, body, ...audiencePayload(audience, currentBatch.data) }), 'Announcement published.', [news]);
    if (ok) setAnnouncement({ title: '', body: '', audience: null });
  }

  async function markAttendance(e) {
    e.preventDefault();
    await run(() => post('/admin/attendance', { ...attendance, enrollmentId: Number(attendance.enrollmentId) }), 'Attendance saved.', [attendanceRecords]);
  }

  async function grantAccess(e) {
    e.preventDefault();
    const ok = await run(() => post('/admin/enrollments', { userId: Number(grant.userId), batchId: Number(grant.batchId) }), 'Student enrolled in batch.', [enroll, overview, batches]);
    if (ok) setGrant({ userId: '', batchId: '' });
  }

  async function assignExistingBatch(enrollment) {
    const eligible = (batches.data || []).filter(b =>
      (b.status === 'OPEN' || b.status === 'CLOSED') &&
      Number(b.course_id ?? b.courseId) === Number(enrollment.courseId));
    if (!eligible.length) {
      setError('No eligible batch exists for this course. Create or update a batch first.');
      return;
    }
    const choices = eligible.map(b => `${b.id}: ${b.name}`).join('\n');
    const answer = window.prompt(`Assign batch to ${enrollment.student}\n\nAvailable batches:\n${choices}\n\nEnter the batch ID:`);
    if (answer === null) return;
    const selected = eligible.find(b => String(b.id) === answer.trim());
    if (!selected) { setError('Select a valid batch ID from the list.'); return; }
    if (!window.confirm(`Assign ${enrollment.student} to ${selected.name}? Existing enrollment will be preserved.`)) return;
    await run(() => post(`/admin/enrollments/${enrollment.id}/batch`, { batchId: Number(selected.id) }, 'PUT'),
      'Existing enrollment assigned to batch.', [enroll, overview, batches, students]);
  }

  async function permanentlyDeleteStudent(student) {
    const typed = window.prompt(`PERMANENT DELETION\n\nThis removes ${student.name}'s account, enrollments, payments, attendance, certificates and personal notifications. It cannot be undone.\n\nType the student's email to confirm: ${student.email}`);
    if (typed === null) return;
    if (typed.trim() !== student.email) {
      setError('Deletion cancelled: the email did not match exactly.');
      return;
    }
    if (!window.confirm(`Final confirmation: permanently delete ${student.name} (${student.email})?`)) return;
    await run(() => portal(`/admin/students/${student.id}`, { method: 'DELETE' }),
      'Student permanently deleted.', [students, enroll, payments, attendanceRecords, overview]);
  }

  async function signOut() {
    try {
      await logout();
    } finally {
      nav('/admin/login');
    }
  }

  const navigation = [
    { group: 'OVERVIEW', items: [['Overview', LayoutDashboard]] },
    { group: 'ACADEMY MANAGEMENT', items: [['Programme', BookOpen], ['Batches', Layers], ['Students', Users], ['Enrollments', ClipboardCheck], ['Attendance', CalendarCheck], ['Payments', Wallet], ['Certificates', Award]] },
    { group: 'CONTENT & WEBSITE', items: [['Announcements', Megaphone], ['Notifications', Bell]] },
    { group: 'SYSTEM', items: [['Reports', BarChart3], ['Security', ShieldCheck]] },
  ];
  const pageDescriptions = {
    Overview: 'Monitor your academy at a glance.', Programme: 'One programme. Four connected learning areas.',
    Batches: 'Manage registrations, schedules and batch access.', Students: 'Your complete student directory.',
    Enrollments: 'Review and manage learning access.', Attendance: 'Record and review class attendance.',
    Payments: 'Review the recorded payment ledger.', Certificates: 'Issue and manage student certificates.',
    'Website Content': 'Manage existing public website text.', Announcements: 'Manage existing academy announcements.',
Notifications: 'Send in-app notices to students.',
    Reports: 'Explore academy activity and totals.', Security: 'Review administrator security.'
  };
  const filteredStudents = (students.data || []).filter(s => `${s.studentId||''} ${s.name} ${s.email} ${s.phone}`.toLowerCase().includes(filter.toLowerCase()));
  const statCards = [
    ['Students', overview.data?.students], ['Batches', batches.data?.length ?? 0],
    ['Active access', overview.data?.activeEnrollments], ['Enrollments', overview.data?.totalEnrollments],
    ['Payments', overview.data?.payments], ['Recorded paid', `₹${overview.data?.recordedPaidAmount ?? '—'}`],
  ];
  return (
    <>
        <Alert text={error || students.error || courses.error || overview.error} />
        <Notice text={msg} />
      {tab === 'Overview' && <section>
        <div className="mb-6 rounded-3xl border border-[#30496b] bg-gradient-to-r from-[#1b3254] via-[#16263f] to-[#10151e] p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#a9c9fa]">Academy overview</p><h2 className="mt-3 text-2xl font-semibold text-white">Assalamu Alaikum, Admin</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#c6dcff]">Manage your students, batches, curriculum and academy operations from one secure workspace.</p><div className="mt-5 flex flex-wrap gap-2">{[['Students','Students'],['Batches','Batches'],['Attendance','Attendance']].map(([label,target])=><button type="button" key={target} onClick={()=>setTab(target)} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20">{label} <ArrowUpRight size={13} className="ml-1 inline"/></button>)}</div></div><h2 className="mb-4 text-lg font-semibold text-white">Academy at a glance</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-3">{statCards.map(([label,value]) => <div key={label} className="rounded-2xl border border-[#26364e] bg-[#131c2b] p-5 shadow-[0_12px_35px_rgba(0,0,0,.12)]"><p className="text-sm text-slate-300">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value ?? '—'}</p></div>)}</div>
        <p className="mt-4 text-sm text-slate-500">Financial totals reflect recorded payment statuses, not independently verified bank settlements.</p>
      </section>}
      {tab === 'Batches' && <BatchAdmin batches={batches} courses={courses.data || []} run={run} post={post} />}
      {tab === 'Students' && <section>
        <h2 className="text-xl font-semibold">Student directory</h2><p className="mt-1 text-sm text-slate-600">Permanent deletion removes the student and their course access, payments, attendance, certificates and personal notifications. Administrator accounts cannot be deleted here.</p>
        <input className={`${field} my-3`} placeholder="Search by name, email or phone" value={filter} onChange={e => setFilter(e.target.value)} />
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50"><th className="p-3">Student ID</th><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Age</th><th className="p-3">Actions</th></tr></thead><tbody>{filteredStudents.map(s => <tr key={s.id} className="border-b"><td className="p-3 font-mono text-blue-300">{s.studentId||'Pending'}</td><td className="p-3 font-medium">{s.name}</td><td className="p-3">{s.email}</td><td className="p-3">{s.phone}</td><td className="p-3">{s.age}</td><td className="p-3"><button type="button" onClick={() => permanentlyDeleteStudent(s)} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">Delete permanently</button></td></tr>)}</tbody></table></div>
        {filteredStudents.length === 0 && <p className="p-4 text-sm text-slate-500">No matching students.</p>}
      </section>}
      {tab === 'Enrollments' && <section>
        <h2 className="mb-3 text-xl font-semibold">Enrollment and access management</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50">{['Student','Course','Batch','Status','Course end','Action'].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{enroll.data?.map(e => <tr key={e.id} className="border-b"><td className="p-3">{e.student}</td><td className="p-3">{e.course}</td><td className="p-3">{batches.data?.find(b => Number(b.id) === Number(e.batchId))?.name || `#${e.batchId || "—"}`}</td><td className="p-3">{e.status}</td><td className="p-3">{e.expiresAt?.slice(0,10) || '—'}</td><td className="p-3">{!e.batchId && <button type="button" className={`${linkButton} mr-3`} onClick={() => assignExistingBatch(e)}>Assign Batch</button>}<button className={linkButton} onClick={() => { const next = e.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE'; if (window.confirm(`Set enrollment #${e.id} to ${next}?`)) run(() => post(`/admin/enrollments/${e.id}/status`, { status: next }, 'PUT'), 'Access updated.', [enroll,overview]); }}>{e.status === 'ACTIVE' ? 'Revoke' : 'Reactivate'}</button></td></tr>)}</tbody></table></div>
      <h2 className="mt-7 text-xl font-semibold">Manually enroll student</h2>
      <p className="text-sm text-slate-600">Assign an existing student to a batch after verifying their one-time course fee outside the website. Admin enrollment works even after the public registration deadline.</p>
      <form className="mt-2 grid gap-2" onSubmit={grantAccess}>
        <select className={field} value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })} required>
          <option value="">Select student</option>
          {students.data?.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
        </select>
        <select className={field} value={grant.batchId} onChange={(e) => setGrant({ ...grant, batchId: e.target.value })} required>
          <option value="">Select batch</option>
          {batches.data?.filter(b => b.status === 'OPEN' || b.status === 'CLOSED').map(b => <option key={b.id} value={b.id}>{b.name} — ₹{b.course_fee} (one-time fee)</option>)}
        </select>
        <p className="text-sm text-slate-600">Payment must be verified by the administrator before confirming this enrollment.</p>
        <button className={button}>Confirm manual enrollment</button>
      </form>

      </section>}
      {tab === 'Programme' && <ProgrammeEditor />}
      {tab === 'Payments' && <section><h2 className="text-xl font-semibold">Razorpay financial records</h2><p className="text-sm">Gateway-reported fees include GST. Net shown is an estimate, not a bank settlement.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Student','Payment','Status','Paid','Commission','Gateway GST','Refund','Estimated net','Receipt'].map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{razor.data?.map(r=><tr key={r.order_id}>{[r.full_name,r.payment_id||r.order_id,r.status,r.status==='PAID'?r.amount_paise/100:'Pending',r.fee_paise==null||r.tax_paise==null?'Pending':(r.fee_paise-r.tax_paise)/100,r.tax_paise==null?'Pending':r.tax_paise/100,r.refunded_paise/100,r.fee_paise==null?'Pending':(r.amount_paise-r.fee_paise-r.refunded_paise)/100].map((v,i)=><td key={i} className="p-2">{v}</td>)}<td>{r.email_sent?'Sent':r.payment_id?<button onClick={async()=>{try{await portal('/admin/razorpay/'+r.order_id+'/retry',{method:'POST'});razor.refresh();}catch(e){alert(e.message)}}}>Retry email</button>:<button onClick={async()=>{const paymentId=window.prompt('Enter captured Razorpay payment ID for this order');if(!paymentId)return;try{await portal('/admin/razorpay/'+r.order_id+'/recover',{method:'POST',body:JSON.stringify({paymentId:paymentId.trim()})});razor.refresh();}catch(e){alert(e.message)}}}>Recover captured payment</button>}</td></tr>)}</tbody></table></div><h2 className="mb-3 text-xl font-semibold">Payment ledger</h2><p className="mb-3 text-sm text-slate-500">Read-only transaction records. Demo transactions are not proof of real payment.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50">{['ID','Enrollment','Provider','Status','Amount','Reference'].map(x => <th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{payments.data?.map(p => <tr className="border-b" key={p.id}><td className="p-3">{p.id}</td><td className="p-3">{p.enrollmentId}</td><td className="p-3">{p.provider}</td><td className="p-3">{p.status}</td><td className="p-3">₹{p.amount}</td><td className="p-3">{p.referenceCode}</td></tr>)}</tbody></table></div></section>}
      {tab === 'Announcements' && <section><h2 className="mt-7 text-xl font-semibold">Announcements</h2>
      {news.data?.map((n) => (
        <div key={n.id} className="flex items-start justify-between gap-3 border-b py-2 text-sm">
          <span><b>{n.title}</b> — {n.body}<span className="mt-1 block text-[var(--p-muted)]">{audienceLabel(batches.data,n.batchId)}</span></span>
          <button className={linkButton} onClick={() => run(() => portal(`/admin/announcements/${n.id}`, { method: 'DELETE' }), 'Announcement deleted.', [news])}>Delete</button>
        </div>
      ))}
      <form className="mt-3 grid gap-3" onSubmit={publish}>
        <Alert text={news.error || batches.error || currentBatch.error} />
        <AudienceField batches={batches.data} current={currentBatch.data} selection={announcement.audience}
          onChange={audience => setAnnouncement(old => ({...old, audience}))} />
        <input className={field} placeholder="Title" value={announcement.title} maxLength={200} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} required />
        <textarea className={field} placeholder="Announcement" value={announcement.body} maxLength={5000} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} required />
        <button className={button} disabled={!batches.data || !currentBatch.data || !!(batches.error || currentBatch.error)}>Publish</button>
      </form>

      </section>}
      {tab === 'Attendance' && <BatchAttendance batches={batches} records={attendanceRecords} run={run} post={post} />}
      {tab === 'Certificates' && <BatchCertificates batches={batches} run={run} post={post} />}
      {['Teachers','Website Content','Reports','Notifications'].includes(tab) && <ManagementSections section={tab} enrollments={enroll.data || []} courses={courses.data || []} audience={{batches:batches.data,current:currentBatch.data,error:batches.error||currentBatch.error}} students={students.data} studentsError={students.error} />}
      {tab === 'Security' && <AdminSecurityAudit />}
      <p className="mt-6 text-sm text-slate-600">Notifications appear in the student portal. Share files through Notes and class links through Google Meet.</p>
    </>
  );
}

function AdminSecurityAudit() {
  const audit = useLoad('/admin/security/audit');
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">Admin security audit</h2>
      <p className="my-2 text-sm">Recent administrator logins, MFA events and changes</p>
      <Alert text={audit.error} />
      <div className="max-h-72 overflow-y-auto">
        {audit.data?.map((x) => <div key={x.id} className="border-b py-2 text-xs">{x.action} — {String(x.event_time ?? '')} — {x.ip_address} {x.details ? `— ${x.details}` : ''}</div>)}
      </div>
    </section>
  );
}
