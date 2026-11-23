import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { portal } from '@/services/portalApi';
import { Button, inputClass } from '@/components/kit';
import '@/styles/portal.css';

export default function ForgotPassword() {
  const [email,setEmail]=useState(''); const [otp,setOtp]=useState('');
  const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState('');
  const [step,setStep]=useState(0); const [busy,setBusy]=useState(false);
  const [error,setError]=useState(''); const [notice,setNotice]=useState('');
  const [show,setShow]=useState(false);
  async function requestOtp(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await portal('/auth/password-reset/request',{method:'POST',body:JSON.stringify({email})});
      setNotice('If this email address belongs to a student account, an email code has been sent.'); setStep(1);
    } catch(err) {setError(err.message)} finally {setBusy(false)}
  }
  async function reset(e) {
    e.preventDefault();setError('');
    if(password!==confirm){setError('Passwords do not match.');return}
    setBusy(true);
    try {await portal('/auth/password-reset/confirm',{method:'POST',body:JSON.stringify({email,code:otp,newPassword:password})});setStep(2);setNotice('Your password has been updated. Please sign in.');}
    catch(err){setError(err.message)}finally{setBusy(false)}
  }
  return <div className="portal-theme portal-bg-grid min-h-screen px-4 py-12" data-theme="dark">
    <main className="mx-auto max-w-md rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-7 shadow-2xl sm:p-9">
      <Link to="/login" className="inline-flex items-center gap-2 text-sm text-[var(--p-muted)] hover:text-white"><ArrowLeft size={16}/> Back to student login</Link>
      <img src="/logo-transparent.png" alt="Hajara Ilm Academy" className="mx-auto mt-5 h-24 w-24 object-contain"/>
      <ShieldCheck className="mx-auto mt-4 text-emerald-400" size={27}/>
      <h1 className="mt-3 text-center text-2xl font-semibold">{step===2?'Password updated':'Reset student password'}</h1>
      <p className="mt-2 text-center text-sm text-[var(--p-muted)]">{step===0?'Enter your registered email address to receive an email verification code.':step===1?'Enter the six-digit email code and choose a new password.':'You can now use your new password.'}</p>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</p>}
      {step===0 && <form onSubmit={requestOtp} className="mt-6 grid gap-4"><label className="grid gap-2 text-sm">Registered email address<input className={inputClass} value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required/></label><Button loading={busy} disabled={busy} type="submit">Send OTP</Button></form>}
      {step===1 && <form onSubmit={reset} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm">Six-digit OTP<input className={inputClass} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6}/></label>
        <label className="grid gap-2 text-sm">New password<div className="relative"><input className={`${inputClass} pr-12`} type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={10} maxLength={72} autoComplete="new-password" required/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--p-muted)]">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
        <label className="grid gap-2 text-sm">Confirm new password<input className={inputClass} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required/></label>
        <Button loading={busy} disabled={busy||otp.length!==6} type="submit">Reset password</Button>
        <button type="button" disabled={busy} onClick={()=>{setStep(0);setOtp('');setError('');setNotice('')}} className="text-sm text-emerald-300 hover:underline">Request another code</button>
      </form>}
      {step===2 && <Link to="/login" className="mt-6 block rounded-xl bg-emerald-700 p-3 text-center font-semibold text-white">Go to Student Login</Link>}
    </main>
  </div>;
}
