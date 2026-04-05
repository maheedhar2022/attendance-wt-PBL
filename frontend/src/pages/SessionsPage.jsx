import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, coursesAPI } from '../utils/api';
import { format } from 'date-fns';
import AddToCalendarBtn from '../components/shared/AddToCalendarBtn';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh] animate-fade-in">
        <div className="px-6 py-5 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900 rounded-t-2xl sticky top-0 z-10">
          <h2 className="text-lg font-bold text-white">{session?._id ? 'Edit Session' : 'Create Session'}</h2>
          <button className="text-zinc-500 hover:text-zinc-300 transition-colors outline-none" onClick={onClose}>✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {error && <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">{error}</div>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {!session?._id && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Course <span className="text-zoom-blue">*</span></label>
                <select name="courseId" value={form.courseId} onChange={handleChange} required className="form-select">
                  <option value="">Select course...</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.title} ({c.code})</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Session Title</label>
              <input name="title" value={form.title} onChange={handleChange} className="form-input" placeholder="e.g. Week 3 Lecture" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Topic</label>
              <input name="topic" value={form.topic} onChange={handleChange} className="form-input" placeholder="What will be covered?" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date <span className="text-zoom-blue">*</span></label>
              <input type="date" name="date" value={form.date ? form.date.split('T')[0] : ''} onChange={handleChange} required className="form-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Time <span className="text-zoom-blue">*</span></label>
                <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">End Time <span className="text-zoom-blue">*</span></label>
                <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required className="form-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} className="form-textarea min-h-[100px]" placeholder="Any additional notes..." />
            </div>
            
            <div className="flex gap-3 justify-end mt-4 pt-5 border-t border-zinc-800/80">
              <button type="button" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition" onClick={onClose}>Cancel</button>
              <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-zoom-blue hover:bg-blue-600 transition shadow-lg shadow-zoom-blue/20 flex items-center justify-center min-w-[120px]" disabled={loading}>
                {loading ? <span className="loading-spinner w-4 h-4 border-[2px]" /> : (session?._id ? 'Save Changes' : 'Create Session')}
              </button>
            </div>
          </form>
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
  const [filterStatus, setFilterStatus] = useState('');
  const [toast, setToast] = useState('');

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
    const map = { active: 'bg-green-500/10 text-green-400 border-green-500/20', scheduled: 'bg-zoom-blue/10 text-zoom-blue border-zoom-blue/20', closed: 'bg-zinc-800 text-zinc-400 border-zinc-700', cancelled: 'bg-red-500/10 text-red-500 border-red-500/20' };
    return <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 w-max ${map[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>}{status}</span>;
  };

  const hasLiveSessions = sessions.some(s => s.liveSessionActive);

  return (
    <div className="page-wrapper max-w-full">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-3 max-w-sm animate-fade-in">
          <span>✅</span>
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}
      
      {showModal && <SessionModal courses={courses} onClose={() => { setShowModal(false); setEditSession(null); }} onSave={() => { loadData(); showToast('Session saved!'); }} session={editSession} />}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title flex items-center gap-3">
            Sessions
            {hasLiveSessions && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Live Now
              </span>
            )}
          </h1>
          <p className="page-subtitle mb-0">{isInstructor ? 'Manage your class sessions' : 'Your scheduled class sessions'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="form-select max-w-[200px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
          {isInstructor && (
            <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-zoom-blue hover:bg-zoom-blue/90 transition shadow-lg shadow-zoom-blue/20 flex gap-2 items-center whitespace-nowrap" onClick={() => { setEditSession(null); setShowModal(true); }}>
              <span className="text-lg leading-none">+</span> New Session
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-zinc-400 font-medium text-sm"><span className="loading-spinner mr-3" /> Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 px-6 bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl max-w-2xl mx-auto mt-10">
          <div className="text-5xl mb-4 opacity-80">📅</div>
          <h3 className="text-lg font-bold text-white mb-2">No sessions found</h3>
          <p className="text-sm text-zinc-400 mb-6">{isInstructor ? 'Create your first session using the button above.' : 'No sessions scheduled yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map(session => (
            <div key={session._id} className={`bg-zinc-900 border rounded-2xl flex flex-col transition-all relative overflow-hidden group
              ${session.status === 'active' ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.05)]' : 'border-zinc-800 hover:border-zinc-700'}
            `}>
              {/* Live Card Banner */}
              {session.liveSessionActive && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-pink-500 to-red-500 blur-[1px]"></div>
              )}

              <div className="p-6 flex-1 flex flex-col relative z-10">
                {session.liveSessionActive && (
                  <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span> Live in progress</span>
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  {statusBadge(session.status)}
                  <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider">{session.course?.code}</span>
                </div>
                
                <div className="mb-5 flex-1">
                  <h3 className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-zoom-blue transition-colors">{session.title || session.topic || 'Class Session'}</h3>
                  {session.topic && session.title && <p className="text-sm text-zinc-400 leading-relaxed font-medium">{session.topic}</p>}
                </div>
                
                <div className="flex flex-col gap-2.5 text-xs text-zinc-400 font-medium bg-zinc-950/50 p-3.5 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-zinc-500">📅</span> {format(new Date(session.date), 'EEEE, MMM d yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-zinc-500">⏰</span> {session.startTime} &mdash; {session.endTime}
                  </div>
                </div>
              </div>

              {/* Action Buttons row (anchored to bottom) */}
              {(isInstructor || session.liveSessionActive) && (
                <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-950 flex flex-wrap gap-2 text-xs font-bold">
                  {isInstructor ? (
                    session.liveSessionActive ? (
                      <button className="flex-1 py-2 px-3 rounded-lg bg-red-500 flex items-center justify-center gap-2 text-white hover:bg-red-600 transition disabled:opacity-50 border border-red-400/50" onClick={() => handleGoLive(session)}>
                        🔴 Manage Live
                      </button>
                    ) : (
                      <button className="flex-1 py-2 px-3 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center gap-2 text-white transition border border-zinc-700 group-hover:border-zoom-blue/50 group-hover:text-zoom-blue" onClick={() => handleGoLive(session)}>
                        🎥 Go Live
                      </button>
                    )
                  ) : (
                    session.liveSessionActive && (
                      <button className="flex-1 py-2 px-3 rounded-lg bg-zoom-blue flex items-center justify-center gap-2 text-white hover:bg-blue-600 transition shadow-lg shadow-zoom-blue/20" onClick={() => handleGoLive(session)}>
                        🎥 Join Live Room
                      </button>
                    )
                  )}

                  {/* Add to Calendar — always visible for non-closed sessions */}
                  {session.status !== 'closed' && (
                    <AddToCalendarBtn session={session} compact />
                  )}
                  {isInstructor && (
                    <>
                      <button className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition border border-zinc-700" onClick={() => { setEditSession({ _id: session._id, courseId: session.course?._id, title: session.title || '', topic: session.topic || '', date: session.date ? session.date.split('T')[0] : '', startTime: session.startTime || '', endTime: session.endTime || '', notes: session.notes || '' }); setShowModal(true); }}>
                        ✏️ Edit
                      </button>
                      <button className="px-3 py-2 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition border border-red-500/20" onClick={() => handleDelete(session._id)} title="Delete Session">
                        🗑
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
