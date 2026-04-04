const express = require('express');
const router = express.Router();
const {
  createSession, getSessions, getSession,
  updateSession, deleteSession, activateSession,
  closeSession, regenCode,
  startLiveSession, endLiveSession, joinLiveSession
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
// Note: mark-live-attendance removed — attendance is now tracked server-side via socket presence


module.exports = router;
