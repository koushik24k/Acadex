import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [department, setDepartment] = useState('Computer Science');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.register(name, email, password, role, department);
      setSuccess('Registration successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try another email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 relative overflow-hidden noise-overlay">
      {/* ─── Decorative orbs ─── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 right-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl animate-float-medium" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl p-8 bg-white/5 border border-white/10" style={{ backdropFilter: 'blur(16px)' }}>
        <Link to="/" className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">AcadeX</Link>
        <h2 className="mt-5 text-xl font-semibold text-white">Create Account</h2>
        <p className="text-sm text-slate-300 mt-1">Registration is open for all users</p>

        {error && <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>}
        {success && <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Full name"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Password"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="student" className="text-black">Student</option>
              <option value="faculty" className="text-black">Faculty</option>
              <option value="admin" className="text-black">Admin</option>
            </select>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Department"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link to="/login" className="text-indigo-300 hover:text-indigo-200 text-sm font-medium">
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
