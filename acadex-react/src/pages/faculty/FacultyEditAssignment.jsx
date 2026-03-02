import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { assignmentService } from '../../services';

export default function FacultyEditAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', subject: '', dueDate: '', maxMarks: 100, status: 'draft' });

  useEffect(() => {
    Promise.all([
      assignmentService.get(id),
      assignmentService.getSubmissions(id, {}).catch(() => []),
    ]).then(([a, subs]) => {
      if (a) setForm({ title: a.title || '', description: a.description || '', subject: a.subject || '', dueDate: a.dueDate || '', maxMarks: a.maxMarks || 100, status: a.status || 'draft' });
      setSubmissions(Array.isArray(subs) ? subs : []);
      setLoading(false);
    });
  }, [id]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await assignmentService.update(id, { ...form, maxMarks: parseInt(form.maxMarks) });
      navigate('/faculty/assignments');
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <DashboardLayout role="faculty"><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div></DashboardLayout>;

  return (
    <DashboardLayout role="faculty">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Assignment</h1>
      <div className="flex space-x-2 mb-6">
        <button onClick={() => setTab('details')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'details' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Details</button>
        <button onClick={() => setTab('submissions')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'submissions' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>Submissions ({submissions.length})</button>
      </div>

      {tab === 'details' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input name="title" value={form.title} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input name="subject" value={form.subject} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="datetime-local" name="dueDate" value={form.dueDate} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label><input type="number" name="maxMarks" value={form.maxMarks} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select name="status" value={form.status} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none"><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></div>
          </div>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      )}

      {tab === 'submissions' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {submissions.length === 0 ? <p className="text-gray-500">No submissions yet.</p> : (
            submissions.map((s) => (
              <div key={s.id} className="flex justify-between items-center py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">Student: {s.studentId?.slice(0, 12)}</p>
                  <p className="text-xs text-gray-500">Submitted: {s.submittedAt}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'graded' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{s.status}</span>
                  {s.marksAwarded != null && <span className="text-sm font-medium">{s.marksAwarded} marks</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
