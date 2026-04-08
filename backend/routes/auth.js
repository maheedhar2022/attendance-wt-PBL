// ── routes/auth.js ──────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, uploadAvatar } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { upload } = require('../config/cloudinary');

// ── Rate Limiters ────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ── Validation middleware ────────────────────────────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }).withMessage('Name too long.'),
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').optional().isIn(['student', 'instructor']).withMessage('Invalid role.'),
  body('studentId').optional().trim().isLength({ max: 50 }).withMessage('Student ID too long.'),
  body('department').optional().trim().isLength({ max: 100 }).withMessage('Department too long.'),
];

const loginValidators = [
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

router.post('/register', authLimiter, registerValidators, handleValidation, register);
router.post('/login', loginLimiter, loginValidators, handleValidation, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/profile/avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
