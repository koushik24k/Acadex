import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, submissionService, assignmentService, assignmentSubmissionService } from '../../services';

export default function FacultyDashboard() {
  const [stats, setStats] = useState({ exams: 0, pendingExamGrading: 0, assignments: 0, pendingAssignmentGrading: 0 });
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [aSubmissions, setASubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      examService.list({ limit: 10 }).catch(() => []),
      submissionService.list({ status: 'submitted', limit: 5 }).catch(() => []),
      assignmentService.list({ limit: 10 }).catch(() => []),
      assignmentSubmissionService.list({ status: 'submitted', limit: 5 }).catch(() => []),
    ]).then(([ex, sub, assign, asub]) => {
      const examList = Array.isArray(ex) ? ex : [];
      const subList = Array.isArray(sub) ? sub : [];
      const assignList = Array.isArray(assign) ? assign : [];
      const asubList = Array.isArray(asub) ? asub : [];
      setExams(examList);
      setSubmissions(subList);
      setAssignments(assignList);
      setASubmissions(asubList);
      setStats({
        exams: examList.length,
        pendingExamGrading: subList.length,
        assignments: assignList.length,
        pendingAssignmentGrading: asubList.length,
      });
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout role="faculty">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Faculty Dashboard</h1>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <p className="text-sm text-slate-500 font-medium">Total Exams</p>
              <p className="text-3xl font-bold text-slate-900">{stats.exams}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <p className="text-sm text-slate-500 font-medium">Pending Exam Grading</p>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingExamGrading}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <p className="text-sm text-slate-500 font-medium">Total Assignments</p>
              <p className="text-3xl font-bold text-slate-900">{stats.assignments}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <p className="text-sm text-slate-500 font-medium">Pending Assignment Grading</p>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingAssignmentGrading}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Exams */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">Recent Exams</h3>
                <Link to="/faculty/exams/create" className="text-teal-600 text-sm hover:underline">Create Exam</Link>
              </div>
              {exams.slice(0, 5).map((e) => (
                <div key={e.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div><p className="text-sm font-medium">{e.title}</p><p className="text-xs text-gray-500">{e.scheduledDate}</p></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${e.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{e.status}</span>
                </div>
              ))}
            </div>

            {/* Pending Submissions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">Pending Exam Submissions</h3>
                <Link to="/faculty/grading" className="text-teal-600 text-sm hover:underline">Grade All</Link>
              </div>
              {submissions.length === 0 ? <p className="text-gray-500 text-sm">No pending submissions.</p> : (
                submissions.map((s) => (
                  <div key={s.id} className="py-2 border-b last:border-0">
                    <p className="text-sm">Submission #{s.id} - Exam #{s.examId}</p>
                    <p className="text-xs text-gray-500">Student: {s.studentId?.slice(0, 8)}</p>
                  </div>
                ))
              )}
            </div>

            {/* Recent Assignments */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">Recent Assignments</h3>
                <Link to="/faculty/assignments/create" className="text-teal-600 text-sm hover:underline">Create Assignment</Link>
              </div>
              {assignments.slice(0, 5).map((a) => (
                <div key={a.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-gray-500">{a.subject || 'No subject'}</p></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{a.status}</span>
                </div>
              ))}
            </div>

            {/* Pending Assignment Submissions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">Pending Assignment Submissions</h3>
                <Link to="/faculty/assignments/grade" className="text-teal-600 text-sm hover:underline">Grade All</Link>
              </div>
              {aSubmissions.length === 0 ? <p className="text-gray-500 text-sm">No pending submissions.</p> : (
                aSubmissions.map((s) => (
                  <div key={s.id} className="py-2 border-b last:border-0">
                    <p className="text-sm">Submission #{s.id} - Assignment #{s.assignmentId}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
