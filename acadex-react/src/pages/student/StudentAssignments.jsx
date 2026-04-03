import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { assignmentService, assignmentSubmissionService } from '../../services';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadAssignments = async () => {
    try {
      setLoading(true);
      // Students should only see published assignments.
      const data = await assignmentService.list({ status: 'published' });
      setAssignments(Array.isArray(data) ? data : []);
    } catch (e) {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMySubmissions = async () => {
    try {
      const data = await assignmentSubmissionService.list();
      const list = Array.isArray(data) ? data : [];
      const map = {};
      list.forEach((s) => {
        if (s.assignmentId != null) {
          map[s.assignmentId] = s;
        }
      });
      setSubmissionsByAssignment(map);
    } catch {
      setSubmissionsByAssignment({});
    }
  };

  useEffect(() => {
    loadAssignments();
    loadMySubmissions();
  }, []);

  const filtered = assignments.filter((a) => {
    const q = query.toLowerCase();
    return (a.title || '').toLowerCase().includes(q) || (a.subject || '').toLowerCase().includes(q);
  });

  const openSubmitModal = (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionText('');
    setSelectedFile(null);
    setMessage('');
  };

  const closeSubmitModal = () => {
    setSelectedAssignment(null);
    setSubmissionText('');
    setSelectedFile(null);
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;
    if (!submissionText.trim() && !selectedFile) {
      setMessage('Please enter submission text or attach a file.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('assignmentId', String(selectedAssignment.id));
      if (submissionText.trim()) {
        formData.append('submissionText', submissionText.trim());
      }
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await assignmentSubmissionService.upload(formData);
      await loadMySubmissions();
      setMessage('Assignment submitted successfully.');
      setTimeout(() => {
        closeSubmitModal();
      }, 700);
    } catch (err) {
      setMessage(err?.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Assignments</h1>
            <p className="text-slate-500 text-sm mt-1">Track all published assignments and due dates</p>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or subject"
            className="w-full sm:w-72 px-4 py-2 border rounded-lg outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/50 p-12 text-center">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-slate-400">No published assignments available right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <div key={a.id} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/50 p-5">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">{a.status || 'published'}</span>
                  <span className="text-xs text-slate-400">#{a.id}</span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{a.title}</h3>
                <p className="text-xs text-slate-500 mb-2">{a.subject || 'General'}</p>
                <p className="text-sm text-slate-600 line-clamp-3 min-h-[60px]">{a.description || 'No description provided.'}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Due: {a.dueDate || 'Not specified'}</span>
                  <span className="font-medium text-indigo-700">{a.maxMarks || 100} marks</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  {submissionsByAssignment[a.id] ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                      Submitted
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                      Pending
                    </span>
                  )}

                  <button
                    onClick={() => openSubmitModal(a)}
                    disabled={Boolean(submissionsByAssignment[a.id])}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submissionsByAssignment[a.id] ? 'Already Submitted' : 'Submit'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedAssignment && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Submit Assignment</h2>
                  <p className="text-sm text-slate-500 mt-1">{selectedAssignment.title}</p>
                </div>
                <button onClick={closeSubmitModal} className="text-slate-500 hover:text-slate-700">✕</button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Submission Text (optional)</label>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  rows={5}
                  placeholder="Add your answer, explanation, or notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Attach File (PDF/DOC/DOCX)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                {selectedFile && (
                  <p className="text-xs text-slate-500 mt-1">Selected: {selectedFile.name}</p>
                )}
              </div>

              {message && (
                <div className={`text-sm px-3 py-2 rounded-lg ${message.toLowerCase().includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {message}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={closeSubmitModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Assignment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
