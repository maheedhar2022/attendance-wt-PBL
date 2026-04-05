import { useState, useEffect } from 'react';
import { attendanceAPI, coursesAPI } from '../utils/api';
import { format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';

export default function AnalyticsPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    coursesAPI.getAll().then(res => {
      setCourses(res.data.courses);
      if (res.data.courses.length > 0) {
        setSelectedCourse(res.data.courses[0]._id);
      }
    }).finally(() => setCoursesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    loadAnalytics(selectedCourse);
  }, [selectedCourse]);

  const loadAnalytics = async (courseId) => {
    setLoading(true);
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        coursesAPI.getStats(courseId),
        attendanceAPI.getAnalytics(courseId)
      ]);
      setStats(statsRes.data.stats);
      setAnalytics(analyticsRes.data.analytics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const trendData = analytics?.sessions?.map(s => ({
    name: s.date ? format(new Date(s.date), 'MMM d') : '',
    present: s.present,
    absent: s.total - s.present,
    rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
  })) || [];

  // Distribution for pie chart
  const distribution = stats ? [
    { name: '≥75% (Good)', value: stats.studentStats.filter(s => s.percentage >= 75).length, color: '#22c55e' },
    { name: '50–74% (At Risk)', value: stats.studentStats.filter(s => s.percentage >= 50 && s.percentage < 75).length, color: '#eab308' },
    { name: '<50% (Critical)', value: stats.studentStats.filter(s => s.percentage < 50).length, color: '#ef4444' },
  ] : [];

  const tooltipStyle = { background: '#09090b', border: '1px solid #27272a', borderRadius: 12, color: '#f4f4f5', fontSize: 13, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' };

  return (
    <div className="page-wrapper max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle mb-0">Attendance trends and insights</p>
        </div>
        <select className="form-select max-w-[280px]" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
          {courses.map(c => <option key={c._id} value={c._id}>{c.title} ({c.code})</option>)}
        </select>
      </div>

      {coursesLoading ? (
        <div className="py-12 flex justify-center text-zinc-400"><span className="loading-spinner mr-3" /></div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 px-6 bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl">
          <div className="text-4xl mb-4 opacity-80">📊</div>
          <h3 className="text-base font-semibold text-white mb-2">No courses found</h3>
        </div>
      ) : loading ? (
        <div className="py-12 flex justify-center items-center font-medium text-sm text-zinc-400 gap-3"><span className="loading-spinner" /> Loading analytics stream...</div>
      ) : (
        <>
          {/* Overview Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
                <div className="w-11 h-11 rounded-lg bg-zoom-blue/10 border border-zoom-blue/20 flex items-center justify-center text-xl">📅</div>
                <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Total Sessions</div>
                <div className="text-3xl font-bold text-white tracking-tight">{stats.totalSessions}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
                <div className="w-11 h-11 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-xl">✅</div>
                <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Avg Attendance</div>
                <div className="text-3xl font-bold tracking-tight text-green-500">
                  {stats.studentStats.length > 0 ? Math.round(stats.studentStats.reduce((s, c) => s + c.percentage, 0) / stats.studentStats.length) : 0}%
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
                <div className="w-11 h-11 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl">⚠️</div>
                <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">At Risk Students</div>
                <div className="text-3xl font-bold tracking-tight text-red-500">
                  {stats.studentStats.filter(s => s.percentage < 75).length}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col gap-3">
                <div className="w-11 h-11 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl">🎓</div>
                <div className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Total Students</div>
                <div className="text-3xl font-bold text-white tracking-tight">{stats.studentStats.length}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Trend Line Chart */}
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <span>📈</span> Attendance Trend
              </h3>
              {trendData.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">No session data yet.</div>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" tickMargin={10} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#27272a', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Line type="monotone" dataKey="rate" name="Attendance %" stroke="#2D8CFF" strokeWidth={3} dot={{ fill: '#09090b', stroke: '#2D8CFF', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#2D8CFF', stroke: '#fff', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Distribution Pie */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col">
              <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <span>🥧</span> Student Distribution
              </h3>
              {distribution.every(d => d.value === 0) ? (
                <div className="py-12 text-center text-zinc-500 text-sm m-auto">No data yet.</div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                          {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-3 mt-6 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                    {distribution.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-sm font-medium text-zinc-400">{d.name}</span>
                        </div>
                        <span className="font-bold text-white">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Per-session bar chart */}
          {trendData.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
              <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <span>📊</span> Session-wise Attendance (Volume)
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={10} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} iconType="circle" />
                    <Bar dataKey="present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Student Leaderboard */}
          {stats && stats.studentStats.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-800/80">
                <h3 className="text-base font-bold text-white">Student Attendance Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider font-semibold border-b border-zinc-800/80">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Student ID</th>
                      <th className="px-6 py-4">Sessions</th>
                      <th className="px-6 py-4">Percentage</th>
                      <th className="px-6 py-4">Health Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {[...stats.studentStats].sort((a, b) => b.percentage - a.percentage).map((s, i) => (
                      <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4" style={{ background: s.percentage < 50 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                          <div className="font-semibold text-white">{s.student.name}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">{s.student.email}</div>
                        </td>
                        <td className="px-6 py-4" style={{ background: s.percentage < 50 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>{s.student.studentId || '—'}</td>
                        <td className="px-6 py-4 font-medium text-zinc-300" style={{ background: s.percentage < 50 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>{s.attended} / {s.totalSessions}</td>
                        <td className="px-6 py-4" style={{ background: s.percentage < 50 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${s.percentage >= 75 ? 'bg-green-500' : s.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${s.percentage}%` }} />
                            </div>
                            <span className={`font-bold w-9 ${s.percentage >= 75 ? 'text-green-500' : s.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {s.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4" style={{ background: s.percentage < 50 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                          {s.percentage >= 75
                            ? <span className="px-2.5 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[11px] font-bold uppercase tracking-wider">Good</span>
                            : s.percentage >= 50
                            ? <span className="px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[11px] font-bold uppercase tracking-wider">At Risk</span>
                            : <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20 text-[11px] font-bold uppercase tracking-wider">Critical</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
