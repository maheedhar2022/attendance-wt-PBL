import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { coursesAPI, usersAPI } from '../utils/api';

function CourseModal({ course, onClose, onSave }) {
  const [form, setForm] = useState(course || { title: '', code: '', description: '', semester: '', academicYear: '', schedule: { days: [], startTime: '', endTime: '' } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const toggleDay = (day) => {
    const days = form.schedule?.days || [];
    const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    setForm(f => ({ ...f, schedule: { ...f.schedule, days: newDays } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (course?._id) await coursesAPI.update(course._id, form);
      else await coursesAPI.create(form);
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh] animate-fade-in">
        <div className="px-6 py-5 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900 rounded-t-2xl sticky top-0 z-10">
          <h2 className="text-lg font-bold text-white">{course?._id ? 'Edit Course' : 'Create Course'}</h2>
          <button className="text-zinc-500 hover:text-zinc-300 transition-colors outline-none" onClick={onClose}>✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {error && <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">{error}</div>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Course Title <span className="text-zoom-blue">*</span></label>
              <input name="title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="form-input" placeholder="e.g. Data Structures & Algorithms" />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Course Code <span className="text-zoom-blue">*</span></label>
              <input name="code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required className="form-input" placeholder="e.g. CS301" />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="form-textarea min-h-[100px]" placeholder="Course description..." />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Semester</label>
                <input value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className="form-input" placeholder="e.g. Spring 2024" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Academic Year</label>
                <input value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} className="form-input" placeholder="e.g. 2023-24" />
              </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Schedule Days</label>
              <div className="flex gap-2 flex-wrap">
                {daysOfWeek.map(day => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all
                      ${(form.schedule?.days || []).includes(day) 
                        ? 'bg-zoom-blue/10 border border-zoom-blue text-zoom-blue shadow-sm shadow-zoom-blue/10' 
                        : 'bg-transparent border border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Time</label>
                <input type="time" value={form.schedule?.startTime || ''} onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule, startTime: e.target.value } }))} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">End Time</label>
                <input type="time" value={form.schedule?.endTime || ''} onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule, endTime: e.target.value } }))} className="form-input" />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-4 pt-5 border-t border-zinc-800/80">
              <button type="button" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition" onClick={onClose}>Cancel</button>
              <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-zoom-blue hover:bg-blue-600 transition shadow-lg shadow-zoom-blue/20 flex items-center justify-center min-w-[120px]" disabled={loading}>
                {loading ? <span className="loading-spinner w-4 h-4 border-[2px]" /> : (course?._id ? 'Save Changes' : 'Create Course')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ManageStudentsModal({ course, onClose, onUpdated }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState('');
  const [enrolled, setEnrolled] = useState(course.students || []);
  const [actionLoading, setActionLoading] = useState('');

  const showMsg = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const search = async (q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await usersAPI.searchStudents(q);
      setResults(res.data.students || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const addStudent = async (student) => {
    setActionLoading(student._id);
    try {
      await usersAPI.addToCourse(course._id, student._id);
      setEnrolled(prev => [...prev, student]);
      showMsg(`✅ ${student.name} added!`);
      onUpdated?.();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to add student');
    } finally { setActionLoading(''); }
  };

  const isEnrolled = (id) => enrolled.some(s => (s._id || s) === id || (s._id || s)?.toString() === id?.toString());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl relative flex flex-col max-h-[85vh] animate-fade-in">
        <div className="px-6 py-5 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><span>👥</span> Manage Students</h2>
          <button className="text-zinc-500 hover:text-zinc-300 transition-colors outline-none" onClick={onClose}>✕</button>
        </div>

        <div className="p-6 overflow-y-auto">
          {toast && <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">{toast}</div>}

          <div className="mb-5 flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-100">{course.title}</span>
            <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase px-2 py-1 bg-zinc-800 rounded-md">
              {enrolled.length} Student{enrolled.length !== 1 ? 's' : ''} Enrolled
            </span>
          </div>

          {/* Search */}
          <div className="space-y-1.5 mb-6">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Search to add students</label>
            <input
              className="form-input"
              placeholder="Name, email, or roll number..."
              value={query}
              onChange={e => search(e.target.value)}
              autoFocus
            />
          </div>

          {/* Search results */}
          {searching && <div className="text-zinc-500 text-sm italic mb-4 flex items-center gap-2"><span className="loading-spinner w-3 h-3" /> Searching directories...</div>}
          
          {!searching && results.length > 0 && (
            <div className="mb-6 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/50">
              <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/80 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Search Results</div>
              <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/50 p-2">
                {results.map(student => {
                  const already = isEnrolled(student._id);
                  return (
                    <div key={student._id} className={`p-3 rounded-lg flex items-center justify-between gap-3 ${already ? 'bg-green-500/5' : 'hover:bg-zinc-800/50'}`}>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-white truncate">{student.name}</div>
                        <div className="text-xs text-zinc-400 truncate mt-0.5">
                          {student.email}
                          {student.studentId && <span className="ml-2 text-zoom-blue">Roll: {student.studentId}</span>}
                        </div>
                      </div>
                      {already ? (
                        <span className="text-[11px] font-bold text-green-500 uppercase flex items-center gap-1"><span>✓</span> Added</span>
                      ) : (
                        <button
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-zoom-blue hover:bg-blue-600 transition flex items-center justify-center min-w-[70px]"
                          disabled={actionLoading === student._id}
                          onClick={() => addStudent(student)}
                        >
                          {actionLoading === student._id ? <span className="loading-spinner w-3 h-3 border-[2px]" /> : '+ Add'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!searching && query && results.length === 0 && (
            <div className="text-zinc-500 text-sm mb-6 text-center py-4 bg-zinc-950/50 rounded-xl border border-zinc-800 border-dashed">No students found matching "{query}"</div>
          )}

          {/* Enrolled students list */}
          {enrolled.length > 0 && (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/50 mt-2">
              <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/80 text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex justify-between">
                <span>Enrolled Roster</span>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-zinc-800/50 p-2">
                {enrolled.map((s, i) => (
                  <div key={s._id || i} className="p-3 flex justify-between items-center bg-transparent rounded-lg hover:bg-zinc-800/30">
                    <span className="text-sm font-semibold text-zinc-200 truncate pr-4">{s.name || s.email || 'Student'}</span>
                    <span className="text-xs font-medium text-zinc-500 truncate bg-zinc-900 px-2.5 py-1 rounded-md">{s.studentId ? `Roll: ${s.studentId}` : s.email || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900 rounded-b-2xl flex justify-end">
          <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'instructor';
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [toast, setToast] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [manageStudentsCourse, setManageStudentsCourse] = useState(null);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await coursesAPI.getAll();
      setCourses(res.data.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this course and all its data?')) return;
    try {
      await coursesAPI.delete(id);
      showToast('Course deleted.');
      loadCourses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete');
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="page-wrapper max-w-full">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-3 max-w-sm animate-fade-in">
          <span>✅</span>
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}
      
      {showModal && (
        <CourseModal
          course={editCourse}
          onClose={() => { setShowModal(false); setEditCourse(null); }}
          onSave={() => { loadCourses(); showToast('Course saved!'); }}
        />
      )}
      
      {manageStudentsCourse && (
        <ManageStudentsModal
          course={manageStudentsCourse}
          onClose={() => setManageStudentsCourse(null)}
          onUpdated={loadCourses}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-subtitle mb-0">{isInstructor ? 'Manage your teaching portfolio' : 'Your enrolled courses'}</p>
        </div>
        {isInstructor && (
          <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-zoom-blue hover:bg-zoom-blue/90 transition shadow-lg shadow-zoom-blue/20 flex gap-2 items-center" onClick={() => { setEditCourse(null); setShowModal(true); }}>
            <span className="text-lg leading-none">+</span> New Course
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-zinc-400 font-medium text-sm"><span className="loading-spinner mr-3" /> Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 px-6 bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl max-w-2xl mx-auto mt-10">
          <div className="text-5xl mb-4 opacity-80">📚</div>
          <h3 className="text-lg font-bold text-white mb-2">No courses yet</h3>
          <p className="text-sm text-zinc-400 mb-6">
            {isInstructor ? "You haven't created any courses. Create one to start scheduling sessions." : "You are not enrolled in any active courses."}
          </p>
          {isInstructor && (
            <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition" onClick={() => { setEditCourse(null); setShowModal(true); }}>
              Create First Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col hover:border-zinc-700 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2.5 py-1 rounded bg-zoom-blue/10 text-zoom-blue border border-zoom-blue/20 text-xs font-bold tracking-wider uppercase">{course.code}</span>
                <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[11px] font-bold tracking-wider uppercase">{course.semester || 'Active'}</span>
              </div>
              
              <div className="mb-5 flex-1">
                <h3 className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-zoom-blue transition-colors">{course.title}</h3>
                {course.description && <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{course.description}</p>}
              </div>
              
              <div className="flex flex-col gap-2.5 text-xs text-zinc-400 font-medium bg-zinc-950/50 p-3.5 rounded-xl border border-zinc-800/50 mb-5">
                <div className="flex items-center gap-3">
                  {isInstructor ? (
                    <span className="flex items-center gap-2"><span className="text-zinc-500">👥</span> {course.students?.length || 0} students</span>
                  ) : (
                    <span className="flex items-center gap-2 truncate"><span className="text-zinc-500">👤</span> Instr. {course.instructor?.name}</span>
                  )}
                  {course.schedule?.days?.length > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                      <span className="flex items-center gap-2"><span className="text-zinc-500">📅</span> {course.schedule.days.join(', ')}</span>
                    </>
                  )}
                </div>
                {course.schedule?.startTime && (
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-zinc-500">⏰</span> {course.schedule.startTime} &mdash; {course.schedule.endTime}
                  </div>
                )}
              </div>
              
              {isInstructor && (
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors border border-zinc-700" onClick={() => setManageStudentsCourse(course)}>👥 Roster</button>
                  <button className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors border border-zinc-700" onClick={() => { setEditCourse(course); setShowModal(true); }}>✏️ Edit</button>
                  <button className="w-10 py-2 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-xs transition-colors border border-red-500/20 ring-0 outline-none" onClick={() => handleDelete(course._id)} title="Delete Course">🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
