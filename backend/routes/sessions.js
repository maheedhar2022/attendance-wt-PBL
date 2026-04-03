const express = require('express');
const router = express.Router();
const {
  createSession, getSessions, getSession,
  updateSession, deleteSession, activateSession,
  closeSession, regenCode,
  startLiveSession, endLiveSession, joinLiveSession, markLiveAttendance
} = require('../controllers/sessionController');

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSessions)
  .post(authorize('instructor'), createSession);

router.route('/:id')
  .get(getSession)
  .put(authorize('instructor'), updateSession)
  .delete(authorize('instructor'), deleteSession);

router.patch('/:id/activate', authorize('instructor'), activateSession);
router.patch('/:id/close', authorize('instructor'), closeSession);
router.patch('/:id/regen-code', authorize('instructor'), regenCode);

// Live session routes
router.patch('/:id/start-live', authorize('instructor'), startLiveSession);
router.patch('/:id/end-live', authorize('instructor'), endLiveSession);
router.post('/:id/join-live', authorize('student'), joinLiveSession);
router.post('/:id/mark-live-attendance', authorize('student'), markLiveAttendance);


module.exports = router;
