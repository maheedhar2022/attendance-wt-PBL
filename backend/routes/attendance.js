const express = require('express');
const router = express.Router();
const {
  markAttendance, getMyAttendance, getSessionAttendance,
  updateAttendance, addManualAttendance, getCourseAnalytics
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/mark', authorize('student'), markAttendance);
router.get('/my', authorize('student'), getMyAttendance);
router.get('/session/:sessionId', authorize('instructor'), getSessionAttendance);
router.put('/:id', authorize('instructor'), updateAttendance);
router.post('/manual', authorize('instructor'), addManualAttendance);
router.get('/analytics/:courseId', authorize('instructor'), getCourseAnalytics);

module.exports = router;
