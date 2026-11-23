import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X, ArrowUpRight, Mail, Phone, UserRound, LogOut, LayoutDashboard, BookOpen, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
const NAV = [
    { to: '/', label: 'Home', end: true },
    { to: '/about', label: 'About Us' },
    { to: '/course', label: 'Programme' },
    { to: '/curriculum', label: 'Curriculum' },
    { to: '/contact', label: 'Contact' },
];
function Logo({ className }) {
    return <img src="/logo-transparent.png"  sizes="52px" width="56" height="56" alt="Hajara Ilm Academy logo" className={`${className}`}/>;
}
const linkClass = ({ isActive }) => cn('block rounded-full px-3 py-2 text-[13px] font-semibold text-[#526274] transition hover:bg-[#f2eee5] hover:text-[#172d43]', isActive && 'bg-[#f2eee5] text-[#172d43]');
export default function PublicLayout() {
    const [open, setOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [logoutError, setLogoutError] = useState('');
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const publicUser = user?.role === 'ADMIN' ? null : user;
    const destination = '/student';
    const links = publicUser ? [...NAV, { to: destination, label: 'My Learning' }] : NAV;
    async function signOut() {
      setLogoutError('');
      try { await logout(); setProfileOpen(false); setOpen(false); navigate('/'); }
      catch { setLogoutError('Could not log out. Please try again.'); }
    }
    return (<div className="flex min-h-screen flex-col bg-[#fbfaf7]">
      <header className="sticky top-0 z-30 border-b border-[#e9e4da] bg-[#fbfaf7]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
            <Logo className="h-12 w-12 shrink-0 object-contain"/>
            <span className="min-w-0">
              <span className="block truncate font-heading text-lg font-semibold leading-tight text-[#172d43] sm:text-xl">Hajara Ilm Academy</span>
              <span lang="ar" dir="rtl" className="mt-0.5 block text-sm leading-tight text-[#a1834e]">أكاديمية هاجرة للعلم</span>
            </span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-0.5 xl:flex">
            {links.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>{item.label}</NavLink>)}
          </nav>
          <div className="hidden xl:block">
            {publicUser ? (
              <div className="relative">
                <button type="button" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen(v => !v)} className="flex items-center gap-2 rounded-full border border-[#d7dfe6] bg-white px-3 py-2 text-[#172d43] hover:bg-[#f2eee5]">
                  <UserRound size={20}/><span className="max-w-32 truncate text-sm font-semibold">{publicUser.name}</span><ChevronDown size={15}/>
                </button>
                {profileOpen && <div role="menu" className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b px-3 py-2 text-sm"><b className="block truncate">{publicUser.name}</b><span className="block truncate text-xs text-slate-500">{publicUser.email}</span></div>
                  <Link role="menuitem" to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100"><UserRound size={16}/>My Profile</Link>
                  <Link role="menuitem" to={destination} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100"><LayoutDashboard size={16}/>Dashboard</Link>
                  {publicUser && <Link role="menuitem" to="/student" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100"><BookOpen size={16}/>My Learning</Link>}
                  <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"><LogOut size={16}/>Logout</button>
                  {logoutError && <p role="alert" className="px-3 text-xs text-red-700">{logoutError}</p>}
                </div>}
              </div>
            ) : <div className="flex items-center gap-2"><Link to="/login" className="rounded-full border border-[#d7dfe6] px-5 py-2 text-sm font-semibold text-[#172d43]">Student Login</Link><Button asChild className="rounded-full bg-[#172d43] px-5 text-white shadow-sm hover:bg-[#25435f]"><Link to="/register">Enroll Now <ArrowUpRight className="ml-1 h-4 w-4"/></Link></Button></div>}
          </div>
          <Button variant="ghost" size="sm" className="rounded-full text-[#172d43] xl:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((value) => !value)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
        {open && (<nav id="mobile-nav" aria-label="Mobile" className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-[#e9e4da] bg-[#fbfaf7] px-4 py-4 xl:hidden">
            <ul className="mx-auto flex max-w-7xl flex-col gap-1">
              {links.map((item) => <li key={item.to}><NavLink to={item.to} end={item.end} className={({ isActive }) => cn(linkClass({ isActive }), 'w-full')} onClick={() => setOpen(false)}>{item.label}</NavLink></li>)}
              {publicUser ? <>
                <li><Link className="block rounded-xl px-3 py-2 text-sm" to="/profile" onClick={() => setOpen(false)}>My Profile — {publicUser.name}</Link></li>
                <li><button type="button" className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-700" onClick={signOut}>Logout</button></li>
              </> : <li className="pt-2"><Link to="/login" onClick={() => setOpen(false)} className="mb-2 block rounded-xl border border-slate-300 px-3 py-2 text-center font-semibold">Student Login</Link><Button asChild className="w-full rounded-full bg-[#172d43] text-white"><Link to="/register" onClick={() => setOpen(false)}>Enroll Now <ArrowUpRight className="ml-1 h-4 w-4"/></Link></Button></li>}
            </ul>
          </nav>)}
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      <footer className="mt-16 bg-[#14283c] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_.8fr_1fr] lg:px-8 lg:py-14">
          <div>
            <div className="flex items-center gap-3">
              <Logo className="h-14 w-14 rounded-full bg-white/95 p-1"/>
              <div>
                <p className="font-heading text-xl font-semibold">Hajara Ilm Academy</p>
                <p lang="ar" dir="rtl" className="mt-1 text-lg text-[#d9bf85]">أكاديمية هاجرة للعلم</p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#d3dce5]">An online learning space for women and girls to explore Quran reading and essential Islamic knowledge from home.</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[.18em] text-[#e7cc91]">Explore</h2>
            <nav aria-label="Footer navigation" className="mt-5 flex flex-col items-start gap-3 text-sm text-[#e0e7ee]">
              {links.filter((item) => item.to !== '/' && item.to !== '/login').map((item) => <Link key={item.to} to={item.to} className="transition hover:text-[#e7cc91]">{item.label}</Link>)}
              {!user && <Link to="/register" className="transition hover:text-[#e7cc91]">Enroll Now</Link>}
            </nav>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[.18em] text-[#e7cc91]">Contact</h2>
            <div className="mt-5 flex flex-col gap-4 text-sm text-[#e0e7ee]">
              <a href="tel:+918015580602" className="flex items-center gap-3 transition hover:text-[#e7cc91]"><Phone className="h-4 w-4 shrink-0 text-[#d9bf85]"/><span>+91 80155 80602</span></a>
              <a href="mailto:hajarailmacademy@gmail.com" className="flex items-center gap-3 transition hover:text-[#e7cc91]"><Mail className="h-4 w-4 shrink-0 text-[#d9bf85]"/><span className="break-all">hajarailmacademy@gmail.com</span></a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10"><div className="mx-auto max-w-7xl px-4 py-4 text-xs text-[#aebdca] sm:px-6 lg:px-8">© {new Date().getFullYear()} Hajara Ilm Academy. All rights reserved.</div></div>
      </footer>
    </div>);
}
