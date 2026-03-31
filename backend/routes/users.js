const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Search students (for instructors to manage enrollment)
router.get('/students', authorize('instructor'), async (req, res) => {
  try {
    const { q } = req.query;
    const query = { role: 'student', isActive: true };
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { studentId: { $regex: q, $options: 'i' } }
      ];
    }
    const students = await User.find(query).select('name email studentId department').limit(20);
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add student to course manually (instructor)
router.post('/courses/:courseId/add-student', authorize('instructor'), async (req, res) => {
  try {
    const Course = require('../models/Course');
    const { studentId } = req.body;

    const course = await Course.findOne({ _id: req.params.courseId, instructor: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (course.students.includes(student._id)) {
      return res.status(400).json({ success: false, message: 'Student already enrolled.' });
    }

    course.students.push(student._id);
    await course.save();
    await User.findByIdAndUpdate(student._id, { $addToSet: { enrolledCourses: course._id } });

    res.json({ success: true, message: 'Student added to course.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
