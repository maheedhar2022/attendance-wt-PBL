const express = require('express');
const router = express.Router();
const {
  createSession, getSessions, getSession,
  updateSession, deleteSession, activateSession,
  closeSession, regenCode
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

module.exports = router;
