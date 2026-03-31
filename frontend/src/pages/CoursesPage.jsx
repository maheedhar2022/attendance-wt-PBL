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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{course?._id ? 'Edit Course' : 'Create Course'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Course Title *</label>
            <input name="title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="form-input" placeholder="e.g. Data Structures & Algorithms" />
          </div>
          <div className="form-group">
            <label className="form-label">Course Code *</label>
            <input name="code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required className="form-input" placeholder="e.g. CS301" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="form-textarea" placeholder="Course description..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Semester</label>
              <input value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className="form-input" placeholder="e.g. Spring 2024" />
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <input value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} className="form-input" placeholder="e.g. 2023-24" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Schedule Days</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {daysOfWeek.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: '1px solid',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: (form.schedule?.days || []).includes(day) ? 'var(--accent)' : 'var(--border-light)',
                    background: (form.schedule?.days || []).includes(day) ? 'var(--accent-glow)' : 'transparent',
                    color: (form.schedule?.days || []).includes(day) ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="time" value={form.schedule?.startTime || ''} onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule, startTime: e.target.value } }))} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input type="time" value={form.schedule?.endTime || ''} onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule, endTime: e.target.value } }))} className="form-input" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="loading-spinner" /> : (course?._id ? 'Save' : 'Create Course')}
            </button>
          </div>
        </form>
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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540, width: '95vw' }}>
        <div className="modal-header">
          <h2 className="modal-title">👥 Manage Students — {course.title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {toast && <div className="alert alert-success" style={{ marginBottom: 12 }}>{toast}</div>}

        {/* Enrolled count */}
        <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
          {enrolled.length} student{enrolled.length !== 1 ? 's' : ''} currently enrolled
        </div>

        {/* Search */}
        <div className="form-group">
          <label className="form-label">Search by name, email or roll number</label>
          <input
            className="form-input"
            placeholder="e.g. Ravi, ravi@college.edu, 21CS045..."
            value={query}
            onChange={e => search(e.target.value)}
            autoFocus
          />
        </div>

        {/* Search results */}
        {searching && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Searching...</div>}
        {!searching && results.length > 0 && (
          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {results.map(student => {
              const already = isEnrolled(student._id);
              return (
                <div key={student._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  border: already ? '1px solid var(--green)' : '1px solid var(--border-light)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {student.email}
                      {student.studentId && <span style={{ marginLeft: 8, color: 'var(--accent)' }}>Roll: {student.studentId}</span>}
                      {student.department && <span style={{ marginLeft: 8 }}>{student.department}</span>}
                    </div>
                  </div>
                  {already ? (
                    <span className="badge badge-green">✓ Enrolled</span>
                  ) : (
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={actionLoading === student._id}
                      onClick={() => addStudent(student)}
                    >
                      {actionLoading === student._id ? <span className="loading-spinner" /> : '+ Add'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!searching && query && results.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>No students found for "{query}"</div>
        )}

        {/* Enrolled students list */}
        {enrolled.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Enrolled Students
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {enrolled.map((s, i) => (
                <div key={s._id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.name || s.email || 'Student'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.studentId ? `Roll: ${s.studentId}` : s.email || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
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
  const [enrollCode, setEnrollCode] = useState('');
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

  const handleEnroll = async (courseId) => {
    setEnrolling(true);
    try {
      await coursesAPI.enroll(courseId);
      showToast('Enrolled successfully! ✅');
      loadCourses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="page-wrapper">
      {toast && <div className="alert alert-success" style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: 340 }}>{toast}</div>}
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

      <div className="page-header">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-subtitle">{isInstructor ? 'Manage your courses' : 'Your enrolled courses'}</p>
        </div>
        {isInstructor && (
          <button className="btn btn-primary" onClick={() => { setEditCourse(null); setShowModal(true); }}>
            + New Course
          </button>
        )}
      </div>

      {loading ? (
        <div className="page-loader"><div className="loading-spinner" /> Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-title">No courses yet</div>
          <div className="empty-state-desc">
            {isInstructor ? 'Create your first course above.' : 'You are not enrolled in any courses yet.'}
          </div>
        </div>
      ) : (
        <div className="sessions-grid">
          {courses.map(course => (
            <div key={course._id} className="session-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge badge-blue">{course.code}</span>
                <span className="badge badge-gray">{course.semester || 'Active'}</span>
              </div>
              <div>
                <div className="session-title">{course.title}</div>
                {course.description && <div className="session-topic">{course.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                {isInstructor ? (
                  <>
                    <span>👥 {course.students?.length || 0} students</span>
                    {course.schedule?.days?.length > 0 && (
                      <span>📅 {course.schedule.days.join(', ')}</span>
                    )}
                  </>
                ) : (
                  <span>👤 {course.instructor?.name}</span>
                )}
              </div>
              {course.schedule?.startTime && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  ⏰ {course.schedule.startTime} – {course.schedule.endTime}
                </div>
              )}
              {isInstructor && (
                <div className="session-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => setManageStudentsCourse(course)}>👥 Students</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditCourse(course); setShowModal(true); }}>✏️ Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(course._id)}>🗑 Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
