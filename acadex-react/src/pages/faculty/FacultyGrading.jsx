import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { submissionService } from '../../services';
import { useAuth } from '../../context/AuthContext';

export default function FacultyGrading() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [grades, setGrades] = useState({});
  const [grading, setGrading] = useState(false);

  const fetchSubmissions = () => {
    setLoading(true);
    submissionService.list({ status: tab === 'pending' ? 'submitted' : 'graded' }).then((d) => {
      setSubmissions(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchSubmissions(); }, [tab]);

  const openGrading = async (sub) => {
    try {
      const detail = await submissionService.get(sub.id);
      setSelected(detail);
      const g = {};
      (detail.answers || []).forEach((a) => {
        g[a.id] = { marksAwarded: a.marksAwarded || 0, isCorrect: a.isCorrect || false, feedback: a.feedback || '' };
      });
      setGrades(g);
    } catch (err) { alert('Failed to load submission'); }
  };

  const handleGrade = async () => {
    setGrading(true);
    try {
      const gradeData = Object.entries(grades).map(([answerId, g]) => ({
        answerId: parseInt(answerId), marksAwarded: parseInt(g.marksAwarded), isCorrect: g.isCorrect, feedback: g.feedback,
      }));
      await submissionService.grade(selected.id, { gradedBy: user.id, grades: gradeData });
      setSelected(null);
      fetchSubmissions();
    } catch (err) { alert(err.response?.data?.error || 'Failed to grade'); }
    finally { setGrading(false); }
  };

  return (
    <DashboardLayout role="faculty">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Exam Grading</h1>
      <div className="flex space-x-2 mb-6">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'pending' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Pending</button>
        <button onClick={() => setTab('graded')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'graded' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Graded</button>
      </div>

      {/* Grading Dialog */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Grade Submission #{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
            </div>
            <div className="space-y-4">
              {(selected.answers || []).map((a) => (
                <div key={a.id} className="border rounded-lg p-4">
                  <p className="font-medium text-sm mb-2">Question #{a.questionId}</p>
                  <p className="text-sm text-gray-700 mb-3">Answer: {a.answerText || 'No answer'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Marks</label>
                      <input type="number" value={grades[a.id]?.marksAwarded || 0} onChange={(e) => setGrades((g) => ({ ...g, [a.id]: { ...g[a.id], marksAwarded: e.target.value } }))} className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Correct?</label>
                      <select value={grades[a.id]?.isCorrect ? 'true' : 'false'} onChange={(e) => setGrades((g) => ({ ...g, [a.id]: { ...g[a.id], isCorrect: e.target.value === 'true' } }))} className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none">
                        <option value="true">Yes</option><option value="false">No</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">Feedback</label>
                    <textarea value={grades[a.id]?.feedback || ''} onChange={(e) => setGrades((g) => ({ ...g, [a.id]: { ...g[a.id], feedback: e.target.value } }))} className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none" rows={2} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleGrade} disabled={grading} className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium">{grading ? 'Grading...' : 'Submit Grades'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
      ) : submissions.length === 0 ? (
        <p className="text-center py-12 text-gray-500">No {tab} submissions.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">Submission #{s.id} - Exam #{s.examId}</p>
                <p className="text-sm text-gray-500">Student: {s.studentId?.slice(0, 12)} | {s.submittedAt || s.startedAt}</p>
              </div>
              {tab === 'pending' ? (
                <button onClick={() => openGrading(s)} className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm">Grade</button>
              ) : (
                <span className="text-sm font-medium text-green-600">Score: {s.totalScore}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
