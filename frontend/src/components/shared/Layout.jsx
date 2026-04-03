import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sessionsAPI } from '../../utils/api';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const buildNav = (role) =>
  role === 'instructor'
    ? [
        { to: '/instructor', label: 'Dashboard', icon: '⊞', end: true },
        { to: '/instructor/sessions', label: 'Sessions', icon: '📅', isSession: true },
        { to: '/instructor/courses', label: 'Courses', icon: '📚' },
        { to: '/instructor/attendance', label: 'Attendance', icon: '✅' },
        { to: '/instructor/analytics', label: 'Analytics', icon: '📊' },
      ]
    : [
        { to: '/student', label: 'Dashboard', icon: '⊞', end: true },
        { to: '/student/sessions', label: 'Sessions', icon: '📅', isSession: true },
        { to: '/student/courses', label: 'My Courses', icon: '📚' },
        { to: '/student/attendance', label: 'Attendance', icon: '✅' },
      ];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = buildNav(user?.role);
  const [hasLive, setHasLive] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await sessionsAPI.getAll({ status: 'active' });
        setHasLive(res.data.sessions.some(s => s.liveSessionActive));
      } catch {}
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      <Sidebar user={user} navItems={navItems} hasLive={hasLive} />
      
      <main className="main-content">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="scroll-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
