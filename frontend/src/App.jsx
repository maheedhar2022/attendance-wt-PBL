import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import SessionsPage from './pages/SessionsPage';
import CoursesPage from './pages/CoursesPage';
import AttendancePage from './pages/AttendancePage';
import AnalyticsPage from './pages/AnalyticsPage';
import LiveSessionPage from './pages/LiveSessionPage';
import ProfilePage from './pages/ProfilePage';
import LandingPage from './pages/LandingPage';
import CalendarPage from './pages/CalendarPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import Layout from './components/shared/Layout';

function ProtectedRoute({ children, allowedRole }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <div className="page-loader"><div className="loading-spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'instructor' ? '/instructor' : '/student'} replace />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'instructor' ? '/instructor' : '/student'} /> : <AuthPage />} />
      <Route path="/" element={user ? <Navigate to={user.role === 'instructor' ? '/instructor' : '/student'} /> : <LandingPage />} />

      {/* Student routes */}
      <Route path="/student" element={<ProtectedRoute allowedRole="student"><Layout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="live/:sessionId" element={<LiveSessionPage />} />
      </Route>

      {/* Instructor routes */}
      <Route path="/instructor" element={<ProtectedRoute allowedRole="instructor"><Layout /></ProtectedRoute>}>
        <Route index element={<InstructorDashboard />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="live/:sessionId" element={<LiveSessionPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
