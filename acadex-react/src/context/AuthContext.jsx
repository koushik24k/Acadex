import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

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
    let isMounted = true;

    const normalizeRole = (value) => {
      if (!value) return null;
      if (typeof value === 'string') return value.toLowerCase();
      if (typeof value === 'object' && value.role) return String(value.role).toLowerCase();
      return null;
    };

    const initSession = async () => {
      try {
        const hasToken = authService.isAuthenticated();
        const storedUser = authService.getUser();
        const savedRole = localStorage.getItem('role') || localStorage.getItem('mock_role');

        if (hasToken && storedUser) {
          const derivedRole =
            normalizeRole(savedRole) ||
            normalizeRole(Array.isArray(storedUser.roles) ? storedUser.roles[0] : null) ||
            'student';

          if (isMounted) {
            setUser(storedUser);
            setRole(derivedRole);
          }
          return;
        }

        // Fallback recovery when token exists but local user cache is missing/corrupt
        if (hasToken) {
          const session = await authService.getSession();
          const sessionUser = session?.user;
          if (sessionUser?.id && isMounted) {
            const derivedRole =
              normalizeRole(savedRole) ||
              normalizeRole(Array.isArray(sessionUser.roles) ? sessionUser.roles[0] : null) ||
              'student';

            localStorage.setItem('user', JSON.stringify(sessionUser));
            localStorage.setItem('role', derivedRole);
            setUser(sessionUser);
            setRole(derivedRole);
          }
        }
      } catch {
        // Ignore restore failures; user can log in again.
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Dev mode: pick a role → auto-login to backend with seeded credentials
  const switchRole = async (newRole) => {
    const creds = DEV_CREDENTIALS[newRole];
    if (!creds) return;
    try {
      const { user: u, role: backendRole } = await authService.login(creds.email, creds.password);
      setUser(u);
      setRole(String(backendRole || newRole).toLowerCase());
      localStorage.setItem('mock_role', newRole);
    } catch (err) {
      console.error('Dev auto-login failed:', err);
    }
  };

  const login = async (email, password) => {
    const { user: u, role: backendRole } = await authService.login(email, password);
    setUser(u);

    const finalRole = String(backendRole || u?.roles?.[0] || 'student').toLowerCase();
    localStorage.setItem('role', finalRole);
    setRole(finalRole);
    return finalRole;
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
