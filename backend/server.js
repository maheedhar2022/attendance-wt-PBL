const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const sessionRoutes = require('./routes/sessions');
const attendanceRoutes = require('./routes/attendance');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chatRoutes');
const { autoCloseExpiredSessions } = require('./controllers/sessionController');

// ── Attendance Config ─────────────────────────────────────────────
// Students must attend this fraction of session duration to be marked present
const ATTENDANCE_PRESENCE_THRESHOLD = 5 / 6; // must attend ~83% of session

const app = express();
const server = http.createServer(app);

// ── Allowed CORS Origins ─────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://attendance-wt-pbl.vercel.app',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app preview URL
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
};

// ── Socket.io ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Socket CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST']
  }
});

// Track participants in each live room: roomId -> [{ socketId, userId, userName, role }]
// Track participants in each live room: roomId -> [{ socketId, userId, userName, role }]
const liveRooms = {};

// Track actual presence time per student:
// presenceData[roomId][userId] = { totalMs, currentJoinedAt, userName, role }
const presenceData = {};

// Helper: parse "HH:MM" to minutes
function parseTimeMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Mark attendance for a room based on accumulated presence time.
// Called when a session ends (instructor ends it or auto-close).
async function markAttendanceForRoom(sessionId, roomId) {
  if (!sessionId || !roomId || !presenceData[roomId]) return;
  try {
    const Session = require('./models/Session');
    const Attendance = require('./models/Attendance');

    const session = await Session.findById(sessionId);
    if (!session) return;

    const startMins = parseTimeMinutes(session.startTime);
    const endMins   = parseTimeMinutes(session.endTime);
    let totalDurationMs = Math.max((endMins - startMins) * 60 * 1000, 0);
    
    // Cap strictly at actual duration if ended earlier than scheduled end
    if (session.liveStartedAt) {
      const actualDurationMs = Math.max(Date.now() - session.liveStartedAt.getTime(), 0);
      if (actualDurationMs < totalDurationMs) {
        totalDurationMs = actualDurationMs;
      }
    }
    
    const requiredMs = totalDurationMs * ATTENDANCE_PRESENCE_THRESHOLD;

    const roomPresence = presenceData[roomId];
    const now = Date.now();

    for (const [userId, pres] of Object.entries(roomPresence)) {
      if (pres.role === 'instructor') continue;

      // If still in room when session ended, count this final stint
      let effectiveMs = pres.totalMs;
      if (pres.currentJoinedAt) {
        effectiveMs += now - pres.currentJoinedAt.getTime();
      }

      if (effectiveMs >= requiredMs) {
        const existing = await Attendance.findOne({ session: sessionId, student: userId });
        if (!existing) {
          await Attendance.create({
            session: sessionId,
            course: session.course,
            student: userId,
            status: 'present',
            markedVia: 'live',
            markedAt: new Date()
          });
          console.log(`✅ Attendance: ${pres.userName} marked present (${Math.round(effectiveMs / 60000)}min / ${Math.round(requiredMs / 60000)}min required)`);
        }
      } else {
        console.log(`❌ Absent: ${pres.userName} only ${Math.round(effectiveMs / 60000)}min of ${Math.round(requiredMs / 60000)}min required`);
      }
    }

    delete presenceData[roomId]; // clean up
  } catch (err) {
    console.error('markAttendanceForRoom error:', err.message);
  }
}

