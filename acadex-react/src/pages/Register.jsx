import React from 'react';
import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 relative overflow-hidden noise-overlay">
      {/* ─── Decorative orbs ─── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 right-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl animate-float-medium" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl p-8 bg-white/5 border border-white/10 text-center" style={{ backdropFilter: 'blur(16px)' }}>
        <Link to="/" className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">AcadeX</Link>
        <div className="mt-6 p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <h2 className="text-lg font-semibold text-amber-300">Registration Disabled</h2>
          <p className="text-sm text-amber-200/70 mt-2">
            New registrations are currently disabled. Please contact your administrator for account creation.
          </p>
        </div>
        <Link to="/login" className="mt-6 inline-block text-indigo-400 hover:text-indigo-300 text-sm font-medium">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
