import { useState } from 'react';
import { addSessionToCalendar } from '../../utils/googleCalendar';

/**
 * Reusable "Add to Google Calendar" button.
 * Props:
 *   session  — full session object from the API
 *   compact  — (bool) if true, shows icon-only with tooltip
 */
export default function AddToCalendarBtn({ session, compact = false }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [errMsg, setErrMsg] = useState('');

  const handle = async () => {
    if (state === 'loading' || state === 'done') return;
    setState('loading');
    setErrMsg('');
    try {
      await addSessionToCalendar(session);
      setState('done');
      setTimeout(() => setState('idle'), 4000);
    } catch (err) {
      console.error('[GoogleCalendar]', err);
      setErrMsg(err.message || 'Failed');
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  const cfg = {
    idle:    { label: compact ? '📅' : '📅 Add to Calendar',  cls: 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600' },
    loading: { label: compact ? '…'  : 'Adding…',             cls: 'bg-zinc-800 border-zinc-700 text-zinc-400 cursor-wait' },
    done:    { label: compact ? '✅'  : '✅ Added to Calendar', cls: 'bg-green-500/10 border-green-500/30 text-green-400 cursor-default' },
    error:   { label: compact ? '❌'  : '❌ Failed',            cls: 'bg-red-500/10 border-red-500/30 text-red-400' },
  }[state];

  return (
    <div className="relative group">
      <button
        onClick={handle}
        disabled={state === 'loading' || state === 'done'}
        title={state === 'error' ? errMsg : 'Add this session to Google Calendar'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${cfg.cls}`}
      >
        {state === 'loading' && (
          <span className="inline-block w-3 h-3 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
        )}
        {cfg.label}
      </button>
      {/* Error tooltip */}
      {state === 'error' && errMsg && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] text-red-400 font-medium shadow-xl w-max max-w-[220px] z-50">
          {errMsg}
        </div>
      )}
    </div>
  );
}
