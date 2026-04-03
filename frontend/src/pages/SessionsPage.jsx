import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, coursesAPI } from '../utils/api';
import { format } from 'date-fns';

function SessionModal({ session, courses, onClose, onSave }) {
  const [form, setForm] = useState(session || {
    courseId: '', title: '', topic: '', date: '', startTime: '', endTime: '', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (session?._id) {
        await sessionsAPI.update(session._id, form);
      } else {
        await sessionsAPI.create(form);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{session?._id ? 'Edit Session' : 'Create Session'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!session?._id && (
            <div className="form-group">
              <label className="form-label">Course *</label>
              <select name="courseId" value={form.courseId} onChange={handleChange} required className="form-select">
                <option value="">Select course...</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.title} ({c.code})</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Session Title</label>
            <input name="title" value={form.title} onChange={handleChange} className="form-input" placeholder="e.g. Week 3 Lecture" />
          </div>
          <div className="form-group">
            <label className="form-label">Topic</label>
            <input name="topic" value={form.topic} onChange={handleChange} className="form-input" placeholder="What will be covered?" />
          </div>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input type="date" name="date" value={form.date ? form.date.split('T')[0] : ''} onChange={handleChange} required className="form-input" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} className="form-textarea" placeholder="Any additional notes..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="loading-spinner" /> : (session?._id ? 'Save Changes' : 'Create Session')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendanceCodeModal({ session, onClose, onRegenerate }) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(session.attendanceCode);
  const [duration, setDuration] = useState(90);
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await sessionsAPI.activate(session._id, duration);
      setCode(res.data.session.attendanceCode);
      onRegenerate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setActivating(false);
    }
  };

  const handleRegen = async () => {
    setLoading(true);
    try {
      const res = await sessionsAPI.regenCode(session._id);
      setCode(res.data.attendanceCode);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">📋 Attendance Code</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 14 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{session.title || session.topic}</strong>
          <br />{session.course?.title || ''} · {format(new Date(session.date), 'MMM d, yyyy')}
        </div>

        <div className="code-display" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Session Code</div>
          <div className="code-value">{code}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Share this with your students</div>
        </div>

        {session.status !== 'active' && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Duration (minutes)</label>
              <input type="number" className="form-input" value={duration} onChange={e => setDuration(e.target.value)} min={5} max={300} />
            </div>
            <div style={{ paddingTop: 22 }}>
              <button className="btn btn-success" onClick={handleActivate} disabled={activating}>
                {activating ? <span className="loading-spinner" /> : '▶ Activate'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={handleRegen} disabled={loading}>
            {loading ? <span className="loading-spinner" /> : '🔄 New Code'}
          </button>
          {session.status === 'active' && (
            <button className="btn btn-danger" onClick={async () => { await sessionsAPI.close(session._id); onRegenerate?.(); onClose(); }}>
              ⏹ Close Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isInstructor = user?.role === 'instructor';
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [codeModal, setCodeModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [toast, setToast] = useState('');
  const [startingLive, setStartingLive] = useState(null);

  useEffect(() => { loadData(); }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const [sRes, cRes] = await Promise.all([
        sessionsAPI.getAll(params),
        isInstructor ? coursesAPI.getAll() : Promise.resolve({ data: { courses: [] } })
      ]);
      setSessions(sRes.data.sessions);
      setCourses(cRes.data.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this session?')) return;
    try {
      await sessionsAPI.delete(id);
      showToast('Session deleted.');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoLive = (session) => {
    const base = isInstructor ? '/instructor' : '/student';
    navigate(`${base}/live/${session._id}`);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const statusBadge = (status) => {
    const map = { active: 'badge-green', scheduled: 'badge-blue', closed: 'badge-gray', cancelled: 'badge-red' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status === 'active' ? '● ' : ''}{status}</span>;
  };

  const hasLiveSessions = sessions.some(s => s.liveSessionActive);

  return (
    <div className="page-wrapper">
      {toast && <div className="alert alert-success" style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: 340 }}>{toast}</div>}
      {showModal && <SessionModal courses={courses} onClose={() => { setShowModal(false); setEditSession(null); }} onSave={() => { loadData(); showToast('Session saved!'); }} session={editSession} />}
      {codeModal && <AttendanceCodeModal session={codeModal} onClose={() => setCodeModal(null)} onRegenerate={loadData} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">
            Sessions
            {hasLiveSessions && (
              <span className="live-indicator-pill" style={{ marginLeft: 12 }}>
                🔴 Live Now
              </span>
            )}
          </h1>
          <p className="page-subtitle">{isInstructor ? 'Manage your class sessions' : 'Your scheduled class sessions'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
          {isInstructor && (
            <button className="btn btn-primary" onClick={() => { setEditSession(null); setShowModal(true); }}>
              + New Session
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="loading-spinner" /> Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">No sessions found</div>
          <div className="empty-state-desc">{isInstructor ? 'Create your first session using the button above.' : 'No sessions scheduled yet.'}</div>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map(session => (
            <div key={session._id} className={`session-card ${session.status === 'active' ? 'active-session' : ''} ${session.liveSessionActive ? 'live-session-card' : ''}`}>
              {/* Live pulse banner */}
              {session.liveSessionActive && (
                <div className="live-card-banner">
                  <span className="pulse-dot" />
                  <span>Live in progress</span>
                </div>
              )}

              <div className="session-meta">
                {statusBadge(session.status)}
                <span className="session-course">{session.course?.code}</span>
              </div>
              <div>
                <div className="session-title">{session.title || session.topic || 'Class Session'}</div>
                {session.topic && session.title && <div className="session-topic">{session.topic}</div>}
              </div>
              <div className="session-time">
                📅 {format(new Date(session.date), 'EEEE, MMM d yyyy')}
                <br />⏰ {session.startTime} – {session.endTime}
              </div>

              {session.status === 'active' && !session.liveSessionActive && (
                <div className="code-display" style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ATTENDANCE CODE</div>
                  <div className="code-value" style={{ fontSize: 28, letterSpacing: 6 }}>{session.attendanceCode}</div>
                </div>
              )}

              {/* Live / Join Live button */}
              <div className="session-live-action">
                {isInstructor ? (
                  session.liveSessionActive ? (
                    <button className="btn btn-sm live-rejoin-btn" onClick={() => handleGoLive(session)}>
                      🔴 Manage Live Session
                    </button>
                  ) : (
                    <button className="btn btn-sm go-live-btn" onClick={() => handleGoLive(session)}>
                      🎥 Go Live
                    </button>
                  )
                ) : (
                  session.liveSessionActive && (
                    <button className="btn btn-sm join-live-btn" onClick={() => handleGoLive(session)}>
                      🎥 Join Live
                    </button>
                  )
                )}
              </div>

              {isInstructor && (
                <div className="session-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => setCodeModal(session)}>🔑 Code</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditSession({ _id: session._id, courseId: session.course?._id, title: session.title || '', topic: session.topic || '', date: session.date ? session.date.split('T')[0] : '', startTime: session.startTime || '', endTime: session.endTime || '', notes: session.notes || '' }); setShowModal(true); }}>✏️ Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(session._id)}>🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
