import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, roomService } from '../../services';

export default function AdminEditExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', classId: '', roomId: '', status: 'draft',
    duration: 60, totalMarks: 100, passingMarks: 40,
    scheduledDate: '', scheduledTime: '', endTime: '',
    randomizeQuestions: false, randomizeOptions: false,
  });

  useEffect(() => {
    Promise.all([
      examService.get(id),
      roomService.list({ isActive: true }).catch(() => []),
    ]).then(([exam, roomData]) => {
      if (exam) {
        setForm({
          title: exam.title || '', description: exam.description || '',
          classId: exam.classId || '', roomId: exam.roomId || '', status: exam.status || 'draft',
          duration: exam.duration || 60, totalMarks: exam.totalMarks || 100, passingMarks: exam.passingMarks || 40,
          scheduledDate: exam.scheduledDate || '', scheduledTime: exam.scheduledTime || '', endTime: exam.endTime || '',
          randomizeQuestions: exam.randomizeQuestions || false, randomizeOptions: exam.randomizeOptions || false,
        });
      }
      setRooms(Array.isArray(roomData) ? roomData : []);
      setLoading(false);
    });
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (status) => {
    setSaving(true);
    try {
      await examService.update(id, {
        ...form, status,
        duration: parseInt(form.duration),
        totalMarks: parseInt(form.totalMarks),
        passingMarks: parseInt(form.passingMarks),
        roomId: form.roomId ? parseInt(form.roomId) : null,
      });
      navigate('/admin/exams');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update exam');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout role="admin"><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div></div></DashboardLayout>;

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Exam</h1>
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input name="title" value={form.title} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-2 border rounded-lg outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select name="roomId" value={form.roomId} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none">
                <option value="">Select room</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <input type="number" name="duration" value={form.duration} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
              <input type="number" name="totalMarks" value={form.totalMarks} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
              <input type="number" name="passingMarks" value={form.passingMarks} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" name="scheduledDate" value={form.scheduledDate} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="time" name="scheduledTime" value={form.scheduledTime} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" />
            </div>
          </div>
          <div className="flex space-x-3 pt-4">
            <button onClick={() => handleSave('draft')} disabled={saving} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium">
              Save as Draft
            </button>
            <button onClick={() => handleSave('published')} disabled={saving} className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition text-sm font-medium">
              {saving ? 'Saving...' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
