import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import PublicLayout from '@/layouts/PublicLayout';
import AdminLayout from '@/layouts/AdminLayout';
import StudentLayout from '@/layouts/StudentLayout';
import NotBuiltYet from '@/pages/NotBuiltYet';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Course from '@/pages/Course';
import Curriculum from '@/pages/Curriculum';
import Contact from '@/pages/Contact';
import VerifyCertificate from '@/pages/VerifyCertificate';
import Profile from '@/pages/Profile';
import { Register } from '@/pages/Portal';
import AdminLogin from '@/pages/auth/AdminLogin';
import StudentLogin from '@/pages/auth/StudentLogin';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Resources from '@/pages/admin/Resources';
import { Notes, Meetings } from '@/pages/student/Resources';
import AdminSection from '@/pages/admin/AdminSection';
import Batches from '@/pages/admin/Batches';
import BatchDetail from '@/pages/admin/BatchDetail';
import Students, { StudentProfile as AdminStudentProfile } from '@/pages/admin/Students';
import AdminAttendance from '@/pages/admin/Attendance';
import { Dashboard, Learning, Attendance, Announcements, Certificates, Profile as StudentProfile } from '@/pages/student/pages';
import { RedirectIfAuthed, RequireAdmin, RequireStudent } from '@/routes/guards';

function ScrollToTop(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo(0,0)},[pathname]);return null;}
export default function AppRoutes() {
  return (
    <><ScrollToTop/><Routes>
      {/* Public website: unchanged */}
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="teacher" element={<Navigate to="/about" replace />} />
        <Route path="course" element={<Course />} />
        <Route path="curriculum" element={<Curriculum />} />
        <Route path="contact" element={<Contact />} />
        <Route path="verify-certificate/:code" element={<VerifyCertificate />} />
        <Route path="register" element={<Register />} />
        <Route path="profile" element={<Profile />} />
        <Route path="learn/:courseId" element={<Navigate to="/student/learning" replace />} />
        <Route path="*" element={<NotBuiltYet title="Page not found" phase="—" />} />
      </Route>

      {/* Isolated apps: no public header/footer */}
      <Route path="login" element={<RedirectIfAuthed><StudentLogin /></RedirectIfAuthed>} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="admin/login" element={<RedirectIfAuthed admin><AdminLogin /></RedirectIfAuthed>} />

      <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<AdminSection />} />
        <Route path="notes" element={<Resources kind="notes" />} /><Route path="meetings" element={<Resources kind="meetings" />} />
        <Route path="batches" element={<Batches />} />
        <Route path="batches/:batchId" element={<BatchDetail />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:userId" element={<AdminStudentProfile />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="website" element={<Navigate to="/admin" replace />} />
        <Route path="lessons" element={<Navigate to="/admin/programme" replace />} /><Route path=":section/*" element={<AdminSection />} />
      </Route>

      <Route path="student" element={<RequireStudent><StudentLayout /></RequireStudent>}>
        <Route index element={<Dashboard />} />
        <Route path="learning" element={<Learning />} /><Route path="notes" element={<Notes />} /><Route path="meetings" element={<Meetings />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Route>
    </Routes></>
  );
}
