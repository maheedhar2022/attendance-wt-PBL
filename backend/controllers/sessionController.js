const Session = require('../models/Session');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');

/**
 * @desc    Create a new session
 * @route   POST /api/sessions
 * @access  Private (Instructor)
 */
const createSession = async (req, res) => {
  try {
    const { courseId, title, topic, date, startTime, endTime, notes } = req.body;

    // Verify instructor owns course
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
      // Students see sessions for their enrolled courses only
      const user = await require('../models/User').findById(req.user._id);
      const enrolled = user.enrolledCourses || [];
      // Only allow courseId filter if student is enrolled in that course
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

    // Attendance records for this session (instructors only)
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
 * @desc    Update session (title, topic, notes, date/time)
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

    const { durationMinutes = 60 } = req.body;
    const now = new Date();
    const closesAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    session.status = 'active';
    session.attendanceWindow = { opensAt: now, closesAt };
    await session.save();

    res.json({ success: true, session, message: `Attendance opened for ${durationMinutes} minutes.` });
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

    session.attendanceCode = undefined; // triggers pre-save hook to generate new code
    await session.save();

    res.json({ success: true, attendanceCode: session.attendanceCode });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createSession, getSessions, getSession, updateSession, deleteSession, activateSession, closeSession, regenCode };
