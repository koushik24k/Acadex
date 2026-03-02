import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Home() {
  const { isAuthenticated, switchRole } = useAuth();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const roles = [
    {
      key: 'admin',
      label: 'Admin',
      desc: 'Manage users, exams, rooms, seat allocation & analytics.',
      color: 'from-rose-500 to-rose-600',
      icon: '\uD83D\uDEE1\uFE0F',
    },
    {
      key: 'faculty',
      label: 'Faculty',
      desc: 'Create exams, assignments, grading & seating management.',
      color: 'from-teal-500 to-teal-600',
      icon: '\uD83D\uDC68\u200D\uD83C\uDFEB',
    },
    {
      key: 'student',
      label: 'Student',
      desc: 'Take exams, view results, notifications & assignments.',
      color: 'from-indigo-500 to-violet-600',
      icon: '\uD83C\uDF93',
    },
  ];

  const handleSelect = async (roleKey) => {
    setLoadingRole(roleKey);
    try {
      await switchRole(roleKey);
      navigate(`/${roleKey}/dashboard`);
    } catch (err) {
      console.error('Failed to connect:', err);
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col relative overflow-hidden noise-overlay">
      {/* ─── Decorative background orbs ─── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-3xl animate-float-slow" />
        <div className="absolute top-1/2 -left-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl animate-float-medium" />
        <div className="absolute -bottom-20 right-1/3 w-80 h-80 rounded-full bg-rose-500/8 blur-3xl animate-float-fast" />
        <div className="absolute top-20 left-1/3 w-64 h-64 rounded-full bg-cyan-500/8 blur-3xl animate-float-medium" />
        <div className="absolute inset-0 dot-pattern opacity-10" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">AcadeX</span>
          <span className="text-sm text-slate-500 tracking-wide">Dev Mode &mdash; No Login Required</span>
        </div>
      </nav>

      {/* Role Selector */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-4 leading-tight">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
              AcadeX
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-lg mx-auto">
            Select a role to enter the dashboard directly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => handleSelect(r.key)}
              disabled={!!loadingRole}
              className={`group relative rounded-2xl p-8 text-left cursor-pointer transition-all duration-300 border card-lift ${
                loadingRole === r.key
                  ? 'ring-2 ring-indigo-400 bg-white/10 border-white/20'
                  : loadingRole && loadingRole !== r.key
                  ? 'opacity-40 pointer-events-none bg-white/5 border-white/10'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${r.color} text-white text-2xl mb-5 shadow-lg`}>
                {loadingRole === r.key ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                ) : r.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{r.label}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{r.desc}</p>
              {loadingRole === r.key && (
                <p className="text-xs text-indigo-400 mt-3 animate-pulse">Connecting to backend...</p>
              )}
              <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r ${r.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} AcadeX &mdash; Dev Mode (Login bypassed)
      </footer>
    </div>
  );
}
