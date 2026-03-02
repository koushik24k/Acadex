import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, registrationService } from '../../services';
import { Search, Calendar, Clock, BookOpen } from 'lucide-react';

export default function StudentExams() {
  const [exams, setExams] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examService.list({ status: 'published' }).then(async (data) => {
      const list = Array.isArray(data) ? data : [];
      setExams(list);
      // Check registrations
      const regMap = {};
      await Promise.allSettled(list.map(async (e) => {
        try {
          const reg = await registrationService.check(e.id);
          if (reg && reg.registered) regMap[e.id] = reg;
        } catch {}
      }));
      setRegistrations(regMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = exams.filter((e) =>
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (exam) => {
    const now = new Date();
    const start = new Date(exam.date || exam.startTime);
    const end = new Date(start.getTime() + (exam.duration || 60) * 60000);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'completed';
  };

  const statusBadge = (s) => {
    const m = { upcoming: 'bg-indigo-100 text-indigo-700', ongoing: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${m[s]}`}>{s}</span>;
  };

  return (
    <DashboardLayout role="student">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Available Exams</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exams..." className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl shadow-sm outline-none" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No exams available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exam) => {
            const status = getStatus(exam);
            const reg = registrations[exam.id];
            return (
              <Link to={`/student/exams/${exam.id}`} key={exam.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{exam.title}</h3>
                  {statusBadge(status)}
                </div>
                {exam.subject && <p className="text-xs text-gray-500 mb-3">{exam.subject}</p>}
                <div className="space-y-1.5 text-xs text-gray-500">
                  <p className="flex items-center"><Calendar className="w-3 h-3 mr-1.5" />{exam.date || 'TBD'}</p>
                  <p className="flex items-center"><Clock className="w-3 h-3 mr-1.5" />{exam.duration} minutes</p>
                  <p>Total Marks: {exam.totalMarks}</p>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  {reg ? (
                    <span className="text-xs text-green-600 font-medium">✓ Registered</span>
                  ) : (
                    <span className="text-xs text-gray-400">Not registered</span>
                  )}
                  <span className="text-xs text-indigo-600 font-medium">View Details →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
