import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, roomService, courseService, authService } from '../../services';
import { useAuth } from '../../context/AuthContext';

export default function FacultyCreateExam() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('details');
  const [rooms, setRooms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseError, setCourseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [examMode, setExamMode] = useState('offline');
  const [form, setForm] = useState({
    title: '', description: '', classId: '', roomId: '',
    duration: 60, totalMarks: 100, passingMarks: 40,
    scheduledDate: '', scheduledTime: '', endTime: '',
    randomizeQuestions: false, randomizeOptions: false,
  });
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState({ questionText: '', questionType: 'mcq', options: ['', '', '', ''], correctAnswer: '', marks: 10, order: 1 });

  const parseCorrectAnswerArray = (value) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let active = true;
    const loadFacultyScopedData = async () => {
      try {
        const session = await authService.getSession();
        const sessionUserId = session?.user?.id;

        if (!sessionUserId) {
          if (!active) return;
          setCourses([]);
          setCourseError('Unable to verify your login session. Please logout and login again.');
          return;
        }

        const [roomData, courseData] = await Promise.all([
          roomService.list({ isActive: true }).catch(() => []),
          courseService.list({ facultyId: sessionUserId }).catch(() => []),
        ]);

        if (!active) return;
        setRooms(Array.isArray(roomData) ? roomData : []);
        const safeCourses = Array.isArray(courseData) ? courseData : [];
        setCourses(safeCourses);
        setCourseError(safeCourses.length === 0 ? 'No courses are mapped to your active faculty login.' : '');
      } catch {
        if (!active) return;
        setCourses([]);
        setCourseError('Unable to load mapped courses. Please re-login and try again.');
      }
    };

    loadFacultyScopedData();
    return () => { active = false; };
  }, [user?.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCreateExam = async () => {
    if (examMode === 'online' && questions.length === 0) {
      alert('Add at least one question for an online exam.');
      return;
    }

    // Validate all required fields
    if (!form.title?.trim()) {
      alert('Exam title is required.');
      return;
    }
    if (!form.classId?.trim()) {
      alert('Course is required.');
      return;
    }
    if (!form.scheduledDate) {
      alert('Exam date is required.');
      return;
    }
    if (!form.scheduledTime) {
      alert('Start time is required.');
      return;
    }
    if (!form.endTime) {
      alert('End time is required.');
      return;
    }
    if (form.duration <= 0) {
      alert('Duration must be greater than 0.');
      return;
    }
    if (form.totalMarks <= 0) {
      alert('Total marks must be greater than 0.');
      return;
    }
    if (form.passingMarks < 0 || form.passingMarks > form.totalMarks) {
      alert('Passing marks must be between 0 and total marks.');
      return;
    }

    // Verify token-backed session role before attempting protected exam creation.
    try {
      const session = await authService.getSession();
      const roles = Array.isArray(session?.user?.roles) ? session.user.roles : [];
      const normalizedRoles = roles
        .map((r) => (typeof r === 'string' ? r : r?.role))
        .filter(Boolean)
        .map((r) => String(r).toLowerCase());

      if (!normalizedRoles.includes('faculty') && !normalizedRoles.includes('admin')) {
        alert('Your current login session does not have faculty permission. Please logout and login again as faculty/admin.');
        return;
      }
    } catch {
      alert('Unable to verify your session. Please logout and login again.');
      return;
    }

    setSaving(true);
    try {
      const createdExam = await examService.create({
        ...form,
        status: 'draft',
        createdByRole: 'faculty',
        duration: parseInt(form.duration), totalMarks: parseInt(form.totalMarks),
        passingMarks: parseInt(form.passingMarks), roomId: form.roomId ? parseInt(form.roomId) : null,
        questions: examMode === 'online' ? questions : [],
      });

      // Keep a local cache so FacultyExams can still render created records if list API is unavailable.
      try {
        const cacheKey = 'faculty_created_exams_cache';
        const current = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const next = [createdExam, ...current.filter((e) => String(e.id) !== String(createdExam.id))];
        localStorage.setItem(cacheKey, JSON.stringify(next.slice(0, 50)));
      } catch {
        // Non-blocking cache failure.
      }

      navigate('/faculty/exams', { state: { createdExam } });
    } catch (err) {
      console.error('Exam creation error:', err);
      const responseData = err.response?.data;
      const errorMsg =
        (typeof responseData === 'string' ? responseData : null) ||
        responseData?.error ||
        responseData?.message ||
        err.message ||
        'Failed to create exam. Please check all fields and try again.';
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    if (!currentQ.questionText.trim()) {
      alert('Question text is required.');
      return;
    }

    if ((currentQ.questionType === 'mcq' || currentQ.questionType === 'multiple-correct') && currentQ.options.some((opt) => !opt.trim())) {
      alert('Please fill all options for objective questions.');
      return;
    }

    if (currentQ.questionType === 'multiple-correct') {
      const selected = parseCorrectAnswerArray(currentQ.correctAnswer);
      if (selected.length === 0) {
        alert('Select at least one correct option for multiple-correct question.');
        return;
      }
    } else if (!currentQ.correctAnswer.trim()) {
      alert('Correct answer is required.');
      return;
    }

    setQuestions([...questions, { ...currentQ, order: questions.length + 1 }]);
    setCurrentQ({ questionText: '', questionType: 'mcq', options: ['', '', '', ''], correctAnswer: '', marks: 10, order: questions.length + 2 });
  };

  const toggleMultipleCorrect = (option) => {
    setCurrentQ((q) => {
      const selected = parseCorrectAnswerArray(q.correctAnswer);
      const next = selected.includes(option)
        ? selected.filter((v) => v !== option)
        : [...selected, option];
      return { ...q, correctAnswer: JSON.stringify(next) };
    });
  };

  return (
    <DashboardLayout role="faculty">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Exam</h1>
      <div className="flex space-x-2 mb-6">
        <button onClick={() => setTab('details')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'details' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Exam Details</button>
        {examMode === 'online' && (
          <button onClick={() => setTab('questions')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'questions' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Questions ({questions.length})</button>
        )}
      </div>

      {tab === 'details' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input name="title" value={form.title} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Mode</label>
            <select
              value={examMode}
              onChange={(e) => {
                const mode = e.target.value;
                setExamMode(mode);
                if (mode === 'offline') setTab('details');
              }}
              className="w-full px-4 py-2 border rounded-lg outline-none"
            >
              <option value="offline">Offline (classroom exam)</option>
              <option value="online">Online (conduct in portal)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
              <select name="classId" value={form.classId} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none">
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={String(course.id)}>{course.courseName} ({course.courseCode})</option>
                ))}
              </select>
              {courseError && <p className="text-xs text-amber-700 mt-2">{courseError}</p>}
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Room</label><select name="roomId" value={form.roomId} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none"><option value="">Select</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label><input type="number" name="duration" value={form.duration} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label><input type="number" name="totalMarks" value={form.totalMarks} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label><input type="number" name="passingMarks" value={form.passingMarks} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" name="scheduledDate" value={form.scheduledDate} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label><input type="time" name="scheduledTime" value={form.scheduledTime} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">End Time</label><input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          </div>
          {examMode === 'online' && (
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2"><input type="checkbox" name="randomizeQuestions" checked={form.randomizeQuestions} onChange={handleChange} /><span className="text-sm">Randomize Questions</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" name="randomizeOptions" checked={form.randomizeOptions} onChange={handleChange} /><span className="text-sm">Randomize Options</span></label>
            </div>
          )}
        </div>
      )}

      {tab === 'questions' && (
        <div className="max-w-2xl space-y-4">
          {/* Existing questions */}
          {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between"><span className="font-medium">Q{i + 1}. {q.questionText}</span><span className="text-sm text-gray-500">{q.questionType} | {q.marks} marks</span></div>
              {(q.questionType === 'mcq' || q.questionType === 'multiple-correct') && q.options && (
                <ul className="mt-2 text-sm text-gray-600">
                  {q.options.map((o, j) => {
                    const multiAnswers = q.questionType === 'multiple-correct' ? parseCorrectAnswerArray(q.correctAnswer) : [];
                    const isCorrectOption = q.questionType === 'multiple-correct' ? multiAnswers.includes(o) : o === q.correctAnswer;
                    return <li key={j} className={isCorrectOption ? 'text-green-600 font-medium' : ''}>• {o}</li>;
                  })}
                </ul>
              )}
            </div>
          ))}

          {/* Add question form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-4">Add Question</h3>
            <div className="space-y-3">
              <select value={currentQ.questionType} onChange={(e) => setCurrentQ((q) => ({ ...q, questionType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg outline-none">
                <option value="mcq">MCQ (single correct)</option>
                <option value="multiple-correct">MCQ (multiple correct)</option>
                <option value="subjective">Subjective</option>
                <option value="fill-blank">Fill in the Blank</option>
              </select>
              <textarea value={currentQ.questionText} onChange={(e) => setCurrentQ((q) => ({ ...q, questionText: e.target.value }))} placeholder="Question text" className="w-full px-3 py-2 border rounded-lg outline-none" rows={2} />
              {(currentQ.questionType === 'mcq' || currentQ.questionType === 'multiple-correct') && currentQ.options.map((opt, i) => (
                <input key={i} value={opt} onChange={(e) => { const opts = [...currentQ.options]; opts[i] = e.target.value; setCurrentQ((q) => ({ ...q, options: opts })); }} placeholder={`Option ${i + 1}`} className="w-full px-3 py-2 border rounded-lg outline-none" />
              ))}
              {currentQ.questionType === 'multiple-correct' ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Select one or more correct options:</p>
                  {currentQ.options.filter((opt) => opt.trim()).map((opt, i) => {
                    const selected = parseCorrectAnswerArray(currentQ.correctAnswer).includes(opt);
                    return (
                      <label key={i} className="flex items-center space-x-2 text-sm text-gray-700">
                        <input type="checkbox" checked={selected} onChange={() => toggleMultipleCorrect(opt)} />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input value={currentQ.correctAnswer} onChange={(e) => setCurrentQ((q) => ({ ...q, correctAnswer: e.target.value }))} placeholder="Correct Answer" className="w-full px-3 py-2 border rounded-lg outline-none" />
              )}
              <input type="number" value={currentQ.marks} onChange={(e) => setCurrentQ((q) => ({ ...q, marks: parseInt(e.target.value) }))} placeholder="Marks" className="w-full px-3 py-2 border rounded-lg outline-none" />
              <button onClick={addQuestion} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Add Question</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <button onClick={handleCreateExam} disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
          {saving ? 'Creating...' : 'Create Exam'}
        </button>
      </div>
    </DashboardLayout>
  );
}
