import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService } from '../../services';

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchExams = () => {
    setLoading(true);
    examService.list({}).then((data) => {
      setExams(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchExams(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    await examService.remove(id);
    fetchExams();
  };

  const filtered = exams.filter((e) =>
    e.title?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      ongoing: 'bg-rose-100 text-rose-800',
      completed: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <Link to="/admin/exams/create" className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition text-sm font-medium">
          Create Exam
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search exams..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No exams found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">{exam.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(exam.status)}`}>
                  {exam.status}
                </span>
              </div>
              {exam.classId && (
                <span className="inline-block px-2 py-0.5 bg-rose-50 text-rose-700 text-xs rounded mb-2">{exam.classId}</span>
              )}
              <p className="text-sm text-gray-500 mb-1">Date: {exam.scheduledDate}</p>
              <p className="text-sm text-gray-500 mb-1">Time: {exam.scheduledTime} - {exam.endTime}</p>
              <p className="text-sm text-gray-500 mb-4">Marks: {exam.totalMarks} | Pass: {exam.passingMarks}</p>
              <div className="flex space-x-2">
                <Link to={`/admin/exams/${exam.id}`} className="flex-1 text-center px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-sm hover:bg-rose-100 transition">
                  Edit
                </Link>
                <button onClick={() => handleDelete(exam.id)} className="flex-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
