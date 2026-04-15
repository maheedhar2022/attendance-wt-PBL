import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  
  // Using local state to mock announcements until backend is implemented
  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: "Welcome to the New Curriculum!",
      content: "We're excited to launch the updated materials for this semester. Please check the course resources section for your updated syllabus.",
      author: "Admin System",
      date: new Date(Date.now() - 86400000 * 2), // 2 days ago
      important: true
    },
    {
      id: 2,
      title: "Maintenance Notice",
      content: "The platform will undergo scheduled maintenance this Sunday from 2 AM to 4 AM EST. During this time, live sessions will be unavailable.",
      author: "IT Support",
      date: new Date(Date.now() - 86400000 * 5), // 5 days ago
      important: false
    }
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  const handlePost = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newAnnouncement = {
      id: Date.now(),
      title: newTitle,
      content: newContent,
      author: user?.name || "Instructor",
      date: new Date(),
      important: isImportant
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    setNewTitle('');
    setNewContent('');
    setIsImportant(false);
  };

  return (
    <div className="page-wrapper max-w-4xl">
      <div>
        <h1 className="page-title">Announcements</h1>
        <p className="page-subtitle">Stay up to date with class news and updates</p>
      </div>

      {user?.role === 'instructor' && (
        <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl shadow-lg backdrop-blur-sm animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>📣</span> Post an Announcement
          </h2>
          <form onSubmit={handlePost} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Announcement Title"
                className="form-input bg-zinc-950/50"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <textarea
                placeholder="What do you want to share with your students?"
                className="form-textarea bg-zinc-950/50 min-h-[100px]"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer hover:text-zinc-300">
                <input
                  type="checkbox"
                  className="rounded border-zinc-700 bg-zinc-900 text-zoom-blue focus:ring-zoom-blue/50 focus:ring-offset-zinc-950 w-4 h-4 cursor-pointer"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                />
                Mark as important
              </label>
              <button 
                type="submit"
                disabled={!newTitle.trim() || !newContent.trim()}
                className="px-6 py-2 bg-zoom-blue text-white text-sm font-semibold rounded-xl hover:bg-zoom-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-zoom-blue/20"
              >
                Post Announcement
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div 
            key={announcement.id} 
            className={`p-6 rounded-2xl border transition-all duration-300 animate-fade-in shadow-md
              ${announcement.important 
                ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40' 
                : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/80'}`
            }
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-3">
                {announcement.important && (
                  <span className="px-2.5 py-1 rounded-md bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                    Important
                  </span>
                )}
                <h3 className="text-lg font-bold text-white">{announcement.title}</h3>
              </div>
              <div className="text-xs text-zinc-500 whitespace-nowrap">
                {format(announcement.date, 'MMM d, yyyy • h:mm a')}
              </div>
            </div>
            
            <p className="text-zinc-300 text-sm leading-relaxed mb-4">
              {announcement.content}
            </p>
            
            <div className="flex items-center gap-2 mt-auto">
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 text-[10px] font-bold border border-zinc-700">
                {announcement.author.charAt(0)}
              </div>
              <span className="text-xs font-medium text-zinc-400">Posted by {announcement.author}</span>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800/80 rounded-2xl bg-zinc-900/20">
            No announcements yet.
          </div>
        )}
      </div>
    </div>
  );
}
