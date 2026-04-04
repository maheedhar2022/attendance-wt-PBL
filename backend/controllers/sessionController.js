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
      const user = await require('../models/User').findById(req.user._id);
      const enrolled = user.enrolledCourses || [];
      if (courseId && enrolled.map(id => id.toString()).includes(courseId)) {
        query.course = courseId;
      } else {
        query.course = { $in: enrolled };
      }
    }
    if (status) query.status = status;
    if (upcoming === 'true') query.date = { $gte: new Date() };

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

    const updated = await Session.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    }).populate('course', 'title code');

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
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user._id },
      { status: 'closed' },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    res.json({ success: true, session, message: 'Session closed.' });
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

    res.json({ success: true, attendanceCode: session.attendanceCode });
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
 * @desc    Join a live session — validates enrollment, calculates attendance threshold
 *          Does NOT mark attendance immediately. Returns markAfterMs so the client
 *          sets a timer and calls /mark-live-attendance when threshold is reached.
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

    // ── Calculate attendance threshold ──────────────────────
    // Threshold = 5/6 of total session duration (e.g. 50 min for 60-min session)
    const startMins = parseTimeMinutes(session.startTime); // e.g. "09:00" -> 540
    const endMins   = parseTimeMinutes(session.endTime);   // e.g. "10:00" -> 600
    const totalDurationMs = Math.max((endMins - startMins) * 60 * 1000, 0);
    const thresholdMs = totalDurationMs * (5 / 6);

    // Reference point: when the instructor actually started the live session
    const liveStartedAt = session.liveStartedAt || new Date();
    const attendanceMarkAt = new Date(liveStartedAt.getTime() + thresholdMs);
    const now = new Date();
    const markAfterMs = attendanceMarkAt.getTime() - now.getTime();

    // Student joined BEFORE the threshold — schedule on client side
    if (markAfterMs > 0) {
      return res.json({
        success: true,
        liveRoomId: session.liveRoomId,
        canMark: true,
        markAfterMs,
        thresholdMinutes: Math.round(thresholdMs / 60000),
        message: `Your attendance will be recorded in ${Math.ceil(markAfterMs / 60000)} minute(s).`
      });
    }

    // Student joined AFTER threshold — mark immediately (late join)
    const existing = await Attendance.findOne({ session: session._id, student: req.user._id });
    let attendanceStatus = 'already_marked';
    if (!existing) {
      await Attendance.create({
        session: session._id,
        course: session.course._id,
        student: req.user._id,
        status: 'late',          // past threshold = late
        markedVia: 'live',
        markedAt: now
      });
      attendanceStatus = 'late';
    } else {
      attendanceStatus = existing.status;
    }

    return res.json({
      success: true,
      liveRoomId: session.liveRoomId,
      canMark: false,
      markAfterMs: 0,
      attendanceStatus,
      message: `Joined after threshold. Attendance marked as "${attendanceStatus}".`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Actually mark live attendance — called by client timer after threshold
 * @route   POST /api/sessions/:id/mark-live-attendance
 * @access  Private (Student)
 */
const markLiveAttendance = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('course');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // Verify enrollment
    const course = await Course.findOne({ _id: session.course._id, students: req.user._id });
    if (!course) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    // Check if already marked
    const existing = await Attendance.findOne({ session: session._id, student: req.user._id });
    if (existing) {
      return res.json({ success: true, status: existing.status, message: 'Attendance already recorded.' });
    }

    // Verify threshold has actually been reached (server-side guard)
    const startMins = parseTimeMinutes(session.startTime);
    const endMins   = parseTimeMinutes(session.endTime);
    const totalDurationMs = Math.max((endMins - startMins) * 60 * 1000, 0);
    const thresholdMs = totalDurationMs * (5 / 6);
    const liveStartedAt = session.liveStartedAt || new Date();
    const now = new Date();
    const elapsedSinceStart = now.getTime() - liveStartedAt.getTime();

    // Allow a 30-second grace window to account for network/timer delays
    if (elapsedSinceStart < thresholdMs - 30000) {
      return res.status(400).json({
        success: false,
        message: `Attendance threshold not yet reached. Please wait.`
      });
    }

    const attendance = await Attendance.create({
      session: session._id,
      course: session.course._id,
      student: req.user._id,
      status: 'present',
      markedVia: 'live',
      markedAt: now
    });

    res.status(201).json({
      success: true,
      status: 'present',
      message: 'Attendance marked as present.',
      attendance
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
  try {
    const now = nowIST();
    // Only look at sessions that are not yet closed/cancelled
    const openSessions = await Session.find({ status: { $in: ['scheduled', 'active'] } });

    for (const session of openSessions) {
      const scheduledStart = buildISTDateTime(session.date, session.startTime);
      const scheduledEnd   = buildISTDateTime(session.date, session.endTime);

      if (now >= scheduledEnd) {
        // Past end time → close it and stop any live video
        session.status = 'closed';
        session.liveSessionActive = false;
        session.liveRoomId = null;
        await session.save();
        console.log(`⏰ Auto-closed: "${session.title || session.topic || session._id}" (end: ${session.endTime} IST)`);
      } else if (now >= scheduledStart && session.status === 'scheduled') {
        // Within time window → activate it
        session.status = 'active';
        await session.save();
        console.log(`▶️  Auto-activated: "${session.title || session.topic || session._id}" (start: ${session.startTime} IST)`);
      }
    }
  } catch (err) {
    console.error('Auto-status update error:', err.message);
  }
};

// Keep old export name as alias so server.js import doesn't break
const autoCloseExpiredSessions = autoUpdateSessionStatuses;

module.exports = {
  createSession, getSessions, getSession, updateSession,
  deleteSession, activateSession, closeSession, regenCode,
  startLiveSession, endLiveSession, joinLiveSession, markLiveAttendance,
  autoCloseExpiredSessions, autoUpdateSessionStatuses
};

