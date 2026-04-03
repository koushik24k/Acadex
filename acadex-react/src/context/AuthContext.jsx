import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

const getCachedAuthState = () => {
  const cachedUser = authService.getUser();
  const cachedRole = localStorage.getItem('role') || localStorage.getItem('mock_role');
  const derivedRole = cachedRole || (Array.isArray(cachedUser?.roles) && cachedUser.roles[0]) || null;
  return {
    user: cachedUser,
    role: derivedRole ? String(derivedRole).toLowerCase() : null,
  };
};

// Dev-mode credentials — these match the DataInitializer seed data
const DEV_CREDENTIALS = {
  admin:   { email: 'admin@acadex.com',   password: 'admin123' },
  faculty: { email: 'faculty@acadex.com', password: 'faculty123' },
  student: { email: 'student@acadex.com', password: 'student123' },
};

export function AuthProvider({ children }) {
  const cachedAuth = getCachedAuthState();
  const [user, setUser] = useState(cachedAuth.user);
  const [role, setRole] = useState(cachedAuth.role);
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

        if (storedUser?.id && isMounted) {
          const derivedRole =
            normalizeRole(Array.isArray(storedUser.roles) ? storedUser.roles[0] : null) ||
            normalizeRole(savedRole) ||
            'student';
          setUser(storedUser);
          setRole(derivedRole);
        }

        if (hasToken) {
          // Always verify token-backed session to avoid stale local role/user mismatches.
          const session = await authService.getSession();
          const sessionUser = session?.user;

          if (sessionUser?.id && isMounted) {
            const derivedRole =
              normalizeRole(Array.isArray(sessionUser.roles) ? sessionUser.roles[0] : null) ||
              normalizeRole(savedRole) ||
              'student';

            localStorage.setItem('user', JSON.stringify(sessionUser));
            localStorage.setItem('role', derivedRole);
            setUser(sessionUser);
            setRole(derivedRole);
            return;
          }

          // Fallback to cached session data when backend session check is temporarily unavailable.
          if (storedUser?.id && isMounted) {
            const derivedRole =
              normalizeRole(Array.isArray(storedUser.roles) ? storedUser.roles[0] : null) ||
              normalizeRole(savedRole) ||
              'student';
            setUser(storedUser);
            setRole(derivedRole);
            return;
          }

          authService.logout();
          localStorage.removeItem('mock_role');
          if (isMounted) {
            setUser(null);
            setRole(null);
          }
        }
      } catch {
        // Keep user logged in from cache on transient refresh failures.
        const storedUser = authService.getUser();
        const savedRole = localStorage.getItem('role') || localStorage.getItem('mock_role');
        if (storedUser?.id && isMounted) {
          const derivedRole =
            normalizeRole(Array.isArray(storedUser.roles) ? storedUser.roles[0] : null) ||
            normalizeRole(savedRole) ||
            'student';
          setUser(storedUser);
          setRole(derivedRole);
        } else {
          authService.logout();
          localStorage.removeItem('mock_role');
          if (isMounted) {
            setUser(null);
            setRole(null);
          }
        }
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
