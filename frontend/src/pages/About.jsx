import SiteReady from '@/components/SiteReady';
import PageShell, { Ar, Ta } from '@/components/PageShell';
import TeacherProfileCard from '@/components/teacher/TeacherProfileCard';
import { BookOpen, HeartHandshake, Laptop, Languages, Target, UsersRound } from 'lucide-react';
import { parseBilingualLines } from '@/lib/format';
const pillars = [
    { Icon: BookOpen, title: 'Meaningful Islamic learning', tamil: 'பயனுள்ள இஸ்லாமியக் கல்வி', body: 'Learn Quran recitation, Islamic beliefs, practical rulings and Islamic history through a structured learning journey.' },
    { Icon: Laptop, title: 'Learn from home', tamil: 'வீட்டிலிருந்தே கற்கலாம்', body: 'Live online classes help learners access lessons without needing to travel to a physical madrasa.' },
    { Icon: Languages, title: 'Tamil-medium teaching', tamil: 'தமிழ் வழிக் கற்பித்தல்', body: 'Lessons are taught in Tamil so students can understand concepts clearly and ask questions comfortably.' },
];
export default function About() {
    return (<SiteReady>
      {({ content }) => {
            const value = (key) => content[key]?.en;
            const profile = {
                name: value('teacher.name'),
                photoUrl: value('teacher.photo_url'),
                designations: parseBilingualLines(value('teacher.designations')),
                qualifications: (value('teacher.qualifications') ?? '').split('\n').map((item) => item.trim()).filter(Boolean),
                experience: value('teacher.experience'),
                specialization: value('teacher.specialization'),
                bio: value('teacher.bio'),
            };
            const hasEducatorDetails = Boolean(profile.name || profile.designations.length || profile.qualifications.length || profile.experience || profile.specialization || profile.bio);
            return (<div className="min-h-screen bg-[#f7f5ef]">
            <PageShell title="About Hajara Ilm Academy" wide>
              <section className="relative overflow-hidden rounded-[1.8rem] bg-[#172d43] px-6 py-10 text-white sm:px-10 sm:py-14">
                <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-[#d9bf85]/20"/>
                <div className="pointer-events-none absolute right-8 top-8 h-40 w-40 rounded-full border border-[#d9bf85]/20"/>
                <Ar className="text-2xl text-[#e7cc91]">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Ar>
                <p className="mt-7 text-xs font-bold uppercase tracking-[.24em] text-[#e7cc91]">Our purpose</p>
                <h2 className="mt-3 max-w-3xl font-heading text-3xl font-semibold leading-tight sm:text-5xl">Knowledge That Nurtures Faith.</h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#e7edf3]">An online space for women and girls who wish to learn Islam but are unable to attend a madrasa in person.</p>
                <p lang="ta" className="mt-3 max-w-2xl leading-8 text-[#d6e0e8]">மதரஸாவிற்குச் சென்று பயில முடியாத மாணவிகள் மற்றும் பெண்களும், வீட்டிலிருந்தபடியே இஸ்லாமிய அறிவைப் பெறுவதற்கான வாய்ப்பை உருவாக்குவதே எங்களின் நோக்கம்.</p>
              </section>

              <section className="grid gap-5 md:grid-cols-[1.1fr_.9fr]">
                <div className="rounded-[1.6rem] border border-[#e7e0d4] bg-white p-6 sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-[#a1834e]">Why we are here</p>
                  <h2 className="mt-3 font-heading text-2xl font-semibold text-[#172d43] sm:text-3xl">A learning opportunity for every woman who seeks knowledge.</h2>
                  <p className="mt-4 leading-8 text-[#586878]">Some students and women may have family responsibilities, studies, work or other circumstances that make attending a madrasa in person difficult. Hajara Ilm Academy aims to make Islamic learning more accessible through live online lessons.</p>
                  <p lang="ta" className="mt-3 leading-8 text-[#687583]">கல்வி, வேலை, குடும்பப் பொறுப்புகள் அல்லது பிற சூழ்நிலைகளால் நேரடியாக மதரஸாவிற்குச் செல்ல முடியாதவர்களும் இஸ்லாமியக் கல்வியைத் தொடர்ந்து கற்க உதவும் நோக்கத்துடன் இந்த இணையவழி கற்றல் முயற்சி அமைக்கப்பட்டுள்ளது.</p>
                </div>
                <div className="rounded-[1.6rem] bg-[#efe8d9] p-6 sm:p-8">
                  <Target className="h-8 w-8 text-[#987644]" strokeWidth={1.5}/>
                  <h2 className="mt-4 font-heading text-2xl font-semibold text-[#172d43]">Our vision</h2>
                  <p className="mt-3 leading-7 text-[#586878]">To encourage women and girls to build a meaningful connection with Islamic knowledge and lifelong learning.</p>
                  <p lang="ta" className="mt-2 leading-7 text-[#687583]">பெண்களும் மாணவிகளும் இஸ்லாமிய அறிவுடன் ஆழமான தொடர்பை வளர்த்துக்கொண்டு தொடர்ந்து கற்க ஊக்குவித்தல்.</p>
                  <div className="my-6 h-px bg-[#d8cbb2]"/>
                  <HeartHandshake className="h-8 w-8 text-[#987644]" strokeWidth={1.5}/>
                  <h2 className="mt-4 font-heading text-2xl font-semibold text-[#172d43]">Our mission</h2>
                  <p className="mt-3 leading-7 text-[#586878]">To provide accessible, structured online learning in Quran reading, Tajweed and essential areas of Islamic knowledge.</p>
                  <p lang="ta" className="mt-2 leading-7 text-[#687583]">குர்ஆன் ஓதுதல், தஜ்வீத் மற்றும் அடிப்படை இஸ்லாமிய அறிவை ஒழுங்குபடுத்தப்பட்ட இணையவழி வகுப்புகள் மூலம் வழங்குதல்.</p>
                </div>
              </section>

              <section>
                <div className="mb-5 max-w-2xl">
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-[#a1834e]">The learning experience</p>
                  <h2 className="mt-2 font-heading text-3xl font-semibold text-[#172d43]">Learning designed around accessibility</h2>
                  <p lang="ta" className="mt-2 leading-7 text-[#687583]">எளிதில் அணுகக்கூடிய வகையில் அமைக்கப்பட்ட கற்றல் முறை.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {pillars.map(({ Icon, title, tamil, body }, index) => (<article key={title} className="rounded-[1.4rem] border border-[#e7e0d4] bg-white p-6">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1eadc] text-[#8e7040]"><Icon className="h-6 w-6" strokeWidth={1.6}/></span>
                      <span className="mt-5 block text-xs font-bold tracking-[.18em] text-[#a1834e]">0{index + 1}</span>
                      <h3 className="mt-2 font-heading text-xl font-semibold text-[#172d43]">{title}</h3>
                      <Ta className="mt-1 text-sm text-[#7b8792]">{tamil}</Ta>
                      <p className="mt-3 text-sm leading-7 text-[#586878]">{body}</p>
                    </article>))}
                </div>
              </section>

              <section className="rounded-[1.6rem] border border-[#e7e0d4] bg-white p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#172d43] text-[#e7cc91]"><UsersRound className="h-6 w-6"/></span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.2em] text-[#a1834e]">Who we serve</p>
                    <h2 className="mt-2 font-heading text-2xl font-semibold text-[#172d43]">For women and girls</h2>
                    <p className="mt-3 leading-7 text-[#586878]">Our learning initiative is intended for women and girls who want to gain Islamic knowledge from home, especially those who cannot attend a madrasa in person.</p>
                    <p lang="ta" className="mt-2 leading-7 text-[#687583]">வீட்டிலிருந்தபடியே இஸ்லாமிய அறிவைப் பெற விரும்பும் பெண்கள் மற்றும் மாணவிகளுக்காக இந்த வகுப்புகள் அமைக்கப்பட்டுள்ளன.</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-5 max-w-2xl">
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-[#a1834e]">Our educator</p>
                  <h2 className="mt-2 font-heading text-3xl font-semibold text-[#172d43]">Guidance through every lesson</h2>
                  <p lang="ta" className="mt-2 leading-7 text-[#687583]">ஒவ்வொரு பாடத்திலும் ஆசிரியரின் வழிகாட்டுதலுடன் கற்றல்.</p>
                </div>
                {hasEducatorDetails ? (<TeacherProfileCard {...profile}/>) : (<div className="rounded-[1.5rem] border border-[#e7e0d4] bg-white p-6 sm:p-8">
                    <p className="font-heading text-xl font-semibold text-[#172d43]">A dedicated educator leads the learning journey.</p>
                    <p className="mt-2 max-w-2xl leading-7 text-[#586878]">Educator details and verified qualifications will be shared here when the profile is ready.</p>
                    <p lang="ta" className="mt-2 leading-7 text-[#687583]">ஆசிரியரின் அறிமுகம் மற்றும் உறுதிப்படுத்தப்பட்ட தகுதி விவரங்கள் தயாரானதும் இங்கே பகிரப்படும்.</p>
                  </div>)}
              </section>
            </PageShell>
          </div>);
        }}
    </SiteReady>);
}
