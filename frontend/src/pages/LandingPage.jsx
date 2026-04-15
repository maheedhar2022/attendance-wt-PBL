import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans overflow-x-hidden selection:bg-zoom-blue/30 selection:text-zoom-blue flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zoom-blue/30 blur-[120px] rounded-full mix-blend-screen opacity-50 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-zoom-blue to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-zoom-blue/20">
              AX
            </div>
            <span className="font-bold text-xl tracking-tight text-white">AttendX</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/login" className="px-5 py-2.5 rounded-xl bg-zoom-blue hover:bg-zoom-blue/90 text-white text-sm font-semibold transition-all shadow-lg shadow-zoom-blue/20 hover:shadow-zoom-blue/40 transform hover:-translate-y-0.5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-24 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zoom-blue/10 border border-zoom-blue/20 text-zoom-blue text-sm font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zoom-blue opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-zoom-blue"></span>
          </span>
          Next-Gen Live Learning
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-4xl leading-tight">
          Manage Attendance &amp; <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zoom-blue to-blue-400">
            Live Sessions
          </span> Effortlessly
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          AttendX combines intelligent attendance tracking, real-time analytics, and Zoom-quality live sessions in one seamless, glassmorphic platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zoom-blue hover:bg-zoom-blue/90 text-white text-lg font-semibold transition-all shadow-lg shadow-zoom-blue/20 hover:shadow-zoom-blue/40 transform hover:-translate-y-0.5">
            Join for Free
          </Link>
          <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-white text-lg font-semibold transition-all backdrop-blur-sm">
            Explore Features
          </a>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="relative z-10 w-full bg-zinc-900/30 border-t border-zinc-800/80 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need to succeed</h2>
            <p className="text-zinc-400">Streamline your classroom experience with powerful integrated tools.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm hover:border-zoom-blue/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-zoom-blue/10 flex items-center justify-center text-zoom-blue text-2xl mb-6 group-hover:scale-110 transition-transform">
                🎥
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Live Video Sessions</h3>
              <p className="text-zinc-400 leading-relaxed">
                Host or join high-quality, real-time video classes with integrated chat and screen sharing capabilities.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm hover:border-zoom-blue/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 text-2xl mb-6 group-hover:scale-110 transition-transform">
                📊
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Automated Analytics</h3>
              <p className="text-zinc-400 leading-relaxed">
                Track attendance automatically and visualize student engagement with detailed, real-time analytics dashboards.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm hover:border-zoom-blue/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 text-2xl mb-6 group-hover:scale-110 transition-transform">
                📅
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Calendar Sync</h3>
              <p className="text-zinc-400 leading-relaxed">
                Never miss a class again. Sync all your upcoming sessions directly to Google Calendar with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-zinc-800/80 text-center flex-shrink-0">
        <p className="text-sm text-zinc-500">© {new Date().getFullYear()} AttendX. All rights reserved.</p>
      </footer>
    </div>
  );
}
