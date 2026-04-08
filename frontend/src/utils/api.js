import axios from 'axios';
import { io } from 'socket.io-client';

// Socket.io connection for live video sessions
// auth.token is set dynamically before each connect() call to avoid stale token issues
export const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  auth: (cb) => cb({ token: localStorage.getItem('token') })
});


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadAvatar: (formData) => api.post('/auth/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// ── Courses ─────────────────────────────────────────────────
export const coursesAPI = {
  getAll: () => api.get('/courses'),
  getOne: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  enroll: (id) => api.post(`/courses/${id}/enroll`),
  getStats: (id) => api.get(`/courses/${id}/stats`)
};

// ── Sessions ────────────────────────────────────────────────
export const sessionsAPI = {
  getAll: (params) => api.get('/sessions', { params }),
  getOne: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  activate: (id, durationMinutes) => api.patch(`/sessions/${id}/activate`, { durationMinutes }),
  close: (id) => api.patch(`/sessions/${id}/close`),
  regenCode: (id) => api.patch(`/sessions/${id}/regen-code`),
  startLive: (id) => api.patch(`/sessions/${id}/start-live`),
  endLive: (id) => api.patch(`/sessions/${id}/end-live`),
  joinLive: (id) => api.post(`/sessions/${id}/join-live`)
};

// ── Attendance ──────────────────────────────────────────────
export const attendanceAPI = {
  getMy: (params) => api.get('/attendance/my', { params }),
  getSession: (sessionId) => api.get(`/attendance/session/${sessionId}`),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  addManual: (data) => api.post('/attendance/manual', data),
  getAnalytics: (courseId) => api.get(`/attendance/analytics/${courseId}`)
};

// ── Users ────────────────────────────────────────────────────
export const usersAPI = {
  searchStudents: (q) => api.get('/users/students', { params: { q } }),
  addToCourse: (courseId, studentId) => api.post(`/users/courses/${courseId}/add-student`, { studentId })
};

// ── Chat ─────────────────────────────────────────────────────
export const chatAPI = {
  sendMessage: (messages) => api.post('/chat', { messages })
};

export default api;
