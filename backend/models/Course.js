const mongoose = require('mongoose');

/**
 * Course Schema
 * Represents a subject/course offered by an instructor
 */
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Course code cannot exceed 20 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required']
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    schedule: {
      days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
      startTime: String, // e.g. "09:00"
      endTime: String    // e.g. "10:30"
    },
    semester: {
      type: String,
      trim: true
    },
    academicYear: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ── Virtual: total enrolled students ───────────────────────────
courseSchema.virtual('totalStudents').get(function () {
  return this.students ? this.students.length : 0;
});

module.exports = mongoose.model('Course', courseSchema);
