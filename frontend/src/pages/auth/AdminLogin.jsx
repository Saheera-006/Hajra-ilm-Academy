import { useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Activity } from 'lucide-react';
import LoginForm from './LoginForm';
import { useLoginFlow } from './useLoginFlow';
import '@/styles/portal.css';

export default function AdminLogin() {
  const flow = useLoginFlow({ admin: true });
  const { state } = useLocation();
  return (
    <div className="portal-theme hia-admin-login portal-bg-grid grid min-h-screen lg:grid-cols-[1.1fr_1fr]" data-theme="dark">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--p-border)] bg-gradient-to-br from-[#101e35] via-[#0a101c] to-[#07090d] p-12 lg:flex">
        <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <img src="/logo-transparent.png" alt="Hajara Ilm Academy" className="h-14 w-14 object-contain" />
          <div><p className="font-semibold tracking-wide">Hajara Ilm Academy</p><p lang="ar" dir="rtl" className="text-sm text-blue-300/80">أكاديمية هاجرة للعلم</p></div>
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-blue-400">Admin Control Center</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">Run every batch, class and certificate from one place.</h1>
          <ul className="mt-8 space-y-4 text-sm text-[var(--p-muted)]">
            <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-blue-400" />Authenticator-protected administrator access</li>
            <li className="flex gap-3"><Lock className="h-5 w-5 shrink-0 text-blue-400" />Server-enforced permissions on every action</li>
            <li className="flex gap-3"><Activity className="h-5 w-5 shrink-0 text-blue-400" />Audited changes to attendance and certificates</li>
          </ul>
        </div>
        <p className="relative text-xs text-[var(--p-muted)]">Authorised personnel only. Activity is logged.</p>
      </aside>
      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/logo-transparent.png" alt="Hajara Ilm Academy" className="h-12 w-12 object-contain" />
            <p className="font-semibold">Hajara Ilm Academy <span className="block text-[10px] font-bold uppercase tracking-[.2em] text-blue-400">Admin</span></p>
          </div>
          {state?.denied && <p role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">That account does not have administrator access.</p>}
          <div className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)]/90 p-7 shadow-2xl backdrop-blur sm:p-8">
            <LoginForm flow={flow} admin /><p className="mt-4 text-xs text-[var(--p-muted)]">After verification, this browser stays signed in for 30 days. Sign out to forget this browser. Use your personal device.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
