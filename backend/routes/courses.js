const express = require('express');
const router = express.Router();
const {
  createCourse, getCourses, getCourse, updateCourse,
  deleteCourse, enrollCourse, getCourseStats
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All course routes require auth

router.route('/')
  .get(getCourses)
  .post(authorize('instructor'), createCourse);

router.route('/:id')
  .get(getCourse)
  .put(authorize('instructor'), updateCourse)
  .delete(authorize('instructor'), deleteCourse);

router.post('/:id/enroll', authorize('student'), enrollCourse);
router.get('/:id/stats', authorize('instructor'), getCourseStats);

module.exports = router;
