import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, sessionsAPI, coursesAPI } from '../utils/api';
import { format } from 'date-fns';

export default function AttendancePage() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'instructor';

  return isInstructor ? <InstructorAttendance /> : <StudentAttendance />;
}

// ── Student View ─────────────────────────────────────────────────
function StudentAttendance() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('');
  const [courses, setCourses] = useState([]);

  useEffect(() => { loadData(); }, [filterCourse]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCourse) params.courseId = filterCourse;
      const [attRes, cRes] = await Promise.all([
        attendanceAPI.getMy(params),
        coursesAPI.getAll()
      ]);
      setRecords(attRes.data.records);
      setStats(attRes.data.stats);
      setCourses(cRes.data.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const map = { present: 'badge-green', late: 'badge-yellow', absent: 'badge-red', excused: 'badge-blue' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Attendance</h1>
          <p className="page-subtitle">Track your attendance across all courses</p>
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map(c => <option key={c._id} value={c._id}>{c.title} ({c.code})</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      {stats.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{s.course?.code}</div>
              <div className="stat-label">{s.course?.title}</div>
              <div className="stat-value" style={{ color: s.percentage >= 75 ? 'var(--green)' : s.percentage >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                {s.percentage}%
              </div>
              <div className="progress-bar">
                <div className={`progress-fill ${s.percentage >= 75 ? 'high' : s.percentage >= 50 ? 'medium' : 'low'}`} style={{ width: `${s.percentage}%` }} />
              </div>
              <div className="stat-sub">{s.attended} of {s.total} sessions</div>
            </div>
          ))}
        </div>
      )}

      {/* Records Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Attendance History</h2>
        </div>
        {loading ? (
          <div className="page-loader"><div className="loading-spinner" /></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No records yet</div>
            <div className="empty-state-desc">Mark attendance when your instructor opens a session.</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Course</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec._id}>
                    <td><strong>{rec.session?.title || rec.session?.topic || 'Session'}</strong></td>
                    <td><span className="badge badge-blue">{rec.course?.code}</span></td>
                    <td>{rec.session?.date ? format(new Date(rec.session.date), 'MMM d, yyyy') : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{rec.session?.startTime}</td>
                    <td>{statusBadge(rec.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Instructor View ──────────────────────────────────────────────
function InstructorAttendance() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await sessionsAPI.getAll({});
      setSessions(res.data.sessions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewAttendance = async (session) => {
    setSelectedSession(session);
    setDetailLoading(true);
    try {
      const res = await attendanceAPI.getSession(session._id);
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (attendanceId, status) => {
    try {
      await attendanceAPI.update(attendanceId, { status });
      viewAttendance(selectedSession);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadCSV = () => {
    if (!attendance) return;
    const rows = [
      ['Student', 'Email', 'Student ID', 'Status', 'Marked At'],
      ...attendance.present.map(r => [r.student.name, r.student.email, r.student.studentId || '', r.status, format(new Date(r.markedAt), 'yyyy-MM-dd HH:mm')]),
      ...attendance.absent.map(s => [s.name, s.email, s.studentId || '', 'absent', ''])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedSession.attendanceCode}.csv`;
    a.click();
  };

  const statusBadge = (status) => {
    const map = { present: 'badge-green', late: 'badge-yellow', absent: 'badge-red', excused: 'badge-blue' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Records</h1>
          <p className="page-subtitle">View and manage student attendance for each session</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        {/* Session List */}
        <div className="card" style={{ padding: 0, alignSelf: 'start' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>Sessions</h3>
          </div>
          {loading ? (
            <div className="page-loader" style={{ height: 120 }}><div className="loading-spinner" /></div>
          ) : sessions.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>No sessions found.</div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {sessions.map(s => (
                <div key={s._id}
                  onClick={() => viewAttendance(s)}
                  style={{
                    padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: selectedSession?._id === s._id ? 'var(--accent-glow)' : 'transparent',
                    transition: 'background 0.15s'
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: selectedSession?._id === s._id ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {s.title || s.topic || 'Session'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {s.course?.code} · {s.date ? format(new Date(s.date), 'MMM d') : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance Detail */}
        <div>
          {!selectedSession ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">👈</div>
                <div className="empty-state-title">Select a session</div>
                <div className="empty-state-desc">Click a session on the left to view its attendance records.</div>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="card"><div className="page-loader"><div className="loading-spinner" /></div></div>
          ) : attendance ? (
            <>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total', value: attendance.summary.total, color: 'var(--text-primary)' },
                  { label: 'Present', value: attendance.summary.present, color: 'var(--green)' },
                  { label: 'Late', value: attendance.summary.late, color: 'var(--yellow)' },
                  { label: 'Absent', value: attendance.summary.absent, color: 'var(--red)' },
                ].map(item => (
                  <div key={item.label} className="stat-card" style={{ padding: 16 }}>
                    <div className="stat-label">{item.label}</div>
                    <div className="stat-value" style={{ color: item.color, fontSize: 22 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>
                    {selectedSession.title || 'Attendance'} — {selectedSession.date ? format(new Date(selectedSession.date), 'MMM d, yyyy') : ''}
                  </h3>
                  <button className="btn btn-sm btn-secondary" onClick={downloadCSV}>⬇️ Export CSV</button>
                </div>
                <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                  <table>
                    <thead><tr><th>Student</th><th>ID</th><th>Status</th><th>Marked At</th><th>Actions</th></tr></thead>
                    <tbody>
                      {attendance.present.map(rec => (
                        <tr key={rec._id}>
                          <td><strong>{rec.student.name}</strong><br /><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rec.student.email}</span></td>
                          <td>{rec.student.studentId || '—'}</td>
                          <td>{statusBadge(rec.status)}</td>
                          <td style={{ fontSize: 12 }}>{format(new Date(rec.markedAt), 'HH:mm')}</td>
                          <td>
                            <select className="form-select" style={{ padding: '4px 8px', fontSize: 12 }}
                              value={rec.status}
                              onChange={e => handleUpdateStatus(rec._id, e.target.value)}>
                              {['present', 'late', 'absent', 'excused'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                      {attendance.absent.map(student => (
                        <tr key={student._id} style={{ background: 'rgba(248,113,113,0.04)' }}>
                          <td><strong>{student.name}</strong><br /><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{student.email}</span></td>
                          <td>{student.studentId || '—'}</td>
                          <td>{statusBadge('absent')}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</td>
                          <td>
                            <button className="btn btn-sm btn-success" onClick={async () => {
                              await attendanceAPI.addManual({ sessionId: selectedSession._id, studentId: student._id, status: 'excused' });
                              viewAttendance(selectedSession);
                            }}>Mark Excused</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
