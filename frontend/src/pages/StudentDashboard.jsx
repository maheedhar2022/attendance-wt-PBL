import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, attendanceAPI, coursesAPI } from '../utils/api';
import { format, formatDistanceToNow } from 'date-fns';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessRes, attRes, coursesRes] = await Promise.all([
        sessionsAPI.getAll({ upcoming: 'true' }),
        attendanceAPI.getMy(),
        coursesAPI.getAll()
      ]);
      setUpcomingSessions(sessRes.data.sessions.slice(0, 4));
      setAttendanceStats(attRes.data.stats);
      setCourses(coursesRes.data.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const overallPercentage = attendanceStats.length > 0
    ? Math.round(attendanceStats.reduce((s, c) => s + c.percentage, 0) / attendanceStats.length)
    : 0;

  const getPercentageColor = (pct) => {
    if (pct >= 75) return 'text-green-500';
    if (pct >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPercentageBarClass = (pct) => {
    if (pct >= 75) return 'bg-green-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

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
        <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
          <div className="w-11 h-11 rounded-lg bg-zoom-blue/10 border border-zoom-blue/20 flex items-center justify-center text-xl">📚</div>
          <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Enrolled Courses</div>
          <div className="text-3xl font-bold text-white tracking-tight">{courses.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
          <div className="w-11 h-11 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-xl">🎯</div>
          <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Overall Attendance</div>
          <div className={`text-3xl font-bold tracking-tight ${getPercentageColor(overallPercentage)}`}>
            {overallPercentage}%
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
          <div className="w-11 h-11 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl">📅</div>
          <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Upcoming Sessions</div>
          <div className="text-3xl font-bold text-white tracking-tight">{upcomingSessions.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
          <div className="w-11 h-11 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-xl">⚠️</div>
          <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Low Attendance</div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold tracking-tight text-yellow-500">
              {attendanceStats.filter(s => s.percentage < 75).length}
            </div>
            <div className="text-[11px] font-medium text-zinc-500 uppercase">courses &lt; 75%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <span>📅</span> Upcoming Sessions
          </h2>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-10 px-6 bg-zinc-950/50 border border-zinc-800/50 border-dashed rounded-xl">
              <div className="text-4xl mb-3 opacity-80">🎉</div>
              <h3 className="text-base font-semibold text-white mb-1">All caught up!</h3>
              <p className="text-sm text-zinc-400">No upcoming sessions scheduled.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingSessions.map(session => (
                <div key={session._id} className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50 flex justify-between items-center gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-white truncate">
                      {session.title || session.topic || 'Class Session'}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 truncate">
                      <span className="text-zoom-blue font-medium">{session.course?.code}</span> &bull; {format(new Date(session.date), 'MMM d')} at {session.startTime}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {session.status === 'active'
                      ? <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>Live</span>
                      : <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 whitespace-nowrap">{formatDistanceToNow(new Date(session.date), { addSuffix: true })}</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course Attendance */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <span>📊</span> Attendance by Course
          </h2>
          {attendanceStats.length === 0 ? (
            <div className="text-center py-10 px-6 bg-zinc-950/50 border border-zinc-800/50 border-dashed rounded-xl">
              <div className="text-4xl mb-3 opacity-80">📋</div>
              <h3 className="text-base font-semibold text-white mb-1">No records yet</h3>
              <p className="text-sm text-zinc-400">Attendance records will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {attendanceStats.map((stat, i) => (
                <div key={i}>
                  <div className="flex justify-between items-end mb-2">
                    <div className="min-w-0 pr-4">
                      <span className="text-sm font-semibold text-white truncate block">
                        {stat.course?.title}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-500 uppercase mt-0.5 block">
                        {stat.attended} / {stat.total} Sessions
                      </span>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${getPercentageColor(stat.percentage)}`}>
                      {stat.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${getPercentageBarClass(stat.percentage)}`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  {stat.percentage < 75 && (
                    <div className="text-[10px] uppercase font-bold text-red-400 mt-1.5 tracking-wider">
                      ⚠️ Below Threshold
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
