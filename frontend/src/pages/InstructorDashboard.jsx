import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, coursesAPI, attendanceAPI } from '../utils/api';
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
    <div className="page-wrapper">
      <div className="page-loader"><div className="loading-spinner" /> Loading...</div>
    </div>
  );

  return (
    <div className="page-wrapper">
      {toast && <div className="alert alert-success" style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: 340 }}>{toast}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Instructor Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name} · {format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-glow)' }}>📚</div>
          <div className="stat-label">Total Courses</div>
          <div className="stat-value">{courses.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--green-bg)' }}>🎓</div>
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{totalStudents}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--purple-bg)' }}>📅</div>
          <div className="stat-label">Upcoming Sessions</div>
          <div className="stat-value">{sessions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: activeSessions > 0 ? 'var(--green-bg)' : 'var(--bg-elevated)' }}>🔴</div>
          <div className="stat-label">Active Now</div>
          <div className="stat-value" style={{ color: activeSessions > 0 ? 'var(--green)' : 'var(--text-primary)' }}>{activeSessions}</div>
        </div>
      </div>

      <div className="content-grid">
        {/* Upcoming Sessions */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            📅 Manage Sessions
          </h2>
          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No sessions yet</div>
              <div className="empty-state-desc">Go to Sessions to create your first class session.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map(session => (
                <div key={session._id} style={{
                  padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  border: session.status === 'active' ? '1px solid var(--green)' : '1px solid transparent'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                        {session.title || session.topic || 'Class Session'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {session.course?.code} · {format(new Date(session.date), 'MMM d')} {session.startTime}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {session.status === 'active' ? (
                        <button className="btn btn-sm btn-danger" onClick={() => closeSession(session._id)}>Close</button>
                      ) : session.status === 'scheduled' ? (
                        <button className="btn btn-sm btn-success" onClick={() => activateSession(session._id)}>▶ Start</button>
                      ) : (
                        <span className="badge badge-gray">{session.status}</span>
                      )}
                    </div>
                  </div>
                  {session.status === 'active' && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--green-bg)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--green)' }}>● Attendance Open</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: 4, color: 'var(--green)' }}>
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
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            📚 My Courses
          </h2>
          {courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <div className="empty-state-title">No courses yet</div>
              <div className="empty-state-desc">Create your first course from the Courses page.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {courses.map(course => (
                <div key={course._id} style={{
                  padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{course.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {course.code} · {course.students?.length || 0} students
                    </div>
                  </div>
                  <span className="badge badge-blue">{course.semester || 'Active'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
