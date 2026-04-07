const Session = require('../models/Session');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const { v4: uuidv4 } = require('uuid');

/**
 * Build a full UTC Date from a session's stored date + HH:MM time string,
 * treating the time as IST (UTC+5:30).
 *
 * session.date is stored as an ISO Date (midnight UTC or the date the user chose).
 * We extract YYYY-MM-DD in IST, combine with "HH:MM", then parse as IST.
 */
function buildISTDateTime(sessionDate, timeStr) {
  // sessionDate can be a Date object or ISO string
  const d = new Date(sessionDate);
  // Format as YYYY-MM-DD in IST by shifting by +5:30 (19800 seconds)
  const istOffset = 5.5 * 60 * 60 * 1000; // 19800000 ms
  const istDate = new Date(d.getTime() + istOffset);
  const yyyy = istDate.getUTCFullYear();
  const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getUTCDate()).padStart(2, '0');
  const datePart = `${yyyy}-${mm}-${dd}`;
  // Combine as "YYYY-MM-DDTHH:MM+05:30" and parse
  return new Date(`${datePart}T${timeStr}:00+05:30`);
}

/**
 * Get current IST time as a Date object (same as UTC Date but semantically IST)
 */
function nowIST() {
  return new Date();
}

/**
 * @desc    Create a new session
 * @route   POST /api/sessions
 * @access  Private (Instructor)
 */
