const express = require('express');
const router = express.Router();
const {
  getMyAttendance, getSessionAttendance,
  updateAttendance, addManualAttendance, getCourseAnalytics
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Code-based attendance marking removed — attendance is via live session only or instructor manual entry
router.get('/my', authorize('student'), getMyAttendance);
router.get('/session/:sessionId', authorize('instructor'), getSessionAttendance);
router.put('/:id', authorize('instructor'), updateAttendance);
router.post('/manual', authorize('instructor'), addManualAttendance);
router.get('/analytics/:courseId', authorize('instructor'), getCourseAnalytics);

module.exports = router;
