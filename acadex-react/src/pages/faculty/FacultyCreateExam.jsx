import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, questionService, roomService } from '../../services';

export default function FacultyCreateExam() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('details');
  const [rooms, setRooms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [examId, setExamId] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', classId: '', roomId: '',
    duration: 60, totalMarks: 100, passingMarks: 40,
    scheduledDate: '', scheduledTime: '', endTime: '',
    randomizeQuestions: false, randomizeOptions: false,
  });
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState({ questionText: '', questionType: 'mcq', options: ['', '', '', ''], correctAnswer: '', marks: 10, order: 1 });

  useEffect(() => {
    roomService.list({ isActive: true }).then((d) => setRooms(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCreateExam = async () => {
    setSaving(true);
    try {
      const exam = await examService.create({
        ...form, status: 'draft', createdByRole: 'faculty',
        duration: parseInt(form.duration), totalMarks: parseInt(form.totalMarks),
        passingMarks: parseInt(form.passingMarks), roomId: form.roomId ? parseInt(form.roomId) : null,
      });
      setExamId(exam.id);
      // Save questions
      for (const q of questions) {
        await questionService.create(exam.id, q);
      }
      navigate('/faculty/exams');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { ...currentQ, order: questions.length + 1 }]);
    setCurrentQ({ questionText: '', questionType: 'mcq', options: ['', '', '', ''], correctAnswer: '', marks: 10, order: questions.length + 2 });
  };

  return (
    <DashboardLayout role="faculty">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Exam</h1>
      <div className="flex space-x-2 mb-6">
        <button onClick={() => setTab('details')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'details' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Exam Details</button>
        <button onClick={() => setTab('questions')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'questions' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Questions ({questions.length})</button>
      </div>

      {tab === 'details' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input name="title" value={form.title} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Class ID *</label><input name="classId" value={form.classId} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
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
          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2"><input type="checkbox" name="randomizeQuestions" checked={form.randomizeQuestions} onChange={handleChange} /><span className="text-sm">Randomize Questions</span></label>
            <label className="flex items-center space-x-2"><input type="checkbox" name="randomizeOptions" checked={form.randomizeOptions} onChange={handleChange} /><span className="text-sm">Randomize Options</span></label>
          </div>
        </div>
      )}

      {tab === 'questions' && (
        <div className="max-w-2xl space-y-4">
          {/* Existing questions */}
          {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between"><span className="font-medium">Q{i + 1}. {q.questionText}</span><span className="text-sm text-gray-500">{q.questionType} | {q.marks} marks</span></div>
              {q.questionType === 'mcq' && q.options && (
                <ul className="mt-2 text-sm text-gray-600">{q.options.map((o, j) => <li key={j} className={o === q.correctAnswer ? 'text-green-600 font-medium' : ''}>• {o}</li>)}</ul>
              )}
            </div>
          ))}

          {/* Add question form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-4">Add Question</h3>
            <div className="space-y-3">
              <select value={currentQ.questionType} onChange={(e) => setCurrentQ((q) => ({ ...q, questionType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg outline-none">
                <option value="mcq">MCQ</option><option value="subjective">Subjective</option><option value="fill-blank">Fill in the Blank</option>
              </select>
              <textarea value={currentQ.questionText} onChange={(e) => setCurrentQ((q) => ({ ...q, questionText: e.target.value }))} placeholder="Question text" className="w-full px-3 py-2 border rounded-lg outline-none" rows={2} />
              {currentQ.questionType === 'mcq' && currentQ.options.map((opt, i) => (
                <input key={i} value={opt} onChange={(e) => { const opts = [...currentQ.options]; opts[i] = e.target.value; setCurrentQ((q) => ({ ...q, options: opts })); }} placeholder={`Option ${i + 1}`} className="w-full px-3 py-2 border rounded-lg outline-none" />
              ))}
              <input value={currentQ.correctAnswer} onChange={(e) => setCurrentQ((q) => ({ ...q, correctAnswer: e.target.value }))} placeholder="Correct Answer" className="w-full px-3 py-2 border rounded-lg outline-none" />
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
