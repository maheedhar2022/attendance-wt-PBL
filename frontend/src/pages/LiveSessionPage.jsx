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
  pc._iceQueue = []; 
  
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
function VideoTile({ stream, name, avatar, isSelf, isMuted, isVideoOff, isInstructor, dominant = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
      if (stream) {
        videoRef.current.play().catch(e => console.warn('Video auto-play prevented:', e));
      }
    }
  }, [stream]);

  return (
    <div className={`relative bg-zinc-900 overflow-hidden flex items-center justify-center group ${dominant ? 'w-full h-full rounded-2xl shadow-2xl ring-1 ring-white/10' : 'aspect-video rounded-xl shadow-lg ring-1 ring-white/5'} ${isSelf && !dominant ? 'ring-2 ring-zoom-blue/50' : ''} transition-all duration-300`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        onLoadedMetadata={(e) => { e.target.play().catch(err => console.warn('Auto-play prevented:', err)) }}
        className={`w-full h-full object-cover ${isSelf ? '-scale-x-100' : ''} transition-opacity duration-500`}
        style={{ opacity: (!stream || isVideoOff) ? 0 : 1 }}
      />
      
      {(!stream || isVideoOff) && (
        <div className="absolute inset-0 bg-zinc-900/95 flex items-center justify-center backdrop-blur-md">
          {avatar ? (
            <img src={avatar} alt={name} className={`${dominant ? 'w-48 h-48' : 'w-16 h-16'} rounded-full object-cover shadow-inner border border-zinc-600/50`} />
          ) : (
            <div className={`${dominant ? 'w-48 h-48 text-5xl' : 'w-16 h-16 text-xl'} rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-white flex items-center justify-center font-bold shadow-inner border border-zinc-600/50`}>
              {name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
            </div>
          )}
        </div>
      )}

      {/* Overlays */}
      <div className="absolute flex justify-between items-end gap-2 pointer-events-none left-3 bottom-3 right-3 lg:left-4 lg:bottom-4 lg:right-4">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-full">
          <span className="text-xs sm:text-sm font-medium tracking-wide text-white drop-shadow-md truncate">
            {name}{isSelf ? ' (You)' : ''}
          </span>
          {(isMuted || isVideoOff) && (
            <div className="flex gap-1.5 shrink-0 ml-1">
              {isMuted && <span className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full text-white shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M10.428 3.57a.75.75 0 00-1.127-.089l-3.32 3.32H3.75A1.75 1.75 0 002 8.55v2.9a1.75 1.75 0 001.75 1.75h2.231l3.32 3.32a.75.75 0 001.128-.089C11.536 15.352 12 13.916 12 12.339V7.66c0-1.576-.464-3.013-1.572-4.09zM15.45 4.55a.75.75 0 011.06 0 10.463 10.463 0 010 14.9.75.75 0 11-1.06-1.06 8.963 8.963 0 000-12.78.75.75 0 010-1.06z" /><path d="M12.98 7.02a.75.75 0 011.06 0 6.965 6.965 0 010 9.96.75.75 0 11-1.06-1.06 5.465 5.465 0 000-7.84.75.75 0 010-1.06z" /><path fillRule="evenodd" d="M1.373 1.956a.75.75 0 011.05-.183l16 12a.75.75 0 11-.9 1.2l-16-12a.75.75 0 01-.15-1.017z" clipRule="evenodd" /></svg></span>}
              {isVideoOff && <span className="flex items-center justify-center w-5 h-5 bg-zinc-800 border border-zinc-700 rounded-full text-white shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M11.96 4.69a.75.75 0 01.128.92l-2.484 3.727-2.67-1.87A1.5 1.5 0 005.1 7.234l-1.92 1.343A1.5 1.5 0 002.5 9.8v3.45a1.5 1.5 0 001.5 1.5h7.02c-.01-.064-.02-.128-.02-.193v-2.02A12.016 12.016 0 0112 12.5v-1a.75.75 0 111.5 0v1a10.516 10.516 0 00-1-0.038v2.038a3.5 3.5 0 11-7 0v-2.5h2v1.5a1.5 1.5 0 003 0v-2a.75.75 0 011.23-.577l2.5 2A.75.75 0 0115 11.5v-6a.75.75 0 011.23-.578l2.5 2c.453.363 1.134-.043 1.134-.62v-4.6c0-.578-.68-.984-1.133-.62l-2.5 2v-.332a.75.75 0 00-.75-.75h-7.5zm1.536 7.644l-2.5-2A.75.75 0 0010 11.022v6.956c0 .578.68.984 1.133.62l2.5-2A.75.75 0 0014 15.932v-2.908a.75.75 0 00-.274-.59z" /></svg></span>}
            </div>
          )}
        </div>
      </div>
      
      {isInstructor && (
        <div className="absolute top-3 left-3 lg:top-4 lg:left-4">
          <div className="bg-zoom-blue/95 backdrop-blur-md text-white px-2 py-1 text-[10px] font-bold tracking-widest uppercase rounded flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            Instructor
          </div>
        </div>
      )}
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

  // Participants
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Time tracking
  const [timeToStart, setTimeToStart] = useState(null);
  const [canStartNow, setCanStartNow] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  const timeCheckRef = useRef(null);
  const autoEndTimerRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const roomId = useRef('');

  // ── Build IST Date ────────
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

  // ── Time-window enforcement
  useEffect(() => {
    if (!session || !isInstructor) return;
    const check = () => {
      const start = buildISTDateTime(session.date, session.startTime);
      const end   = buildISTDateTime(session.date, session.endTime);
      if (!start || !end) return;
      const now = new Date();
      const tenMinBefore = new Date(start.getTime() - 10 * 60 * 1000);

      if (now > end) {
        setSessionExpired(true); setCanStartNow(false); setTimeToStart(null);
      } else if (now >= tenMinBefore) {
        setCanStartNow(true); setSessionExpired(false); setTimeToStart(null);
      } else {
        setCanStartNow(false); setSessionExpired(false);
        setTimeToStart(Math.ceil((tenMinBefore - now) / 1000));
      }
    };
    check();
    timeCheckRef.current = setInterval(check, 15000);
    return () => clearInterval(timeCheckRef.current);
  }, [session, isInstructor]);

  // ── Auto-end client-side
  useEffect(() => {
    if (!session || !inRoom) return;
    const end = buildISTDateTime(session.date, session.endTime);
    if (!end) return;
    const msUntilEnd = end.getTime() - Date.now();
    if (msUntilEnd <= 0) return;

    autoEndTimerRef.current = setTimeout(async () => {
      if (isInstructor) {
        try {
          socket.emit('end-live-session', { roomId: roomId.current, sessionId });
          await sessionsAPI.endLive(sessionId);
        } catch (e) {}
        cleanup();
        navigate(-1);
      } else {
        setSessionEnded(true);
        setTimeout(() => navigate(-1), 4000);
      }
    }, msUntilEnd);
    return () => clearTimeout(autoEndTimerRef.current);
  }, [session, inRoom]);

  // ── Cleanup
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    if (timeCheckRef.current) clearInterval(timeCheckRef.current);
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
    ['room-participants', 'peer-joined', 'peer-left', 'receive-offer', 'receive-answer', 'receive-ice-candidate', 'peer-media-state', 'peer-chat-message', 'participant-count', 'session-ended'].forEach(ev => socket.off(ev));
    socket.disconnect();
  }, []);

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
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

  const setupSocketListeners = useCallback((stream) => {
    socket.on('room-participants', (existing) => {
      existing.forEach(async (p) => await callPeer(p.socketId, p.userId, p.userName, p.role, p.avatar, stream));
    });

    socket.on('peer-joined', ({ peerId, userName, role, avatar, socketId }) => {
      setParticipants(prev => {
        if (prev.find(p => p.userId === peerId)) return prev;
        return [...prev, { userId: peerId, userName, role, avatar, socketId, stream: null, audioEnabled: true, videoEnabled: true }];
      });
    });

    socket.on('peer-left', ({ userId: leftId }) => {
      setParticipants(prev => prev.filter(p => p.userId !== leftId));
      const entry = Object.entries(peerConnectionsRef.current).find(([socketId, pc]) => pc._remoteUserId === leftId);
      if (entry) { entry[1].close(); delete peerConnectionsRef.current[entry[0]]; }
    });

    socket.on('receive-offer', async ({ offer, from }) => {
      const pc = createPeer(stream);
      pc._remoteSocketId = from.socketId; pc._remoteUserId = from.userId;
      peerConnectionsRef.current[from.socketId] = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('relay-ice-candidate', { to: from.socketId, candidate: e.candidate, from: { socketId: socket.id, userId: user._id } });
      };

      pc.ontrack = (e) => {
        if (!pc._builtStream) pc._builtStream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
        else if (!e.streams || !e.streams[0]) pc._builtStream.addTrack(e.track);
        
        setParticipants(prev => {
          if (prev.find(p => p.socketId === from.socketId)) return prev.map(p => p.socketId === from.socketId ? { ...p, stream: pc._builtStream } : p);
          return [...prev, { userId: from.userId, userName: from.userName || 'Participant', role: from.role || 'student', avatar: from.avatar, socketId: from.socketId, stream: pc._builtStream, audioEnabled: true, videoEnabled: true }];
        });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (pc._iceQueue.length > 0) {
        for (const c of pc._iceQueue) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e){} }
        pc._iceQueue = [];
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('relay-answer', { to: from.socketId, answer, from: { socketId: socket.id, userId: user._id } });
    });

    socket.on('receive-answer', async ({ answer, from }) => {
      const pc = peerConnectionsRef.current[from.socketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        if (pc._iceQueue?.length > 0) {
          for (const c of pc._iceQueue) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e){} }
          pc._iceQueue = [];
        }
      }
    });

    socket.on('receive-ice-candidate', async ({ candidate, from }) => {
      const pc = peerConnectionsRef.current[from.socketId];
      if (pc && candidate) {
        if (!pc.remoteDescription) { pc._iceQueue = pc._iceQueue || []; pc._iceQueue.push(candidate); }
        else { try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e){} }
      }
    });

    socket.on('peer-media-state', ({ userId: uid, audioEnabled: a, videoEnabled: v }) => {
      setParticipants(prev => prev.map(p => p.userId === uid ? { ...p, audioEnabled: a, videoEnabled: v } : p));
    });

    socket.on('peer-chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      setIsChatOpen(prevOpen => {
        if (!prevOpen) setUnreadCount(c => c + 1);
        return prevOpen;
      });
    });

    socket.on('participant-count', count => setParticipantCount(count));
    socket.on('session-ended', () => { setSessionEnded(true); setTimeout(() => navigate(-1), 4000); });
  }, [user, navigate]);

  const callPeer = async (targetSocketId, targetUserId, targetName, targetRole, targetAvatar, stream) => {
    const pc = createPeer(stream);
    pc._remoteSocketId = targetSocketId; pc._remoteUserId = targetUserId;
    peerConnectionsRef.current[targetSocketId] = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('relay-ice-candidate', { to: targetSocketId, candidate: e.candidate, from: { socketId: socket.id, userId: user._id } });
    };

    pc.ontrack = (e) => {
      if (!pc._builtStream) pc._builtStream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
      else if (!e.streams || !e.streams[0]) pc._builtStream.addTrack(e.track);

      setParticipants(prev => {
        if (prev.find(p => p.userId === targetUserId)) return prev.map(p => p.userId === targetUserId ? { ...p, stream: pc._builtStream } : p);
        return [...prev, { userId: targetUserId, userName: targetName, role: targetRole, avatar: targetAvatar, socketId: targetSocketId, stream: pc._builtStream, audioEnabled: true, videoEnabled: true }];
      });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('relay-offer', { to: targetSocketId, offer, from: { socketId: socket.id, userId: user._id } });

    setParticipants(prev => {
      if (prev.find(p => p.userId === targetUserId)) return prev;
      return [...prev, { userId: targetUserId, userName: targetName, role: targetRole, avatar: targetAvatar, socketId: targetSocketId, stream: null, audioEnabled: true, videoEnabled: true }];
    });
  };

  const joinRoom = async () => {
    setJoining(true); setError('');
    try {
      if (!isInstructor) {
        const res = await sessionsAPI.joinLive(sessionId);
        roomId.current = res.data.liveRoomId;
      } else roomId.current = session.liveRoomId;

      const stream = await getUserMedia();
      if (!stream) { setJoining(false); return; }

      socket.auth = { token: localStorage.getItem('token') };
      socket.connect();
      await new Promise((resolve, reject) => {
        if (socket.connected) return resolve();
        const onConnect = () => { socket.off('connect_error', onError); resolve(); };
        const onError = (err) => { socket.off('connect', onConnect); reject(err); };
        socket.once('connect', onConnect); socket.once('connect_error', onError);
        setTimeout(() => { socket.off('connect', onConnect); socket.off('connect_error', onError); reject(new Error('Connection timed out.')); }, 7000);
      });

      setupSocketListeners(stream);
      socket.emit('join-live-room', { roomId: roomId.current });
      
      // Explicitly broadcast our initial media setup so peers know if our video is off.
      // E.g. we didn't have a camera, so we fallback to audio-only.
      setTimeout(() => {
        const audioIsOn = stream ? stream.getAudioTracks().some(t => t.enabled) : true;
        const videoIsOn = stream ? stream.getVideoTracks().some(t => t.enabled) : false;
        socket.emit('media-state-change', { roomId: roomId.current, userId: user._id, audioEnabled: audioIsOn, videoEnabled: videoIsOn });
      }, 500);

      setInRoom(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join live session.');
    } finally { setJoining(false); }
  };

  const handleStartLive = async () => {
    if (!canStartNow && !session?.liveSessionActive) return setError(`Cannot start yet. Scheduled for ${session.startTime} IST.`);
    setJoining(true); setError('');
    try {
      const res = await sessionsAPI.startLive(sessionId);
      setSession(res.data.session);
      await joinRoom();
    } catch (err) { setError(err.response?.data?.message || 'Failed to start live session.'); setJoining(false); }
  };

  const handleEndLive = async () => {
    if (!window.confirm('End the session for everyone?')) return;
    try { await sessionsAPI.endLive(sessionId); cleanup(); navigate(-1); } catch (e) {}
  };

  const handleLeave = () => {
    cleanup();
    navigate(-1);
  };

  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    setAudioEnabled(!audioEnabled);
    socket.emit('media-state-change', { roomId: roomId.current, userId: user._id, audioEnabled: !audioEnabled, videoEnabled });
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    setVideoEnabled(!videoEnabled);
    socket.emit('media-state-change', { roomId: roomId.current, userId: user._id, audioEnabled, videoEnabled: !videoEnabled });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msgData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      userId: user._id, userName: user.name, role: user.role, avatar: user.avatar,
      message: chatInput.trim(), timestamp: new Date()
    };
    setChatMessages(prev => [...prev, msgData]);
    socket.emit('session-chat-message', { roomId: roomId.current, message: chatInput.trim() });
    setChatInput('');
  };

  useEffect(() => {
    if (isChatOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  /* ── RENDER: Lobby ════════════════════════════════ */
  if (loading) return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center fixed inset-0 z-[100]">
      <div className="w-12 h-12 border-4 border-zinc-800 border-t-zoom-blue rounded-full animate-spin"></div>
      <p className="text-zinc-500 font-medium mt-6 tracking-wide animate-pulse">Loading session data...</p>
    </div>
  );

  if (error && !inRoom) return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-6 fixed inset-0 z-[100] text-center">
      <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md w-full shadow-2xl">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 text-3xl">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-3">Unable to Join</h2>
        <p className="text-zinc-400 font-medium leading-relaxed mb-8">{error}</p>
        <button onClick={() => navigate(-1)} className="w-full py-4 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors shadow-lg border border-zinc-700">Return to Dashboard</button>
      </div>
    </div>
  );

  if (sessionEnded) return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-6 fixed inset-0 z-[100]">
      <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl max-w-md w-full text-center shadow-2xl animate-fade-in transition-all">
        <div className="w-24 h-24 bg-zoom-blue/10 rounded-full flex items-center justify-center mx-auto mb-6 text-zoom-blue text-4xl transform transition-transform hover:scale-110">🏁</div>
        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Session Ended</h2>
        <p className="text-zinc-400 font-medium leading-relaxed mb-8">The host has concluded this session. Redirecting you shortly...</p>
        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden"><div className="bg-zoom-blue h-full rounded-full animate-[progress_4s_ease-in-out_forwards]"></div></div>
      </div>
    </div>
  );

  if (!inRoom) {
     const isLive = session?.liveSessionActive;
     const countdownStr = timeToStart !== null ? `${Math.floor(timeToStart / 3600) > 0 ? Math.floor(timeToStart / 3600) + 'h ' : ''}${Math.floor((timeToStart % 3600) / 60)}m ${timeToStart % 60}s` : null;

     return (
       <div className="h-screen w-full bg-zinc-950 flex fixed inset-0 z-50">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zoom-blue/10 via-zinc-950 to-zinc-950 pointer-events-none"></div>
         <div className="m-auto w-full max-w-4xl px-4 sm:px-6 relative z-10 flex">
           <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row backdrop-blur-xl w-full">
             {/* Left Panel */}
             <div className="p-8 md:p-12 md:w-[55%] border-b md:border-b-0 md:border-r border-zinc-800/80 bg-zinc-900/40 flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zoom-blue via-blue-500 to-purple-600"></div>
               <div className="flex items-center gap-3 mb-8">
                 {isLive ? (
                   <span className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live Now
                   </span>
                 ) : (
                   <span className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700">
                     <span className="w-2 h-2 rounded-full bg-zinc-500"></span> Scheduled
                   </span>
                 )}
               </div>
               <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight">{session?.title || session?.topic || 'Live Class Session'}</h1>
               <div className="text-zoom-blue font-semibold mb-8 text-sm sm:text-base tracking-wide flex items-center gap-2">{session?.course?.title} <span className="w-1 h-1 rounded-full bg-zoom-blue/50"></span> {session?.course?.code}</div>
               <div className="space-y-4">
                 <div className="flex items-center gap-4 text-zinc-300 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/50">
                   <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                   <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">Time Period (IST)</span><span className="font-semibold">{session?.startTime} &mdash; {session?.endTime}</span></div>
                 </div>
                 <div className="flex items-center gap-4 text-zinc-300 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/50">
                   <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg></div>
                   <div className="flex flex-col"><span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">Session Host</span><span className="font-semibold">{session?.instructor?.name || 'Instructor'}</span></div>
                 </div>
               </div>
             </div>
             {/* Right Panel */}
             <div className="p-8 md:p-12 md:w-[45%] flex flex-col justify-center items-center text-center">
               {sessionExpired && (
                 <div className="mb-8 w-full"><div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><h3 className="text-red-400 font-bold text-lg mb-1">Session Ended</h3><p className="text-zinc-500 text-sm">This class is already over.</p></div>
               )}
               {!sessionExpired && isInstructor && !isLive && timeToStart !== null && (
                 <div className="mb-8 w-full"><div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3">Broadcast Opens In</div><div className="text-4xl sm:text-5xl font-mono text-white tracking-wider font-light">{countdownStr}</div></div>
               )}
               {!sessionExpired && !isInstructor && !isLive && (
                 <div className="mb-8 w-full"><div className="w-20 h-20 bg-zoom-blue/10 rounded-full flex items-center justify-center text-zoom-blue mx-auto mb-4 animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg></div><h3 className="text-white font-bold text-lg mb-2">Please Wait</h3><p className="text-zinc-400 text-sm">The host will start the session soon.</p></div>
               )}
               {!isInstructor && isLive && (
                <p className="text-xs text-zinc-500 mb-6 font-medium">Wait for host admission. Make sure your video and audio devices are connected.</p>
               )}
               <div className="w-full space-y-3 mt-auto">
                 {isInstructor ? (
                   isLive ? (
                     <button className="w-full py-4 rounded-xl text-white font-bold text-sm bg-zoom-blue hover:bg-blue-600 transition shadow-lg shadow-zoom-blue/20 flex gap-2 justify-center items-center" onClick={joinRoom} disabled={joining}>{joining ? <span className="loading-spinner w-5 h-5 mx-auto block" /> : <>Re-join Broadcast</>}</button>
                   ) : (
                     <button className={`w-full py-4 rounded-xl font-bold text-sm transition shadow-lg flex justify-center gap-2 items-center text-white ${(!canStartNow || sessionExpired) ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20 border border-red-500 hover:-translate-y-0.5'}`} onClick={handleStartLive} disabled={joining || sessionExpired || !canStartNow}>{joining ? <span className="loading-spinner" /> : sessionExpired ? 'Ended' : (!canStartNow ? `Starts at ${session?.startTime}` : 'Start Broadcast')}</button>
                   )
                 ) : (
                   isLive ? (
                     <button className="w-full py-4 rounded-xl text-white font-bold text-sm bg-zoom-blue hover:bg-blue-600 transition-all shadow-lg shadow-zoom-blue/20 hover:-translate-y-0.5" onClick={joinRoom} disabled={joining}>{joining ? <span className="loading-spinner w-5 h-5 mx-auto block" /> : 'Join Session'}</button>
                   ) : (
                     <button className="w-full py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition border border-zinc-700" onClick={() => loadSession()}>Refresh Status</button>
                   )
                 )}
                 <button className="w-full py-3.5 rounded-xl text-zinc-400 font-bold hover:bg-zinc-800 hover:text-white transition text-sm" onClick={() => navigate(-1)}>Return to Dashboard</button>
               </div>
             </div>
           </div>
         </div>
       </div>
     );
  }

  /* ── RENDER: In-room ═══════════════════════════════════════ */
  const allParticipants = [{ userId: user._id, userName: user.name, role: user.role, avatar: user.avatar, stream: localStream, audioEnabled, videoEnabled, isSelf: true }, ...participants];
  const instructorParticipant = allParticipants.find(p => p.role === 'instructor');
  const studentParticipants = allParticipants.filter(p => p.role !== 'instructor');

  return (
    <div className="h-screen w-full bg-black flex flex-col fixed inset-0 overflow-hidden text-zinc-100 font-sans z-[100]">
      {/* Top Header */}
      <header className="h-16 px-4 sm:px-6 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800/80 flex items-center justify-between z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-zoom-blue to-blue-600 shadow-md">
            <span className="text-white font-bold text-xs">AX</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide max-w-[150px] sm:max-w-xs md:max-w-md truncate leading-tight">
              {session?.title || session?.topic || 'Live Session'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
               <p className="text-[10px] text-zoom-blue font-semibold tracking-wider uppercase">{session?.course?.code}</p>
               <span className="w-1 h-1 rounded-full bg-zinc-700 hidden sm:block"></span>
               {isInstructor && <p className="text-[10px] text-zinc-500 font-medium hidden sm:block">Host Controls Enabled</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {!isInstructor && (
             <span className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zoom-blue/10 text-zoom-blue text-[10px] font-bold uppercase tracking-widest border border-zoom-blue/20">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
               Attendance Logged
             </span>
           )}
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/80 text-white font-medium text-sm shadow-inner cursor-default hover:bg-zinc-700 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-zinc-400"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" /></svg>
             {participantCount || allParticipants.length}
           </div>
        </div>
      </header>

      {/* Main Content & Sidebar Wrapper */}
      <div className="flex-1 overflow-hidden flex relative">
        
        {/* Main Video Area */}
        <main className={`flex-1 p-2 sm:p-4 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black transition-all ${isChatOpen ? 'pr-2 md:pr-4' : ''}`}>
          {/* Gallery / Spotlight View */}
          <div className={`w-full h-full mx-auto flex gap-4 ${instructorParticipant && studentParticipants.length > 0 ? 'flex-col md:flex-row' : ''}`}>
            
            {/* Spotlight (Instructor) */}
            {instructorParticipant && (
              <div className={`transition-all duration-500 ease-in-out ${studentParticipants.length > 0 ? 'h-3/5 md:h-full md:flex-1 lg:w-3/4' : 'w-full h-full mx-auto'}`}>
                <VideoTile stream={instructorParticipant.stream} name={instructorParticipant.userName} avatar={instructorParticipant.avatar} isSelf={instructorParticipant.isSelf} isMuted={!instructorParticipant.audioEnabled} isVideoOff={!instructorParticipant.videoEnabled} isInstructor={true} dominant={true} />
              </div>
            )}

            {/* Gallery (Students) */}
            <div className={`transition-all overflow-y-auto custom-scrollbar content-start
              ${studentParticipants.length === 0 ? 'hidden' : ''}
              ${instructorParticipant ? 'h-2/5 md:h-full md:w-64 lg:w-80 flex gap-2 md:block space-y-0 md:space-y-4' : 
                `grid gap-4 w-full h-full mx-auto items-center justify-center
                 ${studentParticipants.length === 1 ? 'grid-cols-1 md:grid-cols-2' : 
                   studentParticipants.length <= 4 ? 'grid-cols-2 lg:grid-cols-2' : 
                   studentParticipants.length <= 9 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}
                `}`}
            >
              {(!instructorParticipant ? allParticipants : studentParticipants).map(p => (
                <div key={p.userId} className={`${instructorParticipant ? 'w-48 shrink-0 md:w-full md:aspect-video aspect-video' : ''}`}>
                  <VideoTile stream={p.stream} name={p.userName} avatar={p.avatar} isSelf={p.isSelf} isMuted={!p.audioEnabled} isVideoOff={!p.videoEnabled} isInstructor={p.role === 'instructor'} />
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Chat Sidebar */}
        {isChatOpen && (
          <aside className="w-full md:w-[340px] border-l border-zinc-800 bg-zinc-950/90 backdrop-blur-2xl flex flex-col shrink-0 z-40 absolute md:relative right-0 h-full shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="h-16 px-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-zoom-blue"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75c2.605 0 4.97-.935 6.772-2.5l2.478 2.478c.31.31.782.164.846-.263l.354-2.316a9.75 9.75 0 00-10.45-19.4z" clipRule="evenodd" /></svg>
                Session Chat
              </h3>
              <button onClick={() => setIsChatOpen(false)} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg></button>
            </div>
            
            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-zinc-950/40">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                  <span className="text-4xl mb-3 opacity-20">💬</span>
                  <p>No messages yet.</p>
                  <p className="text-xs opacity-70">Say hello!</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.userId === user._id ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-end gap-2 max-w-[85%]">
                      {msg.userId !== user._id && (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0 border border-zinc-700 overflow-hidden text-[10px] font-bold flex items-center justify-center">
                          {msg.avatar ? <img src={msg.avatar} alt={msg.userName} className="w-full h-full object-cover" /> : msg.userName?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.userId === user._id ? 'bg-zoom-blue text-white rounded-br-sm' : 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 rounded-bl-sm'}`}>
                        {msg.userId !== user._id && <span className="block text-[10px] font-bold text-zinc-400 mb-0.5">{msg.userName}</span>}
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-zinc-900/80 border-t border-zinc-800/80">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zoom-blue/60 focus:ring-1 focus:ring-zoom-blue/60 transition"
                />
                <button type="submit" disabled={!chatInput.trim()} className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-zoom-blue hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-zoom-blue text-white transition-all shadow-md shadow-zoom-blue/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 translate-x-[1px]"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" /></svg>
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <footer className="h-20 sm:h-24 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800/80 px-4 sm:px-6 flex justify-between items-center z-50 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        
        {/* Left Status Area */}
        <div className="w-1/4 hidden md:flex items-center gap-3">
          <div className="text-zinc-500 text-xs font-semibold whitespace-nowrap">
            Secure Connection
          </div>
        </div>

        {/* Center Main Controls */}
        <div className="flex-1 md:w-2/4 flex justify-center items-center gap-3 sm:gap-6">
          <button onClick={toggleAudio} className={`group relative flex flex-col items-center justify-center w-[52px] h-[52px] sm:w-[64px] sm:h-[64px] rounded-full transition-all duration-300 shadow-md ${!audioEnabled ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:-translate-y-1'}`}>
            {audioEnabled ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px] sm:w-[26px] sm:h-[26px]"><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" /><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.85V21a.75.75 0 01-1.5 0v-1.65A6.75 6.75 0 014.5 12.75v-1.5a.75.75 0 01.75-.75z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px] sm:w-[26px] sm:h-[26px]"><path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" /></svg>}
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-xs px-2.5 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap border border-zinc-700">{audioEnabled ? 'Mute' : 'Unmute'}</div>
          </button>
          
          <button onClick={toggleVideo} className={`group relative flex flex-col items-center justify-center w-[52px] h-[52px] sm:w-[64px] sm:h-[64px] rounded-full transition-all duration-300 shadow-md ${!videoEnabled ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:-translate-y-1'}`}>
            {videoEnabled ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px]"><path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 5.904A2.25 2.25 0 0017.25 6v12a2.25 2.25 0 002.69 2.096l3.454-1.151a1.5 1.5 0 001.106-1.424v-11.04a1.5 1.5 0 00-1.106-1.424l-3.454-1.151z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px]"><path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM20.25 5.507v11.561L5.853 2.671c.15-.043.306-.075.467-.092H15.75a3 3 0 013 3v.006l1.5-.078zM15.75 17.5c.34 0 .673-.057.994-.16l-8.682-8.681A3.003 3.003 0 004.5 11.25v2.247c0 .151.01.302.03.45l-1.05.525a1.5 1.5 0 00-1.106 1.424v6.104h8.25c1.243 0 2.308-.755 2.766-1.84z" /></svg>}
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-xs px-2.5 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap border border-zinc-700">{videoEnabled ? 'Stop Video' : 'Start Video'}</div>
          </button>
          
          <button onClick={() => { setIsChatOpen(!isChatOpen); setUnreadCount(0); }} className={`group relative flex flex-col items-center justify-center w-[52px] h-[52px] sm:w-[64px] sm:h-[64px] rounded-full transition-all duration-300 shadow-md ${isChatOpen ? 'bg-zoom-blue hover:bg-blue-600 text-white shadow-zoom-blue/20' : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:-translate-y-1'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px]"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75c2.605 0 4.97-.935 6.772-2.5l2.478 2.478c.31.31.782.164.846-.263l.354-2.316a9.75 9.75 0 00-10.45-19.4z" clipRule="evenodd" /></svg>
            {!isChatOpen && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow ring-2 ring-zinc-900 border border-red-500/20">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-xs px-2.5 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap border border-zinc-700">{isChatOpen ? 'Close Chat' : 'Open Chat'}</div>
          </button>
        </div>

        {/* Right End Call */}
        <div className="w-1/4 flex justify-end">
          {isInstructor ? (
            <button onClick={handleEndLive} className="flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-600/30 text-xs sm:text-sm border border-red-500 hover:-translate-y-1">
              <span>End Call</span>
            </button>
          ) : (
            <button onClick={handleLeave} className="flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 border border-zinc-700 text-white rounded-2xl font-bold transition-all text-xs sm:text-sm hover:-translate-y-1">
              <span>Leave</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
