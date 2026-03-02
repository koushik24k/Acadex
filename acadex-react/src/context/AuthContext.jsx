import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, userService } from '../services';

const AuthContext = createContext(null);

// Dev-mode credentials — these match the DataInitializer seed data
const DEV_CREDENTIALS = {
  admin:   { email: 'admin@acadex.com',   password: 'admin123' },
  faculty: { email: 'faculty@acadex.com', password: 'faculty123' },
  student: { email: 'student@acadex.com', password: 'student123' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on reload
    const savedRole = localStorage.getItem('mock_role');
    const stored = authService.getUser();
    if (savedRole && stored && authService.isAuthenticated()) {
      setUser(stored);
      setRole(savedRole);
    }
    setLoading(false);
  }, []);

  // Dev mode: pick a role → auto-login to backend with seeded credentials
  const switchRole = async (newRole) => {
    const creds = DEV_CREDENTIALS[newRole];
    if (!creds) return;
    try {
      const { user: u } = await authService.login(creds.email, creds.password);
      setUser(u);
      setRole(newRole);
      localStorage.setItem('mock_role', newRole);
    } catch (err) {
      console.error('Dev auto-login failed:', err);
    }
  };

  const login = async (email, password) => {
    const { user: u } = await authService.login(email, password);
    setUser(u);
    const roles = await userService.getRoles(u.id);
    const r = roles?.[0]?.role || 'student';
    setRole(r);
    return r;
  };

  const logout = () => {
    authService.logout();
    localStorage.removeItem('mock_role');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, switchRole, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
