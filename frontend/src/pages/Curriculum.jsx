import { Sparkles } from 'lucide-react';
import LearningAreaGrid from '@/components/LearningAreaGrid';
import PageShell from '@/components/PageShell';
import { curriculum } from '@/data/curriculum';
export default function Curriculum() {
    return (<div className="min-h-screen bg-[#f7f5ef]">
      <PageShell title="Programme Curriculum" wide>
        <div className="relative overflow-hidden rounded-[1.8rem] bg-[#172d43] px-6 py-9 text-white sm:px-9 sm:py-11">
          <div className="pointer-events-none absolute -right-14 -top-20 h-64 w-64 rounded-full border border-[#d9bf85]/20"/>
          <div className="pointer-events-none absolute -right-2 -top-8 h-40 w-40 rounded-full border border-[#d9bf85]/20"/>
          <p className="text-xs font-bold uppercase tracking-[.24em] text-[#e4c98f]">Learn · Reflect · Grow</p>
          <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold leading-tight sm:text-4xl">One integrated programme. Four areas of Islamic learning.</h2>
          <p className="mt-4 max-w-2xl leading-7 text-[#e4eaf0]">A six-month learning journey bringing Quran, belief, Islamic practice and history together.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">Live online classes</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">Tamil instruction</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">Women & girls</span>
          </div>
        </div>
        <LearningAreaGrid compact showCurriculumLink={false} showTopicsLink={false}/>
        <div className="space-y-5">
          <p className="rounded-2xl border border-[#e7e0d4] bg-white p-6 text-[#586878]">Detailed sections and topics are available to enrolled students under My Learning.</p>
        </div>
        <div className="rounded-2xl border border-[#e7e0d4] bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#a1834e]"/>
            <div>
              <h2 className="font-heading text-xl font-semibold text-[#172d43]">Learning through live guidance</h2>
              <p className="mt-2 leading-7 text-[#586878]">Classes are conducted live online and taught in Tamil. Quran recitation includes oral practice and teacher feedback, so learners can work on pronunciation and apply Tajweed rules while reading.</p>
              <p lang="ta" className="mt-2 leading-7 text-[#687583]">அனைத்து வகுப்புகளும் தமிழில் நேரடி இணையவழியில் நடத்தப்படும். குர்ஆன் ஓதுதலில் வாய்மொழிப் பயிற்சி மற்றும் ஆசிரியரின் திருத்தங்களும் இடம்பெறும்.</p>
            </div>
          </div>
        </div>
      </PageShell>
    </div>);
}
