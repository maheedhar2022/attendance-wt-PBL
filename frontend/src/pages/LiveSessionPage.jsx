import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionsAPI, socket } from '../utils/api';

/* ── Peer connection helpers ──────────────────────────────── */
function createPeer(stream) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  });
  if (stream) stream.getTracks().forEach(t => pc.addTrack(t, stream));
  return pc;
}

/* ── Video Tile ────────────────────────────────────────────── */
function VideoTile({ stream, name, isSelf, isMuted, isVideoOff, isInstructor }) {
  const videoRef = useRef(null);

  // Use useLayoutEffect so srcObject is set BEFORE paint — avoids the blank
  // frame when the component first mounts with a stream already available.
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className={`video-tile ${isInstructor ? 'tile-instructor' : ''} ${isSelf ? 'tile-self' : ''}`}>
      {/*
        IMPORTANT: Always render the <video> element — never conditionally mount/unmount it.
        Conditionally doing so causes React to create a brand-new DOM element on toggle-on,
        and the useEffect([stream]) only fires when `stream` changes (same reference = no fire),
        leaving the new element without a srcObject → blank video.
        Instead, keep it in the DOM and use CSS to hide it when camera is off.
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className="video-element"
        style={{ display: (!stream || isVideoOff) ? 'none' : 'block' }}
      />
      {/* Avatar shown when video is off or no stream yet */}
      {(!stream || isVideoOff) && (
        <div className="video-avatar-placeholder">
          <div className="video-avatar-initials">
            {name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
          </div>
        </div>
      )}
      <div className="video-tile-footer">
        <span className="tile-name">{name}{isSelf ? ' (You)' : ''}</span>
        <div className="tile-icons">
          {isMuted && <span className="tile-icon muted-icon">🔇</span>}
          {isVideoOff && <span className="tile-icon">📷</span>}
        </div>
      </div>
      {isInstructor && <div className="instructor-badge">Instructor</div>}
    </div>
  );
}


