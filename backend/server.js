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
const liveRooms = {};

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User joins a live video room
  socket.on('join-live-room', ({ roomId, userId, userName, role }) => {
    socket.join(roomId);

    if (!liveRooms[roomId]) liveRooms[roomId] = [];

    // Remove stale entry for same user if reconnecting
    liveRooms[roomId] = liveRooms[roomId].filter(p => p.userId !== userId);
    liveRooms[roomId].push({ socketId: socket.id, userId, userName, role });

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
  socket.on('end-live-session', ({ roomId }) => {
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
      const before = liveRooms[roomId].length;
      const leaving = liveRooms[roomId].find(p => p.socketId === socket.id);
      liveRooms[roomId] = liveRooms[roomId].filter(p => p.socketId !== socket.id);

      if (leaving) {
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

    // ── Auto-close sessions at their scheduled IST end time ──────
    // Runs every 60 seconds; closes sessions whose endTime (IST) has passed
    setInterval(async () => {
      await autoCloseExpiredSessions();
    }, 60 * 1000);
    console.log('⏰ Session auto-close scheduler running (checks every 60s)');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
