import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, attendanceAPI, coursesAPI } from '../utils/api';
import { format, formatDistanceToNow } from 'date-fns';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessRes, attRes, coursesRes, allSessRes] = await Promise.all([
        sessionsAPI.getAll({ upcoming: 'true' }),
        attendanceAPI.getMy(),
        coursesAPI.getAll(),
        sessionsAPI.getAll({})
      ]);
      setUpcomingSessions(sessRes.data.sessions.slice(0, 5));
      setAttendanceStats(attRes.data.stats);
      setCourses(coursesRes.data.courses);
      setAllSessions(allSessRes.data.sessions);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const pctColor = (p) => p >= 75 ? 'text-green-500' : p >= 50 ? 'text-yellow-500' : 'text-red-500';
  const pctBar = (p) => p >= 75 ? 'bg-green-500' : p >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const pctBg = (p) => p >= 75 ? 'bg-green-500/10 border-green-500/20 text-green-400' : p >= 50 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-red-500/10 border-red-500/20 text-red-400';

  const overallPct = attendanceStats.length > 0
    ? Math.round(attendanceStats.reduce((s, c) => s + c.percentage, 0) / attendanceStats.length) : 0;
  const atRiskCourses = attendanceStats.filter(s => s.percentage < 75);
  const liveSessions = upcomingSessions.filter(s => s.liveSessionActive);
  const totalAttended = attendanceStats.reduce((s, c) => s + (c.attended || 0), 0);
  const totalSessions = attendanceStats.reduce((s, c) => s + (c.total || 0), 0);

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 text-zinc-400 font-medium"><span className="loading-spinner" /> Loading dashboard...</div>
    </div>
  );

  return (
    <div className="page-wrapper">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle mb-0">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/student/attendance')} className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm font-bold hover:bg-zinc-700 transition flex items-center gap-2">
            <span>📋</span> My Attendance
          </button>
          <button onClick={() => navigate('/student/sessions')} className="px-4 py-2 rounded-xl bg-zoom-blue text-white text-sm font-bold hover:bg-blue-600 transition shadow-lg shadow-zoom-blue/20 flex items-center gap-2">
            <span>📅</span> Sessions
          </button>
        </div>
      </div>

      {/* Live session alert */}
      {liveSessions.length > 0 && (
        <div className="mb-8 p-4 rounded-2xl bg-green-500/10 border border-green-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(34,197,94,0.08)]">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse flex-shrink-0"></span>
            <div>
              <p className="text-sm font-bold text-green-400">🔴 {liveSessions.length} Session{liveSessions.length > 1 ? 's' : ''} Live Right Now!</p>
              <p className="text-xs text-green-400/70 mt-0.5">{liveSessions.map(s => `${s.course?.code}: ${s.title || s.topic || 'Session'}`).join(', ')}</p>
            </div>
          </div>
          <button onClick={() => navigate('/student/sessions')} className="text-xs font-bold text-green-400 border border-green-500/30 px-4 py-2 rounded-lg hover:bg-green-500/10 transition whitespace-nowrap">
            Join Now →
          </button>
        </div>
      )}

      {/* Attendance warning */}
      {atRiskCourses.length > 0 && (
        <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-400 mb-0.5">Attendance Alert — {atRiskCourses.length} course{atRiskCourses.length > 1 ? 's' : ''} below 75%</p>
            <p className="text-xs text-red-400/70">{atRiskCourses.map(c => `${c.course?.code} (${c.percentage}%)`).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 transition-all flex flex-col gap-2">
          <div className="w-10 h-10 rounded-lg bg-zoom-blue/10 border border-zoom-blue/20 flex items-center justify-center text-lg">📚</div>
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Courses</div>
          <div className="text-3xl font-bold text-white">{courses.length}</div>
          <div className="text-[11px] text-zinc-500">enrolled</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 transition-all flex flex-col gap-2">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg ${pctBg(overallPct)}`}>🎯</div>
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Overall %</div>
          <div className={`text-3xl font-bold ${pctColor(overallPct)}`}>{overallPct}%</div>
          <div className="text-[11px] text-zinc-500">{totalAttended} of {totalSessions} sessions</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 transition-all flex flex-col gap-2">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg">📅</div>
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Upcoming</div>
          <div className="text-3xl font-bold text-white">{upcomingSessions.length}</div>
          <div className="text-[11px] text-zinc-500">{liveSessions.length > 0 ? `${liveSessions.length} live now` : 'sessions ahead'}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 transition-all flex flex-col gap-2">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg ${atRiskCourses.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
            {atRiskCourses.length > 0 ? '⚠️' : '✅'}
          </div>
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">At Risk</div>
          <div className={`text-3xl font-bold ${atRiskCourses.length > 0 ? 'text-red-500' : 'text-green-500'}`}>{atRiskCourses.length}</div>
          <div className="text-[11px] text-zinc-500">course{atRiskCourses.length !== 1 ? 's' : ''} &lt;75%</div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Attendance breakdown — 2 cols */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800/80 flex justify-between items-center">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><span>📊</span> Attendance by Course</h2>
            <button onClick={() => navigate('/student/attendance')} className="text-xs font-bold text-zinc-400 hover:text-zoom-blue transition">Details →</button>
          </div>
          <div className="p-6">
            {attendanceStats.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">No attendance records yet.</div>
            ) : (
              <div className="flex flex-col gap-5">
                {attendanceStats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="min-w-0 pr-4">
                        <div className="text-sm font-bold text-white truncate">{stat.course?.title}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">{stat.course?.code} · {stat.attended}/{stat.total} sessions attended</div>
                      </div>
                      <div className={`flex-shrink-0 px-3 py-1 rounded-lg border text-sm font-bold ${pctBg(stat.percentage)}`}>
                        {stat.percentage}%
                      </div>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ease-out ${pctBar(stat.percentage)}`} style={{ width: `${stat.percentage}%` }} />
                    </div>
                    {stat.percentage < 75 && stat.total > 0 && (() => {
                      const needed = Math.ceil((0.75 * stat.total - stat.attended) / 0.25);
                      return needed > 0 ? (
                        <div className="text-[10px] text-red-400 font-semibold mt-1.5 uppercase tracking-wider">
                          ⚠️ Need {needed} more session{needed !== 1 ? 's' : ''} to reach 75%
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Sessions panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800/80 flex justify-between items-center">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><span>📅</span> Upcoming</h2>
            <button onClick={() => navigate('/student/sessions')} className="text-xs font-bold text-zinc-400 hover:text-zoom-blue transition">All →</button>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {upcomingSessions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-3 opacity-60">🎉</div>
                <p className="text-sm font-semibold text-white mb-1">All caught up!</p>
                <p className="text-xs text-zinc-500">No upcoming sessions.</p>
              </div>
            ) : upcomingSessions.map(session => (
              <div key={session._id} className={`px-5 py-4 hover:bg-zinc-800/30 transition-colors ${session.liveSessionActive ? 'bg-green-500/5' : ''}`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{session.title || session.topic || 'Class Session'}</div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      <span className="text-zoom-blue font-medium">{session.course?.code}</span>
                      <span className="text-zinc-600 mx-1">·</span>
                      <span>{format(new Date(session.date), 'MMM d')} at {session.startTime}</span>
                    </div>
                  </div>
                  {session.liveSessionActive ? (
                    <button onClick={() => navigate('/student/sessions')} className="flex-shrink-0 px-2 py-1 text-[10px] font-bold rounded-md bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>Join
                    </button>
                  ) : (
                    <span className="flex-shrink-0 text-[10px] font-semibold text-zinc-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(session.date), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My Courses — horizontal cards */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-800/80 flex justify-between items-center">
          <h2 className="text-base font-bold text-white flex items-center gap-2"><span>🎓</span> My Courses</h2>
          <button onClick={() => navigate('/student/courses')} className="text-xs font-bold text-zinc-400 hover:text-zoom-blue transition">View all →</button>
        </div>
        {courses.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">You are not enrolled in any courses yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {courses.map(course => {
              const stat = attendanceStats.find(s => s.course?._id === course._id || s.course === course._id);
              const pct = stat?.percentage ?? null;
              return (
                <div key={course._id} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 hover:border-zinc-700 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 rounded bg-zoom-blue/10 text-zoom-blue border border-zoom-blue/20 text-[11px] font-bold uppercase tracking-wider">{course.code}</span>
                    {pct !== null && (
                      <span className={`text-sm font-bold ${pctColor(pct)}`}>{pct}%</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white truncate">{course.title}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{course.instructor?.name || 'Instructor'}</div>
                  </div>
                  {pct !== null && (
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pctBar(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {course.schedule?.days?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {course.schedule.days.map(d => (
                        <span key={d} className="px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded font-semibold text-zinc-400">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
