import SiteReady from '@/components/SiteReady';
import PageShell, { EmptyNote } from '@/components/PageShell';
import TeacherProfileCard from '@/components/teacher/TeacherProfileCard';
import { parseBilingualLines } from '@/lib/format';
export default function Teacher() {
    return (<SiteReady>
      {({ content }) => {
            const v = (k) => content[k]?.en;
            const profile = {
                name: v('teacher.name'),
                photoUrl: v('teacher.photo_url'),
                designations: parseBilingualLines(v('teacher.designations')),
                qualifications: (v('teacher.qualifications') ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
                experience: v('teacher.experience'),
                specialization: v('teacher.specialization'),
                bio: v('teacher.bio'),
            };
            const hasContent = profile.name || profile.designations.length || profile.qualifications.length || profile.experience || profile.bio || profile.specialization;
            return (<PageShell title={v('teacher.title') ?? 'Your Teacher'}>
            {hasContent ? <TeacherProfileCard {...profile}/> : <EmptyNote />}
          </PageShell>);
        }}
    </SiteReady>);
}
