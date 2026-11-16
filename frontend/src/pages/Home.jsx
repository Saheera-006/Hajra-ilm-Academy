import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Laptop, Languages, MoveUpRight, Sparkles, UsersRound } from 'lucide-react';
import SiteReady from '@/components/SiteReady';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { portal } from '@/services/portalApi';
import { Ar, Ta, Text } from '@/components/PageShell';
const benefits = [
    { Icon: Laptop, title: 'Live online classes', tamil: 'நேரடி இணையவழி வகுப்புகள்', body: 'Learn from home without the need to travel to a physical madrasa.' },
    { Icon: Languages, title: 'Tamil-medium lessons', tamil: 'தமிழ் வழிக் கற்பித்தல்', body: 'Every lesson is taught in Tamil for clear and comfortable learning.' },
    { Icon: UsersRound, title: 'For women & girls', tamil: 'பெண்கள் மற்றும் மாணவிகளுக்காக', body: 'A learning opportunity for those who wish to study Islam but cannot attend in person.' },
];
export default function Home() {
    return <SiteReady>{(site) => <HomeContent site={site}/>}</SiteReady>;
}
function HomeContent({ site }) {
    const { user } = useAuth();
    const [myCourses, setMyCourses] = useState([]);
    const [overrides, setOverrides] = useState({});
    const [enrollmentStatus, setEnrollmentStatus] = useState(null);
    useEffect(() => { let active = true; portal('/batches/current').then(batch => { if(active) setEnrollmentStatus(batch?.id ? 'open' : 'closed'); }).catch(() => { if(active) setEnrollmentStatus('unavailable'); }); return () => { active = false; }; }, []);
    useEffect(()=>{portal('/site-content').then(setOverrides).catch(()=>{});},[]);
    useEffect(() => {
      let mounted = true;
      if (user?.role !== 'STUDENT') { setMyCourses([]); return; }
      portal('/my-enrollments').then(items => { if (mounted) setMyCourses(items.filter(e => e.active)); }).catch(() => { if (mounted) setMyCourses([]); });
      return () => { mounted = false; };
    }, [user?.id, user?.role]);
    const { content, learningAreas, announcements } = site;
    const heroTitle = overrides['home.hero_title'] || content['home.hero_title']?.en || 'Knowledge That Nurtures Faith.';
    const heroSubtitle = overrides['home.hero_subtitle'] || content['home.hero_subtitle']?.en || 'An online space for women and girls to learn the Quran and essential Islamic knowledge from home.';
    const bismillah = overrides['home.bismillah'] || content['home.bismillah']?.en || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    return (<>
      {user?.role === 'STUDENT' && <section className="border-b border-[#e5dccb] bg-[#f3eee2] px-4 py-6 sm:px-6"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8a6b39]">Your academy · One login</p><h2 className="mt-1 font-heading text-2xl font-semibold text-[#172d43]">Welcome back, {user.name}</h2><p className="mt-1 text-sm text-[#526274]">Access your enrolled courses directly from the homepage.</p><div className="mt-4 flex flex-wrap gap-3">{myCourses.map(e => <Link key={e.id} to={`/learn/${e.courseId}`} className="rounded-full bg-[#172d43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#25435f]">Continue {e.course} →</Link>)}<Link to="/student" className="rounded-full border border-[#c9bda7] bg-white px-5 py-3 text-sm font-semibold text-[#172d43]">{myCourses.length ? 'My dashboard' : 'Browse and enroll in courses'} →</Link></div></div></section>}
      <section className="relative isolate overflow-hidden bg-[#172d43] text-white">
        <div className="hero-ornament pointer-events-none absolute inset-0" aria-hidden="true"/>
        <div className="pointer-events-none absolute -right-28 top-10 h-[26rem] w-[26rem] rounded-full border border-[#e7cc91]/15" aria-hidden="true"/>
        <div className="pointer-events-none absolute -right-8 top-28 h-[18rem] w-[18rem] rounded-full border border-[#e7cc91]/15" aria-hidden="true"/>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <Ar className="text-2xl text-[#e7cc91]">{bismillah}</Ar>
            <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-4 py-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#e7cc91] sm:text-xs"><Sparkles className="h-3.5 w-3.5"/> Online Islamic learning for women & girls</p>
            <h1 className="mt-6 max-w-3xl font-heading text-5xl font-semibold leading-[1.04] tracking-[-.03em] sm:text-6xl lg:text-7xl">{heroTitle}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#dce5ed] sm:text-xl">{heroSubtitle}</p>
            <p lang="ta" className="mt-4 max-w-2xl leading-8 text-[#c4d1dd]">மதரஸாவிற்குச் சென்று பயில முடியாத பெண்கள் மற்றும் மாணவிகளும் வீட்டிலிருந்தபடியே இஸ்லாமிய அறிவைப் பெறுவதற்கான இணையவழிக் கற்றல் வாய்ப்பு.</p>
            <div className="mt-6"><p className="text-sm font-semibold text-[#e7cc91]">Islamic Learning Programme</p><p lang="ta" className="mt-1 text-sm text-[#dce5ed]">இஸ்லாமியக் கல்விப் பாடத்திட்டம்</p>{enrollmentStatus === 'open' && <p role="status" className="mt-3 text-sm font-semibold text-[#b8f4cc]">Enrollment Open · Applications are being accepted</p>}{enrollmentStatus === 'closed' && <p role="status" className="mt-3 text-sm text-[#e7cc91]">Enrollment Closed · Please check back later</p>}</div>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/curriculum" className="inline-flex items-center gap-2 rounded-full bg-[#e7cc91] px-6 py-3.5 text-sm font-bold text-[#172d43] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#f0dcae]">Explore curriculum <ArrowRight className="h-4 w-4"/></Link>
              <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-[#e7cc91] hover:bg-white/[.06]">Discover our purpose <MoveUpRight className="h-4 w-4"/></Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-sm text-[#c4d1dd]">
              <span className="inline-flex items-center gap-2"><Laptop className="h-4 w-4 text-[#e7cc91]"/> Live online</span>
              <span className="inline-flex items-center gap-2"><Languages className="h-4 w-4 text-[#e7cc91]"/> Taught in Tamil</span>
              <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4 text-[#e7cc91]"/> Women & girls</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-5 rounded-[2.5rem] border border-[#e7cc91]/20"/>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#203c55] p-7 shadow-2xl shadow-black/20 sm:p-9">
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.2em] text-[#e7cc91]">A journey of knowledge</span><span className="h-2 w-2 rounded-full bg-[#e7cc91]"/></div>
              <div className="my-9 text-center">
                <Ar className="text-5xl leading-[1.9] text-[#f0dcae]">اقْرَأْ</Ar>
                <p className="mt-3 font-heading text-3xl text-white">Iqra</p>
                <p className="mt-2 text-sm tracking-wide text-[#c4d1dd]">Read · Learn · Reflect</p>
              </div>
              <div className="space-y-3">
                {['Quran Reading & Tajweed', 'Islamic Creed & Beliefs', 'Islamic Rulings & Ethics', 'Islamic History'].map((label, index) => (<div key={label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.055] px-4 py-3">
                    <span className="font-heading text-lg text-[#e7cc91]">0{index + 1}</span><span className="text-sm font-medium text-[#e8edf2]">{label}</span>
                  </div>))}
              </div>
              <p className="mt-6 text-center text-xs text-[#aebdca]">A structured path to learn from home</p>
            </div>
          </div>
        </div>
      </section>

      {announcements.length > 0 && (<section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8" aria-label="Announcements">
          {announcements.map((item) => <div key={item.id} className="mb-3 rounded-2xl border border-[#e7e0d4] bg-white px-5 py-4"><h2 className="font-semibold text-[#172d43]">{item.title}</h2><Ta className="mt-1 text-sm text-[#687583]">{item.titleTa}</Ta><Text value={item.body} className="mt-2 text-sm text-[#586878]"/></div>)}
        </section>)}

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[.75fr_1.25fr] md:items-center lg:px-8 lg:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-[#a1834e]">Why Hajara Ilm Academy</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight text-[#172d43] sm:text-4xl">Islamic knowledge should be within reach.</h2>
          <p lang="ta" className="mt-4 leading-8 text-[#687583]">இஸ்லாமியக் கல்வியைப் பெற விரும்பியும் நேரடியாக மதரஸாவிற்குச் செல்ல முடியாதவர்களுக்கும், வீட்டிலிருந்தபடியே கற்கும் வாய்ப்பை உருவாக்குவதே எங்கள் முக்கிய நோக்கம்.</p>
          <Link to="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#8a6b39] hover:text-[#172d43]">Learn about our purpose <ArrowRight className="h-4 w-4"/></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {benefits.map(({ Icon, title, tamil, body }, index) => (<article key={title} className="rounded-[1.4rem] border border-[#e8e2d8] bg-white p-5 shadow-[0_16px_40px_-36px_rgba(23,45,67,.4)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1eadc] text-[#8e7040]"><Icon className="h-5 w-5" strokeWidth={1.7}/></span>
              <span className="mt-5 block text-xs font-bold tracking-[.18em] text-[#a1834e]">0{index + 1}</span>
              <h3 className="mt-2 font-heading text-xl font-semibold leading-snug text-[#172d43]">{title}</h3>
              <Ta className="mt-1 text-xs text-[#7b8792]">{tamil}</Ta>
              <p className="mt-3 text-sm leading-6 text-[#687583]">{body}</p>
            </article>))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="overflow-hidden rounded-[1.8rem] bg-[#e9e1d1] px-6 py-10 text-center sm:px-10 sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-[#8a6b39]">Begin your learning journey</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-semibold text-[#172d43] sm:text-4xl">Let your journey of knowledge begin.</h2>
          <p lang="ta" className="mx-auto mt-3 max-w-xl leading-7 text-[#687583]">இஸ்லாமிய அறிவை நோக்கிய உங்கள் பயணத்தை இன்றே தொடங்குங்கள்.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/programme" className="inline-flex items-center gap-2 rounded-full bg-[#172d43] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#25435f]">Explore programme <ArrowRight className="h-4 w-4"/></Link><Link to="/register" className="inline-flex items-center gap-2 rounded-full border border-[#c9bda7] bg-white/60 px-6 py-3.5 text-sm font-semibold text-[#172d43] transition hover:bg-white">Enroll Now</Link></div>
        </div>
      </section>
    </>);
}
