import { useState, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO 
} from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI } from '../utils/api';

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await sessionsAPI.getAll();
      // Assume the response returns an array of sessions under data.sessions
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions for calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📆</span> {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Previous Month"
          >
            ‹
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
          >
            Today
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Next Month"
          >
            ›
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="py-2 text-center text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          {format(addDays(startDate, i), 'EEE')}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        // Find sessions for this day
        const daySessions = sessions.filter(session => {
          if (!session.scheduledAt) return false;
          return isSameDay(parseISO(session.scheduledAt), cloneDay);
        });

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] sm:min-h-[120px] p-2 flex flex-col border border-zinc-800/50 transition-colors
              ${!isSameMonth(day, monthStart) ? 'bg-zinc-900/20 text-zinc-600' : 'bg-zinc-900/40 hover:bg-zinc-800/40 text-zinc-300'}
              ${isSameDay(day, new Date()) ? 'ring-2 ring-zoom-blue/50 ring-inset rounded-lg z-10' : ''}
              ${i === 0 ? 'rounded-l-xl' : ''} ${i === 6 ? 'rounded-r-xl' : ''}
            `}
          >
            <span className={`text-right text-sm font-medium ${isSameDay(day, new Date()) ? 'text-zoom-blue' : ''}`}>
              {formattedDate}
            </span>
            <div className="flex-1 mt-1 overflow-y-auto space-y-1 custom-scrollbar">
              {daySessions.map(session => (
                <div 
                  key={session._id} 
                  className="text-xs p-1.5 rounded-md bg-zoom-blue/10 border border-zoom-blue/20 text-zoom-blue truncate"
                  title={`${session.title} at ${format(parseISO(session.scheduledAt), 'p')}`}
                >
                  <span className="font-semibold">{format(parseISO(session.scheduledAt), 'h:mm a')}</span> - {session.title}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 mb-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="animate-fade-in">{rows}</div>;
  };

  if (loading) {
    return <div className="page-wrapper flex items-center justify-center"><div className="loading-spinner"></div></div>;
  }

  return (
    <div className="page-wrapper">
      <div>
        <h1 className="page-title">Session Calendar</h1>
        <p className="page-subtitle">View and manage your upcoming schedule</p>
      </div>
      
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
}
