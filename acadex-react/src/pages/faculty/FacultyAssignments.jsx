import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { assignmentService } from '../../services';

export default function FacultyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    const params = { limit: 100 };
    if (statusFilter) params.status = statusFilter;
    assignmentService.list(params).then((d) => { setAssignments(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    await assignmentService.remove(id);
    fetch();
  };

  const filtered = assignments.filter((a) => a.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout role="faculty">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <Link to="/faculty/assignments/create" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">Create Assignment</Link>
      </div>
      <div className="flex space-x-4 mb-6">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg outline-none" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg outline-none">
          <option value="">All</option><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option>
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-500">No assignments found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-lg mb-1">{a.title}</h3>
              <p className="text-sm text-gray-500 mb-1">{a.subject || 'No subject'}</p>
              <p className="text-sm text-gray-500 mb-1">Due: {a.dueDate || 'No deadline'}</p>
              <p className="text-sm text-gray-500 mb-4">Max Marks: {a.maxMarks}</p>
              <div className="flex space-x-2">
                <Link to={`/faculty/assignments/${a.id}`} className="flex-1 text-center px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm">Edit</Link>
                <button onClick={() => handleDelete(a.id)} className="flex-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
