import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, coursesAPI } from '../utils/api';
import { format, formatDistanceToNow } from 'date-fns';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes, allRes] = await Promise.all([
        coursesAPI.getAll(),
        sessionsAPI.getAll({ upcoming: 'true' }),
        sessionsAPI.getAll({})
      ]);
      setCourses(cRes.data.courses);
      setSessions(sRes.data.sessions.slice(0, 6));
      setAllSessions(allRes.data.sessions);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const activateSession = async (id) => {
    try {
      await sessionsAPI.activate(id, 90);
      showToast('Session activated! Attendance window is open.');
      loadData();
    } catch (err) { showToast(err.response?.data?.message || 'Failed'); }
  };

  const closeSession = async (id) => {
    try { await sessionsAPI.close(id); showToast('Session closed.'); loadData(); }
    catch (err) { console.error(err); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const totalStudents = courses.reduce((s, c) => s + (c.students?.length || 0), 0);
  const activeSessions = allSessions.filter(s => s.status === 'active');
  const closedSessions = allSessions.filter(s => s.status === 'closed');
  const scheduledCount = allSessions.filter(s => s.status === 'scheduled').length;

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 text-zinc-400 font-medium"><span className="loading-spinner" /> Loading dashboard...</div>
    </div>
  );

  return (
    <div className="page-wrapper">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-3 max-w-sm animate-fade-in">
          <span>✅</span><p className="text-sm font-medium">{toast}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle mb-0">Welcome back, <span className="text-white font-semibold">{user?.name}</span> · {format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/instructor/sessions')} className="px-4 py-2 rounded-xl bg-zoom-blue text-white text-sm font-bold hover:bg-blue-600 transition shadow-lg shadow-zoom-blue/20 flex items-center gap-2">
            <span>＋</span> New Session
          </button>
          <button onClick={() => navigate('/instructor/courses')} className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm font-bold hover:bg-zinc-700 transition flex items-center gap-2">
            <span>📚</span> New Course
          </button>
          <button onClick={() => navigate('/instructor/analytics')} className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm font-bold hover:bg-zinc-700 transition flex items-center gap-2">
            <span>📊</span> Analytics
          </button>
        </div>
      </div>

      {/* Live session alert banner */}
      {activeSessions.length > 0 && (
        <div className="mb-8 p-4 rounded-2xl bg-green-500/10 border border-green-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(34,197,94,0.08)]">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse flex-shrink-0"></span>
            <div>
              <p className="text-sm font-bold text-green-400">{activeSessions.length} Live Session{activeSessions.length > 1 ? 's' : ''} Running</p>
              <p className="text-xs text-green-400/70 mt-0.5 truncate">{activeSessions.map(s => s.title || s.topic || 'Session').join(', ')}</p>
            </div>
          </div>
          <button onClick={() => navigate('/instructor/sessions')} className="text-xs font-bold text-green-400 border border-green-500/30 px-4 py-2 rounded-lg hover:bg-green-500/10 transition whitespace-nowrap">
            Manage Live →
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '📚', label: 'Courses', value: courses.length, sub: `${scheduledCount} sessions scheduled`, color: 'zoom-blue' },
          { icon: '🎓', label: 'Students', value: totalStudents, sub: `across ${courses.length} course${courses.length !== 1 ? 's' : ''}`, color: 'green' },
          { icon: '✅', label: 'Completed', value: closedSessions.length, sub: 'sessions conducted', color: 'purple' },
          { icon: '🔴', label: 'Active Now', value: activeSessions.length, sub: activeSessions.length > 0 ? 'sessions live' : 'none running', color: activeSessions.length > 0 ? 'green' : 'zinc' },
        ].map(({ icon, label, value, sub, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-${color}-500/10 border border-${color}-500/20`}>{icon}</div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</div>
            <div className={`text-3xl font-bold tracking-tight ${color === 'green' && value > 0 ? 'text-green-500' : color === 'zoom-blue' ? 'text-white' : 'text-white'}`}>{value}</div>
            <div className="text-[11px] text-zinc-500 font-medium">{sub}</div>
          </div>
        ))}
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Manage Sessions – takes 2 cols */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800/80 flex justify-between items-center">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><span>📅</span> Manage Sessions</h2>
            <button onClick={() => navigate('/instructor/sessions')} className="text-xs font-bold text-zinc-400 hover:text-zoom-blue transition">View all →</button>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {sessions.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">No sessions yet. <button onClick={() => navigate('/instructor/sessions')} className="text-zoom-blue hover:underline">Create one →</button></div>
            ) : sessions.map(session => (
              <div key={session._id} className={`p-4 rounded-xl bg-zinc-950/60 border ${session.status === 'active' ? 'border-green-500/40' : 'border-zinc-800/60'}`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white truncate">{session.title || session.topic || 'Class Session'}</div>
                    <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-zoom-blue font-medium">{session.course?.code}</span>
                      <span className="text-zinc-600">·</span>
                      <span>{format(new Date(session.date), 'MMM d, yyyy')}</span>
                      <span className="text-zinc-600">·</span>
                      <span>{session.startTime} – {session.endTime}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {session.status === 'active' ? (
                      <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition" onClick={() => closeSession(session._id)}>■ Close</button>
                    ) : session.status === 'scheduled' ? (
                      <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500 text-white hover:bg-green-600 transition" onClick={() => activateSession(session._id)}>▶ Start</button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-500 uppercase tracking-wider">{session.status}</span>
                    )}
                  </div>
                </div>
                {session.status === 'active' && (
                  <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-medium text-green-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Attendance Open</span>
                    <span className="font-mono text-base font-bold tracking-[0.3em] text-green-400">{session.attendanceCode}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Course Roster Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800/80 flex justify-between items-center">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><span>📚</span> Courses</h2>
            <button onClick={() => navigate('/instructor/courses')} className="text-xs font-bold text-zinc-400 hover:text-zoom-blue transition">Manage →</button>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {courses.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">No courses yet. <button onClick={() => navigate('/instructor/courses')} className="text-zoom-blue hover:underline">Create one →</button></div>
            ) : courses.map(course => {
              const studentCount = course.students?.length || 0;
              const pct = Math.min(100, Math.round((studentCount / Math.max(studentCount, 30)) * 100));
              return (
                <div key={course._id} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 hover:border-zinc-700/80 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate">{course.title}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 uppercase tracking-wider font-semibold">{course.code} · {course.semester || 'Active'}</div>
                    </div>
                    <span className="flex-shrink-0 ml-2 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-bold border border-zinc-700">{studentCount}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
                      <span className="uppercase font-semibold">Enrollment</span>
                      <span className="text-zinc-400 font-bold">{studentCount} students</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zoom-blue/80 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {course.schedule?.days?.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {course.schedule.days.map(d => (
                        <span key={d} className="px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded font-bold text-zinc-400">{d}</span>
                      ))}
                      {course.schedule.startTime && <span className="text-[10px] text-zinc-500 ml-1">· {course.schedule.startTime}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row: Recent Activity + Session Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent sessions activity */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800/80">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><span>🕐</span> Recent Activity</h2>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {allSessions.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">No activity yet.</div>
            ) : allSessions.slice(0, 6).map(s => {
              const statusMap = { active: { dot: 'bg-green-400', text: 'text-green-400', label: 'Live' }, closed: { dot: 'bg-zinc-500', text: 'text-zinc-400', label: 'Ended' }, scheduled: { dot: 'bg-zoom-blue', text: 'text-zoom-blue', label: 'Scheduled' }, cancelled: { dot: 'bg-red-500', text: 'text-red-400', label: 'Cancelled' } };
              const st = statusMap[s.status] || statusMap.scheduled;
              return (
                <div key={s._id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot} ${s.status === 'active' ? 'animate-pulse' : ''}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{s.title || s.topic || 'Class Session'}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{s.course?.code} · {s.date ? format(new Date(s.date), 'MMM d, yyyy') : ''}</div>
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider flex-shrink-0 ${st.text}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session stats breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800/80">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><span>📈</span> Session Overview</h2>
          </div>
          <div className="p-6 flex flex-col gap-5">
            {[
              { label: 'Total Sessions', value: allSessions.length, max: Math.max(allSessions.length, 1), color: 'bg-zinc-600', pct: 100 },
              { label: 'Completed', value: closedSessions.length, max: Math.max(allSessions.length, 1), color: 'bg-green-500', pct: Math.round((closedSessions.length / Math.max(allSessions.length, 1)) * 100) },
              { label: 'Scheduled', value: scheduledCount, max: Math.max(allSessions.length, 1), color: 'bg-zoom-blue', pct: Math.round((scheduledCount / Math.max(allSessions.length, 1)) * 100) },
              { label: 'Active Now', value: activeSessions.length, max: Math.max(allSessions.length, 1), color: 'bg-red-500', pct: Math.round((activeSessions.length / Math.max(allSessions.length, 1)) * 100) },
            ].map(({ label, value, color, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-300">{label}</span>
                  <span className="font-bold text-white">{value}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}

            <div className="mt-2 pt-4 border-t border-zinc-800/80 grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-center">
                <div className="text-xl font-bold text-white">{totalStudents}</div>
                <div className="text-[10px] text-zinc-500 uppercase font-semibold mt-0.5">Total Students</div>
              </div>
              <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-center">
                <div className="text-xl font-bold text-white">{courses.length > 0 ? Math.round(totalStudents / courses.length) : 0}</div>
                <div className="text-[10px] text-zinc-500 uppercase font-semibold mt-0.5">Avg / Course</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