const createSession = async (req, res) => {
  try {
    const { courseId, title, topic, date, startTime, endTime, notes } = req.body;

    const course = await Course.findOne({ _id: courseId, instructor: req.user._id });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized.' });
    }

    const session = await Session.create({
      course: courseId,
      instructor: req.user._id,
      title,
      topic,
      date,
      startTime,
      endTime,
      notes
    });

    await session.populate('course', 'title code');

    res.status(201).json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get all sessions for instructor or student
 * @route   GET /api/sessions
 * @access  Private
 */
const getSessions = async (req, res) => {
  try {
    const { courseId, status, upcoming } = req.query;
    let query = {};

    if (req.user.role === 'instructor') {
      query.instructor = req.user._id;
      if (courseId) query.course = courseId;
    } else {
      const enrolled = req.user.enrolledCourses || [];
      if (courseId && enrolled.map(id => id.toString()).includes(courseId)) {
        query.course = courseId;
      } else {
        query.course = { $in: enrolled };
      }
    }
    if (status) query.status = status;
    if (upcoming === 'true') {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      query.date = { $gte: today };
    }

    const sessions = await Session.find(query)
      .populate('course', 'title code')
      .populate('instructor', 'name')
      .sort({ date: upcoming === 'true' ? 1 : -1 })
      .limit(50);

    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get single session
 * @route   GET /api/sessions/:id
 * @access  Private
 */
const getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('course', 'title code students')
      .populate('instructor', 'name email');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // Security Check: Enforce ownership and enrollment
    if (req.user.role === 'instructor' && session.instructor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this session.' });
    }

    if (req.user.role === 'student') {
      const isEnrolled = session.course.students.some(id => id.toString() === req.user._id.toString());
      if (!isEnrolled) {
        return res.status(403).json({ success: false, message: 'Not enrolled in this course.' });
      }
    }

    let attendanceRecords = [];
    if (req.user.role === 'instructor') {
      attendanceRecords = await Attendance.find({ session: session._id })
        .populate('student', 'name email studentId')
        .sort('markedAt');
    }

    res.json({ success: true, session, attendanceRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Update session
 * @route   PUT /api/sessions/:id
 * @access  Private (Instructor)
 */
const updateSession = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or not authorized.' });
    }

    // Whitelist allowed fields to prevent mass-assignment attacks
    const { title, topic, date, startTime, endTime, notes } = req.body;
    const updated = await Session.findByIdAndUpdate(
      req.params.id,
      { title, topic, date, startTime, endTime, notes },
      { new: true, runValidators: true }
    ).populate('course', 'title code');

    res.json({ success: true, session: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Delete session
 * @route   DELETE /api/sessions/:id
 * @access  Private (Instructor)
 */
const deleteSession = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or not authorized.' });
    }

    await Session.findByIdAndDelete(req.params.id);
    await Attendance.deleteMany({ session: req.params.id });

    res.json({ success: true, message: 'Session deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Activate session (opens attendance window)
 * @route   PATCH /api/sessions/:id/activate
 * @access  Private (Instructor)
 */
const activateSession = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or not authorized.' });
    }

    // Use scheduled IST start/end times as the attendance window
    const opensAt = buildISTDateTime(session.date, session.startTime);
    const closesAt = buildISTDateTime(session.date, session.endTime);
    const now = nowIST();

    // Warn if session hasn't started yet but allow instructor to activate early
    const effectiveOpens = now < opensAt ? opensAt : now;

    session.status = 'active';
    session.attendanceWindow = { opensAt: effectiveOpens, closesAt };
    await session.save();

    const durationMinutes = Math.round((closesAt - effectiveOpens) / 60000);
    res.json({ success: true, session, message: `Attendance opened. Window closes at scheduled end time (${session.endTime} IST).` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Close session attendance
 * @route   PATCH /api/sessions/:id/close
 * @access  Private (Instructor)
 */
const closeSession = async (req, res) => {
  try {
    const sessionDoc = await Session.findOne({ _id: req.params.id, instructor: req.user._id });

    if (!sessionDoc) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const roomId = sessionDoc.liveRoomId;

    sessionDoc.status = 'closed';
    sessionDoc.liveSessionActive = false;
    sessionDoc.liveRoomId = null;
    await sessionDoc.save();

    if (roomId) {
      const io = req.app.get('io');
      const markAttendanceForRoom = req.app.get('markAttendanceForRoom');
      const liveRooms = req.app.get('liveRooms');
      
      if (markAttendanceForRoom) {
        await markAttendanceForRoom(sessionDoc._id.toString(), roomId);
      }
      if (io) {
        io.to(roomId).emit('session-ended');
      }
      if (liveRooms && liveRooms[roomId]) {
        delete liveRooms[roomId];
      }
    }

    res.json({ success: true, session: sessionDoc, message: 'Session closed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Regenerate attendance code
 * @route   PATCH /api/sessions/:id/regen-code
 * @access  Private (Instructor)
 */
const regenCode = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    session.attendanceCode = undefined;
    await session.save();

    // Re-fetch to guarantee we return the freshly generated code from the pre-save hook
    const refreshed = await Session.findById(session._id).select('attendanceCode');
    res.json({ success: true, attendanceCode: refreshed.attendanceCode });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Start a live video session (instructor)
 * @route   PATCH /api/sessions/:id/start-live
 * @access  Private (Instructor)
 */
const startLiveSession = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or not authorized.' });
    }

    const now = nowIST();

    // Build scheduled start and end as full IST timestamps
    const scheduledStart = buildISTDateTime(session.date, session.startTime);
    const scheduledEnd   = buildISTDateTime(session.date, session.endTime);

    // Reject if session end time has already passed
    if (now > scheduledEnd) {
      return res.status(400).json({
        success: false,
        message: `Cannot start session. The scheduled end time (${session.endTime} IST) has already passed.`
      });
    }

    // Reject if it's more than 10 minutes before the scheduled start time
    const tenMinBefore = new Date(scheduledStart.getTime() - 10 * 60 * 1000);
    if (now < tenMinBefore) {
      const minutesLeft = Math.ceil((scheduledStart - now) / 60000);
      return res.status(400).json({
        success: false,
        message: `Session starts at ${session.startTime} IST. You can start it up to 10 minutes early. ${minutesLeft} minute(s) remaining.`,
        scheduledStartIST: scheduledStart.toISOString(),
        minutesUntilStart: minutesLeft
      });
    }

    const liveRoomId = uuidv4();

    // Set attendance window to match session's actual scheduled duration
    session.status = 'active';
    session.attendanceWindow = {
      opensAt: now,        // opens when instructor starts
      closesAt: scheduledEnd  // closes exactly at scheduled end time
    };

    session.liveSessionActive = true;
    session.liveRoomId = liveRoomId;
    session.liveStartedAt = now;
    await session.save();

    res.json({
      success: true,
      session,
      liveRoomId,
      scheduledEndIST: scheduledEnd.toISOString(),
      message: `Live session started. Will auto-close at ${session.endTime} IST.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    End a live video session (instructor)
 * @route   PATCH /api/sessions/:id/end-live
 * @access  Private (Instructor)
 */
const endLiveSession = async (req, res) => {
  try {
    // Only clear live-video fields — do NOT change status to 'closed'.
    // The server-side scheduler (autoUpdateSessionStatuses) will close
    // the session automatically when the scheduled endTime (IST) passes.
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user._id },
      { liveSessionActive: false, liveRoomId: null },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    res.json({ success: true, session, message: 'Live video ended. Session remains active until its scheduled end time.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Helper: parse "HH:MM" time string to total minutes
 */
function parseTimeMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * @desc    Join a live session — verifies enrollment, returns room ID.
 *          Attendance is now tracked entirely server-side via socket presence time.
 * @route   POST /api/sessions/:id/join-live
 * @access  Private (Student)
 */
const joinLiveSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('course');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (!session.liveSessionActive) {
      return res.status(400).json({ success: false, message: 'Live session is not active.' });
    }

    // Verify student enrolled
    const course = await Course.findOne({ _id: session.course._id, students: req.user._id });
    if (!course) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    // Simply return the room ID.
    // Attendance is calculated server-side based on actual socket presence time.
    return res.json({
      success: true,
      liveRoomId: session.liveRoomId,
      message: 'Joined session. Attendance tracked by your presence time in the room.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * Auto-update session statuses based on scheduled IST start/end times.
 * - scheduled → active  when currentTime >= startTime IST
 * - active    → closed  when currentTime >= endTime  IST
 * Call this on a timer from server.js (every 60 seconds).
 */
const autoUpdateSessionStatuses = async () => {
  const closedSessions = []; // return value so server.js can mark attendance
  try {
    const now = nowIST();
    const openSessions = await Session.find({ status: { $in: ['scheduled', 'active'] } });

    for (const session of openSessions) {
      const scheduledStart = buildISTDateTime(session.date, session.startTime);
      const scheduledEnd   = buildISTDateTime(session.date, session.endTime);

      if (now >= scheduledEnd) {
        const liveRoomId = session.liveRoomId; // save BEFORE clearing
        session.status = 'closed';
        session.liveSessionActive = false;
        session.liveRoomId = null;
        await session.save();
        closedSessions.push({ sessionId: session._id.toString(), liveRoomId });
        console.log(`⏰ Auto-closed: "${session.title || session.topic || session._id}" (end: ${session.endTime} IST)`);
      } else if (now >= scheduledStart && session.status === 'scheduled') {
        session.status = 'active';
        await session.save();
        console.log(`▶️  Auto-activated: "${session.title || session.topic || session._id}" (start: ${session.startTime} IST)`);
      }
    }
  } catch (err) {
    console.error('Auto-status update error:', err.message);
  }
  return closedSessions;
};

const autoCloseExpiredSessions = autoUpdateSessionStatuses;

module.exports = {
  createSession, getSessions, getSession, updateSession,
  deleteSession, activateSession, closeSession, regenCode,
  startLiveSession, endLiveSession, joinLiveSession,
  autoCloseExpiredSessions, autoUpdateSessionStatuses
};