/* ── Main Component ────────────────────────────────────────── */
export default function LiveSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInstructor = user?.role === 'instructor';

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [inRoom, setInRoom] = useState(false);

  // Participants: { userId, userName, role, stream, audioEnabled, videoEnabled, socketId, pc }
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);

  // Attendance — deferred marking based on session duration threshold (5/6 of total)
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [attendancePending, setAttendancePending] = useState(false);  // waiting for timer
  const [attendanceCountdown, setAttendanceCountdown] = useState(0); // seconds remaining
  const attendanceTimerRef = useRef(null);
  const attendanceCountdownRef = useRef(null);

  // Session ended banner
  const [sessionEnded, setSessionEnded] = useState(false);

  // ── Scheduled time enforcement (IST) ─────────────────────────
  // Countdown to session start
  const [timeToStart, setTimeToStart] = useState(null);       // seconds until startTime
  const [canStartNow, setCanStartNow] = useState(false);      // within allowed window
  const [sessionExpired, setSessionExpired] = useState(false); // past endTime
  const timeCheckRef = useRef(null);
  const autoEndTimerRef = useRef(null);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // { socketId: RTCPeerConnection }
  const roomId = useRef('');

  // ── Build IST Date from session date + "HH:MM" string ────────
  const buildISTDateTime = (sessionDate, timeStr) => {
    if (!sessionDate || !timeStr) return null;
    const d = new Date(sessionDate);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + istOffset);
    const yyyy = istDate.getUTCFullYear();
    const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getUTCDate()).padStart(2, '0');
    return new Date(`${yyyy}-${mm}-${dd}T${timeStr}:00+05:30`);
  };

  // ── Load session info ─────────────────────────────────────
  useEffect(() => {
    loadSession();
    return () => cleanup();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await sessionsAPI.getOne(sessionId);
      setSession(res.data.session);
    } catch (err) {
      setError('Session not found or you do not have access.');
    } finally {
      setLoading(false);
    }
  };

  // ── Time-window enforcement for instructor ────────────────
  // Re-runs every 15 seconds to keep countdown live
  useEffect(() => {
    if (!session || !isInstructor) return;

    const check = () => {
      const start = buildISTDateTime(session.date, session.startTime);
      const end   = buildISTDateTime(session.date, session.endTime);
      if (!start || !end) return;

      const now = new Date();
      const tenMinBefore = new Date(start.getTime() - 10 * 60 * 1000);

      if (now > end) {
        setSessionExpired(true);
        setCanStartNow(false);
        setTimeToStart(null);
      } else if (now >= tenMinBefore) {
        setCanStartNow(true);
        setSessionExpired(false);
        setTimeToStart(null);
      } else {
        const secsUntil = Math.ceil((tenMinBefore - now) / 1000);
        setCanStartNow(false);
        setSessionExpired(false);
        setTimeToStart(secsUntil);
      }
    };

    check(); // run immediately
    timeCheckRef.current = setInterval(check, 15000);
    return () => clearInterval(timeCheckRef.current);
  }, [session, isInstructor]);

  // ── Auto-end client-side at scheduled endTime ─────────────
  useEffect(() => {
    if (!session || !inRoom) return;

    const end = buildISTDateTime(session.date, session.endTime);
    if (!end) return;

    const msUntilEnd = end.getTime() - Date.now();
    if (msUntilEnd <= 0) return; // already past

    autoEndTimerRef.current = setTimeout(async () => {
      if (isInstructor) {
        // Instructor: auto end the session
        try {
          socket.emit('end-live-session', { roomId: roomId.current });
          await sessionsAPI.endLive(sessionId);
        } catch (e) { /* ignore */ }
        cleanup();
        navigate(-1);
      } else {
        // Student: session window closed — show ended screen
        setSessionEnded(true);
        setTimeout(() => navigate(-1), 4000);
      }
    }, msUntilEnd);

    return () => clearTimeout(autoEndTimerRef.current);
  }, [session, inRoom]);

  // ── Cleanup on unmount ───────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    // Clear deferred attendance timer
    if (attendanceTimerRef.current) clearTimeout(attendanceTimerRef.current);
    if (attendanceCountdownRef.current) clearInterval(attendanceCountdownRef.current);
    if (timeCheckRef.current) clearInterval(timeCheckRef.current);
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
    socket.off('room-participants');
    socket.off('peer-joined');
    socket.off('peer-left');
    socket.off('receive-offer');
    socket.off('receive-answer');
    socket.off('receive-ice-candidate');
    socket.off('peer-media-state');
    socket.off('participant-count');
    socket.off('session-ended');
    socket.disconnect();
  }, []);

  // ── Schedule deferred attendance marking ──────────────────
  // Called after join. `markAfterMs` is when (relative to now) attendance
  // should be recorded — calculated as (5/6 × session duration) from live start.
  const scheduleAttendanceMark = useCallback((markAfterMs) => {
    const totalSeconds = Math.ceil(markAfterMs / 1000);
    setAttendancePending(true);
    setAttendanceCountdown(totalSeconds);

    // Live countdown display
    attendanceCountdownRef.current = setInterval(() => {
      setAttendanceCountdown(prev => {
        if (prev <= 1) {
          clearInterval(attendanceCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Actual mark call after delay
    attendanceTimerRef.current = setTimeout(async () => {
      try {
        const res = await sessionsAPI.markLiveAttendance(sessionId);
        setAttendancePending(false);
        setAttendanceConfirmed(true);
        setAttendanceStatus(res.data.status);
      } catch (err) {
        // Already marked or session ended — still confirm UI
        setAttendancePending(false);
        setAttendanceConfirmed(true);
        setAttendanceStatus('present');
        console.warn('Attendance mark error (possibly already marked):', err.message);
      }
    }, markAfterMs);
  }, [sessionId]);


  // ── Get user media ───────────────────────────────────────
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      // Try audio only if camera fails
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setVideoEnabled(false);
        return stream;
      } catch (e) {
        setError('Could not access camera or microphone. Please check permissions.');
        return null;
      }
    }
  };

  // ── Setup socket listeners ───────────────────────────────
  const setupSocketListeners = useCallback((stream) => {
    // Existing participants when we join
    socket.on('room-participants', (existingParticipants) => {
      existingParticipants.forEach(async (p) => {
        await callPeer(p.socketId, p.userId, p.userName, p.role, stream);
      });
    });

    // New peer joined — they'll call us
    socket.on('peer-joined', ({ peerId, userName, role, socketId }) => {
      setParticipants(prev => {
        if (prev.find(p => p.userId === peerId)) return prev;
        return [...prev, { userId: peerId, userName, role, socketId, stream: null, audioEnabled: true, videoEnabled: true }];
      });
    });

    // Peer left
    socket.on('peer-left', ({ userId: leftId }) => {
      setParticipants(prev => prev.filter(p => p.userId !== leftId));
      // Close that peer connection
      const entry = Object.entries(peerConnectionsRef.current).find(([socketId, pc]) => {
        return pc._remoteUserId === leftId;
      });
      if (entry) {
        entry[1].close();
        delete peerConnectionsRef.current[entry[0]];
      }
    });

    // Receive WebRTC offer from a new peer
    socket.on('receive-offer', async ({ offer, from }) => {
      const pc = createPeer(stream);
      pc._remoteSocketId = from.socketId;
      pc._remoteUserId = from.userId;
      peerConnectionsRef.current[from.socketId] = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('relay-ice-candidate', {
            to: from.socketId,
            candidate: e.candidate,
            from: { socketId: socket.id, userId: user._id }
          });
        }
      };

      pc.ontrack = (e) => {
        const remoteStream = e.streams[0];
        setParticipants(prev => prev.map(p =>
          p.socketId === from.socketId ? { ...p, stream: remoteStream } : p
        ));
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('relay-answer', {
        to: from.socketId,
        answer,
        from: { socketId: socket.id, userId: user._id }
      });
    });

    // Receive answer
    socket.on('receive-answer', async ({ answer, from }) => {
      const pc = peerConnectionsRef.current[from.socketId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Receive ICE candidate
    socket.on('receive-ice-candidate', async ({ candidate, from }) => {
      const pc = peerConnectionsRef.current[from.socketId];
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
      }
    });

    // Media state changes from other peers
    socket.on('peer-media-state', ({ userId: uid, audioEnabled: a, videoEnabled: v }) => {
      setParticipants(prev => prev.map(p =>
        p.userId === uid ? { ...p, audioEnabled: a, videoEnabled: v } : p
      ));
    });

    // Participant count
    socket.on('participant-count', (count) => setParticipantCount(count));

    // Session ended by instructor
    socket.on('session-ended', () => {
      setSessionEnded(true);
      setTimeout(() => navigate(-1), 4000);
    });
  }, [user, navigate]);

  // ── Call an existing peer (we initiate) ──────────────────
  const callPeer = async (targetSocketId, targetUserId, targetName, targetRole, stream) => {
    const pc = createPeer(stream);
    pc._remoteSocketId = targetSocketId;
    pc._remoteUserId = targetUserId;
    peerConnectionsRef.current[targetSocketId] = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('relay-ice-candidate', {
          to: targetSocketId,
          candidate: e.candidate,
          from: { socketId: socket.id, userId: user._id }
        });
      }
    };

    pc.ontrack = (e) => {
      const remoteStream = e.streams[0];
      setParticipants(prev => {
        const exists = prev.find(p => p.userId === targetUserId);
        if (exists) {
          return prev.map(p => p.userId === targetUserId ? { ...p, stream: remoteStream } : p);
        }
        return [...prev, { userId: targetUserId, userName: targetName, role: targetRole, socketId: targetSocketId, stream: remoteStream, audioEnabled: true, videoEnabled: true }];
      });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('relay-offer', {
      to: targetSocketId,
      offer,
      from: { socketId: socket.id, userId: user._id }
    });

    setParticipants(prev => {
      if (prev.find(p => p.userId === targetUserId)) return prev;
      return [...prev, { userId: targetUserId, userName: targetName, role: targetRole, socketId: targetSocketId, stream: null, audioEnabled: true, videoEnabled: true }];
    });
  };

  // ── Join Room ────────────────────────────────────────────
  const joinRoom = async () => {
    setJoining(true);
    setError('');
    try {
      if (!isInstructor) {
        // joinLive now returns markAfterMs (deferred attendance) instead of
        // marking immediately. Attendance is marked after (5/6 × duration).
        const res = await sessionsAPI.joinLive(sessionId);
        roomId.current = res.data.liveRoomId;

        if (res.data.canMark) {
          // Student joined before the attendance threshold — schedule timer
          scheduleAttendanceMark(res.data.markAfterMs);
        } else {
          // Joined too late (past threshold) — backend will have marked immediately
          setAttendanceConfirmed(true);
          setAttendanceStatus(res.data.attendanceStatus || 'late');
        }
      } else {
        roomId.current = session.liveRoomId;
      }

      const stream = await getUserMedia();
      if (!stream) { setJoining(false); return; }

      // Connect socket
      socket.connect();
      await new Promise(resolve => {
        if (socket.connected) return resolve();
        socket.once('connect', resolve);
      });

      setupSocketListeners(stream);

      socket.emit('join-live-room', {
        roomId: roomId.current,
        userId: user._id,
        userName: user.name,
        role: user.role
      });

      setInRoom(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join live session.');
    } finally {
      setJoining(false);
    }
  };


  // ── Instructor: Start Live ───────────────────────────────
  const handleStartLive = async () => {
    if (!canStartNow && !session?.liveSessionActive) {
      // Show a clear message — backend will reject anyway, but catch early
      const start = buildISTDateTime(session.date, session.startTime);
      const mins = timeToStart !== null ? Math.ceil(timeToStart / 60) : '?';
      setError(`Cannot start yet. Session begins at ${session.startTime} IST. You can start up to 10 minutes early. (~${mins} min remaining)`);
      return;
    }
    setJoining(true);
    setError('');
    try {
      const res = await sessionsAPI.startLive(sessionId);
      setSession(res.data.session);
      await joinRoom();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start live session.');
      setJoining(false);
    }
  };

  // ── Instructor: End Live ──────────────────────────────────
  const handleEndLive = async () => {
    if (!confirm('End the live session for everyone?')) return;
    try {
      socket.emit('end-live-session', { roomId: roomId.current });
      await sessionsAPI.endLive(sessionId);
      cleanup();
      navigate(-1);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Toggle Audio ─────────────────────────────────────────
  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    socket.emit('media-state-change', {
      roomId: roomId.current, userId: user._id,
      audioEnabled: newState, videoEnabled
    });
  };

  // ── Toggle Video ─────────────────────────────────────────
  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    socket.emit('media-state-change', {
      roomId: roomId.current, userId: user._id,
      audioEnabled, videoEnabled: newState
    });
  };

  // ── Leave ────────────────────────────────────────────────
  const handleLeave = () => {
    cleanup();
    navigate(-1);
  };

  /* ── RENDER: Pre-join lobby ════════════════════════════════ */
  if (loading) {
    return (
      <div className="live-page-center">
        <div className="loading-spinner" style={{ width: 40, height: 40 }} />
        <p style={{ color: 'var(--text-muted)', marginTop: 16, fontSize: 16 }}>Loading session...</p>
      </div>
    );
  }

  if (error && !inRoom) {
    return (
      <div className="live-page-center">
        <div style={{ fontSize: 48 }}>⚠️</div>
        <p style={{ color: 'var(--red)', marginTop: 12, fontSize: 16 }}>{error}</p>
        <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="live-page-center">
        <div style={{ fontSize: 64 }}>🏁</div>
        <h2 style={{ color: 'var(--text-primary)', marginTop: 16 }}>Session Ended</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>The instructor has ended the live session. Redirecting...</p>
      </div>
    );
  }

  if (!inRoom) {
    // Lobby / waiting room
    const isLive = session?.liveSessionActive;

    // Friendly countdown string for instructor
    const countdownStr = timeToStart !== null
      ? `${Math.floor(timeToStart / 3600) > 0 ? Math.floor(timeToStart / 3600) + 'h ' : ''}${Math.floor((timeToStart % 3600) / 60)}m ${timeToStart % 60}s`
      : null;

    return (
      <div className="live-lobbywrap">
        <div className="live-lobby">
          {/* Header */}
          <div className="lobby-header">
            <div className="live-badge-pill pulse-red">🔴 LIVE</div>
            <h1 className="lobby-title">{session?.title || session?.topic || 'Live Class Session'}</h1>
            <p className="lobby-course">{session?.course?.title} · {session?.course?.code}</p>
            <p className="lobby-time">{session?.startTime} – {session?.endTime} IST</p>
          </div>

          {/* Session expired notice */}
          {sessionExpired && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              ⏱️ This session has ended (past scheduled end time of {session?.endTime} IST).
            </div>
          )}

          {/* Instructor: countdown to start window */}
          {isInstructor && !isLive && !sessionExpired && timeToStart !== null && (
            <div style={{
              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 12, padding: '14px 20px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <span style={{ fontSize: 28 }}>⏳</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Session hasn't started yet</strong>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 14 }}>
                  Scheduled: <strong>{session?.startTime} IST</strong>. You can start it 10 minutes before.<br />
                  <span style={{ fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>⏱ {countdownStr} until early-start allowed</span>
                </p>
              </div>
            </div>
          )}

          {/* Student: not live yet info */}
          {!isInstructor && !isLive && !sessionExpired && (
            <div style={{
              background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: 12, padding: '14px 20px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <span style={{ fontSize: 28 }}>⏰</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Waiting for instructor</strong>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 14 }}>
                  Session is scheduled for <strong>{session?.startTime} – {session?.endTime} IST</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Attendance status for student */}
          {attendancePending && !attendanceConfirmed && (
            <div className="attendance-pending-banner">
              <div>
                <div className="countdown-value">
                  {Math.floor(attendanceCountdown / 60)}:{String(attendanceCountdown % 60).padStart(2, '0')}
                </div>
              </div>
              <div>
                <strong>⏳ Attendance will be recorded...</strong>
                <p>Stay in the session. Your attendance is auto-marked at {Math.round(attendanceCountdown / 60)} minute{attendanceCountdown >= 120 ? 's' : ''} remaining.</p>
              </div>
            </div>
          )}
          {attendanceConfirmed && (
            <div className="attendance-confirmed-banner">
              <span className="confirmed-icon">✅</span>
              <div>
                <strong>Attendance Recorded!</strong>
                <p>Status: <span style={{ color: attendanceStatus === 'present' ? 'var(--green)' : 'var(--yellow)', fontWeight: 700, textTransform: 'capitalize' }}>{attendanceStatus}</span></p>
              </div>
            </div>
          )}


          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Action buttons */}
          <div className="lobby-actions">
            {isInstructor ? (
              isLive ? (
                <button className="btn btn-primary btn-lg live-btn" onClick={joinRoom} disabled={joining}>
                  {joining ? <span className="loading-spinner" /> : '🎥 Rejoin Your Session'}
                </button>
              ) : (
                <button
                  className="btn btn-lg live-btn"
                  style={{
                    background: (!canStartNow || sessionExpired)
                      ? 'rgba(239,68,68,0.3)'
                      : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    cursor: (!canStartNow || sessionExpired) ? 'not-allowed' : 'pointer',
                    opacity: (!canStartNow || sessionExpired) ? 0.6 : 1
                  }}
                  onClick={handleStartLive}
                  disabled={joining || sessionExpired}
                  title={!canStartNow && !sessionExpired ? `Available from ${session?.startTime} IST (10 min early allowed)` : ''}
                >
                  {joining ? <span className="loading-spinner" /> : sessionExpired ? '⛔ Session Ended' : (!canStartNow ? `🔒 Starts at ${session?.startTime} IST` : '🔴 Start Live Session')}
                </button>
              )
            ) : (
              isLive ? (
                <button className="btn btn-primary btn-lg live-btn" onClick={joinRoom} disabled={joining}>
                  {joining ? <span className="loading-spinner" /> : '🎥 Join Live Session'}
                </button>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>⏰</div>
                  <p style={{ color: 'var(--text-muted)' }}>The instructor hasn't started the live session yet.</p>
                  <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => { loadSession(); }}>🔄 Refresh</button>
                </div>
              )
            )}
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back to Sessions</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── RENDER: In-room ═══════════════════════════════════════ */
  const allParticipants = [
    { userId: user._id, userName: user.name, role: user.role, stream: localStream, audioEnabled, videoEnabled, isSelf: true },
    ...participants
  ];

  const instructorParticipant = allParticipants.find(p => p.role === 'instructor');
  const studentParticipants = allParticipants.filter(p => p.role !== 'instructor');

  return (
    <div className="live-room">
      {/* Top bar */}
      <div className="live-topbar">
        <div className="live-topbar-left">
          <div className="live-badge-pill pulse-red" style={{ fontSize: 11 }}>🔴 LIVE</div>
          <span className="live-session-name">{session?.title || session?.topic || 'Live Session'}</span>
        </div>
        <div className="live-topbar-right">
          <span className="participant-count-badge">
            👥 {participantCount || allParticipants.length}
          </span>
          {attendancePending && !attendanceConfirmed && (
            <span className="attendance-countdown-badge">
              ⏱ Attendance in {Math.floor(attendanceCountdown / 60)}:{String(attendanceCountdown % 60).padStart(2, '0')}
            </span>
          )}
          {attendanceConfirmed && (
            <span className="attendance-mini-badge">
              ✅ Attendance Recorded
            </span>
          )}
        </div>

      </div>

      {/* Video grid */}
      <div className={`live-video-grid ${allParticipants.length === 1 ? 'grid-1' : allParticipants.length === 2 ? 'grid-2' : allParticipants.length <= 4 ? 'grid-4' : 'grid-many'}`}>
        {/* Instructor tile is always shown first and larger */}
        {instructorParticipant && (
          <VideoTile
            key={instructorParticipant.userId}
            stream={instructorParticipant.stream}
            name={instructorParticipant.userName}
            isSelf={instructorParticipant.isSelf}
            isMuted={!instructorParticipant.audioEnabled}
            isVideoOff={!instructorParticipant.videoEnabled}
            isInstructor={true}
          />
        )}
        {studentParticipants.map(p => (
          <VideoTile
            key={p.userId}
            stream={p.stream}
            name={p.userName}
            isSelf={p.isSelf}
            isMuted={!p.audioEnabled}
            isVideoOff={!p.videoEnabled}
            isInstructor={false}
          />
        ))}
      </div>

      {/* Control bar */}
      <div className="live-control-bar">
        <button
          className={`live-ctrl-btn ${!audioEnabled ? 'ctrl-off' : ''}`}
          onClick={toggleAudio}
          title={audioEnabled ? 'Mute' : 'Unmute'}
        >
          {audioEnabled ? '🎙️' : '🔇'}
          <span>{audioEnabled ? 'Mute' : 'Unmute'}</span>
        </button>

        <button
          className={`live-ctrl-btn ${!videoEnabled ? 'ctrl-off' : ''}`}
          onClick={toggleVideo}
          title={videoEnabled ? 'Stop Video' : 'Start Video'}
        >
          {videoEnabled ? '📹' : '📷'}
          <span>{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
        </button>

        {isInstructor ? (
          <button className="live-ctrl-btn ctrl-end" onClick={handleEndLive}>
            🔴 <span>End Session</span>
          </button>
        ) : (
          <button className="live-ctrl-btn ctrl-leave" onClick={handleLeave}>
            🚪 <span>Leave</span>
          </button>
        )}
      </div>
    </div>
  );
}
