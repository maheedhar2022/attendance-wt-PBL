const mongoose = require('mongoose');

/**
 * Session Schema
 * Represents a single class session for a course
 */
const sessionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required']
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    topic: {
      type: String,
      trim: true,
      maxlength: [300, 'Topic cannot exceed 300 characters']
    },
    date: {
      type: Date,
      required: [true, 'Session date is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required']
    },
    // Unique 6-character alphanumeric code students use to mark attendance
    attendanceCode: {
      type: String,
      unique: true,
      uppercase: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'closed', 'cancelled'],
      default: 'scheduled'
    },
    // When attendance window opens/closes
    attendanceWindow: {
      opensAt: Date,
      closesAt: Date
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ── Generate unique attendance code before saving ───────────────
sessionSchema.pre('save', async function (next) {
  if (!this.attendanceCode) {
    this.attendanceCode = generateCode();
    // Ensure uniqueness
    let exists = await mongoose.model('Session').findOne({ attendanceCode: this.attendanceCode });
    while (exists) {
      this.attendanceCode = generateCode();
      exists = await mongoose.model('Session').findOne({ attendanceCode: this.attendanceCode });
    }
  }
  next();
});

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── Virtual: is session currently active ───────────────────────
sessionSchema.virtual('isAttendanceOpen').get(function () {
  if (this.status !== 'active') return false;
  const now = new Date();
  if (!this.attendanceWindow || !this.attendanceWindow.opensAt || !this.attendanceWindow.closesAt) return true;
  return now >= this.attendanceWindow.opensAt && now <= this.attendanceWindow.closesAt;
});

module.exports = mongoose.model('Session', sessionSchema);
