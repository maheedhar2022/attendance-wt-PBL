import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', studentId: '', department: '' });
  const [error, setError] = useState('');
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = mode === 'login'
      ? await login(form.email, form.password)
      : await register(form);

    if (result.success) {
      const user = JSON.parse(localStorage.getItem('user'));
      navigate(user.role === 'instructor' ? '/instructor' : '/student');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#fff' }}>AX</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>AttendX</span>
        </div>

        <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Sign in to your attendance portal' : 'Join the digital attendance system'}
        </p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">I am a</label>
                <div className="role-selector">
                  {['student', 'instructor'].map(role => (
                    <span key={role}>
                      <input
                        type="radio" id={`role-${role}`} name="role"
                        value={role} checked={form.role === role}
                        onChange={handleChange} className="role-option"
                      />
                      <label htmlFor={`role-${role}`} className="role-label">
                        {role === 'student' ? '🎓' : '📖'} {role.charAt(0).toUpperCase() + role.slice(1)}
                      </label>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  className="form-input" placeholder="Your full name" />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input name="department" value={form.department} onChange={handleChange}
                  className="form-input" placeholder="e.g. Computer Science" />
              </div>

              {form.role === 'student' && (
                <div className="form-group">
                  <label className="form-label">Student ID</label>
                  <input name="studentId" value={form.studentId} onChange={handleChange}
                    className="form-input" placeholder="e.g. CS2021001" />
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              required className="form-input" placeholder="you@example.com" />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange}
              required className="form-input" placeholder="••••••••" minLength={6} />
          </div>

          {mode === 'login' && (
            <div style={{ padding: '8px 12px', background: 'var(--accent-glow)', borderRadius: 8, fontSize: 13, color: 'var(--accent)' }}>
              💡 Demo: instructor@demo.com / alice@demo.com — password: password123
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <span className="loading-spinner" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>Don't have an account? <a onClick={() => { setMode('register'); setError(''); }}>Sign up</a></>
          ) : (
            <>Already have an account? <a onClick={() => { setMode('login'); setError(''); }}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  );
}
