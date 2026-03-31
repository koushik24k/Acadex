import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { assignmentService } from '../../services';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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

  useEffect(() => {
    loadAssignments();
  }, []);

  const filtered = assignments.filter((a) => {
    const q = query.toLowerCase();
    return (a.title || '').toLowerCase().includes(q) || (a.subject || '').toLowerCase().includes(q);
  });

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
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
