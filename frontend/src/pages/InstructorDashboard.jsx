import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, coursesAPI } from '../utils/api';
import { format } from 'date-fns';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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
      loadData();
    } catch (err) { console.error(err); }
  };

  const closeSession = async (id) => {
    try {
      await sessionsAPI.close(id);
      loadData();
    } catch (err) { console.error(err); }
  };

  const totalStudents = courses.reduce((s, c) => s + (c.students?.length || 0), 0);
  const activeSessions = recentSessions.filter(s => s.status === 'active').length;

  if (loading) return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading dashboard...</div>
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button variant="primary" onClick={() => {}}>+ New Session</Button>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
        <StatCard icon="📚" label="Total Courses" value={courses.length} bg="var(--info-light)" textColor="var(--info)" />
        <StatCard icon="🎓" label="Total Students" value={totalStudents} bg="var(--success-bg)" textColor="var(--success-text)" />
        <StatCard icon="📅" label="Upcoming Classes" value={sessions.length} bg="var(--warning-bg)" textColor="var(--warning-text)" />
        <StatCard icon="🔴" label="Active Right Now" value={activeSessions} bg={activeSessions > 0 ? 'var(--danger-bg)' : 'var(--bg-elevated)'} textColor={activeSessions > 0 ? 'var(--danger)' : 'var(--text-primary)'} />
      </div>

      <div className="grid-cols-2">
        {/* Manage Sessions Card */}
        <Card title="Today's Sessions">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">☕</span>
              <div className="empty-state-title">No sessions today</div>
              <div className="empty-state-desc">Enjoy your free time or schedule a new class.</div>
            </div>
          ) : (
            <div className="flex" style={{ flexDirection: 'column', gap: '12px' }}>
              {sessions.map(session => (
                <div key={session._id} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '16px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
                  background: session.status === 'active' ? 'var(--success-bg)' : 'transparent'
                }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{session.title || session.topic}</h3>
                    <div className="text-sm text-muted">{session.course?.code} • {session.startTime}</div>
                    {session.status === 'active' && (
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--success-text)' }}>
                        Attendance Code: <span style={{ letterSpacing: '2px' }}>{session.attendanceCode}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    {session.status === 'active' ? (
                      <Button size="sm" variant="danger" onClick={() => closeSession(session._id)}>End Class</Button>
                    ) : session.status === 'scheduled' ? (
                      <Button size="sm" variant="success" onClick={() => activateSession(session._id)}>Start Class</Button>
                    ) : (
                      <Badge variant={session.status}>{session.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* My Courses Card */}
        <Card title="My Courses" action={<Button variant="ghost" size="sm">View All</Button>}>
          {courses.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📚</span>
              <div className="empty-state-title">No courses found</div>
              <div className="empty-state-desc">You are not assigned to any courses yet.</div>
            </div>
          ) : (
            <div className="flex" style={{ flexDirection: 'column', gap: '12px' }}>
              {courses.map(course => (
                <div key={course._id} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '16px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)'
                }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{course.title}</h3>
                    <div className="text-sm text-muted">{course.code} • {course.students?.length || 0} enrolled</div>
                  </div>
                  <Badge variant="info">{course.semester || 'Active'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
