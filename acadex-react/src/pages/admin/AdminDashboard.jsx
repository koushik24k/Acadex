import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, submissionService, adminUserService } from '../../services';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalExams: 0, totalUsers: 0, totalSubmissions: 0, activeExams: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      examService.list({}).catch(() => []),
      submissionService.list({}).catch(() => []),
      adminUserService.list({}).catch(() => ({ users: [] })),
    ]).then(([exams, submissions, usersData]) => {
      const examList = Array.isArray(exams) ? exams : [];
      const subList = Array.isArray(submissions) ? submissions : [];
      const userList = usersData?.users || (Array.isArray(usersData) ? usersData : []);
      setStats({
        totalExams: examList.length,
        totalUsers: userList.length,
        totalSubmissions: subList.length,
        activeExams: examList.filter((e) => e.status === 'published' || e.status === 'ongoing').length,
      });
      setLoading(false);
    });
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, color: 'bg-rose-500' },
    { label: 'Total Exams', value: stats.totalExams, color: 'bg-emerald-500' },
    { label: 'Submissions', value: stats.totalSubmissions, color: 'bg-violet-500' },
    { label: 'Active Exams', value: stats.activeExams, color: 'bg-amber-500' },
  ];

  const quickActions = [
    { label: 'Manage Users', path: '/admin/users', desc: 'Create and manage user accounts' },
    { label: 'Manage Exams', path: '/admin/exams', desc: 'View and manage all exams' },
    { label: 'Manage Rooms', path: '/admin/rooms', desc: 'Configure exam rooms' },
    { label: 'Seat Allocation', path: '/admin/seat-allocation', desc: 'Allocate seats for exams' },
    { label: 'Analytics', path: '/admin/analytics', desc: 'View system-wide analytics' },
  ];

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Dashboard</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow">
                <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{s.value}</p>
                <div className={`mt-3 h-1 rounded-full ${s.color} opacity-30`}></div>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((a) => (
              <Link key={a.path} to={a.path} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md hover:border-rose-200 transition-all group">
                <h3 className="font-semibold text-slate-900 group-hover:text-rose-700 transition-colors">{a.label}</h3>
                <p className="text-sm text-slate-500 mt-1">{a.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
