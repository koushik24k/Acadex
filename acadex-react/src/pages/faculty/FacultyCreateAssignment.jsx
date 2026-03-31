import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { assignmentService, courseService } from '../../services';
import { useAuth } from '../../context/AuthContext';

export default function FacultyCreateAssignment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', subject: '', courseId: '', dueDate: '', maxMarks: 100, status: 'draft' });

  React.useEffect(() => {
    if (user?.id) {
      courseService.list({ facultyId: user.id })
        .then((data) => setCourses(Array.isArray(data) ? data : []))
        .catch(() => setCourses([]));
    }
  }, [user]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await assignmentService.create({
        ...form,
        courseId: form.courseId ? Number(form.courseId) : null,
        maxMarks: parseInt(form.maxMarks)
      });
      navigate('/faculty/assignments');
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <DashboardLayout role="faculty">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Assignment</h1>
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input name="title" value={form.title} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
          <select name="courseId" value={form.courseId} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none">
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.courseName || c.name || `Course ${c.id}`}</option>
            ))}
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input name="subject" value={form.subject} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="datetime-local" name="dueDate" value={form.dueDate} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label><input type="number" name="maxMarks" value={form.maxMarks} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select name="status" value={form.status} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none"><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></div>
        </div>
        <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">{saving ? 'Creating...' : 'Create Assignment'}</button>
      </div>
    </DashboardLayout>
  );
}
