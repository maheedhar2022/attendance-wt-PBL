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
    if (pct >= 75) return 'var(--green)';
    if (pct >= 50) return 'var(--yellow)';
    return 'var(--red)';
  };

  if (loading) return (
    <div className="page-wrapper">
      <div className="page-loader"><div className="loading-spinner" /> Loading dashboard...</div>
    </div>
  );

  return (
    <div className="page-wrapper">
      {toast && <div className="alert alert-success" style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: 320 }}>{toast}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-glow)', fontSize: 20 }}>📚</div>
          <div>
            <div className="stat-label">Enrolled Courses</div>
            <div className="stat-value">{courses.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--green-bg)', fontSize: 20 }}>🎯</div>
          <div>
            <div className="stat-label">Overall Attendance</div>
            <div className="stat-value" style={{ color: getPercentageColor(overallPercentage) }}>
              {overallPercentage}%
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--purple-bg)', fontSize: 20 }}>📅</div>
          <div>
            <div className="stat-label">Upcoming Sessions</div>
            <div className="stat-value">{upcomingSessions.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--yellow-bg)', fontSize: 20 }}>⚠️</div>
          <div>
            <div className="stat-label">Low Attendance</div>
            <div className="stat-value" style={{ color: 'var(--yellow)' }}>
              {attendanceStats.filter(s => s.percentage < 75).length}
            </div>
            <div className="stat-sub">courses below 75%</div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        {/* Upcoming Sessions */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            📅 Upcoming Sessions
          </h2>
          {upcomingSessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <div className="empty-state-title">All caught up!</div>
              <div className="empty-state-desc">No upcoming sessions scheduled.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingSessions.map(session => (
                <div key={session._id} style={{
                  padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      {session.title || session.topic || 'Class Session'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {session.course?.code} • {format(new Date(session.date), 'MMM d')} at {session.startTime}
                    </div>
                  </div>
                  <div>
                    {session.status === 'active'
                      ? <span className="badge badge-green">● Live</span>
                      : <span className="badge badge-gray">{formatDistanceToNow(new Date(session.date), { addSuffix: true })}</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course Attendance */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            📊 Attendance by Course
          </h2>
          {attendanceStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No records yet</div>
              <div className="empty-state-desc">Attendance records will appear here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {attendanceStats.map((stat, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {stat.course?.title}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                        {stat.attended}/{stat.total}
                      </span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: getPercentageColor(stat.percentage) }}>
                      {stat.percentage}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${stat.percentage >= 75 ? 'high' : stat.percentage >= 50 ? 'medium' : 'low'}`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  {stat.percentage < 75 && (
                    <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                      ⚠️ Below 75% threshold
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
