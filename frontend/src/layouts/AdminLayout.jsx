import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, BookOpen, Layers, Users, ClipboardCheck, Wallet, Megaphone, CalendarCheck, LibraryBig, Award, Globe, BarChart3, Bell, ShieldCheck, ChevronsLeft, ChevronsRight, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import '@/styles/portal.css';

const NAV = [
  { group: 'Overview', items: [['Dashboard', '/admin', LayoutDashboard, true]] },
  { group: 'Academy', items: [['Programme', '/admin/programme', BookOpen], ['Batches', '/admin/batches', Layers], ['Students', '/admin/students', Users], ['Enrollments', '/admin/enrollments', ClipboardCheck], ['Attendance', '/admin/attendance', CalendarCheck], ['Payments', '/admin/payments', Wallet], ['Certificates', '/admin/certificates', Award]] },
  { group: 'Content', items: [['Announcements', '/admin/announcements', Megaphone], ['Notes', '/admin/notes', LibraryBig], ['Google Meet', '/admin/meetings', LibraryBig], ['Notifications', '/admin/notifications', Bell]] },
  { group: 'System', items: [['Reports', '/admin/reports', BarChart3], ['Security', '/admin/security', ShieldCheck]] },
];
const LABELS = Object.fromEntries(NAV.flatMap((g) => g.items.map(([n, p]) => [p, n])));

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean); // ['admin', 'batches', '12']
  const crumbs = parts.map((_, i) => '/' + parts.slice(0, i + 1).join('/'));
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {crumbs.map((path, i) => {
        const label = i === 0 ? 'Admin' : LABELS[path] || (/^\d+$/.test(parts[i]) ? `#${parts[i]}` : parts[i].replace(/-/g, ' '));
        const last = i === crumbs.length - 1;
        return (
          <span key={path} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--p-muted)]" aria-hidden />}
            {last ? <span aria-current="page" className="truncate font-semibold capitalize">{label}</span>
              : <Link to={path} className="truncate capitalize text-[var(--p-muted)] hover:text-[var(--p-text)]">{label}</Link>}
          </span>
        );
      })}
    </nav>
  );
}

function SidebarContent({ collapsed, onNavigate }) {
  return (
    <>
      <div className={cn('flex h-[68px] items-center gap-3 border-b border-[var(--p-border)] px-4', collapsed && 'justify-center px-2')}>
        <img src="/logo-transparent.png" alt="Hajara Ilm Academy" className="h-10 w-10 shrink-0 object-contain" />
        {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">Hajara Ilm Academy</p><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--p-accent)]">Admin</p></div>}
      </div>
      <nav aria-label="Admin sections" className="portal-scroll flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV.map((g) => (
          <div key={g.group}>
            {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--p-muted)]">{g.group}</p>}
            <ul className="space-y-1">
              {g.items.map(([name, to, Icon, end]) => (
                <li key={to}>
                  <NavLink to={to} end={!!end} onClick={onNavigate} title={collapsed ? name : undefined}
                    className={({ isActive }) => cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', collapsed && 'justify-center px-0',
                      isActive ? 'bg-[var(--p-accent)]/12 text-[var(--p-accent)] ring-1 ring-inset ring-[var(--p-accent)]/25' : 'text-[var(--p-muted)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-text)]')}>
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{name}</span>}
                    {collapsed && <span className="sr-only">{name}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('hia-admin-collapsed') === '1');
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => { setDrawer(false); setMenu(false); }, [pathname]);
  useEffect(() => { localStorage.setItem('hia-admin-collapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function signOut() {
    try { await logout(); } finally { nav('/admin/login', { replace: true }); }
  }
  const initials = (user?.name || 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="portal-theme hia-admin-shell min-h-screen" data-theme="dark">
      {drawer && <button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />}
      <aside id="admin-drawer" className={cn('fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[calc(100vw-2rem)] flex-col overflow-y-auto border-r border-[var(--p-border)] bg-[var(--p-sidebar)] transition-transform duration-300 lg:hidden', drawer ? 'translate-x-0' : '-translate-x-full')}>
        <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10 rounded-lg p-2 text-[var(--p-muted)] hover:bg-[var(--p-surface-3)]"><X className="h-5 w-5" /></button>
        <SidebarContent collapsed={false} onNavigate={() => setDrawer(false)} />
      </aside>
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--p-border)] bg-[var(--p-sidebar)] transition-[width] duration-300 lg:flex', collapsed ? 'w-[76px]' : 'w-[264px]')}>
        <SidebarContent collapsed={collapsed} />
        <div className="border-t border-[var(--p-border)] p-3">
          <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-[var(--p-muted)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-text)]">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Collapse</>}
          </button>
        </div>
      </aside>

      <div className={cn('min-h-screen transition-[padding] duration-300', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-[var(--p-border)] bg-[var(--p-bg)]/85 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button aria-label="Open menu" aria-expanded={drawer} aria-controls="admin-drawer" onClick={() => setDrawer(true)} className="rounded-xl border border-[var(--p-border)] p-2.5 text-[var(--p-text)] hover:bg-[var(--p-surface-3)] lg:hidden"><Menu className="h-5 w-5" /></button>
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/notifications" aria-label="Notifications" className="rounded-xl border border-[var(--p-border)] p-2.5 text-[var(--p-muted)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-text)]"><Bell className="h-[18px] w-[18px]" /></Link>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} className="flex items-center gap-2 rounded-xl border border-[var(--p-border)] py-1.5 pl-1.5 pr-3 hover:bg-[var(--p-surface-3)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--p-accent)]/15 text-xs font-bold text-[var(--p-accent)]">{initials}</span>
                <span className="hidden text-sm font-medium sm:block">{user?.name || 'Administrator'}</span>
                <ChevronDown className="h-4 w-4 text-[var(--p-muted)]" />
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-60 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] p-1.5 shadow-2xl">
                  <div className="border-b border-[var(--p-border)] px-3 py-2.5"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs text-[var(--p-muted)]">{user?.email}</p></div>
                  <Link role="menuitem" to="/admin/security" className="mt-1.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--p-surface-3)]"><ShieldCheck className="h-4 w-4" />Security</Link>
                  <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><LogOut className="h-4 w-4" />Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="hia-admin-main mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
