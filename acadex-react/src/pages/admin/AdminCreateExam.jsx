import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, roomService } from '../../services';

export default function AdminCreateExam() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', classId: '', roomId: '',
    duration: 60, totalMarks: 100, passingMarks: 40,
    scheduledDate: '', scheduledTime: '', endTime: '',
    randomizeQuestions: false, randomizeOptions: false,
  });

  useEffect(() => {
    roomService.list({ isActive: true }).then((data) => setRooms(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (status) => {
    setLoading(true);
    try {
      await examService.create({
        ...form,
        status,
        duration: parseInt(form.duration),
        totalMarks: parseInt(form.totalMarks),
        passingMarks: parseInt(form.passingMarks),
        roomId: form.roomId ? parseInt(form.roomId) : null,
        createdByRole: 'admin',
      });
      navigate('/admin/exams');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Exam</h1>
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" value={form.title} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class ID</label>
              <input name="classId" value={form.classId} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" name="scheduledDate" value={form.scheduledDate} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input type="time" name="scheduledTime" value={form.scheduledTime} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg outline-none" required />
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="randomizeQuestions" checked={form.randomizeQuestions} onChange={handleChange} className="rounded" />
              <span className="text-sm text-gray-700">Randomize Questions</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="randomizeOptions" checked={form.randomizeOptions} onChange={handleChange} className="rounded" />
              <span className="text-sm text-gray-700">Randomize Options</span>
            </label>
          </div>
          <div className="flex space-x-3 pt-4">
            <button onClick={() => handleSubmit('draft')} disabled={loading} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium">
              Save as Draft
            </button>
            <button onClick={() => handleSubmit('published')} disabled={loading} className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition text-sm font-medium">
              {loading ? 'Saving...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
