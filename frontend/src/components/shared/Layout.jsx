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
    <div className="flex h-screen bg-zinc-950 overflow-hidden font-sans text-zinc-100">
      
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col pt-6 pb-5 flex-shrink-0">
        
        {/* Brand Logo */}
        <div className="px-5 pb-6 border-b border-zinc-800/80 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zoom-blue to-blue-600 flex items-center justify-center font-bold text-[15px] text-white shadow-lg shadow-zoom-blue/20">
              AX
            </div>
            <span className="font-bold text-[19px] tracking-tight text-white">AttendX</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 flex flex-col gap-1.5 overflow-y-auto">
          <span className="px-4 pt-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            {user?.role === 'instructor' ? 'Instructor' : 'Student'} Portal
          </span>
          
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? 'bg-zoom-blue/10 text-zoom-blue' 
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'}
              `}
            >
              <span className={`text-lg w-5 text-center transition-colors duration-200 ${item.isActive ? '' : 'filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.isSession && hasLive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" title="Live session active!" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer User Card */}
        <div className="mt-auto px-4 pt-4 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
            <div className="w-9 h-9 rounded-full relative flex items-center justify-center bg-zinc-800 text-zinc-300 font-bold text-[13px] border border-zinc-700/50">
              {initials}
              {/* Online Indicator */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{user?.name}</div>
              <div className="text-[11px] font-medium text-zinc-400 capitalize truncate">{user?.role}</div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400/90 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <span className="text-lg w-5 text-center">⏻</span>
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto relative z-10 bg-zinc-950">
        <Outlet />
      </main>
      
    </div>
  );
}
