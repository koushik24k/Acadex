import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, registrationService } from '../../services';
import { Calendar, Clock, BookOpen, MapPin, Users, ArrowLeft } from 'lucide-react';

export default function StudentExamDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      examService.get(id),
      registrationService.check(id),
    ]).then(([examR, regR]) => {
      setExam(examR.status === 'fulfilled' ? examR.value : null);
      setRegistration(regR.status === 'fulfilled' && regR.value?.registered ? regR.value : null);
      setLoading(false);
    });
  }, [id]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await registrationService.register(id);
      const reg = await registrationService.check(id);
      setRegistration(reg?.registered ? reg : null);
    } catch (err) { alert(err.response?.data?.error || 'Registration failed'); }
    finally { setRegistering(false); }
  };

  const getStatus = () => {
    if (!exam) return 'unknown';
    const now = new Date();
    const start = new Date(exam.date || exam.startTime);
    const end = new Date(start.getTime() + (exam.duration || 60) * 60000);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'completed';
  };

  if (loading) return (
    <DashboardLayout role="student">
      <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
    </DashboardLayout>
  );

  if (!exam) return (
    <DashboardLayout role="student">
      <div className="text-center py-24">
        <p className="text-gray-500">Exam not found.</p>
        <Link to="/student/exams" className="text-indigo-600 text-sm mt-2 inline-block">Back to Exams</Link>
      </div>
    </DashboardLayout>
  );

  const status = getStatus();

  return (
    <DashboardLayout role="student">
      <button onClick={() => navigate('/student/exams')} className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Exams
      </button>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{exam.title}</h1>
            {exam.subject && <p className="text-gray-500">{exam.subject}</p>}
          </div>
          <div className="flex items-center space-x-3">
            {status === 'upcoming' && <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">Upcoming</span>}
            {status === 'ongoing' && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Ongoing</span>}
            {status === 'completed' && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">Completed</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Exam Details */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Exam Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <div><p className="text-xs text-gray-500">Date</p><p className="text-sm font-medium">{exam.date || 'TBD'}</p></div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-purple-500" />
                <div><p className="text-xs text-gray-500">Duration</p><p className="text-sm font-medium">{exam.duration} minutes</p></div>
              </div>
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-green-500" />
                <div><p className="text-xs text-gray-500">Total Marks</p><p className="text-sm font-medium">{exam.totalMarks}</p></div>
              </div>
              {exam.roomId && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-red-500" />
                  <div><p className="text-xs text-gray-500">Room</p><p className="text-sm font-medium">Room #{exam.roomId}</p></div>
                </div>
              )}
            </div>
            {exam.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">{exam.description}</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Instructions</h2>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
              <li>Ensure a stable internet connection before starting the exam.</li>
              <li>Once started, the exam cannot be paused.</li>
              <li>The exam will auto-submit when time expires.</li>
              <li>MCQ and fill-in-the-blank questions are auto-graded.</li>
              <li>Subjective answers will be graded by the faculty.</li>
              <li>Do not refresh the browser during the exam.</li>
            </ul>
          </div>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4">Registration</h2>
          {registration ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-700 font-medium text-sm">✓ You are registered</p>
              </div>
              {registration.seatNumber && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Seat Number</p>
                  <p className="text-lg font-bold text-gray-900">{registration.seatNumber}</p>
                </div>
              )}
              {status === 'ongoing' && (
                <Link to={`/student/exams/${id}/take`} className="block text-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                  Start Exam
                </Link>
              )}
              {status === 'upcoming' && (
                <p className="text-sm text-gray-500 text-center">The exam has not started yet. Come back on the scheduled date.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {status === 'upcoming' && (
                <button onClick={handleRegister} disabled={registering} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                  {registering ? 'Registering...' : 'Register for Exam'}
                </button>
              )}
              {status === 'ongoing' && (
                <p className="text-sm text-red-500 text-center">Registration closed. The exam is already in progress.</p>
              )}
              {status === 'completed' && (
                <p className="text-sm text-gray-500 text-center">This exam has ended.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
