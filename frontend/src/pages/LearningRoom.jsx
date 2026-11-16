import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ExternalLink, GraduationCap, LockKeyhole, Video } from 'lucide-react';
import { portal } from '@/services/portalApi';

export default function LearningRoom() {
  const { courseId } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [lessonsError, setLessonsError] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setRoom(null);
    setError('');
    setLessons([]);
    setLessonsLoading(true);
    setLessonsError('');
    portal(`/learning/${encodeURIComponent(courseId)}/lessons`)
      .then(data => { if (mounted) setLessons(Array.isArray(data) ? data : []); })
      .catch(e => { if (mounted) setLessonsError(e.message || 'Unable to load lessons. Please try again.'); })
      .finally(() => { if (mounted) setLessonsLoading(false); });
    portal(`/learning/${encodeURIComponent(courseId)}`)
      .then(data => { if (mounted) setRoom(data); })
      .catch(e => { if (mounted) setError(e.status === 403 ? 'You need an active enrollment to access this course.' : e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [courseId]);
  return <div className="min-h-[65vh] bg-[#f7f5ef] px-4 py-12 sm:px-6">
    <div className="mx-auto max-w-5xl">
      <Link to="/student" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526274] hover:text-[#172d43]"><ArrowLeft size={16}/> Back to my learning</Link>
      {loading ? <div role="status" className="mt-8 rounded-3xl bg-white p-8">Checking your course access…</div> : error ?
        <div className="mt-8 rounded-3xl border border-[#e9e0d1] bg-white p-8 shadow-sm"><LockKeyhole className="mb-4 text-[#a1834e]" size={30}/><h1 className="font-heading text-3xl font-semibold text-[#172d43]">Course access unavailable</h1><p className="mt-3 text-[#526274]">{error}</p><Link to="/student" className="mt-6 inline-block rounded-full bg-[#172d43] px-6 py-3 text-sm font-semibold text-white">View enrollment options</Link></div> : room && <>
        <div className="mt-8 overflow-hidden rounded-3xl bg-[#172d43] p-8 text-white shadow-xl sm:p-12"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#e7cc91]"><GraduationCap size={16}/> Your learning room</span><h1 className="mt-5 font-heading text-4xl font-semibold sm:text-5xl">{room.title}</h1><p className="mt-4 max-w-2xl leading-7 text-[#dce5ed]">{room.description || 'Welcome back. Continue your learning journey with Hajara Ilm Academy.'}</p><p className="mt-6 flex items-center gap-2 text-sm text-[#e7cc91]"><CalendarDays size={17}/> {room.expiresAt ? `Access until ${new Date(room.expiresAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}` : 'Active course access'}</p></div>
        <div className="mt-7 grid gap-5 md:grid-cols-2"><div className="rounded-3xl border border-[#e9e0d1] bg-white p-7"><Video size={27} className="text-[#a1834e]"/><h2 className="mt-4 font-heading text-2xl font-semibold text-[#172d43]">Live online class</h2><p className="mt-2 text-sm leading-6 text-[#526274]">Join your academy class using your existing account. No additional website login is required.</p>{room.meetUrl ? <a href={room.meetUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#172d43] px-5 py-3 text-sm font-semibold text-white">Join Google Meet <ExternalLink size={16}/></a> : <p className="mt-5 text-sm text-[#8a6b39]">The academy has not added a class link yet.</p>}</div><div className="rounded-3xl border border-[#e9e0d1] bg-white p-7"><GraduationCap size={27} className="text-[#a1834e]"/><h2 className="mt-4 font-heading text-2xl font-semibold text-[#172d43]">Your enrollment</h2><p className="mt-2 text-sm leading-6 text-[#526274]">Your {room.plan?.toLowerCase()} plan is active. Attendance and announcements are available in your student dashboard.</p><Link to="/student" className="mt-5 inline-flex rounded-full border border-[#172d43] px-5 py-3 text-sm font-semibold text-[#172d43]">Open dashboard</Link></div></div>
        <section className="mt-7 rounded-3xl border border-[#e9e0d1] bg-white p-7"><h2 className="font-heading text-2xl font-semibold text-[#172d43]">Course lessons</h2><p className="mt-2 text-sm text-[#526274]">Lessons are available here using your existing login.</p>{lessonsLoading ? <p role="status" className="mt-5 text-sm text-slate-500">Loading lessons…</p> : lessonsError ? <p role="alert" className="mt-5 text-sm text-red-700">{lessonsError}</p> : lessons.length===0 ? <p className="mt-5 text-sm text-slate-500">No lessons currently available</p> : <div className="mt-5 space-y-4">{lessons.map((lesson,i)=><article key={lesson.id} className="rounded-2xl border bg-[#faf8f4] p-5"><h3 className="font-semibold text-[#172d43]">{i+1}. {lesson.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#526274]">{lesson.body}</p>{lesson.resourceUrl&&<a href={lesson.resourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex font-semibold text-[#8a6b39] underline">Open learning resource</a>}</article>)}</div>}</section>
      </>}
    </div>
  </div>;
}
