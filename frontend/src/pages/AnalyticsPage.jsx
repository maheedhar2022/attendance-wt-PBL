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
    { name: '≥75% (Good)', value: stats.studentStats.filter(s => s.percentage >= 75).length, color: '#34d399' },
    { name: '50–74% (At Risk)', value: stats.studentStats.filter(s => s.percentage >= 50 && s.percentage < 75).length, color: '#fbbf24' },
    { name: '<50% (Critical)', value: stats.studentStats.filter(s => s.percentage < 50).length, color: '#f87171' },
  ] : [];

  const tooltipStyle = { background: '#161920', border: '1px solid #1f2430', borderRadius: 8, color: '#f0f2f8', fontSize: 13 };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Attendance trends and insights</p>
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 220 }}
          value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
          {courses.map(c => <option key={c._id} value={c._id}>{c.title} ({c.code})</option>)}
        </select>
      </div>

      {coursesLoading ? (
        <div className="page-loader"><div className="loading-spinner" /></div>
      ) : courses.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">No courses found</div></div>
      ) : loading ? (
        <div className="page-loader"><div className="loading-spinner" /> Loading analytics...</div>
      ) : (
        <>
          {/* Overview Cards */}
          {stats && (
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--accent-glow)' }}>📅</div>
                <div className="stat-label">Total Sessions</div>
                <div className="stat-value">{stats.totalSessions}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--green-bg)' }}>✅</div>
                <div className="stat-label">Avg Attendance</div>
                <div className="stat-value" style={{ color: 'var(--green)' }}>
                  {stats.studentStats.length > 0
                    ? Math.round(stats.studentStats.reduce((s, c) => s + c.percentage, 0) / stats.studentStats.length)
                    : 0}%
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--red-bg)' }}>⚠️</div>
                <div className="stat-label">At Risk Students</div>
                <div className="stat-value" style={{ color: 'var(--red)' }}>
                  {stats.studentStats.filter(s => s.percentage < 75).length}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--purple-bg)' }}>🎓</div>
                <div className="stat-label">Total Students</div>
                <div className="stat-value">{stats.studentStats.length}</div>
              </div>
            </div>
          )}

          <div className="content-grid" style={{ marginBottom: 20 }}>
            {/* Trend Line Chart */}
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
                📈 Attendance Trend
              </h3>
              {trendData.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}><div className="empty-state-desc">No session data yet.</div></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" />
                    <XAxis dataKey="name" tick={{ fill: '#8b95a8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8b95a8', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="rate" name="Attendance %" stroke="#6c8fff" strokeWidth={2.5} dot={{ fill: '#6c8fff', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Distribution Pie */}
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
                🥧 Student Distribution
              </h3>
              {distribution.every(d => d.value === 0) ? (
                <div className="empty-state" style={{ padding: 32 }}><div className="empty-state-desc">No data yet.</div></div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {distribution.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.name}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: d.color }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Per-session bar chart */}
          {trendData.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
                📊 Session-wise Present vs Absent
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" />
                  <XAxis dataKey="name" tick={{ fill: '#8b95a8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8b95a8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 13, color: 'var(--text-secondary)' }} />
                  <Bar dataKey="present" name="Present" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Student Leaderboard */}
          {stats && stats.studentStats.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>Student Attendance Breakdown</h3>
              </div>
              <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Sessions Attended</th>
                      <th>Percentage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...stats.studentStats].sort((a, b) => b.percentage - a.percentage).map((s, i) => (
                      <tr key={i}>
                        <td>
                          <strong>{s.student.name}</strong>
                          <br /><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.student.email}</span>
                        </td>
                        <td>{s.student.studentId || '—'}</td>
                        <td>{s.attended} / {s.totalSessions}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="progress-bar" style={{ width: 80 }}>
                              <div className={`progress-fill ${s.percentage >= 75 ? 'high' : s.percentage >= 50 ? 'medium' : 'low'}`} style={{ width: `${s.percentage}%` }} />
                            </div>
                            <span style={{ fontWeight: 700, color: s.percentage >= 75 ? 'var(--green)' : s.percentage >= 50 ? 'var(--yellow)' : 'var(--red)', fontSize: 14 }}>
                              {s.percentage}%
                            </span>
                          </div>
                        </td>
                        <td>
                          {s.percentage >= 75
                            ? <span className="badge badge-green">Good</span>
                            : s.percentage >= 50
                            ? <span className="badge badge-yellow">At Risk</span>
                            : <span className="badge badge-red">Critical</span>
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
