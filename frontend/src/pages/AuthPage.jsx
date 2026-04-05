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
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      
      {/* Left Pane - Brand/Hero (Hidden on smaller screens) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-zinc-900 border-r border-zinc-800/50 relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-zoom-blue/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zoom-blue flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-zoom-blue/20">
            AX
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">AttendX</span>
        </div>

        <div className="relative z-10 flex flex-col gap-6 max-w-md">
          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
            Streamline your <br/> live class sessions.
          </h1>
          <ul className="flex flex-col gap-4 text-zinc-400 font-medium">
            <li className="flex items-center gap-3"><span className="text-zoom-blue text-xl">✓</span> Live WebRTC Video Rooms</li>
            <li className="flex items-center gap-3"><span className="text-zoom-blue text-xl">✓</span> Automated Analytics</li>
            <li className="flex items-center gap-3"><span className="text-zoom-blue text-xl">✓</span> Secure Role-based Access</li>
          </ul>
        </div>
        
        <div className="relative z-10 text-sm text-zinc-500">
          © {new Date().getFullYear()} AttendX Platform
        </div>
      </div>

      {/* Right Pane - Form Area */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8 sm:p-12 md:p-16">
        
        <div className="w-full max-w-sm">
          {/* Mobile Logo (visible only on small screens) */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-zoom-blue flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-zoom-blue/20">AX</div>
            <span className="text-2xl font-bold tracking-tight text-white">AttendX</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-sm text-zinc-400">
              {mode === 'login' ? 'Enter your credentials to access your portal.' : 'Get started with digital attendance today.'}
            </p>
          </div>

          <button 
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all shadow-sm mb-6"
            onClick={() => alert("Google Sign-In integration coming soon!")}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-zinc-800 flex-1"></div>
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Or continue with email</span>
            <div className="h-px bg-zinc-800 flex-1"></div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <span className="text-red-400">⚠️</span>
              <p className="text-sm font-medium text-red-400 leading-tight mt-0.5">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {mode === 'register' && (
              <>
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['student', 'instructor'].map(role => (
                      <label 
                        key={role}
                        className={`
                          flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all duration-200
                          ${form.role === role 
                            ? 'bg-zoom-blue/10 border-zoom-blue text-zoom-blue ring-1 ring-zoom-blue' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
                        `}
                      >
                        <input
                          type="radio" name="role" value={role}
                          checked={form.role === role} onChange={handleChange} className="hidden"
                        />
                        <span className="text-sm font-semibold capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
                  <input name="name" value={form.name} onChange={handleChange} required className="form-input" placeholder="e.g. Maya Lin" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Department</label>
                    <input name="department" value={form.department} onChange={handleChange} className="form-input" placeholder="e.g. Design" />
                  </div>
                  {form.role === 'student' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Student ID</label>
                      <input name="studentId" value={form.studentId} onChange={handleChange} className="form-input" placeholder="e.g. S-101" />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required className="form-input" placeholder="you@domain.com" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required className="form-input" placeholder="••••••••" minLength={6} />
            </div>

            {mode === 'login' && (
              <div className="p-3 rounded-lg bg-zoom-blue/10 border border-zoom-blue/20 text-zoom-blue text-xs font-medium leading-relaxed">
                💡 Demo Access:<br/>
                Instructor: <b>instructor@demo.com</b><br/>
                Student: <b>alice@demo.com</b><br/>
                Password: <b>password123</b>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center py-3 px-4 rounded-xl font-bold text-sm text-white bg-zoom-blue hover:bg-zoom-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-zoom-blue/20"
            >
              {loading ? <span className="loading-spinner w-4 h-4 border-[2px] border-white/30 border-t-white" /> : (mode === 'login' ? 'Sign in to account' : 'Complete registration')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-sm text-zinc-400">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button 
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="ml-1.5 font-semibold text-zoom-blue hover:text-zoom-blue/80 hover:underline transition-all outline-none"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
