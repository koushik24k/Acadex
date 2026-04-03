import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { studentExamService } from '../../services';
import { Calendar, Clock, BookOpen, MapPin, Users, ArrowLeft } from 'lucide-react';

export default function StudentExamDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const getCachedExam = () => {
    try {
      const exams = JSON.parse(localStorage.getItem('student_exams_cache') || '[]');
      if (!Array.isArray(exams)) return null;
      return exams.find((e) => String(e.id) === String(id)) || null;
    } catch {
      return null;
    }
  };

  const [exam, setExam] = useState(() => location.state?.exam || getCachedExam());
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      studentExamService.get(id),
      studentExamService.checkRegistration(id),
    ]).then(([examR, regR]) => {
      const cached = location.state?.exam || getCachedExam();
      setExam(examR.status === 'fulfilled' ? examR.value : cached);
      setRegistration(regR.status === 'fulfilled' && regR.value?.registered ? regR.value : null);
      setLoading(false);
    });
  }, [id, location.state]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await studentExamService.register(id);
      const reg = await studentExamService.checkRegistration(id);
      setRegistration(reg?.registered ? reg : null);
    } catch (err) {
      const message = err?.response?.data?.error || err?.response?.data?.message || '';
      if (message.toLowerCase().includes('already registered')) {
        try {
          const reg = await studentExamService.checkRegistration(id);
          setRegistration(reg?.registered ? reg : null);
          return;
        } catch {
          // fall through to alert below
        }
      }
      alert(message || 'Registration failed');
    }
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
  const examMode = exam.examMode || ((exam.questionCount || 0) > 0 ? 'online' : 'offline');
  const isOnlineExam = examMode === 'online';

  return (
    <DashboardLayout role="student">
      <button onClick={() => navigate('/student/exams')} className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Exams
      </button>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{exam.title}</h1>
            {exam.courseName && <p className="text-sm text-gray-700">{exam.courseName}{exam.courseCode ? ` (${exam.courseCode})` : ''}</p>}
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
                <Users className={`w-5 h-5 ${isOnlineExam ? 'text-emerald-500' : 'text-slate-500'}`} />
                <div>
                  <p className="text-xs text-gray-500">Mode</p>
                  <p className="text-sm font-medium capitalize">{examMode}</p>
                </div>
              </div>
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
              {isOnlineExam ? (
                <>
                  <li>Ensure a stable internet connection before starting the exam.</li>
                  <li>Once started, the exam cannot be paused.</li>
                  <li>The exam will auto-submit when time expires.</li>
                  <li>Single-choice and multiple-correct MCQ answers are auto-graded.</li>
                  <li>Subjective answers will be graded by the faculty.</li>
                  <li>Do not refresh the browser during the exam.</li>
                </>
              ) : (
                <>
                  <li>This is an offline exam and will be conducted in the assigned room.</li>
                  <li>Carry your ID card and required writing materials.</li>
                  <li>Reach the exam venue at least 20 minutes before start time.</li>
                  <li>Follow invigilator instructions for attendance and seating.</li>
                </>
              )}
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
              {status === 'ongoing' && isOnlineExam && (
                <Link to={`/student/exams/${id}/take`} className="block text-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                  Start Online Exam
                </Link>
              )}
              {status === 'ongoing' && !isOnlineExam && (
                <p className="text-sm text-center text-gray-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  This exam is offline. Please attend in your assigned classroom.
                </p>
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
