import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, resultService, notificationService, assignmentService } from '../../services';
import { BookOpen, Award, Bell, FileText, Calendar, Clock } from 'lucide-react';

export default function StudentDashboard() {
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [results, setResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      examService.list({ status: 'published' }),
      resultService.list({ published: true }),
      notificationService.list({ limit: 5 }),
      assignmentService.list({ limit: 5 }),
    ]).then(([examsR, resultsR, notifsR, assignR]) => {
      setUpcomingExams(Array.isArray(examsR.value) ? examsR.value.slice(0, 5) : []);
      setResults(Array.isArray(resultsR.value) ? resultsR.value.slice(0, 5) : []);
      setNotifications(Array.isArray(notifsR.value) ? notifsR.value.slice(0, 5) : []);
      setAssignments(Array.isArray(assignR.value) ? assignR.value.slice(0, 5) : []);
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: 'Upcoming Exams', value: upcomingExams.length, icon: BookOpen, color: 'indigo', link: '/student/exams' },
    { label: 'Results Available', value: results.length, icon: Award, color: 'emerald', link: '/student/results' },
    { label: 'Notifications', value: notifications.length, icon: Bell, color: 'amber', link: '/student/notifications' },
    { label: 'Assignments', value: assignments.length, icon: FileText, color: 'violet', link: '/student/exams' },
  ];

  if (loading) return (
    <DashboardLayout role="student">
      <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout role="student">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Student Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const colorMap = {
            indigo: 'text-indigo-600',
            emerald: 'text-emerald-600',
            amber: 'text-amber-600',
            violet: 'text-violet-600',
          };
          return (
          <Link to={s.link} key={s.label} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-5 h-5 ${colorMap[s.color] || 'text-slate-600'}`} />
              <span className="text-2xl font-bold text-slate-900">{s.value}</span>
            </div>
            <p className="text-sm text-slate-500 font-medium">{s.label}</p>
          </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Exams</h2>
            <Link to="/student/exams" className="text-sm text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          {upcomingExams.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No upcoming exams.</p>
          ) : upcomingExams.map((e) => (
            <Link to={`/student/exams/${e.id}`} key={e.id} className="block p-3 hover:bg-gray-50 rounded-lg mb-1">
              <p className="font-medium text-sm">{e.title}</p>
              <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{e.date}</span>
                <span className="flex items-center"><Clock className="w-3 h-3 mr-1" />{e.duration} min</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Results</h2>
            <Link to="/student/results" className="text-sm text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          {results.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No results yet.</p>
          ) : results.map((r) => (
            <div key={r.id} className="p-3 hover:bg-gray-50 rounded-lg mb-1">
              <p className="font-medium text-sm">{r.examTitle || `Exam #${r.examId}`}</p>
              <div className="flex items-center space-x-3 mt-1 text-xs">
                <span className="text-green-600 font-medium">{r.marksObtained}/{r.totalMarks}</span>
                {r.grade && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">{r.grade}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
            <Link to="/student/notifications" className="text-sm text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No notifications.</p>
          ) : notifications.map((n) => (
            <div key={n.id} className={`p-3 rounded-lg mb-1 ${!n.read ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
              <p className="font-medium text-sm">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{n.message?.substring(0, 80)}</p>
            </div>
          ))}
        </div>

        {/* Assignments */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Assignments</h2>
          </div>
          {assignments.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No assignments.</p>
          ) : assignments.map((a) => (
            <div key={a.id} className="p-3 hover:bg-gray-50 rounded-lg mb-1">
              <p className="font-medium text-sm">{a.title}</p>
              <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                <span>Due: {a.dueDate}</span>
                <span>Max: {a.maxMarks}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
