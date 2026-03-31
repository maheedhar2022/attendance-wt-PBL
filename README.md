# 🎓 AttendX — Digital Attendance & Session Management System

A full-stack web application for educational institutions to manage student attendance and class sessions digitally.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (JSON Web Tokens) |
| Styling | Custom CSS Design System |
| Charts | Recharts |

---

## 📁 Project Structure

```
attendance-system/
├── backend/
│   ├── config/
│   │   └── seed.js              # Database seeder with demo data
│   ├── controllers/
│   │   ├── authController.js    # Register, login, profile
│   │   ├── courseController.js  # CRUD courses, enrollment, stats
│   │   ├── sessionController.js # CRUD sessions, activate/close
│   │   └── attendanceController.js # Mark, view, update attendance
│   ├── middleware/
│   │   └── auth.js              # JWT protect + role authorization
│   ├── models/
│   │   ├── User.js              # Student & Instructor schema
│   │   ├── Course.js            # Course schema
│   │   ├── Session.js           # Class session schema
│   │   └── Attendance.js        # Attendance record schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── sessions.js
│   │   ├── attendance.js
│   │   └── users.js
│   ├── .env.example
│   ├── package.json
│   └── server.js                # Express app entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── shared/
    │   │       └── Layout.jsx   # Sidebar + navigation
    │   ├── context/
    │   │   └── AuthContext.jsx  # Global auth state
    │   ├── pages/
    │   │   ├── AuthPage.jsx         # Login + Registration
    │   │   ├── StudentDashboard.jsx
    │   │   ├── InstructorDashboard.jsx
    │   │   ├── SessionsPage.jsx
    │   │   ├── CoursesPage.jsx
    │   │   ├── AttendancePage.jsx
    │   │   └── AnalyticsPage.jsx
    │   ├── utils/
    │   │   └── api.js           # Axios API client
    │   ├── App.jsx              # Routes + role-based guards
    │   ├── index.css            # Full design system
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Setup & Run Locally

### Prerequisites
- Node.js v18+
- MongoDB (local) OR MongoDB Atlas URI
- npm or yarn

---

### Step 1: Clone & Install

```bash
# Install backend dependencies
cd attendance-system/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Step 2: Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance_db
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

---

### Step 3: Seed the Database (optional but recommended)

```bash
cd backend
npm run seed
```

This creates demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Instructor | instructor@demo.com | password123 |
| Student | alice@demo.com | password123 |
| Student | bob@demo.com | password123 |

---

### Step 4: Start the Backend

```bash
cd backend
npm run dev    # with nodemon (auto-restart)
# or
npm start      # production
```

Server starts at: `http://localhost:5000`

---

### Step 5: Start the Frontend

```bash
cd frontend
npm run dev
```

App opens at: `http://localhost:5173`

---

## 🔌 API Reference (Postman-compatible)

Base URL: `http://localhost:5000/api`

All protected routes require header:
```
Authorization: Bearer <your_jwt_token>
```

---

### 🔐 Auth Endpoints

#### Register
```
POST /api/auth/register
Body: { name, email, password, role, studentId, department }
```

#### Login
```
POST /api/auth/login
Body: { email, password }
Response: { token, user }
```

#### Get Profile
```
GET /api/auth/me
Protected: Yes
```

---

### 📚 Course Endpoints

#### List Courses
```
GET /api/courses
Protected: Yes
(Instructor sees their courses; Student sees enrolled ones)
```

#### Create Course
```
POST /api/courses
Role: Instructor
Body: { title, code, description, schedule, semester, academicYear }
```

#### Enroll in Course (Student)
```
POST /api/courses/:id/enroll
Role: Student
```

#### Course Stats
```
GET /api/courses/:id/stats
Role: Instructor
```

---

### 📅 Session Endpoints

#### List Sessions
```
GET /api/sessions?status=active&upcoming=true&courseId=xxx
Protected: Yes
```

#### Create Session
```
POST /api/sessions
Role: Instructor
Body: { courseId, title, topic, date, startTime, endTime, notes }
```

#### Activate Session (opens attendance)
```
PATCH /api/sessions/:id/activate
Role: Instructor
Body: { durationMinutes: 90 }
```

#### Close Session
```
PATCH /api/sessions/:id/close
Role: Instructor
```

#### Regenerate Attendance Code
```
PATCH /api/sessions/:id/regen-code
Role: Instructor
```

---

### ✅ Attendance Endpoints

#### Mark Attendance (Student)
```
POST /api/attendance/mark
Role: Student
Body: { code: "ABC123" }
```

#### My Attendance History
```
GET /api/attendance/my?courseId=xxx
Role: Student
```

#### Session Attendance (Instructor)
```
GET /api/attendance/session/:sessionId
Role: Instructor
```

#### Update Attendance Record
```
PUT /api/attendance/:id
Role: Instructor
Body: { status: "excused", notes: "Medical reason" }
```

#### Add Manual Attendance
```
POST /api/attendance/manual
Role: Instructor
Body: { sessionId, studentId, status, notes }
```

#### Course Analytics
```
GET /api/attendance/analytics/:courseId
Role: Instructor
```

---

## 🗄️ MongoDB Schemas

### User
```js
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: "student" | "instructor",
  studentId: String,
  department: String,
  enrolledCourses: [ObjectId → Course],
  isActive: Boolean
}
```

### Course
```js
{
  title: String,
  code: String (unique, uppercase),
  description: String,
  instructor: ObjectId → User,
  students: [ObjectId → User],
  schedule: { days: [...], startTime, endTime },
  semester: String,
  academicYear: String
}
```

### Session
```js
{
  course: ObjectId → Course,
  instructor: ObjectId → User,
  title: String,
  topic: String,
  date: Date,
  startTime: String,
  endTime: String,
  attendanceCode: String (6-char, auto-generated),
  status: "scheduled" | "active" | "closed" | "cancelled",
  attendanceWindow: { opensAt: Date, closesAt: Date },
  notes: String
}
```

### Attendance
```js
{
  session: ObjectId → Session,
  course: ObjectId → Course,
  student: ObjectId → User,
  status: "present" | "late" | "absent" | "excused",
  markedVia: "code" | "manual" | "button",
  markedAt: Date,
  notes: String
}
// Compound unique index: { session, student }
```

---

## ✨ Feature Highlights

- **Role-based dashboards** — Students and instructors see different UIs
- **Live attendance codes** — 6-char auto-generated unique codes per session
- **Real-time session control** — Activate/close attendance windows
- **Late detection** — Students marked late if > 10 mins after window opens
- **Analytics with charts** — Trend lines, bar charts, pie charts (Recharts)
- **CSV export** — Download attendance records for any session
- **Percentage tracking** — Per-student attendance % with visual progress bars
- **Manual overrides** — Instructors can edit/excuse individual records

---

## 🔒 Security

- Passwords hashed with bcryptjs (12 salt rounds)
- JWT tokens expire after 7 days
- Role-based route protection (instructor vs student)
- Compound unique index prevents duplicate attendance records
- CORS configured for frontend origin only

---

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `cd backend && npm run dev` | Start backend with hot-reload |
| `cd backend && npm run seed` | Populate demo data |
| `cd frontend && npm run dev` | Start frontend dev server |
| `cd frontend && npm run build` | Build for production |
