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
const { autoCloseExpiredSessions } = require('./controllers/sessionController');

const app = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
    const totalDurationMs = Math.max((endMins - startMins) * 60 * 1000, 0);
    const requiredMs = totalDurationMs * (5 / 6); // must attend 5/6 of duration

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

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User joins a live video room
  socket.on('join-live-room', ({ roomId, userId, userName, role }) => {
    socket.join(roomId);

    if (!liveRooms[roomId]) liveRooms[roomId] = [];

    // Remove stale entry for same user if reconnecting
    liveRooms[roomId] = liveRooms[roomId].filter(p => p.userId !== userId);
    liveRooms[roomId].push({ socketId: socket.id, userId, userName, role });

    // ── Presence tracking ───────────────────────────────────
    if (!presenceData[roomId]) presenceData[roomId] = {};
    if (!presenceData[roomId][userId]) {
      // First join: start counting from now
      presenceData[roomId][userId] = { totalMs: 0, currentJoinedAt: new Date(), userName, role };
    } else {
      // Re-join after leaving: resume counting from now (previous stint already saved)
      presenceData[roomId][userId].currentJoinedAt = new Date();
    }

    // Tell existing participants about the new joiner
    socket.to(roomId).emit('peer-joined', { peerId: userId, userName, role, socketId: socket.id });

    // Send the new joiner the list of existing participants
    const existing = liveRooms[roomId].filter(p => p.userId !== userId);
    socket.emit('room-participants', existing);

    // Broadcast updated participant count
    io.to(roomId).emit('participant-count', liveRooms[roomId].length);

    console.log(`👥 ${userName} (${role}) joined room ${roomId}. Total: ${liveRooms[roomId].length}`);
  });

  // Relay WebRTC offer/answer/ice-candidate between peers
  socket.on('relay-offer', ({ to, offer, from }) => {
    io.to(to).emit('receive-offer', { offer, from });
  });

  socket.on('relay-answer', ({ to, answer, from }) => {
    io.to(to).emit('receive-answer', { answer, from });
  });

  socket.on('relay-ice-candidate', ({ to, candidate, from }) => {
    io.to(to).emit('receive-ice-candidate', { candidate, from });
  });

  // Instructor ends the live session for all
  socket.on('end-live-session', async ({ roomId, sessionId }) => {
    // Mark attendance FIRST based on actual presence, then notify clients
    if (sessionId) {
      await markAttendanceForRoom(sessionId, roomId);
    }
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
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', userRoutes);

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

module.exports = app;
