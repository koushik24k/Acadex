import api from './api';

export const authService = {
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { token, id, name, email: userEmail, roles } = res.data;
    const user = { id, name, email: userEmail, roles };
    if (token) localStorage.setItem('auth_token', token);
    if (user && user.id) localStorage.setItem('user', JSON.stringify(user));
    return { token, user };
  },

  async register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password });
    return res.data;
  },

  async getSession() {
    const res = await api.get('/auth/session');
    return res.data;
  },

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getToken() {
    return localStorage.getItem('auth_token');
  },

  getUser() {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },
};

export const userService = {
  getRoles: (userId) => api.get(`/users/${userId}/roles`).then((r) => r.data),
  assignRole: (userId, data) => api.post(`/users/${userId}/roles`, data).then((r) => r.data),
};

export const adminUserService = {
  list: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  create: (data) => api.post('/admin/users', data).then((r) => r.data),
  get: (id) => api.get(`/admin/users/${id}`).then((r) => r.data),
  update: (id, data) => api.patch(`/admin/users/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  bulkCreate: (data) => api.post('/admin/users/bulk', data).then((r) => r.data),
};

export const examService = {
  list: (params) => api.get('/exams', { params }).then((r) => r.data),
  get: (id) => api.get('/exams', { params: { id } }).then((r) => r.data),
  create: (data) => api.post('/exams', data).then((r) => r.data),
  update: (id, data) => api.put('/exams', data, { params: { id } }).then((r) => r.data),
  remove: (id) => api.delete('/exams', { params: { id } }).then((r) => r.data),
};

export const questionService = {
  list: (examId, params) => api.get(`/exams/${examId}/questions`, { params }).then((r) => r.data),
  create: (examId, data) => api.post(`/exams/${examId}/questions`, data).then((r) => r.data),
};

export const registrationService = {
  register: (examId, data) => api.post(`/exams/${examId}/register`, data).then((r) => r.data),
  list: (examId, params) => api.get(`/exams/${examId}/registrations`, { params }).then((r) => r.data),
  generateSeating: (examId) => api.post(`/exams/${examId}/seating`).then((r) => r.data),
};

export const submissionService = {
  list: (params) => api.get('/submissions', { params }).then((r) => r.data),
  get: (id) => api.get(`/submissions/${id}`).then((r) => r.data),
  create: (data) => api.post('/submissions', data).then((r) => r.data),
  grade: (id, data) => api.post(`/submissions/${id}/grade`, data).then((r) => r.data),
};

export const resultService = {
  list: (params) => api.get('/results', { params }).then((r) => r.data),
};

export const assignmentService = {
  list: (params) => api.get('/assignments', { params }).then((r) => r.data),
  get: (id) => api.get(`/assignments/${id}`).then((r) => r.data),
  create: (data) => api.post('/assignments', data).then((r) => r.data),
  update: (id, data) => api.put('/assignments', data, { params: { id } }).then((r) => r.data),
  remove: (id) => api.delete('/assignments', { params: { id } }).then((r) => r.data),
  getSubmissions: (id, params) => api.get(`/assignments/${id}/submissions`, { params }).then((r) => r.data),
};

export const assignmentSubmissionService = {
  list: (params) => api.get('/assignment-submissions', { params }).then((r) => r.data),
  get: (id) => api.get(`/assignment-submissions/${id}`).then((r) => r.data),
  create: (data) => api.post('/assignment-submissions', data).then((r) => r.data),
  grade: (id, data) => api.put(`/assignment-submissions/${id}/grade`, data).then((r) => r.data),
};

export const roomService = {
  list: (params) => api.get('/rooms', { params }).then((r) => r.data),
  get: (id) => api.get('/rooms', { params: { id } }).then((r) => r.data),
  create: (data) => api.post('/rooms', data).then((r) => r.data),
  update: (id, data) => api.put('/rooms', data, { params: { id } }).then((r) => r.data),
  remove: (id) => api.delete('/rooms', { params: { id } }).then((r) => r.data),
};

export const notificationService = {
  list: (params) => api.get('/notifications', { params }).then((r) => r.data),
  create: (data) => api.post('/notifications', data).then((r) => r.data),
  update: (id, data) => api.put('/notifications', data, { params: { id } }).then((r) => r.data),
  remove: (id) => api.delete('/notifications', { params: { id } }).then((r) => r.data),
};

export const revaluationService = {
  list: (params) => api.get('/revaluations', { params }).then((r) => r.data),
  create: (data) => api.post('/revaluations', data).then((r) => r.data),
};

export const auditLogService = {
  list: (params) => api.get('/audit-logs', { params }).then((r) => r.data),
  create: (data) => api.post('/audit-logs', data).then((r) => r.data),
};

export const seatAllocationService = {
  allocate: (data) => api.post('/admin/seat-allocation', data).then((r) => r.data),
  get: (examId) => api.get(`/admin/seat-allocation/${examId}`).then((r) => r.data),
};

export const subjectService = {
  list: (params) => api.get('/subjects', { params }).then((r) => r.data),
  get: (id) => api.get(`/subjects/${id}`).then((r) => r.data),
  create: (data) => api.post('/subjects', data).then((r) => r.data),
  update: (id, data) => api.put(`/subjects/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/subjects/${id}`).then((r) => r.data),
};

export const attendanceService = {
  mark: (data) => api.post('/attendance/mark', data).then((r) => r.data),
  getBySubject: (subjectId, params) => api.get(`/attendance/subject/${subjectId}`, { params }).then((r) => r.data),
  getMy: (params) => api.get('/attendance/my', { params }).then((r) => r.data),
  getMyMonthly: (params) => api.get('/attendance/my/monthly', { params }).then((r) => r.data),
  getSummary: (subjectId) => api.get(`/attendance/summary/${subjectId}`).then((r) => r.data),
  getShortage: (params) => api.get('/attendance/shortage', { params }).then((r) => r.data),
  lock: (params) => api.post('/attendance/lock', null, { params }).then((r) => r.data),
  getStats: (params) => api.get('/attendance/stats', { params }).then((r) => r.data),
  getStudents: (params) => api.get('/attendance/students', { params }).then((r) => r.data),
};

export const topicService = {
  list: (params) => api.get('/topics', { params }).then((r) => r.data),
  get: (id) => api.get(`/topics/${id}`).then((r) => r.data),
  create: (data) => api.post('/topics', data).then((r) => r.data),
  update: (id, data) => api.put(`/topics/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/topics/${id}`).then((r) => r.data),
};

export const topicVerificationService = {
  getPending: () => api.get('/topic-verification/pending').then((r) => r.data),
  vote: (data) => api.post('/topic-verification/vote', data).then((r) => r.data),
  getHistory: (params) => api.get('/topic-verification/history', { params }).then((r) => r.data),
  getStats: (params) => api.get('/topic-verification/stats', { params }).then((r) => r.data),
  getTeacherScores: () => api.get('/topic-verification/teacher-scores').then((r) => r.data),
  recalculate: () => api.post('/topic-verification/recalculate').then((r) => r.data),
  getSessions: (params) => api.get('/topic-verification/sessions', { params }).then((r) => r.data),
};

export const courseService = {
  list: (params) => api.get('/courses', { params }).then((r) => r.data),
  get: (id) => api.get(`/courses/${id}`).then((r) => r.data),
  create: (data) => api.post('/courses', data).then((r) => r.data),
  update: (id, data) => api.put(`/courses/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/courses/${id}`).then((r) => r.data),
  publish: (id) => api.post(`/courses/${id}/publish`).then((r) => r.data),
  lock: (id) => api.post(`/courses/${id}/lock`).then((r) => r.data),
  clone: (id, data) => api.post(`/courses/${id}/clone`, data).then((r) => r.data),
  getProgress: (id) => api.get(`/courses/${id}/progress`).then((r) => r.data),
  getRisk: (id) => api.get(`/courses/${id}/risk`).then((r) => r.data),
  getAllRisks: () => api.get('/courses/risk/all').then((r) => r.data),
  checkEligibility: (courseId, studentId) => api.get(`/courses/${courseId}/eligibility/${studentId}`).then((r) => r.data),
  // Units
  listUnits: (courseId) => api.get(`/courses/${courseId}/units`).then((r) => r.data),
  createUnit: (courseId, data) => api.post(`/courses/${courseId}/units`, data).then((r) => r.data),
  updateUnit: (courseId, unitId, data) => api.put(`/courses/${courseId}/units/${unitId}`, data).then((r) => r.data),
  deleteUnit: (courseId, unitId) => api.delete(`/courses/${courseId}/units/${unitId}`).then((r) => r.data),
  // Topics
  listTopics: (courseId, params) => api.get(`/courses/${courseId}/topics`, { params }).then((r) => r.data),
  createTopic: (courseId, data) => api.post(`/courses/${courseId}/topics`, data).then((r) => r.data),
  updateTopic: (courseId, topicId, data) => api.put(`/courses/${courseId}/topics/${topicId}`, data).then((r) => r.data),
  deleteTopic: (courseId, topicId) => api.delete(`/courses/${courseId}/topics/${topicId}`).then((r) => r.data),
  completeTopic: (courseId, topicId) => api.post(`/courses/${courseId}/topics/${topicId}/complete`).then((r) => r.data),
  uncompleteTopic: (courseId, topicId) => api.post(`/courses/${courseId}/topics/${topicId}/uncomplete`).then((r) => r.data),
  // Faculty
  listFaculty: (courseId) => api.get(`/courses/${courseId}/faculty`).then((r) => r.data),
  assignFaculty: (courseId, data) => api.post(`/courses/${courseId}/faculty`, data).then((r) => r.data),
  removeFaculty: (courseId, mappingId) => api.delete(`/courses/${courseId}/faculty/${mappingId}`).then((r) => r.data),
  // Enrollments
  listEnrollments: (courseId) => api.get(`/courses/${courseId}/enrollments`).then((r) => r.data),
  enroll: (courseId, data) => api.post(`/courses/${courseId}/enroll`, data).then((r) => r.data),
  unenroll: (courseId, enrollmentId) => api.delete(`/courses/${courseId}/enrollments/${enrollmentId}`).then((r) => r.data),
};
