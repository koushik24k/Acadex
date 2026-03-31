import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, role: userRole, loading } = useAuth();
  const storedRole = localStorage.getItem('role');
  const effectiveRole = (userRole || storedRole || '').toString().toLowerCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Dev mode: if not authenticated, redirect to home (role selector) instead of login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role && effectiveRole !== String(role).toLowerCase()) {
    return <Navigate to={`/${effectiveRole || 'student'}/dashboard`} replace />;
  }

  return children;
}
