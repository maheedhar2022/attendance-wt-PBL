import { useState, useEffect } from 'react';
import { sessionsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await sessionsAPI.getAll();
      setSessions(res.data.sessions);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const activateSession = async (id) => {
    await sessionsAPI.activate(id, 60);
    loadSessions();
  };

  const closeSession = async (id) => {
    await sessionsAPI.close(id);
    loadSessions();
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const pastSessions = sessions.filter(s => s.status !== 'active');

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading sessions...</div>;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Session Management</h1>
          <p className="page-subtitle">View and manage all class sessions.</p>
        </div>
        {!isStudent && <Button variant="primary">+ Create Session</Button>}
      </div>

      {activeSessions.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--danger)' }}>🔴 Live Now</h2>
          <div className="grid-cols-3">
            {activeSessions.map(session => (
              <Card key={session._id} style={{ borderColor: 'var(--danger)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <Badge variant="danger">LIVE</Badge>
                  {!isStudent && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '2px', color: 'var(--danger)' }}>{session.attendanceCode}</span>}
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{session.topic || session.title}</h3>
                <p className="text-sm text-muted mb-4">{session.course?.title} • {session.startTime}</p>
                
                {isStudent ? (
                  <Link to={`/student/live/${session._id}`} style={{ width: '100%', textDecoration: 'none' }}>
                    <Button variant="danger" style={{ width: '100%' }}>Join Live Class</Button>
                  </Link>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to={`/instructor/live/${session._id}`} style={{ flex: 1, textDecoration: 'none' }}>
                      <Button variant="danger" style={{ width: '100%' }}>Join Video</Button>
                    </Link>
                    <Button variant="outline" onClick={() => closeSession(session._id)}>End</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>All Sessions</h2>
      {pastSessions.length === 0 ? (
        <div className="empty-state">No sessions found.</div>
      ) : (
        <div className="grid-cols-3">
          {pastSessions.map(session => (
            <Card key={session._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <Badge variant={session.status}>{session.status}</Badge>
                <span className="text-sm text-muted">{format(new Date(session.date), 'MMM d, yyyy')}</span>
              </div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{session.title || session.topic}</h3>
              <p className="text-sm text-muted mb-4">{session.course?.code} • {session.startTime} - {session.endTime}</p>
              
              {!isStudent && session.status === 'scheduled' && (
                <Button variant="outline" size="sm" onClick={() => activateSession(session._id)} style={{ width: '100%' }}>Start Session</Button>
              )}
              {session.status === 'closed' && (
                <Button variant="ghost" size="sm" style={{ width: '100%' }}>View Records</Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
