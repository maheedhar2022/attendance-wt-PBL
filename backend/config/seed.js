/**
 * Seed file - populates the database with sample data for development
 * Run with: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([User.deleteMany(), Course.deleteMany(), Session.deleteMany(), Attendance.deleteMany()]);
    console.log('Cleared existing data');

    // Create instructor
    const instructor = await User.create({
      name: 'Dr. Sarah Johnson',
      email: 'instructor@demo.com',
      password: 'password123',
      role: 'instructor',
      department: 'Computer Science'
    });

    // Create students (using User.create to trigger pre-save password hashing)
    const students = await Promise.all([
      User.create({ name: 'Alice Chen', email: 'alice@demo.com', password: 'password123', role: 'student', studentId: 'CS2021001', department: 'Computer Science' }),
      User.create({ name: 'Bob Martinez', email: 'bob@demo.com', password: 'password123', role: 'student', studentId: 'CS2021002', department: 'Computer Science' }),
      User.create({ name: 'Carol White', email: 'carol@demo.com', password: 'password123', role: 'student', studentId: 'CS2021003', department: 'Computer Science' }),
      User.create({ name: 'David Kim', email: 'david@demo.com', password: 'password123', role: 'student', studentId: 'CS2021004', department: 'Computer Science' }),
    ]);

    // Create courses
    const course1 = await Course.create({
      title: 'Data Structures & Algorithms',
      code: 'CS301',
      description: 'Core computer science course covering arrays, trees, graphs, sorting and searching algorithms.',
      instructor: instructor._id,
      students: students.map(s => s._id),
      schedule: { days: ['Mon', 'Wed', 'Fri'], startTime: '09:00', endTime: '10:30' },
      semester: 'Spring 2024',
      academicYear: '2023-24'
    });

    const course2 = await Course.create({
      title: 'Web Development',
      code: 'CS405',
      description: 'Modern web development with React, Node.js and databases.',
      instructor: instructor._id,
      students: students.slice(0, 3).map(s => s._id),
      schedule: { days: ['Tue', 'Thu'], startTime: '14:00', endTime: '15:30' },
      semester: 'Spring 2024',
      academicYear: '2023-24'
    });

    // Update student enrollments
    await User.updateMany(
      { _id: { $in: students.map(s => s._id) } },
      { $addToSet: { enrolledCourses: course1._id } }
    );
    await User.updateMany(
      { _id: { $in: students.slice(0, 3).map(s => s._id) } },
      { $addToSet: { enrolledCourses: course2._id } }
    );

    // Create past sessions (using Session.create to trigger pre-save attendance code generation)
    const pastSessions = await Promise.all([
      Session.create({
        course: course1._id, instructor: instructor._id,
        title: 'Introduction to Arrays', topic: 'Array basics, indexing, and traversal',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        startTime: '09:00', endTime: '10:30', status: 'closed',
        attendanceWindow: { opensAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), closesAt: new Date(Date.now() - 13.9 * 24 * 60 * 60 * 1000) }
      }),
      Session.create({
        course: course1._id, instructor: instructor._id,
        title: 'Linked Lists', topic: 'Singly and doubly linked lists',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        startTime: '09:00', endTime: '10:30', status: 'closed',
        attendanceWindow: { opensAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), closesAt: new Date(Date.now() - 6.9 * 24 * 60 * 60 * 1000) }
      }),
    ]);

    // Create attendance records
    for (const session of pastSessions) {
      for (let i = 0; i < students.length; i++) {
        if (i < 3) { // First 3 students always present
          await Attendance.create({
            session: session._id, course: course1._id,
            student: students[i]._id, status: i === 1 ? 'late' : 'present',
            markedVia: 'code', markedAt: session.date
          });
        }
      }
    }

    // Upcoming session
    await Session.create({
      course: course1._id, instructor: instructor._id,
      title: 'Binary Trees', topic: 'Tree traversal algorithms: inorder, preorder, postorder',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      startTime: '09:00', endTime: '10:30', status: 'scheduled'
    });

    console.log('\n✅ Seed complete!');
    console.log('─────────────────────────────────────');
    console.log('Demo Accounts:');
    console.log('  Instructor: instructor@demo.com / password123');
    console.log('  Student 1:  alice@demo.com / password123');
    console.log('  Student 2:  bob@demo.com / password123');
    console.log('─────────────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
