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
  pc._iceQueue = []; // robust queued ICE handling
  
  pc.oniceconnectionstatechange = () => {
    console.log(`[WebRTC] ICE Connection State: ${pc.iceConnectionState}`);
  };
  pc.onsignalingstatechange = () => {
    console.log(`[WebRTC] Signaling State: ${pc.signalingState}`);
  };

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
      if (stream) {
        videoRef.current.play().catch(e => console.warn('Video auto-play prevented:', e));
      }
    }
  }, [stream]);

  return (
    <div className={`relative bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center border border-zinc-800 transition-all ${isInstructor ? 'col-span-full md:col-span-2 md:row-span-2 shadow-xl shadow-zoom-blue/5 border-zoom-blue/20' : 'aspect-video'} ${isSelf ? 'ring-2 ring-zoom-blue/30 ring-inset' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        onLoadedMetadata={(e) => { e.target.play().catch(err => console.warn('Video auto-play prevented:', err)) }}
        className={`w-full h-full object-cover ${isSelf ? '-scale-x-100' : ''}`}
        style={{ display: (!stream || isVideoOff) ? 'none' : 'block' }}
      />
      {/* Avatar shown when video is off or no stream yet */}
      {(!stream || isVideoOff) && (
        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
            <span className="text-2xl sm:text-3xl font-bold text-zinc-400 select-none">
              {name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
            </span>
          </div>
        </div>
      )}
      
      {/* Footer Info Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 max-w-full">
          <span className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-md select-none">{name}{isSelf ? ' (You)' : ''}</span>
          {(isMuted || isVideoOff) && (
            <div className="flex gap-1.5 shrink-0">
              {isMuted && <span className="w-5 h-5 flex items-center justify-center bg-red-500 rounded-full text-[10px] shadow-lg">🔇</span>}
              {isVideoOff && <span className="w-5 h-5 flex items-center justify-center bg-zinc-800 rounded-full text-[10px] border border-zinc-700">📷</span>}
            </div>
          )}
        </div>
      </div>

      {isInstructor && <div className="absolute top-3 left-3 bg-zoom-blue/90 backdrop-blur-sm text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg select-none">Instructor</div>}
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
        try {
          // Pass sessionId so server marks attendance before ending
          socket.emit('end-live-session', { roomId: roomId.current, sessionId });
          await sessionsAPI.endLive(sessionId);
        } catch (e) { /* ignore */ }
        cleanup();
        navigate(-1);
      } else {
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
      console.log(`[WebRTC] Received explicit OFFER from ${from.userId}`);
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
        console.log(`[WebRTC] ontrack triggered by offer stream! Tracks:`, e.streams ? e.streams.length : 'none');
        if (!pc._builtStream) {
          pc._builtStream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
        } else if (!e.streams || !e.streams[0]) {
          pc._builtStream.addTrack(e.track);
        }
        
        setParticipants(prev => {
          const remoteStream = pc._builtStream;
          const existing = prev.find(p => p.socketId === from.socketId);
          if (existing) {
             return prev.map(p => p.socketId === from.socketId ? { ...p, stream: remoteStream } : p);
          }
          // Fallback if peer-joined was missed
          return [...prev, { userId: from.userId, userName: 'Participant', role: 'student', socketId: from.socketId, stream: remoteStream, audioEnabled: true, videoEnabled: true }];
        });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Drain queued ICE candidates
      if (pc._iceQueue.length > 0) {
        for (const c of pc._iceQueue) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
        }
        pc._iceQueue = [];
      }

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
      console.log(`[WebRTC] Received explicit ANSWER from ${from.socketId}`);
      const pc = peerConnectionsRef.current[from.socketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Drain queued ICE candidates
        if (pc._iceQueue?.length > 0) {
          for (const c of pc._iceQueue) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
          }
          pc._iceQueue = [];
        }
      }
    });

    // Receive ICE candidate
    socket.on('receive-ice-candidate', async ({ candidate, from }) => {
      const pc = peerConnectionsRef.current[from.socketId];
      if (pc && candidate) {
        if (!pc.remoteDescription) {
          pc._iceQueue = pc._iceQueue || [];
          pc._iceQueue.push(candidate);
        } else {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
        }
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
    console.log(`[WebRTC] Initiating call to new peer: ${targetUserId}`);
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
      console.log(`[WebRTC] ontrack triggered by answer stream! Tracks:`, e.streams ? e.streams.length : 'none');
      if (!pc._builtStream) {
        pc._builtStream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
      } else if (!e.streams || !e.streams[0]) {
        pc._builtStream.addTrack(e.track);
      }

      setParticipants(prev => {
        const remoteStream = pc._builtStream;
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
        // Get the room ID. Attendance is now tracked server-side via socket presence time.
        const res = await sessionsAPI.joinLive(sessionId);
        roomId.current = res.data.liveRoomId;
      } else {
        roomId.current = session.liveRoomId;
      }

      const stream = await getUserMedia();
      if (!stream) { setJoining(false); return; }

      // Connect socket
      socket.auth = { token: localStorage.getItem('token') };
      socket.connect();
      await new Promise((resolve, reject) => {
        if (socket.connected) return resolve();
        
        const onConnect = () => {
          socket.off('connect_error', onError);
          resolve();
        };
        const onError = (err) => {
          socket.off('connect', onConnect);
          reject(err);
        };
        
        socket.once('connect', onConnect);
        socket.once('connect_error', onError);
        
        // Safety timeout
        setTimeout(() => {
          socket.off('connect', onConnect);
          socket.off('connect_error', onError);
          reject(new Error('WebSocket connection timed out or authentication failed.'));
        }, 7000);
      });

      setupSocketListeners(stream);

      socket.emit('join-live-room', {
        roomId: roomId.current
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
      // Pass sessionId so server can mark attendance before ending
      socket.emit('end-live-session', { roomId: roomId.current, sessionId });
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center -m-4 sm:-m-6 md:-m-10">
        <span className="loading-spinner w-10 h-10 border-[3px]" />
        <p className="text-zinc-500 font-medium mt-4">Loading session matrix...</p>
      </div>
    );
  }

  if (error && !inRoom) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center -m-4 sm:-m-6 md:-m-10">
        <div className="text-6xl mb-4 opacity-80">⚠️</div>
        <p className="text-red-400 font-medium max-w-md">{error}</p>
        <button className="mt-8 px-6 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center -m-4 sm:-m-6 md:-m-10 animate-fade-in">
        <div className="text-6xl mb-4">🏁</div>
        <h2 className="text-2xl font-bold text-white mb-2">Session Ended</h2>
        <p className="text-zinc-400 font-medium">The instructor has concluded the live session. Redirecting you...</p>
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 -m-4 sm:-m-6 md:-m-10 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zoom-blue/20 via-zinc-950 to-zinc-950 pointer-events-none"></div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl p-8 relative z-10 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4 animate-pulse">
               🔴 Live Room
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">{session?.title || session?.topic || 'Live Class Session'}</h1>
            <p className="text-sm font-medium text-zoom-blue uppercase tracking-wider mb-2">{session?.course?.title} &middot; {session?.course?.code}</p>
            <p className="text-sm text-zinc-400 font-medium px-4 py-1.5 bg-zinc-950 rounded-lg inline-block border border-zinc-800">{session?.startTime} &mdash; {session?.endTime} IST</p>
          </div>

          {/* Session expired notice */}
          {sessionExpired && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium mb-6 text-center">
              ⏱️ This session has ended (past scheduled end time of {session?.endTime} IST).
            </div>
          )}

          {/* Instructor: countdown to start window */}
          {isInstructor && !isLive && !sessionExpired && timeToStart !== null && (
            <div className="bg-zoom-blue/10 border border-zoom-blue/30 rounded-xl p-5 mb-6 flex items-start gap-4">
              <span className="text-3xl mt-1">⏳</span>
              <div>
                <strong className="block text-white mb-1">Session hasn't started yet</strong>
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                  Scheduled: <strong className="text-zinc-300">{session?.startTime} IST</strong>. You can start it 10 minutes before.
                </p>
                <div className="inline-block bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-sm font-bold text-zoom-blue">
                  ⏱ {countdownStr} until early-start allowed
                </div>
              </div>
            </div>
          )}

          {/* Student: not live yet info */}
          {!isInstructor && !isLive && !sessionExpired && (
            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 mb-6 flex items-center gap-4 text-center justify-center flex-col sm:flex-row sm:text-left">
              <span className="text-3xl">⏰</span>
              <div>
                <strong className="block text-white mb-1">Waiting for instructor...</strong>
                <p className="text-zinc-400 text-sm">
                  Session is scheduled for <strong className="text-zinc-300">{session?.startTime} &mdash; {session?.endTime} IST</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Attendance info notice for student */}
          {!isInstructor && isLive && (
            <div className="bg-zoom-blue/10 border border-zoom-blue/30 rounded-xl p-4 mb-6 flex gap-3 items-center">
              <span className="text-2xl shrink-0">📊</span>
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed m-0">
                Attendance is <strong className="text-white">tracked automatically</strong> by your presence.
                Stay for at least <strong className="text-white">5/6</strong> of the duration to be marked present.
              </p>
            </div>
          )}

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm font-medium mb-6 text-center">{error}</div>}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {isInstructor ? (
              isLive ? (
                <button className="w-full py-3.5 rounded-xl text-white font-bold bg-zoom-blue hover:bg-blue-600 transition shadow-lg shadow-zoom-blue/20 flex justify-center items-center h-[52px]" onClick={joinRoom} disabled={joining}>
                  {joining ? <span className="loading-spinner" /> : '🎥 Rejoin Your Session'}
                </button>
              ) : (
                <button
                  className={`w-full py-3.5 rounded-xl font-bold transition shadow-lg h-[52px] flex justify-center items-center text-white
                    ${(!canStartNow || sessionExpired) ? 'bg-zinc-800 border items-center border-zinc-700 text-zinc-500 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20 border border-red-500'}`}
                  onClick={handleStartLive}
                  disabled={joining || sessionExpired || !canStartNow}
                >
                  {joining ? <span className="loading-spinner" /> : sessionExpired ? '⛔ Session Ended' : (!canStartNow ? `🔒 Starts at ${session?.startTime} IST` : '🔴 Start Platform Broadcasting')}
                </button>
              )
            ) : (
              isLive ? (
                <button className="w-full py-3.5 rounded-xl text-white font-bold bg-zoom-blue hover:bg-blue-600 transition shadow-lg shadow-zoom-blue/20 flex justify-center items-center h-[52px]" onClick={joinRoom} disabled={joining}>
                  {joining ? <span className="loading-spinner" /> : '🎥 Join Live Room'}
                </button>
              ) : (
                <div className="text-center bg-zinc-950 rounded-xl border border-zinc-800 p-6 mb-2">
                  <div className="text-4xl mb-3 opacity-50">📡</div>
                  <p className="text-sm font-medium text-zinc-500 mb-4">Instructor is off-air.</p>
                  <button className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition border border-zinc-700" onClick={() => loadSession()}>🔄 Refresh Status</button>
                </div>
              )
            )}
            <button className="w-full py-3 rounded-xl text-zinc-400 font-bold hover:bg-zinc-800 hover:text-white transition" onClick={() => navigate(-1)}>Go Back</button>
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
    <div className="min-h-screen bg-black flex flex-col -m-4 sm:-m-6 md:-m-10">
      {/* Top bar */}
      <div className="h-14 sm:h-16 px-4 sm:px-6 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold text-red-500 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            LIVE
          </div>
          <span className="text-sm sm:text-base font-bold text-white truncate max-w-[150px] sm:max-w-xs">{session?.title || session?.topic || 'Live Session'}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {!isInstructor && (
            <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider text-zoom-blue bg-zoom-blue/10 border border-zoom-blue/20 px-2.5 py-1 rounded-md items-center gap-1.5">
              <span>📊</span> Auto-Attendance Active
            </span>
          )}
          <span className="px-3 py-1.5 bg-zinc-800 rounded-lg text-xs font-bold text-white border border-zinc-700 flex items-center gap-2">
            <span className="text-zinc-400">👥</span>
            {participantCount || allParticipants.length} Connected
          </span>
        </div>
      </div>

      {/* Video grid area (Cinematic Black Canvas) */}
      <div className="flex-1 p-2 sm:p-4 overflow-y-auto relative">
        <div className={`grid gap-2 sm:gap-4 h-full w-full mx-auto align-content-center
          ${allParticipants.length === 1 ? 'grid-cols-1 max-w-4xl max-h-[70vh]' : 
            allParticipants.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-5xl items-center' : 
            allParticipants.length <= 4 ? 'grid-cols-2' : 
            'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}
        `}>
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
      </div>

      {/* Bottom Control bar */}
      <div className="h-20 sm:h-24 bg-zinc-950 border-t border-zinc-800/80 shrink-0 flex items-center justify-center gap-3 sm:gap-6 px-4">
        
        <button
          className={`flex flex-col items-center justify-center w-12 sm:w-16 h-12 sm:h-16 rounded-2xl transition hover:-translate-y-1 group ${!audioEnabled ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'}`}
          onClick={toggleAudio}
        >
          <span className="text-xl sm:text-2xl mb-1 drop-shadow-sm">{audioEnabled ? '🎙️' : '🔇'}</span>
        </button>

        <button
          className={`flex flex-col items-center justify-center w-12 sm:w-16 h-12 sm:h-16 rounded-2xl transition hover:-translate-y-1 group ${!videoEnabled ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'}`}
          onClick={toggleVideo}
        >
          <span className="text-xl sm:text-2xl mb-1 drop-shadow-sm">{videoEnabled ? '📹' : '📷'}</span>
        </button>

        <div className="w-px h-8 bg-zinc-800/80 mx-1 sm:mx-2"></div>

        {isInstructor ? (
          <button className="flex items-center gap-2 h-12 sm:h-16 px-5 sm:px-8 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition shadow-lg shadow-red-600/20 text-sm sm:text-base border border-red-500 hover:-translate-y-1" onClick={handleEndLive}>
            🔴 <span className="hidden sm:inline">End Session</span><span className="sm:hidden">End</span>
          </button>
        ) : (
          <button className="flex items-center gap-2 h-12 sm:h-16 px-5 sm:px-8 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-2xl font-bold transition text-sm sm:text-base hover:-translate-y-1" onClick={handleLeave}>
            🚪 <span className="hidden sm:inline">Leave Room</span><span className="sm:hidden">Leave</span>
          </button>
        )}
      </div>
    </div>
  );
}
