import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { assignmentSubmissionService, assignmentService } from '../../services';

export default function FacultyAssignmentGrading() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('pending');
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [marks, setMarks] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);

  const fetchSubmissions = () => {
    setLoading(true);
    assignmentSubmissionService.list({ status: tab === 'pending' ? 'submitted' : 'graded', limit: 100 }).then((d) => {
      setSubmissions(Array.isArray(d) ? d : []);
      setLoading(false);
      // Auto-select if URL has submissionId
      const sid = searchParams.get('submissionId');
      if (sid) {
        const s = (Array.isArray(d) ? d : []).find((x) => x.id == sid);
        if (s) openSubmission(s);
      }
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchSubmissions(); }, [tab]);

  const openSubmission = async (sub) => {
    setSelected(sub);
    setMarks(sub.marksAwarded || 0);
    setFeedback(sub.feedback || '');
    try {
      const a = await assignmentService.get(sub.assignmentId);
      setAssignment(a);
    } catch { setAssignment(null); }
  };

  const handleGrade = async () => {
    setGrading(true);
    try {
      await assignmentSubmissionService.grade(selected.id, { marksAwarded: parseInt(marks), feedback });
      setSelected(null);
      fetchSubmissions();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setGrading(false); }
  };

  return (
    <DashboardLayout role="faculty">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Assignment Grading</h1>
      <div className="flex space-x-2 mb-6">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'pending' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Pending</button>
        <button onClick={() => setTab('graded')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'graded' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Graded</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions list */}
        <div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
          ) : submissions.length === 0 ? (
            <p className="text-center py-12 text-gray-500">No {tab} submissions.</p>
          ) : (
            <div className="space-y-2">
              {submissions.map((s) => (
                <div key={s.id} onClick={() => openSubmission(s)} className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition ${selected?.id === s.id ? 'ring-2 ring-teal-500' : ''}`}>
                  <p className="font-medium text-sm">Submission #{s.id}</p>
                  <p className="text-xs text-gray-500">Assignment #{s.assignmentId} | {s.submittedAt}</p>
                  {s.marksAwarded != null && <p className="text-xs text-green-600 mt-1">Marks: {s.marksAwarded}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grading panel */}
        {selected && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            {assignment && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{assignment.title}</p>
                <p className="text-xs text-gray-500">Max Marks: {assignment.maxMarks}</p>
              </div>
            )}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Student Submission</h4>
              <div className="p-3 bg-gray-50 rounded-lg text-sm">{selected.submissionText || 'No text submitted'}</div>
              {selected.fileUrl && <a href={selected.fileUrl} target="_blank" rel="noreferrer" className="text-teal-600 text-sm mt-2 inline-block">View File</a>}
            </div>
            {tab === 'pending' && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marks (0 - {assignment?.maxMarks || 100})</label>
                  <input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none" />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg outline-none" />
                </div>
                <button onClick={handleGrade} disabled={grading} className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium">{grading ? 'Grading...' : 'Submit Grade'}</button>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
