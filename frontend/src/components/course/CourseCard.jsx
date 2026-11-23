import { BookOpen, CalendarDays, Languages, Monitor, Wallet } from 'lucide-react';
import GeoPattern from '@/components/GeoPattern';
import { formatDays, formatFee, formatTime, safeUrl } from '@/lib/format';
function Meta({ icon: Icon, children }) {
    return <li className="flex items-start gap-2 text-sm text-[#586878]"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#a1834e]" aria-hidden="true"/><span>{children}</span></li>;
}
export default function CourseCard({ course, footer }) {
    const image = safeUrl(course.imageUrl);
    const summary = course.shortDescription ?? course.description;
    const where = [course.mode, course.platform].filter(Boolean).join(' · ');
    const days = course.classDays?.trim() ? formatDays(course.classDays) : null;
    const start = course.startTime && course.startTime !== '00:00:00' ? formatTime(course.startTime) : null;
    const end = course.endTime && course.endTime !== '00:00:00' ? formatTime(course.endTime) : null;
    const showFee = Number(course.feeRupees) > 0;
    const showDuration = Number(course.durationMonths) > 0;
    return (<article className="group flex h-full w-full flex-col overflow-hidden rounded-[1.6rem] border border-[#e7e0d4] bg-[#fffefa] shadow-[0_18px_50px_-38px_rgba(23,45,67,.5)] transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/8] overflow-hidden bg-[#172d43]">
        {image ? <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"/> : <div className="flex h-full items-center justify-center text-[#e7cc91]" aria-hidden="true"><GeoPattern className="absolute inset-0 opacity-25"/><BookOpen className="relative h-14 w-14" strokeWidth={1.25}/></div>}
        <span className="absolute inset-x-0 bottom-0 h-1 bg-[#d5b779]"/>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-heading text-2xl font-semibold leading-snug text-[#172d43]">{course.title}</h3>
        {course.titleAr && <p lang="ar" dir="rtl" className="mt-1 text-xl text-[#a1834e]">{course.titleAr}</p>}
        {course.titleTa && <p lang="ta" className="mt-1 text-sm text-[#687583]">{course.titleTa}</p>}
        {summary && <p className="mt-3 leading-7 text-[#586878]">{summary}</p>}
        <ul className="mt-5 space-y-3 border-t border-[#e7e0d4] pt-4">
          {where && <Meta icon={Monitor}>{where}</Meta>}
          {course.language && <Meta icon={Languages}>Lessons taught in {course.language}</Meta>}
          {showDuration && <Meta icon={CalendarDays}>{course.durationMonths} months</Meta>}
          {showFee && <Meta icon={Wallet}>{formatFee(course.feeRupees)}</Meta>}
          {(days || start || end) && <Meta icon={CalendarDays}>{[days, start && end ? `${start} – ${end}` : null].filter(Boolean).join(' · ')}</Meta>}
          {course.certificateNote && <Meta icon={BookOpen}>{course.certificateNote}</Meta>}
        </ul>
        {footer && <div className="mt-auto pt-6">{footer}</div>}
      </div>
    </article>);
}
