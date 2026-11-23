import { BookOpen, ScrollText, Landmark, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { curriculum } from '@/data/curriculum';
const STYLES = [
    { Icon: BookOpen, icon: 'bg-[#e8eef2] text-[#294a64]' },
    { Icon: Sparkles, icon: 'bg-[#f1eadc] text-[#8e7040]' },
    { Icon: ScrollText, icon: 'bg-[#e9edf0] text-[#4d6275]' },
    { Icon: Landmark, icon: 'bg-[#f0e9df] text-[#876a42]' },
];
export default function LearningAreaGrid({ compact = false, showCurriculumLink = true, showTopicsLink = true }) {
    return (<div>
      <div className={`grid gap-4 ${compact ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2'}`}>
        {curriculum.map((area, index) => {
            const style = STYLES[index];
            const Icon = style.Icon;
            return (<article key={area.id} className="group relative overflow-hidden rounded-[1.5rem] border border-[#e5dfd4] bg-[#fffefa] p-6 shadow-[0_16px_42px_-36px_rgba(23,45,67,.45)] transition duration-300 hover:-translate-y-1 hover:border-[#c5a66a]/70 hover:shadow-[0_24px_50px_-34px_rgba(23,45,67,.38)]">
              <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-[#c5a66a]/20 transition-transform duration-500 group-hover:scale-125"/>
              <div className="flex items-start justify-between"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.icon}`}><Icon className="h-6 w-6" strokeWidth={1.6}/></span><span className="font-heading text-3xl text-[#172d43]/20">{area.number}</span></div>
              <h3 className="mt-6 font-heading text-xl font-semibold leading-snug text-[#172d43]">{area.title}</h3>
              <p lang="ar" dir="rtl" className="mt-1 text-xl text-[#a1834e]">{area.arabic}</p>
              <p lang="ta" className="mt-2 text-sm leading-6 text-[#687583]">{area.tamil}</p>
              <p className="mt-4 text-sm leading-6 text-[#586878]">{area.intro}</p>
              {showTopicsLink && <a href={`/curriculum#${area.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#8a6b39] transition group-hover:gap-3">Explore topics <span aria-hidden="true">→</span></a>}
            </article>);
        })}
      </div>
      {showCurriculumLink && (<div className="mt-8 flex justify-center"><Link to="/curriculum" className="inline-flex items-center gap-2 rounded-full border border-[#d9d0c1] bg-white px-6 py-3 text-sm font-semibold text-[#172d43] shadow-sm transition hover:border-[#a1834e] hover:bg-[#f7f4ec]">Explore full curriculum <span aria-hidden="true">→</span></Link></div>)}
    </div>);
}
