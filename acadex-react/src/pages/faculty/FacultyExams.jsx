import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { facultyExamService, examService } from '../../services';

export default function FacultyExams() {
  // Load cached exams immediately on mount so user sees data during fetch
  const cachedExams = JSON.parse(localStorage.getItem('faculty_created_exams_cache') || '[]');
  
  const [exams, setExams] = useState(cachedExams);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showingCache, setShowingCache] = useState(cachedExams.length > 0);
  const location = useLocation();

  const fetchExams = () => {
    setLoading(true);
    setError('');

    facultyExamService.list()
      .then((data) => {
        const freshData = Array.isArray(data) ? data : [];
        setExams(freshData);
        setShowingCache(false);
        localStorage.setItem('faculty_created_exams_cache', JSON.stringify(freshData));
      })
      .catch((err) => {
        try {
          const cache = JSON.parse(localStorage.getItem('faculty_created_exams_cache') || '[]');
          if (Array.isArray(cache) && cache.length > 0) {
            setExams(cache);
            setShowingCache(true);
            return;
          }
        } catch {
          // ignore cache parse error
        }
        setExams([]);
        setShowingCache(false);
        setError(err?.response?.data?.message || err?.response?.data?.error || 'Failed to load exams. Please refresh and login again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => { fetchExams(); }, [location.key]);

  useEffect(() => {
    const createdExam = location.state?.createdExam;
    if (!createdExam) return;
    setExams((current) => {
      const next = [createdExam, ...current.filter((exam) => String(exam.id) !== String(createdExam.id))];
      localStorage.setItem('faculty_created_exams_cache', JSON.stringify(next));
      return next;
    });
    window.history.replaceState({}, document.title);
  }, [location.state]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this exam?')) return;
    try {
      await examService.remove(id);
    } catch {
      // Keep going so the UI reflects the delete immediately.
    }

    setExams((current) => {
      const next = current.filter((exam) => String(exam.id) !== String(id));
      try {
        localStorage.setItem('faculty_created_exams_cache', JSON.stringify(next));
      } catch {
        // ignore cache write errors
      }
      return next;
    });
  };

  const filtered = exams.filter((e) => e.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout role="faculty">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
        <Link to="/faculty/exams/create" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">Create Exam</Link>
      </div>
      <input type="text" placeholder="Search exams..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full mb-6 px-4 py-2 border rounded-lg outline-none" />
      {showingCache && <p className="text-xs text-amber-700 mb-4">Server listing is currently blocked; displaying local cache.</p>}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
      ) : error ? (
        <p className="text-center py-12 text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-500">No exams found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-lg mb-1">{exam.title}</h3>
              {exam.courseName && (
                <p className="text-sm text-teal-700 mb-2">Course: {exam.courseName}{exam.courseCode ? ` (${exam.courseCode})` : ''}</p>
              )}
              <p className="text-sm text-gray-500 mb-2">{exam.description?.slice(0, 80)}</p>
              <p className="text-sm text-gray-500">Date: {exam.scheduledDate} | {exam.scheduledTime}</p>
              <p className="text-sm text-gray-500 mb-4">Marks: {exam.totalMarks} | Pass: {exam.passingMarks}</p>
              <div className="flex space-x-2">
                <Link to={`/faculty/exams/${exam.id}`} className="flex-1 text-center px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm">Edit</Link>
                <Link to={`/faculty/exams/${exam.id}/seating`} className="flex-1 text-center px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm">Seating</Link>
                <button onClick={() => handleDelete(exam.id)} className="flex-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
