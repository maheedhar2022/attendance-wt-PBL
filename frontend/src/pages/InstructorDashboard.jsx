import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, coursesAPI } from '../utils/api';
import { format } from 'date-fns';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes, upRes] = await Promise.all([
        coursesAPI.getAll(),
        sessionsAPI.getAll({}),
        sessionsAPI.getAll({ upcoming: 'true' })
      ]);
      setCourses(cRes.data.courses);
      setRecentSessions(sRes.data.sessions.slice(0, 5));
      setSessions(upRes.data.sessions.slice(0, 6));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activateSession = async (id) => {
    try {
      await sessionsAPI.activate(id, 90);
      showToast('Session activated! Attendance window is open.');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to activate session');
    }
  };

  const closeSession = async (id) => {
    try {
      await sessionsAPI.close(id);
      showToast('Session closed.');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const totalStudents = courses.reduce((s, c) => s + (c.students?.length || 0), 0);
  const activeSessions = recentSessions.filter(s => s.status === 'active').length;

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center">
      <div className="flex items-center gap-3 text-zinc-400 font-medium">
        <span className="loading-spinner" /> Loading dashboard...
      </div>
    </div>
  );

  return (
    <div className="page-wrapper">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-3 max-w-sm animate-fade-in">
          <span>✅</span>
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}

      <div className="mb-8">
        <h1 className="page-title">Instructor Dashboard</h1>
        <p className="page-subtitle">Welcome back, {user?.name} · {format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
          <div className="w-11 h-11 rounded-lg bg-zoom-blue/10 border border-zoom-blue/20 flex items-center justify-center text-xl">📚</div>
          <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Total Courses</div>
          <div className="text-3xl font-bold text-white tracking-tight">{courses.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
          <div className="w-11 h-11 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-xl">🎓</div>
          <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Total Students</div>
          <div className="text-3xl font-bold text-white tracking-tight">{totalStudents}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
          <div className="w-11 h-11 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl">📅</div>
          <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Upcoming Sessions</div>
          <div className="text-3xl font-bold text-white tracking-tight">{sessions.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
          <div className={`w-11 h-11 rounded-lg border flex items-center justify-center text-xl ${activeSessions > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-zinc-800/50 border-zinc-700'}`}>🔴</div>
          <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Active Now</div>
          <div className={`text-3xl font-bold tracking-tight ${activeSessions > 0 ? 'text-green-500' : 'text-zinc-500'}`}>{activeSessions}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <span>📅</span> Manage Sessions
          </h2>
          {sessions.length === 0 ? (
            <div className="text-center py-10 px-6 bg-zinc-950/50 border border-zinc-800/50 border-dashed rounded-xl">
              <div className="text-4xl mb-3 opacity-80">📅</div>
              <h3 className="text-base font-semibold text-white mb-1">No sessions yet</h3>
              <p className="text-sm text-zinc-400">Go to Sessions to create your first class session.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map(session => (
                <div key={session._id} className={`p-4 rounded-xl bg-zinc-950/50 border ${session.status === 'active' ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-zinc-800/50'}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white truncate">
                        {session.title || session.topic || 'Class Session'}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1 truncate">
                        <span className="text-zoom-blue font-medium">{session.course?.code}</span> &bull; {format(new Date(session.date), 'MMM d')} {session.startTime}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {session.status === 'active' ? (
                        <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow shadow-red-500/20" onClick={() => closeSession(session._id)}>Close</button>
                      ) : session.status === 'scheduled' ? (
                        <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500 text-white hover:bg-green-600 transition-colors shadow shadow-green-500/20" onClick={() => activateSession(session._id)}>▶ Start</button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-800 text-zinc-400 uppercase tracking-wider">{session.status}</span>
                      )}
                    </div>
                  </div>
                  {session.status === 'active' && (
                    <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                      <span className="text-xs font-medium text-green-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Attendance Open</span>
                      <span className="font-mono text-lg font-bold tracking-[0.2em] text-green-400">
                        {session.attendanceCode}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Courses */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <span>📚</span> My Courses
          </h2>
          {courses.length === 0 ? (
            <div className="text-center py-10 px-6 bg-zinc-950/50 border border-zinc-800/50 border-dashed rounded-xl">
              <div className="text-4xl mb-3 opacity-80">📚</div>
              <h3 className="text-base font-semibold text-white mb-1">No courses yet</h3>
              <p className="text-sm text-zinc-400">Create your first course from the Courses page.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {courses.map(course => (
                <div key={course._id} className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-white truncate">{course.title}</div>
                    <div className="text-xs text-zinc-400 mt-1 truncate">
                      <span className="font-medium">{course.code}</span> &bull; {course.students?.length || 0} students
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-zoom-blue/10 text-zoom-blue border border-zoom-blue/20 whitespace-nowrap">
                    {course.semester || 'Active'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
