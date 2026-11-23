import { BadgeCheck, CalendarCheck, Sparkles, UserRound } from 'lucide-react';
import GeoPattern from '@/components/GeoPattern';
import { safeUrl } from '@/lib/format';
function Fact({ icon: Icon, label, children, delay }) {
    return (<div className="flex gap-3 rounded-lg bg-sky-50 p-4 motion-safe:animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" aria-hidden="true"/>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 whitespace-pre-line">{children}</p>
      </div>
    </div>);
}
export default function TeacherProfileCard({ name, photoUrl, designations, qualifications, experience, specialization, bio }) {
    const photo = safeUrl(photoUrl);
    return (<article className="group grid overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-shadow duration-300 hover:shadow-lg md:grid-cols-12">
      <div className="relative h-80 overflow-hidden bg-navy-900 md:col-span-5 md:h-auto md:min-h-[28rem]">
        {photo ? (<img src={photo} alt={name ? `Portrait of ${name}` : 'Teacher portrait'} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"/>) : (<div className="flex h-full w-full items-center justify-center text-gold-500" aria-hidden="true">
            <GeoPattern className="absolute inset-0 opacity-25"/>
            <span className="relative flex h-28 w-28 items-center justify-center rounded-full border border-gold-500/60 bg-navy-700">
              <UserRound className="h-14 w-14 text-gold-300" strokeWidth={1.25}/>
            </span>
          </div>)}
        <span className="absolute inset-x-0 bottom-0 h-1 bg-gold-500" aria-hidden="true"/>
      </div>

      <div className="space-y-6 p-6 sm:p-8 md:col-span-7">
        <header className="motion-safe:animate-fade-up">
          {name && <h2 className="text-3xl font-semibold sm:text-4xl">{name}</h2>}
          {designations.length > 0 && (<ul className={`flex flex-wrap gap-2 ${name ? 'mt-3' : ''}`} aria-label="Designations">
              {designations.map((d) => (<li key={d.en} className="inline-flex items-baseline gap-2 rounded-full border border-gold-500/50 bg-sky-50 px-4 py-1.5">
                  <span className="font-medium">{d.en}</span>
                  {d.ar && <span lang="ar" dir="rtl" className="text-lg text-navy-700">{d.ar}</span>}
                </li>))}
            </ul>)}
        </header>

        {bio && <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground motion-safe:animate-fade-up" style={{ animationDelay: '80ms' }}>{bio}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          {qualifications.map((q, i) => (<Fact key={q} icon={BadgeCheck} label="Qualification" delay={120 + i * 60}>{q}</Fact>))}
          {experience && <Fact icon={CalendarCheck} label="Experience" delay={180}>{experience}</Fact>}
          {specialization && <Fact icon={Sparkles} label="Specialization" delay={240}>{specialization}</Fact>}
        </div>
      </div>
    </article>);
}
