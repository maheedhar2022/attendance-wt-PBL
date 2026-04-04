const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Course = require('../models/Course');
const { autoCloseExpiredSessions } = require('./sessionController');

/**
 * @desc    Mark attendance via session code
 * @route   POST /api/attendance/mark
 * @access  Private (Student)
 */
const markAttendance = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Attendance code is required.' });
    }

    // Find active session with this code
    const session = await Session.findOne({
      attendanceCode: code.toUpperCase(),
      status: 'active'
    }).populate('course');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid code or session is not active.' });
    }

    // Check attendance window
    const now = new Date();
    if (session.attendanceWindow?.closesAt && now > session.attendanceWindow.closesAt) {
      return res.status(400).json({ success: false, message: 'Attendance window has closed.' });
    }

    // Verify student is enrolled in this course
    const course = await Course.findOne({
      _id: session.course._id,
      students: req.user._id
    });

    if (!course) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    // Check if already marked
    const existing = await Attendance.findOne({ session: session._id, student: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Attendance already marked for this session.' });
    }

    // Determine if late (> 10 mins after window opened)
    let status = 'present';
    if (session.attendanceWindow.opensAt) {
      const minutesLate = (now - session.attendanceWindow.opensAt) / 60000;
      if (minutesLate > 10) status = 'late';
    }

    const attendance = await Attendance.create({
      session: session._id,
      course: session.course._id,
      student: req.user._id,
      status,
      markedVia: 'code',
      markedAt: now
    });

    res.status(201).json({
      success: true,
      message: `Attendance marked as "${status}".`,
      attendance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get student's own attendance history
 * @route   GET /api/attendance/my
 * @access  Private (Student)
 */
const getMyAttendance = async (req, res) => {
  try {
    const { courseId } = req.query;
    let query = { student: req.user._id };
    if (courseId) query.course = courseId;

    const records = await Attendance.find(query)
      .populate('session', 'title date startTime endTime topic')
      .populate('course', 'title code')
      .sort({ markedAt: -1 });

    // Calculate stats per course
    const courseStats = {};
    for (const rec of records) {
      const cid = rec.course?._id?.toString();
      if (!cid) continue;
      if (!courseStats[cid]) {
        courseStats[cid] = {
          course: rec.course,
          total: 0,
          attended: 0,
          late: 0
        };
      }
      courseStats[cid].total++;
      if (rec.status === 'present') courseStats[cid].attended++;
      if (rec.status === 'late') { courseStats[cid].attended++; courseStats[cid].late++; }
    }

    const stats = Object.values(courseStats).map((s) => ({
      ...s,
      percentage: s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0
    }));

    res.json({ success: true, records, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get attendance for a session (instructor)
 * @route   GET /api/attendance/session/:sessionId
 * @access  Private (Instructor)
 */
const getSessionAttendance = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.sessionId,
      instructor: req.user._id
    }).populate('course', 'students');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const records = await Attendance.find({ session: req.params.sessionId })
      .populate('student', 'name email studentId department')
      .sort('markedAt');

    // Find absent students — skip any records where student was deleted
    const validRecords = records.filter((r) => r.student != null);
    const markedIds = validRecords.map((r) => r.student._id.toString());
    const course = await Course.findById(session.course._id).populate('students', 'name email studentId');
    const absent = course.students.filter((s) => !markedIds.includes(s._id.toString()));

    res.json({
      success: true,
      session: { _id: session._id, title: session.title, date: session.date, status: session.status },
      present: validRecords,
      absent,
      summary: {
        total: course.students.length,
        present: validRecords.filter((r) => r.status === 'present').length,
        late: validRecords.filter((r) => r.status === 'late').length,
        absent: absent.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Manually update a student's attendance (instructor)
 * @route   PUT /api/attendance/:id
 * @access  Private (Instructor)
 */
const updateAttendance = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const record = await Attendance.findById(req.params.id).populate('session');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    // Verify instructor owns the session
    if (record.session.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    record.status = status || record.status;
    record.notes = notes || record.notes;
    record.markedVia = 'manual';
    await record.save();

    res.json({ success: true, attendance: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Add manual attendance for absent student (instructor)
 * @route   POST /api/attendance/manual
 * @access  Private (Instructor)
 */
const addManualAttendance = async (req, res) => {
  try {
    const { sessionId, studentId, status, notes } = req.body;

    const session = await Session.findOne({ _id: sessionId, instructor: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { session: sessionId, student: studentId },
      { session: sessionId, course: session.course, student: studentId, status: status || 'present', notes, markedVia: 'manual', markedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get analytics for a course
 * @route   GET /api/attendance/analytics/:courseId
 * @access  Private (Instructor)
 */
const getCourseAnalytics = async (req, res) => {
  try {
    // Lazy-evaluate expired sessions for Serverless environments (Vercel)
    await autoCloseExpiredSessions();

    const course = await Course.findOne({ _id: req.params.courseId, instructor: req.user._id });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const sessions = await Session.find({ course: course._id, status: 'closed' }).sort('date');
    const allRecords = await Attendance.find({ course: course._id });

    // Attendance trend over sessions
    const trend = sessions.map((s) => {
      const sessionRecords = allRecords.filter((r) => r.session.toString() === s._id.toString());
      return {
        sessionId: s._id,
        date: s.date,
        title: s.title || s.topic,
        present: sessionRecords.filter((r) => ['present', 'late'].includes(r.status)).length,
        total: course.students.length
      };
    });

    res.json({ success: true, analytics: { courseName: course.title, sessions: trend } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { markAttendance, getMyAttendance, getSessionAttendance, updateAttendance, addManualAttendance, getCourseAnalytics };
