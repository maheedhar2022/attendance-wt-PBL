import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sessionsAPI } from '../../utils/api';

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

  // Poll for live sessions every 15s to show the pulsing dot
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
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">AX</div>
            <span className="logo-text">AttendX</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">
            {user?.role === 'instructor' ? 'Instructor' : 'Student'} Portal
          </span>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.isSession && hasLive && (
                <span className="nav-live-dot" title="A live session is active!" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="nav-item btn-ghost" onClick={handleLogout} style={{ marginTop: 4, color: 'var(--red)', width: '100%' }}>
            <span className="nav-icon">⏻</span>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
