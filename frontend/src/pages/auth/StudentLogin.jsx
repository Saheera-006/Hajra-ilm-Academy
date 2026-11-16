import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, CalendarCheck, Award } from 'lucide-react';
import LoginForm from './LoginForm';
import { useLoginFlow } from './useLoginFlow';
import '@/styles/portal.css';

export default function StudentLogin() {
  const flow = useLoginFlow({ admin: false });
  return (
    <div className="portal-theme portal-bg-grid min-h-screen" data-theme="dark">
      <div className="mx-auto grid max-w-md items-center gap-5 px-5 py-6 lg:min-h-screen lg:max-w-6xl lg:grid-cols-2 lg:gap-10 lg:py-10">
        <section className="order-1">
          <Link to="/" className="hidden items-center lg:inline-flex gap-2 rounded-full border border-[var(--p-border)] bg-[var(--p-surface)] px-4 py-2 text-sm font-medium text-[var(--p-muted)] transition hover:text-[var(--p-text)]"><ArrowLeft className="h-4 w-4" />Back to website</Link>
          <div className="flex items-center justify-center gap-3 lg:mt-8 lg:justify-start">
            <img src="/logo-transparent.png" alt="" className="h-16 w-16 object-contain" />
            <div><p className="text-lg font-semibold">Hajara Ilm Academy</p><p lang="ar" dir="rtl" className="text-sm text-emerald-300/80">أكاديمية هاجرة للعلم</p></div>
          </div>
          <h1 className="mt-8 hidden text-4xl lg:block font-semibold leading-tight tracking-tight">Your learning, attendance and certificates — together.</h1>
          <ul className="mt-8 hidden gap-4 lg:grid text-sm text-[var(--p-muted)]">
            <li className="flex gap-3"><BookOpenCheck className="h-5 w-5 shrink-0 text-emerald-400" />Four learning areas with lessons and materials</li>
            <li className="flex gap-3"><CalendarCheck className="h-5 w-5 shrink-0 text-emerald-400" />Track your attendance and announcements</li>
            <li className="flex gap-3"><Award className="h-5 w-5 shrink-0 text-emerald-400" />View and download your certificates</li>
          </ul>
        </section>
        <main className="order-2">
          <div className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)]/90 p-7 shadow-2xl backdrop-blur sm:p-8">
            <LoginForm flow={flow} admin={false} />
            <div className="mt-6 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface-2)] p-4 text-sm">
              <p className="font-semibold">New to the academy?</p>
              <p className="mt-1 text-[var(--p-muted)]">Access opens after your enrollment in the current batch is confirmed. If you have not enrolled yet, register first.</p>
              <Link to="/register" className="mt-3 inline-flex font-semibold text-[var(--p-accent)] hover:underline">Enroll Now →</Link>
            </div>
          </div>
          <Link to="/" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--p-muted)] lg:hidden">
            <ArrowLeft className="h-4 w-4" />Back to website
          </Link>
        </main>
      </div>
    </div>
  );
}
