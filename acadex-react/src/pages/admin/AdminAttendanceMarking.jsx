import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { courseService, attendanceService } from '../../services';

export default function AdminAttendanceMarking() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetail, setCourseDetail] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [studentStatuses, setStudentStatuses] = useState({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.list();
      setCourses(data);
    } catch (e) {
      console.error(e);
      setMsg('Error loading courses');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetail = async (courseId) => {
    try {
      const [detail, enrolls] = await Promise.all([
        courseService.get(courseId),
        courseService.listEnrollments(courseId),
      ]);
      setCourseDetail(detail);
      setEnrollments(Array.isArray(enrolls) ? enrolls : []);

      // Extract unique subjects from units and topics
      const subjectSet = new Set();
      if (detail.units && Array.isArray(detail.units)) {
        detail.units.forEach(unit => {
          if (unit.topics && Array.isArray(unit.topics)) {
            unit.topics.forEach(topic => {
              if (topic.subjectId) subjectSet.add(JSON.stringify({ id: topic.subjectId, name: topic.subjectName }));
            });
          }
        });
      }
      const uniqueSubjects = Array.from(subjectSet).map(s => JSON.parse(s));
      setSubjects(uniqueSubjects.length > 0 ? uniqueSubjects : [{ id: detail.id, name: detail.courseName }]);

      // Initialize student statuses
      const statuses = {};
      enrolls.forEach(e => {
        statuses[e.studentId] = 'Present';
      });
      setStudentStatuses(statuses);
    } catch (e) {
      console.error('Error loading course detail:', e);
      setMsg('Error loading course details');
    }
  };

  const handleCourseSelect = (courseId) => {
    setSelectedCourse(courseId);
    setSelectedSubject(null);
    loadCourseDetail(courseId);
  };

  const handleStatusToggle = (studentId) => {
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const handleMarkAttendance = async () => {
    if (!selectedCourse || !selectedSubject || !selectedDate) {
      setMsg('Please select course, subject, and date');
      return;
    }

    try {
      setLoading(true);
      const students = enrollments.map(e => ({
        studentId: e.studentId,
        status: studentStatuses[e.studentId] || 'Present'
      }));

      const result = await attendanceService.override({
        subjectId: selectedSubject,
        date: selectedDate,
        students,
        notes
      });

      setMsg(`✅ Attendance marked for ${result.count} students`);
      setNotes('');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error('Error marking attendance:', e);
      setMsg(e.response?.data?.error || 'Error marking attendance');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = Object.values(studentStatuses).filter(s => s === 'Present').length;
  const absentCount = enrollments.length - presentCount;

  if (loading && !courseDetail) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📝 Mark Attendance</h1>
          <p className="text-slate-600 text-sm mt-1">Mark attendance for students in your courses</p>
        </div>

        {msg && (
          <div className={`text-sm text-center py-3 px-4 rounded-lg font-medium ${
            msg.includes('✅') || msg.includes('success')
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {msg}
          </div>
        )}

        {/* Selection Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Course Selection */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-semibold text-slate-700 block mb-3">📚 Select Course</label>
            <select
              value={selectedCourse || ''}
              onChange={e => handleCourseSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">Choose Course...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} - {c.courseName}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selection */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-semibold text-slate-700 block mb-3">📖 Select Subject</label>
            <select
              value={selectedSubject || ''}
              onChange={e => setSelectedSubject(e.target.value)}
              disabled={!selectedCourse || subjects.length === 0}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
            >
              <option value="">Choose Subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name || 'Subject'}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-semibold text-slate-700 block mb-3">📅 Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200 p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-rose-600 font-medium mb-3">CLASS STATS</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Present</span>
                  <span className="text-lg font-bold text-emerald-600">{presentCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Absent</span>
                  <span className="text-lg font-bold text-red-600">{absentCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <label className="text-sm font-semibold text-slate-700 block mb-2">📝 Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes about this class session..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            rows="2"
          />
        </div>

        {/* Student List */}
        {enrollments.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">👥 Students ({enrollments.length})</h3>
              <button
                onClick={handleMarkAttendance}
                disabled={!selectedCourse || !selectedSubject || loading}
                className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Saving...' : '✅ Mark Attendance'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {enrollments.map(enrollment => (
                <button
                  key={enrollment.id}
                  onClick={() => handleStatusToggle(enrollment.studentId)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    studentStatuses[enrollment.studentId] === 'Present'
                      ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                      : 'bg-red-50 border-red-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{enrollment.studentName || enrollment.studentId}</p>
                      <p className="text-xs text-slate-500">Section {enrollment.section}</p>
                    </div>
                    <div className="text-2xl">
                      {studentStatuses[enrollment.studentId] === 'Present' ? '✅' : '❌'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!selectedCourse && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-6xl mb-3">📚</div>
            <p className="text-lg font-medium">Select a course to begin marking attendance</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
