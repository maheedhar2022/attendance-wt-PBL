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
    const map = { 
      present: 'bg-green-500/10 text-green-400 border-green-500/20', 
      late: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', 
      absent: 'bg-red-500/10 text-red-400 border-red-500/20', 
      excused: 'bg-zoom-blue/10 text-zoom-blue border-zoom-blue/20' 
    };
    return <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase tracking-wider ${map[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{status}</span>;
  };

  return (
    <div className="page-wrapper">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">My Attendance</h1>
          <p className="page-subtitle mb-0">Track your attendance across all courses</p>
        </div>
        <select className="form-select max-w-[240px]" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map(c => <option key={c._id} value={c._id}>{c.title} ({c.code})</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg transition-all">
              <div className="text-[11px] text-zoom-blue font-bold tracking-wider uppercase mb-1">{s.course?.code}</div>
              <div className="text-sm font-semibold text-white truncate mb-3">{s.course?.title}</div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[11px] font-medium text-zinc-500 uppercase">{s.attended} of {s.total} sessions</span>
                <span className={`text-2xl font-bold tracking-tight ${s.percentage >= 75 ? 'text-green-500' : s.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {s.percentage}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${s.percentage >= 75 ? 'bg-green-500' : s.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${s.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Records Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-800/80">
          <h2 className="text-base font-bold text-white">Attendance History</h2>
        </div>
        
        {loading ? (
          <div className="py-12 flex justify-center text-zinc-400 font-medium text-sm"><span className="loading-spinner mr-3"/> Loading records...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="text-4xl mb-4 opacity-80">📋</div>
            <h3 className="text-base font-semibold text-white mb-2">No records yet</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">Attendance is recorded automatically when you attend a live session, or when your instructor marks it manually.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider font-semibold border-b border-zinc-800/80">
                <tr>
                  <th className="px-6 py-4">Session</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {records.map(rec => (
                  <tr key={rec._id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{rec.session?.title || rec.session?.topic || 'Session'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700">{rec.course?.code}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-300">{rec.session?.date ? format(new Date(rec.session.date), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-6 py-4 text-zinc-500">{rec.session?.startTime}</td>
                    <td className="px-6 py-4">{statusBadge(rec.status)}</td>
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
    a.download = `attendance-${selectedSession.title || selectedSession._id}.csv`;
    a.click();
  };

  const statusBadge = (status) => {
    const map = { 
      present: 'bg-green-500/10 text-green-400 border-green-500/20', 
      late: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', 
      absent: 'bg-red-500/10 text-red-400 border-red-500/20', 
      excused: 'bg-zoom-blue/10 text-zoom-blue border-zoom-blue/20' 
    };
    return <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase tracking-wider ${map[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{status}</span>;
  };

  return (
    <div className="page-wrapper max-w-full">
      <div className="mb-8">
        <h1 className="page-title">Attendance Records</h1>
        <p className="page-subtitle mb-0">View and manage student attendance for each session</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Session List */}
        <div className="w-full lg:w-80 flex-shrink-0 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[600px]">
          <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/30">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sessions Timeline</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center text-zinc-500"><span className="loading-spinner" /></div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">No sessions found.</div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {sessions.map(s => (
                  <div key={s._id}
                    onClick={() => viewAttendance(s)}
                    className={`
                      px-5 py-4 cursor-pointer transition-all duration-200 hover:bg-zinc-800/40
                      ${selectedSession?._id === s._id ? 'bg-zoom-blue/5 border-l-4 border-zoom-blue pl-4' : 'border-l-0'}
                    `}
                  >
                    <div className={`text-sm font-bold truncate ${selectedSession?._id === s._id ? 'text-zoom-blue' : 'text-zinc-200'}`}>
                      {s.title || s.topic || 'Session'}
                    </div>
                    <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mt-1.5 flex items-center gap-2">
                      <span className="text-zinc-400">{s.course?.code}</span>
                      {s.date && <span>&bull; {format(new Date(s.date), 'MMM d, yyyy')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Attendance Detail */}
        <div className="flex-1 min-w-0 w-full lg:h-[600px] flex flex-col">
          {!selectedSession ? (
            <div className="h-full bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-center">
              <div className="text-4xl mb-4 opacity-70">👈</div>
              <h3 className="text-lg font-bold text-white mb-2">Select a session</h3>
              <p className="text-sm text-zinc-400 max-w-sm">Click a session on the timeline to view, record, or modify its attendance data.</p>
            </div>
          ) : detailLoading ? (
            <div className="h-full bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
              <span className="loading-spinner w-8 h-8 border-[3px]" />
            </div>
          ) : attendance ? (
            <div className="flex flex-col h-full gap-5">
              
              {/* Stat Summary Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
                {[
                  { label: 'Total', value: attendance.summary.total, color: 'text-white' },
                  { label: 'Present', value: attendance.summary.present, color: 'text-green-500' },
                  { label: 'Late', value: attendance.summary.late, color: 'text-yellow-500' },
                  { label: 'Absent', value: attendance.summary.absent, color: 'text-red-500' },
                ].map(item => (
                  <div key={item.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{item.label}</div>
                    <div className={`text-2xl font-bold tracking-tight ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Table Area */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/30 flex justify-between items-center flex-shrink-0">
                  <h3 className="text-sm font-bold text-white truncate pr-4">
                    {selectedSession.title || 'Attendance'} <span className="text-zinc-500 font-medium ml-2">— {selectedSession.date ? format(new Date(selectedSession.date), 'MMMM d, yyyy') : ''}</span>
                  </h3>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition flex-shrink-0 flex items-center gap-2" onClick={downloadCSV}>
                    ⬇️ Export CSV
                  </button>
                </div>
                
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-900/50 sticky top-0 z-10 text-zinc-400 text-[11px] uppercase tracking-wider font-bold border-b border-zinc-800/80 backdrop-blur-md">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Student</th>
                        <th className="px-6 py-3 font-semibold">ID</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold">Marked At</th>
                        <th className="px-6 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {attendance.present.map(rec => (
                        <tr key={rec._id} className="hover:bg-zinc-800/30">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{rec.student.name}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">{rec.student.email}</div>
                          </td>
                          <td className="px-6 py-4 text-zinc-400 font-medium">{rec.student.studentId || '—'}</td>
                          <td className="px-6 py-4">{statusBadge(rec.status)}</td>
                          <td className="px-6 py-4 text-zinc-500 text-xs font-medium">{format(new Date(rec.markedAt), 'HH:mm')}</td>
                          <td className="px-6 py-4">
                            <select className="form-select py-1.5 px-3 text-xs w-[120px]"
                              value={rec.status}
                              onChange={e => handleUpdateStatus(rec._id, e.target.value)}>
                              {['present', 'late', 'absent', 'excused'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                      {attendance.absent.map(student => (
                        <tr key={student._id} className="bg-red-500/5 hover:bg-red-500/10">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{student.name}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">{student.email}</div>
                          </td>
                          <td className="px-6 py-4 text-zinc-400 font-medium">{student.studentId || '—'}</td>
                          <td className="px-6 py-4">{statusBadge('absent')}</td>
                          <td className="px-6 py-4 text-zinc-600 text-xs">—</td>
                          <td className="px-6 py-4">
                            <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-zoom-blue/90 hover:bg-zoom-blue transition-colors shadow-sm" onClick={async () => {
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

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
