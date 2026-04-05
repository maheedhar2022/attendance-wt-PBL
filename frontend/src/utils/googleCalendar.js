/**
 * Google Calendar OAuth2 integration using Google Identity Services (GIS).
 * Requires VITE_GOOGLE_CLIENT_ID in .env
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient = null;
let cachedToken = null;
let tokenExpiry = 0;

/** Dynamically load the Google Identity Services script */
function loadGIS() {
  return new Promise((resolve) => {
    if (window.google?.accounts) { resolve(); return; }
    const existing = document.getElementById('gsi-script');
    if (existing) { existing.addEventListener('load', resolve); return; }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

/** Get a valid OAuth access token, prompting the user if needed */
export async function getCalendarToken() {
  await loadGIS();

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60_000) {
    return cachedToken;
  }

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (response) => {
          if (response.error) { reject(new Error(response.error)); return; }
          cachedToken = response.access_token;
          tokenExpiry = Date.now() + response.expires_in * 1000;
          resolve(cachedToken);
        },
      });
    }
    tokenClient.requestAccessToken({ prompt: cachedToken ? '' : 'consent' });
  });
}

/** Revoke the access token (sign out of calendar access) */
export function revokeCalendarAccess() {
  if (!cachedToken) return;
  window.google?.accounts.oauth2.revoke(cachedToken, () => {});
  cachedToken = null;
  tokenExpiry = 0;
  tokenClient = null;
}

/**
 * Add a session event to the user's primary Google Calendar.
 * @param {Object} session - session object from the API
 */
export async function addSessionToCalendar(session) {
  const token = await getCalendarToken();

  // Build ISO datetime strings in IST (UTC+5:30)
  const rawDate = session.date?.split('T')[0] ?? new Date().toISOString().split('T')[0];
  const startISO = `${rawDate}T${session.startTime}:00+05:30`;
  const endISO   = `${rawDate}T${session.endTime}:00+05:30`;

  const event = {
    summary: session.title || session.topic || 'Class Session',
    description: [
      `Course: ${session.course?.title || ''} (${session.course?.code || ''})`,
      session.notes ? `Notes: ${session.notes}` : '',
      'Managed via AttendX — Digital Attendance System',
    ].filter(Boolean).join('\n'),
    start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
    end:   { dateTime: endISO,   timeZone: 'Asia/Kolkata' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 },
        { method: 'email', minutes: 60 },
      ],
    },
  };

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    // Token might have expired mid-session; clear cache and throw
    if (res.status === 401) { cachedToken = null; tokenExpiry = 0; }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to add event to Google Calendar');
  }

  return res.json(); // Returns the created event object
}
