const mongoose = require('mongoose');

/**
 * Attendance Schema
 * Records a student's attendance for a specific session
 */
const attendanceSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required']
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required']
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present'
    },
    // How the student marked attendance
    markedVia: {
      type: String,
      enum: ['code', 'manual', 'button'],
      default: 'code'
    },
    // Time the student marked attendance
    markedAt: {
      type: Date,
      default: Date.now
    },
    // Optional notes (e.g., reason for late/excused)
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// ── Compound index: one attendance record per student per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceSchema.index({ course: 1, student: 1 });
attendanceSchema.index({ student: 1, markedAt: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
