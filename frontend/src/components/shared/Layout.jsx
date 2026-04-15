import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sessionsAPI, authAPI } from '../../utils/api';
import ChatAssistant from './ChatAssistant';

const buildNav = (role) =>
  role === 'instructor'
    ? [
        { to: '/instructor', label: 'Dashboard', icon: '⊞', end: true },
        { to: '/instructor/sessions', label: 'Live Sessions', icon: '🎥', isSession: true },
        { to: '/instructor/calendar', label: 'Calendar', icon: '📆' },
        { to: '/instructor/courses', label: 'Courses', icon: '📚' },
        { to: '/instructor/announcements', label: 'Announcements', icon: '📢' },
        { to: '/instructor/attendance', label: 'Attendance', icon: '✅' },
        { to: '/instructor/analytics', label: 'Analytics', icon: '📊' },
        { to: '/instructor/profile', label: 'Settings', icon: '⚙️' },
      ]
    : [
        { to: '/student', label: 'Dashboard', icon: '⊞', end: true },
        { to: '/student/sessions', label: 'Live Sessions', icon: '🎥', isSession: true },
        { to: '/student/calendar', label: 'Calendar', icon: '📆' },
        { to: '/student/courses', label: 'My Courses', icon: '📚' },
        { to: '/student/announcements', label: 'Announcements', icon: '📢' },
        { to: '/student/attendance', label: 'Attendance', icon: '✅' },
        { to: '/student/profile', label: 'Settings', icon: '⚙️' },
      ];

export default function Layout() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const navItems = buildNav(user?.role);
  const [hasLive, setHasLive] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const handleAvatarClick = () => {
    navigate(`/${user?.role || 'student'}/profile`);
  };

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

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden font-sans text-zinc-100">
      
      {/* Sidebar Desktop */}
      <aside className={`relative bg-zinc-950 border-r border-zinc-800/80 flex flex-col pt-6 pb-5 shrink-0 transition-[width] duration-300 ${isCollapsed ? 'w-[88px]' : 'w-64'}`}>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 w-6 h-6 flex items-center justify-center rounded-md bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white transition-colors z-50 shadow-md"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? '›' : '‹'}
        </button>

        {/* Brand Logo */}
        <div className={`px-5 pb-6 border-b border-zinc-800/80 mb-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 overflow-hidden'}`}>
          <div className="w-9 h-9 shrink-0 rounded-xl bg-linear-to-br from-zoom-blue to-blue-600 flex items-center justify-center font-bold text-[15px] text-white shadow-lg shadow-zoom-blue/20">
            AX
          </div>
          {!isCollapsed && <span className="font-bold text-[19px] tracking-tight text-white whitespace-nowrap animate-fade-in">AttendX</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">
          {!isCollapsed ? (
            <span className="px-4 pt-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap animate-fade-in">
              {user?.role === 'instructor' ? 'Instructor' : 'Student'} Portal
            </span>
          ) : (
            <div className="h-6 shrink-0"></div> /* Spacer */
          )}
          
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) => `
                flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-zoom-blue/10 text-zoom-blue' 
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'}
              `}
            >
              <span className={`text-lg w-5 shrink-0 text-center transition-colors duration-200 ${item.isActive ? '' : 'filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="whitespace-nowrap animate-fade-in truncate">{item.label}</span>}
              {item.isSession && hasLive && (
                <span className={`rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse shrink-0 ${isCollapsed ? 'absolute top-1 right-1 w-2 h-2' : 'ml-auto w-2 h-2'}`} title="Live session active!" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer User Card */}
        <div className="mt-auto px-4 pt-4 border-t border-zinc-800/80 space-y-2">
          <div className={`flex items-center ${isCollapsed ? 'justify-center p-0 border-transparent bg-transparent' : 'gap-3 p-2 bg-zinc-900/50 border-zinc-800/50'} rounded-xl border transition-all duration-300 overflow-hidden`}>
            <div 
              onClick={handleAvatarClick}
              className="w-9 h-9 shrink-0 rounded-full relative flex items-center justify-center bg-zinc-800 text-zinc-300 font-bold text-[13px] border border-zinc-700/50 cursor-pointer hover:opacity-80 transition-opacity" 
              title={isCollapsed ? user?.name : "Change Profile Settings"}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                initials
              )}
              {/* Online Indicator */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <div className="text-sm font-bold text-white truncate">{user?.name}</div>
                <div className="text-[11px] font-medium text-zinc-400 capitalize truncate">{user?.role}</div>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            title="Log out"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl text-sm font-medium text-red-400/90 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 overflow-hidden`}
          >
            <span className="text-lg w-5 shrink-0 text-center">⏻</span>
            {!isCollapsed && <span className="whitespace-nowrap animate-fade-in">Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto relative z-10 bg-zinc-950">
        <Outlet />
      </main>

      <ChatAssistant />
      
    </div>
  );
}
