import InstallApp from '@/pages/student/InstallApp';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, BookOpen, CalendarCheck, Megaphone, Award, UserRound, Bell, Sun, Moon, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { StudentDataContext, useApi } from '@/pages/student/useStudentData';
import { disableStudentPush, enableStudentPush, hasPushSubscription, listenForPush, pushPermission, blockedPushMessage, studentPushError } from '@/services/studentPush';
import { pushConfigured } from '@/services/pushConfig';
import '@/styles/portal.css';

const NAV = [
  ['Dashboard', '/student', LayoutDashboard, true], ['My Learning', '/student/learning', BookOpen], ['Notes', '/student/notes', BookOpen], ['Google Meet', '/student/meetings', CalendarCheck], ['Attendance', '/student/attendance', CalendarCheck],
  ['Announcements', '/student/announcements', Megaphone], ['Certificates', '/student/certificates', Award], ['Profile', '/student/profile', UserRound],
];

function Nav({ onNavigate }) {
  return (
    <nav aria-label="Student sections" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-5">
      {NAV.map(([name, to, Icon, end]) => (
        <NavLink key={to} to={to} end={!!end} onClick={onNavigate}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-[var(--p-accent)]/12 text-[var(--p-accent)] ring-1 ring-inset ring-[var(--p-accent)]/25' : 'text-[var(--p-muted)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-text)]')}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />{name}
        </NavLink>
      ))}
    </nav>
  );
}
const Brand = () => (
  <div className="flex h-[68px] items-center gap-3 border-b border-[var(--p-border)] px-5">
    <img src="/logo-transparent.png" alt="Hajara Ilm Academy" className="h-10 w-10 object-contain" />
    <div><p className="text-sm font-semibold">Hajara Ilm Academy</p><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--p-accent)]">Student Portal</p></div>
  </div>
);

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname, state } = useLocation();
  const [dismissPush, setDismissPush] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('hia-student-theme') || 'dark');
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(hasPushSubscription);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState('');
  const [permission, setPermission] = useState(pushPermission);
  const pushBlocked = permission === 'denied';
  useEffect(() => {
    function syncPermission() {
      const next = pushPermission();
      setPermission(next);
      setPushEnabled(hasPushSubscription());
      if (next !== 'denied') setPushStatus(status => status === blockedPushMessage ? '' : status);
    }
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);
    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);
  const ref = useRef(null);
  const enrollments = useApi('/my-enrollments');
  const identity = useApi('/my-student-id');
  const announcements = useApi('/announcements');
  const notifications = useApi('/my-notifications');

  useEffect(() => { setDrawer(false); setMenu(false); setBell(false); }, [pathname]);
  useEffect(() => { localStorage.setItem('hia-student-theme', theme); }, [theme]);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && (setMenu(false), setBell(false));
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(()=>{if(bell)notifications.reload();},[bell]);
  useEffect(() => {
    let unsubscribe;
    let closed = false;
    listenForPush(() => {
      notifications.reload();
      setPushStatus('New message received. Open the notifications bell to read it.');
    }).then(stop => { if (closed) stop(); else unsubscribe = stop; }).catch(() => {});
    return () => { closed = true; unsubscribe?.(); };
  }, []);

  async function togglePush() {
    setPushBusy(true);
    setPushStatus('');
    try {
      if (pushEnabled) await disableStudentPush();
      else await enableStudentPush();
      setPushStatus(pushEnabled ? 'Browser notifications disabled.' : 'Browser notifications enabled.');
    } catch (error) {
      setPushStatus(studentPushError(error));
    } finally {
      setPermission(pushPermission());
      setPushEnabled(hasPushSubscription());
      setPushBusy(false);
    }
  }

  const signOut = async () => {
    try { await disableStudentPush(); } catch { /* Sign out even if push cleanup fails. */ }
    try { await logout(); } finally { nav('/login', { replace: true }); }
  };
  const initials = (user?.name || 'S').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const unread = notifications.data?.length || 0;
  const ctx = { user, enrollments, identity, announcements, notifications };

  return (
    <StudentDataContext.Provider value={ctx}>
      <div className="portal-theme min-h-screen" data-theme={theme}>
        {drawer && <button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />}
        <aside id="student-drawer" className={cn('fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[calc(100vw-2rem)] flex-col overflow-y-auto border-r border-[var(--p-border)] bg-[var(--p-sidebar)] transition-transform duration-300 lg:z-30 lg:translate-x-0', drawer ? 'translate-x-0' : '-translate-x-full')}>
          <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-4 rounded-lg p-2 text-[var(--p-muted)] hover:bg-[var(--p-surface-3)] lg:hidden"><X className="h-5 w-5" /></button>
          <Brand /><Nav onNavigate={() => setDrawer(false)} />
          <div className="border-t border-[var(--p-border)] p-3"><button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--p-muted)] hover:bg-red-500/10 hover:text-red-400"><LogOut className="h-[18px] w-[18px]" />Sign out</button></div>
        </aside>
        <div className="min-h-screen lg:pl-[272px]">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[var(--p-border)] bg-[var(--p-bg)]/85 px-4 backdrop-blur-xl sm:px-8">
            <button aria-label="Open menu" aria-expanded={drawer} aria-controls="student-drawer" onClick={() => setDrawer(true)} className="rounded-xl border border-[var(--p-border)] p-2.5 hover:bg-[var(--p-surface-3)] lg:hidden"><Menu className="h-5 w-5" /></button>
            <p className="hidden text-sm text-[var(--p-muted)] lg:block">Assalamu alaikum, <span className="font-semibold text-[var(--p-text)]">{user?.name?.split(' ')[0]}</span></p>
            <div className="flex items-center gap-2" ref={ref}>
              <InstallApp />
              <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} className="rounded-xl border border-[var(--p-border)] p-2.5 text-[var(--p-muted)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-text)]">{theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
              <div className="sm:relative">
                <button onClick={() => { setBell((b) => !b); setMenu(false); }} aria-label={`Notifications${unread ? `, ${unread}` : ''}`} aria-expanded={bell} className="relative rounded-xl border border-[var(--p-border)] p-2.5 text-[var(--p-muted)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-text)]">
                  <Bell className="h-[18px] w-[18px]" />{unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--p-accent)] px-1 text-[10px] font-bold text-[var(--p-accent-fg)]">{unread > 9 ? '9+' : unread}</span>}
                </button>
                {bell && (
                  <div className="absolute right-4 top-full mt-2 w-[min(340px,calc(100vw-2rem))] sm:right-0 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] p-2 shadow-2xl">
                    <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--p-muted)]">Notifications</p>
                    {pushConfigured && pushBlocked && <p className="px-3 py-2 text-sm text-[var(--p-muted)]">{blockedPushMessage}</p>}
                    {pushConfigured && !pushBlocked && <button type="button" disabled={pushBusy}
                      onClick={togglePush} className="mx-3 my-2 text-sm text-[var(--p-accent)] underline">
                      {pushEnabled ? 'Disable browser push' : 'Enable browser push'}
                    </button>}
                    <div className="portal-scroll max-h-[min(18rem,45dvh)] overflow-y-auto">
                      {unread === 0 ? <p className="px-3 py-6 text-center text-sm text-[var(--p-muted)]">You are all caught up.</p>
                        : notifications.data.map((n) => <div key={n.id} className="rounded-lg px-3 py-2.5 hover:bg-[var(--p-surface-3)]"><p className="break-words text-sm font-semibold">{n.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-[var(--p-muted)]">{n.message}</p></div>)}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => { setMenu((m) => !m); setBell(false); }} aria-haspopup="menu" aria-expanded={menu} className="flex items-center gap-2 rounded-xl border border-[var(--p-border)] py-1.5 pl-1.5 pr-3 hover:bg-[var(--p-surface-3)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--p-accent)]/15 text-xs font-bold text-[var(--p-accent)]">{initials}</span>
                  <ChevronDown className="h-4 w-4 text-[var(--p-muted)]" />
                </button>
                {menu && (
                  <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] p-1.5 shadow-2xl">
                    <div className="border-b border-[var(--p-border)] px-3 py-2.5"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="text-xs text-[var(--p-muted)]">{identity.data?.studentId || 'ID pending enrollment'}</p></div>
                    <Link role="menuitem" to="/student/profile" className="mt-1.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--p-surface-3)]"><UserRound className="h-4 w-4" />Profile</Link>
                    <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"><LogOut className="h-4 w-4" />Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{pushStatus && !pushBlocked && <p role="status" className="mb-4 text-sm text-[var(--p-muted)]">{pushStatus}</p>}{pushConfigured && !pushEnabled && !dismissPush && (pathname === '/student' || state?.offerPush) && (
            <section className="mb-5 space-y-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] p-4">
              <h2 className="font-semibold">{pushBlocked ? 'Browser notifications are blocked' : 'Enable notifications on this device'}</h2>
              <p className="text-sm text-[var(--p-muted)]">{pushBlocked ? blockedPushMessage : 'Get alerts when the academy sends a message. On iPhone, install the app and open it from your Home Screen first.'}</p>
              <div className="flex flex-wrap gap-3">
                {!pushBlocked && <button type="button" disabled={pushBusy} onClick={togglePush} className="rounded-lg bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[var(--p-accent-fg)]">Enable notifications</button>}
                <button type="button" onClick={() => setDismissPush(true)} className="px-3 py-2 text-sm underline">Maybe later</button>
              </div>
            </section>
          )}<Outlet /></main>
        </div>
      </div>
    </StudentDataContext.Provider>
  );
}
