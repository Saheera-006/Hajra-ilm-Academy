import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SiteReady from '@/components/SiteReady';
import PageShell from '@/components/PageShell';
import CourseCard from '@/components/course/CourseCard';
import { Button } from '@/components/ui/button';
export default function Course() {
    const { user } = useAuth();
    return (<SiteReady>
      {({ course, batch }) => (<PageShell title="Six-Month Islamic Learning Programme">
            <div className="mx-auto max-w-md sm:max-w-lg">
              <CourseCard course={course} footer={<Button asChild size="lg" className="w-full rounded-full bg-[#172d43] text-white hover:bg-[#25435f]"><Link to={user ? (user.role === 'ADMIN' ? '/admin' : '/student') : '/register'}>{user ? 'Open my learning' : 'Enroll Now'}</Link></Button>}/>
            </div>
            {batch?.startDate && <p className="text-muted-foreground">Batch start date: {batch.startDate}</p>}
          </PageShell>)}
    </SiteReady>);
}
