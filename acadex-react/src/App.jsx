import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardRouter from './pages/DashboardRouter';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminExams from './pages/admin/AdminExams';
import AdminCreateExam from './pages/admin/AdminCreateExam';
import AdminEditExam from './pages/admin/AdminEditExam';
import AdminRooms from './pages/admin/AdminRooms';
import AdminSeatAllocation from './pages/admin/AdminSeatAllocation';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminCourses from './pages/admin/AdminCourses';

// Faculty pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyExams from './pages/faculty/FacultyExams';
import FacultyCreateExam from './pages/faculty/FacultyCreateExam';
import FacultyEditExam from './pages/faculty/FacultyEditExam';
import FacultySeating from './pages/faculty/FacultySeating';
import FacultyAssignments from './pages/faculty/FacultyAssignments';
import FacultyCreateAssignment from './pages/faculty/FacultyCreateAssignment';
import FacultyEditAssignment from './pages/faculty/FacultyEditAssignment';
import FacultyGrading from './pages/faculty/FacultyGrading';
import FacultyAssignmentGrading from './pages/faculty/FacultyAssignmentGrading';
import FacultyAttendance from './pages/faculty/FacultyAttendance';
import FacultyCourses from './pages/faculty/FacultyCourses';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentExams from './pages/student/StudentExams';
import StudentExamDetails from './pages/student/StudentExamDetails';
import StudentTakeExam from './pages/student/StudentTakeExam';
import StudentResults from './pages/student/StudentResults';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentCourses from './pages/student/StudentCourses';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/exams" element={<ProtectedRoute role="admin"><AdminExams /></ProtectedRoute>} />
          <Route path="/admin/exams/create" element={<ProtectedRoute role="admin"><AdminCreateExam /></ProtectedRoute>} />
          <Route path="/admin/exams/:id" element={<ProtectedRoute role="admin"><AdminEditExam /></ProtectedRoute>} />
          <Route path="/admin/rooms" element={<ProtectedRoute role="admin"><AdminRooms /></ProtectedRoute>} />
          <Route path="/admin/seat-allocation" element={<ProtectedRoute role="admin"><AdminSeatAllocation /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AdminAttendance /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute role="admin"><AdminCourses /></ProtectedRoute>} />

          {/* Faculty */}
          <Route path="/faculty/dashboard" element={<ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>} />
          <Route path="/faculty/exams" element={<ProtectedRoute role="faculty"><FacultyExams /></ProtectedRoute>} />
          <Route path="/faculty/exams/create" element={<ProtectedRoute role="faculty"><FacultyCreateExam /></ProtectedRoute>} />
          <Route path="/faculty/exams/:id" element={<ProtectedRoute role="faculty"><FacultyEditExam /></ProtectedRoute>} />
          <Route path="/faculty/exams/:id/seating" element={<ProtectedRoute role="faculty"><FacultySeating /></ProtectedRoute>} />
          <Route path="/faculty/assignments" element={<ProtectedRoute role="faculty"><FacultyAssignments /></ProtectedRoute>} />
          <Route path="/faculty/assignments/create" element={<ProtectedRoute role="faculty"><FacultyCreateAssignment /></ProtectedRoute>} />
          <Route path="/faculty/assignments/:id" element={<ProtectedRoute role="faculty"><FacultyEditAssignment /></ProtectedRoute>} />
          <Route path="/faculty/grading" element={<ProtectedRoute role="faculty"><FacultyGrading /></ProtectedRoute>} />
          <Route path="/faculty/assignments/grade" element={<ProtectedRoute role="faculty"><FacultyAssignmentGrading /></ProtectedRoute>} />
          <Route path="/faculty/attendance" element={<ProtectedRoute role="faculty"><FacultyAttendance /></ProtectedRoute>} />
          <Route path="/faculty/courses" element={<ProtectedRoute role="faculty"><FacultyCourses /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/exams" element={<ProtectedRoute role="student"><StudentExams /></ProtectedRoute>} />
          <Route path="/student/exams/:id" element={<ProtectedRoute role="student"><StudentExamDetails /></ProtectedRoute>} />
          <Route path="/student/exams/:id/take" element={<ProtectedRoute role="student"><StudentTakeExam /></ProtectedRoute>} />
          <Route path="/student/results" element={<ProtectedRoute role="student"><StudentResults /></ProtectedRoute>} />
          <Route path="/student/notifications" element={<ProtectedRoute role="student"><StudentNotifications /></ProtectedRoute>} />
          <Route path="/student/attendance" element={<ProtectedRoute role="student"><StudentAttendance /></ProtectedRoute>} />
          <Route path="/student/courses" element={<ProtectedRoute role="student"><StudentCourses /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
