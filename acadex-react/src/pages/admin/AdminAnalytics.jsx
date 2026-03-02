import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, resultService } from '../../services';

export default function AdminAnalytics() {
  const [stats, setStats] = useState({ avgScore: 0, passRate: 0, totalExams: 0, totalStudents: 0 });
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      examService.list({}).catch(() => []),
      resultService.list({}).catch(() => []),
    ]).then(([examData, resultData]) => {
      const ex = Array.isArray(examData) ? examData : [];
      const res = Array.isArray(resultData) ? resultData : [];
      setExams(ex);
      setResults(res);

      const totalStudents = new Set(res.map((r) => r.studentId)).size;
      const avgScore = res.length > 0 ? Math.round(res.reduce((a, r) => a + (r.percentage || 0), 0) / res.length) : 0;
      const passed = res.filter((r) => r.obtainedMarks >= (r.totalMarks * 0.4)).length;
      const passRate = res.length > 0 ? Math.round((passed / res.length) * 100) : 0;

      setStats({ avgScore, passRate, totalExams: ex.length, totalStudents });
      setLoading(false);
    });
  }, []);

  const statusCounts = exams.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const topPerformers = [...results]
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    .slice(0, 5);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Average Score', value: `${stats.avgScore}%`, color: 'blue' },
              { label: 'Pass Rate', value: `${stats.passRate}%`, color: 'green' },
              { label: 'Total Exams', value: stats.totalExams, color: 'purple' },
              { label: 'Active Students', value: stats.totalStudents, color: 'orange' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm border p-6">
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex space-x-2 mb-6">
            {['overview', 'exams', 'students'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                  tab === t ? 'bg-rose-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Exams by Status</h3>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="capitalize text-gray-700">{status}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Top Performers</h3>
                {topPerformers.length === 0 ? (
                  <p className="text-gray-500">No results yet.</p>
                ) : (
                  topPerformers.map((r, i) => (
                    <div key={r.id || i} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-gray-700">Student {r.studentId?.slice(0, 8)}</span>
                      <span className="font-medium text-gray-900">{r.percentage}% - Grade {r.grade}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'exams' && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">All Exams</h3>
              {exams.map((e) => (
                <div key={e.id} className="flex justify-between items-center py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{e.title}</p>
                    <p className="text-sm text-gray-500">{e.scheduledDate}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    e.status === 'published' ? 'bg-green-100 text-green-800' :
                    e.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>{e.status}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'students' && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Student Performance</h3>
              <p className="text-gray-500">Detailed student analytics coming soon.</p>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
