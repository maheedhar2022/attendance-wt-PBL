import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, coursesAPI } from '../utils/api';
import { format } from 'date-fns';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          coursesAPI.getAll(),
          sessionsAPI.getAll({ limit: 5 })
        ]);
        setCourses(cRes.data.courses);
        setSessions(sRes.data.sessions);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const getAttendanceRate = () => {
    // Mock logic for demo
    return '92%';
  };

  const activeSessions = sessions.filter(s => s.status === 'active');

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading dashboard...</div>;

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Student Overview</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
        <StatCard icon="📚" label="Enrolled Courses" value={courses.length} bg="var(--info-light)" textColor="var(--info)" />
        <StatCard icon="✅" label="Attendance Rate" value={getAttendanceRate()} bg="var(--success-bg)" textColor="var(--success-text)" />
        <StatCard icon="📅" label="Classes Today" value={sessions.length} bg="var(--warning-bg)" textColor="var(--warning-text)" />
        <StatCard icon="🔴" label="Live Now" value={activeSessions.length} bg={activeSessions.length > 0 ? 'var(--danger-bg)' : 'var(--bg-elevated)'} textColor={activeSessions.length > 0 ? 'var(--danger)' : 'var(--text-primary)'} />
      </div>

      <div className="grid-cols-2">
        {/* Active/Upcoming Sessions */}
        <Card title="Today's Classes">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🎉</span>
              <div className="empty-state-title">No classes today</div>
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
                    <div className="text-sm text-muted">{session.course?.title} • {session.startTime}</div>
                  </div>
                  <div>
                    {session.status === 'active' ? (
                      <Link to={`/student/live/${session._id}`} style={{ textDecoration: 'none' }}>
                        <Button size="sm" variant="success">Join Class</Button>
                      </Link>
                    ) : (
                      <Badge variant={session.status}>{session.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* My Courses */}
        <Card title="My Courses" action={<Link to="/student/courses" style={{ textDecoration: 'none' }}><Button variant="ghost" size="sm">View All</Button></Link>}>
          {courses.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📚</span>
              <div className="empty-state-title">Not enrolled</div>
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
                    <div className="text-sm text-muted">{course.instructor?.name || 'Instructor'}</div>
                  </div>
                  <Badge variant="info">{course.code}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
