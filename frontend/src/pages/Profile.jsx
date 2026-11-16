import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
export default function Profile() {
  const { user, loading } = useAuth();
  if (loading) return <div className="mx-auto max-w-3xl p-8">Loading profile…</div>;
  if (!user) return <div className="mx-auto max-w-3xl p-8">Please <Link className="underline" to="/login">log in</Link> to view your profile.</div>;
  return <section className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <h1 className="font-heading text-3xl font-semibold text-[#172d43]">My Profile</h1>
    <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#172d43] text-2xl font-semibold text-white">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
    <dl className="mt-6 grid gap-4">{[['Full name',user.name],['Email',user.email],['Phone',user.phone],['Role',user.role]].map(([label,value]) => <div key={label} className="border-b pb-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-slate-900">{value || 'Not provided'}</dd></div>)}</dl>
    {user.role === 'STUDENT' && <Link className="mt-5 block text-sm font-semibold underline" to="/student/profile">Edit student profile</Link>}
    <Link className="mt-5 inline-block rounded-xl bg-[#172d43] px-5 py-3 text-sm font-semibold text-white" to={user.role === 'ADMIN' ? '/admin' : '/student'}>Go to dashboard</Link>
  </section>;
}