// ── Socket.io Authentication ──────────────────────────────────
const jwt = require('jsonwebtoken');
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: No token'));
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/User');
    User.findById(decoded.id).then(user => {
      if (!user) return next(new Error('User not found'));
      socket.user = { _id: user._id.toString(), name: user.name, role: user.role, avatar: user.avatar || '' };
      next();
    }).catch(err => next(new Error('Database error during auth')));
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.user.name})`);

  // User joins a live video room
  socket.on('join-live-room', ({ roomId }) => {
    const { _id: userId, name: userName, role } = socket.user;
    socket.join(roomId);

    if (!liveRooms[roomId]) liveRooms[roomId] = [];

    // Remove stale entry for same user if reconnecting
    liveRooms[roomId] = liveRooms[roomId].filter(p => p.userId !== userId);
    liveRooms[roomId].push({ socketId: socket.id, userId, userName, role, avatar: socket.user.avatar });

    // ── Presence tracking ───────────────────────────────────
    if (!presenceData[roomId]) presenceData[roomId] = {};
    if (!presenceData[roomId][userId]) {
      // First join: start counting from now
      presenceData[roomId][userId] = { totalMs: 0, currentJoinedAt: new Date(), userName, role, avatar: socket.user.avatar };
    } else {
      // Re-join after leaving: resume counting from now (previous stint already saved)
      presenceData[roomId][userId].currentJoinedAt = new Date();
    }

    // Tell existing participants about the new joiner
    socket.to(roomId).emit('peer-joined', { peerId: userId, userName, role, avatar: socket.user.avatar, socketId: socket.id });

    // Send the new joiner the list of existing participants
    const existing = liveRooms[roomId].filter(p => p.userId !== userId);
    socket.emit('room-participants', existing);

    // Broadcast updated participant count
    io.to(roomId).emit('participant-count', liveRooms[roomId].length);

    console.log(`👥 ${userName} (${role}) joined room ${roomId}. Total: ${liveRooms[roomId].length}`);
  });

  // Relay WebRTC offer/answer/ice-candidate between peers securely constructed from server state
  socket.on('relay-offer', ({ to, offer }) => {
    const safeFrom = { socketId: socket.id, userId: socket.user._id, userName: socket.user.name, role: socket.user.role, avatar: socket.user.avatar };
    io.to(to).emit('receive-offer', { offer, from: safeFrom });
  });

  socket.on('relay-answer', ({ to, answer }) => {
    const safeFrom = { socketId: socket.id, userId: socket.user._id, userName: socket.user.name, role: socket.user.role, avatar: socket.user.avatar };
    io.to(to).emit('receive-answer', { answer, from: safeFrom });
  });

  socket.on('relay-ice-candidate', ({ to, candidate }) => {
    const safeFrom = { socketId: socket.id, userId: socket.user._id, userName: socket.user.name, role: socket.user.role, avatar: socket.user.avatar };
    io.to(to).emit('receive-ice-candidate', { candidate, from: safeFrom });
  });

  // Instructor ends the live session for all
  socket.on('end-live-session', async ({ roomId, sessionId }) => {
    if (socket.user.role !== 'instructor') {
      console.log(`🔴 Unauthorized end-live-session attempt by non-instructor ${socket.user.name}`);
      return;
    }

    if (!sessionId) {
      console.log(`🔴 Unauthorized: missing sessionId for end-live-session`);
      return;
    }

    const Session = require('./models/Session');
    const session = await Session.findById(sessionId);
    if (!session || session.instructor.toString() !== socket.user._id) {
      console.log(`🔴 Unauthorized: ${socket.user.name} does not own session ${sessionId}`);
      return;
    }
    
    // Mark attendance FIRST based on actual presence, then notify clients
    await markAttendanceForRoom(sessionId, roomId);

    io.to(roomId).emit('session-ended');
    delete liveRooms[roomId];
    console.log(`🔴 Live session ended for room ${roomId}`);
  });

  // Mute/unmute/camera events broadcast to room
  socket.on('media-state-change', ({ roomId, userId, audioEnabled, videoEnabled }) => {
    socket.to(roomId).emit('peer-media-state', { userId, audioEnabled, videoEnabled });
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    for (const roomId in liveRooms) {
      const leaving = liveRooms[roomId].find(p => p.socketId === socket.id);
      liveRooms[roomId] = liveRooms[roomId].filter(p => p.socketId !== socket.id);

      if (leaving) {
        // Accumulate presence time for the stint that just ended
        const pres = presenceData[roomId]?.[leaving.userId];
        if (pres?.currentJoinedAt) {
          const stintMs = Date.now() - pres.currentJoinedAt.getTime();
          pres.totalMs += stintMs;
          pres.currentJoinedAt = null; // mark as not currently in room
          console.log(`⏸ Presence paused: ${leaving.userName} +${Math.round(stintMs / 1000)}s | total: ${Math.round(pres.totalMs / 60000)}min`);
        }

        socket.to(roomId).emit('peer-left', { userId: leaving.userId, userName: leaving.userName });
        io.to(roomId).emit('participant-count', liveRooms[roomId].length);
        console.log(`👋 ${leaving.userName} left room ${roomId}. Total: ${liveRooms[roomId].length}`);
      }

      if (liveRooms[roomId].length === 0) delete liveRooms[roomId];
    }
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// ── Middleware ──────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

// ── Health Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Attendance System API is running', timestamp: new Date() });
});

// ── Global Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ── 404 Handler ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Database & Server Start ─────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db')
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io live session signalling active`);
    });

    // ── Auto-update session statuses + mark attendance on close ───
    // Runs every 60 seconds
    setInterval(async () => {
      const closedSessions = await autoCloseExpiredSessions();
      // Mark attendance for any sessions that just auto-closed
      for (const { sessionId, liveRoomId } of closedSessions) {
        if (liveRoomId) {
          await markAttendanceForRoom(sessionId, liveRoomId);
          io.to(liveRoomId).emit('session-ended'); // notify anyone still in room
          if (liveRooms[liveRoomId]) delete liveRooms[liveRoomId];
        }
      }
    }, 60 * 1000);
    console.log('⏰ Session status scheduler running (checks every 60s)');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ── Expose components for controllers ─────────────────────────────
app.set('io', io);
app.set('markAttendanceForRoom', markAttendanceForRoom);
app.set('liveRooms', liveRooms);

module.exports = app;
