import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, role: userRole } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    navigate(`/${userRole || 'student'}/dashboard`);
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const role = await login(email, password);
      if (role === 'admin') navigate('/admin');
      else if (role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
      <div className="w-full max-w-[1100px] lg:h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white/5 backdrop-blur-lg">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[640px]">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-12 flex flex-col justify-center text-white">
            <h1 className="text-4xl font-bold mb-4">AcadeX</h1>
            <h2 className="text-2xl font-semibold mb-4">Academic Management System</h2>
            <p className="text-base text-white/90 mb-6 max-w-md">
              Manage exams, attendance, courses, assignments, and analytics in one unified platform.
            </p>

            <div className="space-y-2 text-sm text-white/80">
              <p>✔ Smart Attendance Tracking</p>
              <p>✔ Topic-Based Learning</p>
              <p>✔ Automated Seat Allocation</p>
              <p>✔ Real-time Dashboards</p>
            </div>
          </div>

          <div className="bg-[#111827] p-12 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 mb-6">Login to continue to your dashboard</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email / ID"
                className="w-full p-4 rounded bg-gray-800 outline-none text-lg text-white"
                required
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-4 rounded bg-gray-800 outline-none text-lg text-white"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-lg font-semibold p-4 rounded transition-colors"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
