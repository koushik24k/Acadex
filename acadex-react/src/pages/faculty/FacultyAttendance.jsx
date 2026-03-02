import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { subjectService, attendanceService, topicService } from '../../services';

export default function FacultyAttendance() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [existingRecords, setExistingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState('mark'); // mark | summary
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (user?.id) {
      subjectService.list({ facultyId: user.id }).then(setSubjects).catch(() => {});
      attendanceService.getStudents({}).then(setStudents).catch(() => {});
      setLoading(false);
    }
  }, [user]);

  // Load topics when subject changes
  useEffect(() => {
    if (selectedSubject) {
      topicService.list({ subjectId: selectedSubject })
        .then((data) => setTopics(Array.isArray(data) ? data : []))
        .catch(() => setTopics([]));
      setSelectedTopic(null);
    } else {
      setTopics([]);
      setSelectedTopic(null);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedSubject && selectedDate && tab === 'mark') {
      attendanceService.getBySubject(selectedSubject, { date: selectedDate })
        .then((records) => {
          setExistingRecords(records);
          const map = {};
          records.forEach((r) => { map[r.studentId] = r.status; });
          // Default all students to present if no records
          students.forEach((s) => {
            if (!map[s.id]) map[s.id] = 'present';
          });
          setAttendance(map);
          setSaved(false);
        })
        .catch(() => {});
    }
  }, [selectedSubject, selectedDate, tab, students]);

  useEffect(() => {
    if (selectedSubject && tab === 'summary') {
      attendanceService.getSummary(selectedSubject).then(setSummary).catch(() => {});
    }
  }, [selectedSubject, tab]);

  const toggleStatus = (studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present',
    }));
    setSaved(false);
  };

  const markAllPresent = () => {
    const map = {};
    students.forEach((s) => { map[s.id] = 'present'; });
    setAttendance(map);
    setSaved(false);
  };

  const saveAttendance = async () => {
    if (!selectedSubject || !selectedDate) return;
    if (!selectedTopic) {
      alert('Please select a topic covered in this session before saving.');
      return;
    }
    setSaving(true);
    try {
      await attendanceService.mark({
        subjectId: Number(selectedSubject),
        date: selectedDate,
        topicId: Number(selectedTopic),
        notes: sessionNotes || null,
        students: students.map((s) => ({
          studentId: s.id,
          status: attendance[s.id] || 'present',
        })),
      });
      setSaved(true);
    } catch (err) {
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter((v) => v === 'present').length;
  const absentCount = Object.values(attendance).filter((v) => v === 'absent').length;
  const selectedSubjectObj = subjects.find((s) => s.id === Number(selectedSubject));

  return (
    <DashboardLayout role="faculty">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <div className="flex space-x-2">
          {['mark', 'summary'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                tab === t ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t === 'mark' ? 'Mark Attendance' : 'Summary'}
            </button>
          ))}
        </div>
      </div>

      {/* Subject, Date, Topic selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <select
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(e.target.value ? e.target.value : null)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50/50"
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>
              ))}
            </select>
          </div>
          {tab === 'mark' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50/50"
              />
            </div>
          )}
          {tab === 'mark' && selectedSubject && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Topic Covered <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedTopic || ''}
                onChange={(e) => setSelectedTopic(e.target.value ? e.target.value : null)}
                className={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50/50 ${
                  !selectedTopic ? 'border-amber-300 bg-amber-50/30' : 'border-slate-300'
                }`}
              >
                <option value="">Select Topic...</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>Unit {t.unitNo} – {t.topicName}</option>
                ))}
              </select>
              {!selectedTopic && (
                <p className="text-xs text-amber-600 mt-1">⚠ Topic is required to save attendance</p>
              )}
            </div>
          )}
          {tab === 'mark' && selectedSubject && (
            <div className="flex items-end">
              <button onClick={markAllPresent} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 border border-emerald-200 transition">
                Mark All Present
              </button>
            </div>
          )}
        </div>
        {tab === 'mark' && selectedSubject && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Session Notes (optional)</label>
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="e.g. Covered sorting with examples, assigned homework..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50/50 text-sm"
            />
          </div>
        )}
      </div>

      {/* ── MARK TAB ── */}
      {tab === 'mark' && selectedSubject && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200/60 p-4 text-center">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900">{students.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200/60 p-4 text-center">
              <p className="text-sm text-emerald-600">Present</p>
              <p className="text-2xl font-bold text-emerald-700">{presentCount}</p>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200/60 p-4 text-center">
              <p className="text-sm text-red-600">Absent</p>
              <p className="text-2xl font-bold text-red-700">{absentCount}</p>
            </div>
          </div>

          {/* Student list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">#</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Department</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const status = attendance[s.id] || 'present';
                  const isLocked = existingRecords.find((r) => r.studentId === s.id)?.locked;
                  return (
                    <tr key={s.id} className="border-b hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-500">{i + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{s.name}</td>
                      <td className="py-3 px-4 text-slate-500">{s.department}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => !isLocked && toggleStatus(s.id)}
                          disabled={isLocked}
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                            isLocked
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : status === 'present'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {isLocked ? '🔒 ' : ''}{status === 'present' ? 'Present' : 'Absent'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Save button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
            {saved && <span className="text-emerald-600 text-sm font-medium">✓ Saved successfully!</span>}
          </div>
        </>
      )}

      {/* ── SUMMARY TAB ── */}
      {tab === 'summary' && selectedSubject && summary && (
        <div className="space-y-6">
          {/* Overview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <p className="text-sm text-slate-500">Classes Conducted</p>
              <p className="text-3xl font-bold text-slate-900">{summary.totalClassesConducted}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <p className="text-sm text-slate-500">Total Students</p>
              <p className="text-3xl font-bold text-slate-900">{summary.totalStudents}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <p className="text-sm text-slate-500">Below 75%</p>
              <p className="text-3xl font-bold text-red-600">{summary.shortageCount}</p>
            </div>
          </div>

          {/* Student table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h3 className="font-semibold text-slate-900">Student-wise Attendance — {summary.subjectName}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50">
                  <th className="text-left py-3 px-4">Student</th>
                  <th className="text-center py-3 px-4">Attended</th>
                  <th className="text-center py-3 px-4">Total</th>
                  <th className="text-center py-3 px-4">%</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {(summary.students || []).map((s) => (
                  <tr key={s.studentId} className="border-b hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium">{s.studentName || s.studentId}</td>
                    <td className="py-3 px-4 text-center">{s.attendedClasses}</td>
                    <td className="py-3 px-4 text-center">{s.totalClasses}</td>
                    <td className="py-3 px-4 text-center font-semibold">{s.percentage}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        s.shortage ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {s.shortage ? 'Shortage' : 'Eligible'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedSubject && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">Select a subject to get started</p>
        </div>
      )}
    </DashboardLayout>
  );
}
