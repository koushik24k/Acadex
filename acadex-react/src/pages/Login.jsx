import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const role = await login(email, password);
      navigate(`/${role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden noise-overlay">
      {/* ─── Decorative orbs ─── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl animate-float-medium" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-rose-500/5 blur-3xl animate-float-fast" />
      </div>

      {/* ─── Left branding panel (hidden on mobile) ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-16">
        <Link to="/" className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x mb-6">
          AcadeX
        </Link>
        <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
          Exam Management<br />Made Simple
        </h2>
        <p className="text-slate-400 text-lg leading-relaxed max-w-md">
          Streamline your academic workflow with powerful tools for exams, assignments, grading, and seat allocation.
        </p>
        <div className="mt-10 flex space-x-6">
          {[
            { label: 'Exams', value: '500+' },
            { label: 'Users', value: '10K+' },
            { label: 'Uptime', value: '99.9%' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right form panel ─── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <Link to="/" className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">AcadeX</Link>
          </div>

          <div className="rounded-2xl p-8 bg-white/5 border border-white/10" style={{ backdropFilter: 'blur(16px)' }}>
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm mb-6">Sign in to your account</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs font-medium text-slate-400 mb-2">Test Accounts:</p>
              <div className="text-xs text-slate-400 space-y-1">
                <p><strong className="text-slate-300">Admin:</strong> admin@acadex.com / admin123</p>
                <p><strong className="text-slate-300">Faculty:</strong> faculty@acadex.com / faculty123</p>
                <p><strong className="text-slate-300">Student:</strong> student@acadex.com / student123</p>
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-slate-500">
              Don't have an account? <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
