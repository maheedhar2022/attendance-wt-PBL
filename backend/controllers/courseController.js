const Course = require('../models/Course');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private (Instructor only)
 */
const createCourse = async (req, res) => {
  try {
    const { title, code, description, schedule, semester, academicYear } = req.body;

    const existing = await Course.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Course code already exists.' });
    }

    const course = await Course.create({
      title, code, description, schedule, semester, academicYear,
      instructor: req.user._id
    });

    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get all courses (instructor sees their own; student sees enrolled)
 * @route   GET /api/courses
 * @access  Private
 */
const getCourses = async (req, res) => {
  try {
    let courses;
    if (req.user.role === 'instructor') {
      courses = await Course.find({ instructor: req.user._id })
        .populate('students', 'name email studentId')
        .sort('-createdAt');
    } else {
      courses = await Course.find({ students: req.user._id, isActive: true })
        .populate('instructor', 'name email')
        .sort('title');
    }
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  Private
 */
const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email')
      .populate('students', 'name email studentId department');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Authorization check
    if (req.user.role === 'instructor' && course.instructor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Private (Instructor)
 */
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized.' });
    }

    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });

    res.json({ success: true, course: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Delete course
 * @route   DELETE /api/courses/:id
 * @access  Private (Instructor)
 */
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not authorized.' });
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Enroll student in course (self-enroll)
 * @route   POST /api/courses/:id/enroll
 * @access  Private (Student)
 */
const enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course || !course.isActive) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.students.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this course.' });
    }

    course.students.push(req.user._id);
    await course.save();

    // Update user's enrolledCourses
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { enrolledCourses: course._id }
    });

    res.json({ success: true, message: 'Enrolled successfully.', course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get attendance stats for a course
 * @route   GET /api/courses/:id/stats
 * @access  Private (Instructor)
 */
const getCourseStats = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id })
      .populate('students', 'name email studentId');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const totalSessions = await Session.countDocuments({ course: course._id, status: { $ne: 'cancelled' } });

    // Attendance stats per student
    const studentStats = await Promise.all(
      course.students.map(async (student) => {
        const attended = await Attendance.countDocuments({
          course: course._id,
          student: student._id,
          status: { $in: ['present', 'late'] }
        });
        const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
        return {
          student: { _id: student._id, name: student.name, email: student.email, studentId: student.studentId },
          attended,
          totalSessions,
          percentage
        };
      })
    );

    res.json({ success: true, stats: { course: course.title, totalSessions, studentStats } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createCourse, getCourses, getCourse, updateCourse, deleteCourse, enrollCourse, getCourseStats };
