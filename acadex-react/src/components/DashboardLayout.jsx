import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services';

const navItems = {
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Analytics', path: '/admin/analytics' },
    { label: 'Exams', path: '/admin/exams' },
    { label: 'Rooms', path: '/admin/rooms' },
    { label: 'Seat Allocation', path: '/admin/seat-allocation' },
    { label: 'Users', path: '/admin/users' },
    { label: 'Attendance', path: '/admin/attendance' },
    { label: 'Courses', path: '/admin/courses' },
  ],
  faculty: [
    { label: 'Dashboard', path: '/faculty/dashboard' },
    { label: 'Exams', path: '/faculty/exams' },
    { label: 'Assignments', path: '/faculty/assignments' },
    { label: 'Exam Grading', path: '/faculty/grading' },
    { label: 'Assignment Grading', path: '/faculty/assignments/grade' },
    { label: 'Attendance', path: '/faculty/attendance' },
    { label: 'Courses', path: '/faculty/courses' },
  ],
  student: [
    { label: 'Dashboard', path: '/student/dashboard' },
    { label: 'Exams', path: '/student/exams' },
    { label: 'Results', path: '/student/results' },
    { label: 'Notifications', path: '/student/notifications' },
    { label: 'Attendance', path: '/student/attendance' },
    { label: 'Courses', path: '/student/courses' },
  ],
};

const roleBadgeColor = {
  admin: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10',
  faculty: 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/10',
  student: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10',
};

// Role-specific accent colors for consistent theming
const roleTheme = {
  admin: {
    gradient: 'from-rose-600 to-pink-600',
    activeBg: 'bg-rose-50 text-rose-700',
    hoverBorder: 'hover:border-rose-200',
    spinner: 'border-rose-600',
    bgBase: 'bg-gradient-to-br from-rose-50 via-slate-50 to-pink-50',
    orb1: 'bg-rose-300/20',
    orb2: 'bg-pink-200/25',
    orb3: 'bg-amber-200/15',
    headerAccent: 'from-rose-500/5 to-transparent',
  },
  faculty: {
    gradient: 'from-teal-600 to-cyan-600',
    activeBg: 'bg-teal-50 text-teal-700',
    hoverBorder: 'hover:border-teal-200',
    spinner: 'border-teal-600',
    bgBase: 'bg-gradient-to-br from-teal-50 via-slate-50 to-cyan-50',
    orb1: 'bg-teal-300/20',
    orb2: 'bg-cyan-200/25',
    orb3: 'bg-emerald-200/15',
    headerAccent: 'from-teal-500/5 to-transparent',
  },
  student: {
    gradient: 'from-indigo-600 to-violet-600',
    activeBg: 'bg-indigo-50 text-indigo-700',
    hoverBorder: 'hover:border-indigo-200',
    spinner: 'border-indigo-600',
    bgBase: 'bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50',
    orb1: 'bg-indigo-300/20',
    orb2: 'bg-violet-200/25',
    orb3: 'bg-blue-200/15',
    headerAccent: 'from-indigo-500/5 to-transparent',
  },
};

export default function DashboardLayout({ children, role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const theme = roleTheme[role] || roleTheme.student;

  useEffect(() => {
    notificationService.list({ isRead: false, limit: 5 })
      .then((data) => {
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const items = navItems[role] || [];

  return (
    <div className={`min-h-screen ${theme.bgBase} relative overflow-hidden`}>
      {/* ─── Decorative floating orbs ─── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full ${theme.orb1} blur-3xl animate-float-slow`} />
        <div className={`absolute top-1/3 -left-24 w-80 h-80 rounded-full ${theme.orb2} blur-3xl animate-float-medium`} />
        <div className={`absolute bottom-0 right-1/4 w-72 h-72 rounded-full ${theme.orb3} blur-3xl animate-float-fast`} />
        <div className="absolute inset-0 dot-pattern opacity-40" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong shadow-sm">
        <div className={`absolute inset-0 bg-gradient-to-r ${theme.headerAccent}`} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link to={`/${role}/dashboard`} className={`text-xl font-bold bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent`}>
                AcadeX
              </Link>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColor[role] || ''}`}>
                {role}
              </span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? theme.activeBg
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center space-x-3">
              {/* Notifications bell */}
              <Link to={`/${role === 'student' ? 'student' : role}/notifications`} className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <span className="text-sm text-slate-600 hidden sm:block font-medium">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-sm">
            <nav className="px-4 py-2 space-y-1">
              {items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                    location.pathname === item.path
                      ? theme.activeBg
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
