import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { questionService, submissionService, examService } from '../../services';
import { Clock, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export default function StudentTakeExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      examService.get(id),
      questionService.list(id),
    ]).then(([examData, questionsData]) => {
      setExam(examData);
      const qs = Array.isArray(questionsData) ? questionsData : [];
      setQuestions(qs);
      setTimeLeft((examData.duration || 60) * 60);
      setLoading(false);
    }).catch(() => {
      alert('Failed to load exam');
      navigate('/student/exams');
    });
  }, [id]);

  // Timer
  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);

    // Auto-grade MCQ and fill-in-blank
    const answerList = questions.map((q) => {
      const ans = answers[q.id] || '';
      let isCorrect = null;
      let marksAwarded = 0;
      if (q.type === 'mcq' && q.correctAnswer) {
        isCorrect = ans === q.correctAnswer;
        marksAwarded = isCorrect ? (q.marks || 1) : 0;
      } else if (q.type === 'fill-in-blank' && q.correctAnswer) {
        isCorrect = ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        marksAwarded = isCorrect ? (q.marks || 1) : 0;
      }
      return { questionId: q.id, answer: ans, isCorrect, marksAwarded };
    });

    try {
      await submissionService.submit(id, { answers: answerList, autoSubmitted: auto });
      alert(auto ? 'Time expired! Exam auto-submitted.' : 'Exam submitted successfully!');
      navigate('/student/results');
    } catch (err) {
      alert(err.response?.data?.error || 'Submission failed');
      setSubmitting(false);
    }
  }, [answers, questions, id, submitting]);

  if (loading) return (
    <DashboardLayout role="student">
      <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
    </DashboardLayout>
  );

  const q = questions[currentQ];
  const answered = Object.keys(answers).filter((k) => answers[k]).length;
  const isLowTime = timeLeft < 300;

  return (
    <DashboardLayout role="student">
      {/* Timer Bar */}
      <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-3 rounded-xl shadow-sm border mb-6 ${isLowTime ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
        <div>
          <p className="font-semibold text-sm">{exam?.title}</p>
          <p className="text-xs text-gray-500">{answered}/{questions.length} answered</p>
        </div>
        <div className={`flex items-center space-x-2 font-mono text-lg font-bold ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}>
          <Clock className="w-5 h-5" />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Area */}
        <div className="lg:col-span-3">
          {q && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Question {currentQ + 1} of {questions.length}</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{q.type} | {q.marks || 1} marks</span>
              </div>
              <p className="text-gray-900 font-medium mb-6">{q.questionText || q.text}</p>

              {/* MCQ */}
              {q.type === 'mcq' && q.options && (
                <div className="space-y-2">
                  {(Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]')).map((opt, i) => (
                    <label key={i} className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${answers[q.id] === opt ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50'}`}>
                      <input type="radio" name={`q-${q.id}`} checked={answers[q.id] === opt} onChange={() => handleAnswer(q.id, opt)} className="mr-3" />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Fill in blank */}
              {q.type === 'fill-in-blank' && (
                <input value={answers[q.id] || ''} onChange={(e) => handleAnswer(q.id, e.target.value)} placeholder="Type your answer..." className="w-full px-4 py-3 border rounded-lg outline-none text-sm" />
              )}

              {/* Subjective */}
              {q.type === 'subjective' && (
                <textarea value={answers[q.id] || ''} onChange={(e) => handleAnswer(q.id, e.target.value)} rows={6} placeholder="Write your answer..." className="w-full px-4 py-3 border rounded-lg outline-none text-sm" />
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t">
                <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="flex items-center px-4 py-2 text-sm text-gray-600 border rounded-lg disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </button>
                {currentQ < questions.length - 1 ? (
                  <button onClick={() => setCurrentQ(currentQ + 1)} className="flex items-center px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg">
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <button onClick={() => setShowConfirm(true)} className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg font-medium">
                    Submit Exam
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question Navigator */}
        <div className="bg-white rounded-xl shadow-sm border p-4 h-fit">
          <h3 className="text-sm font-semibold mb-3">Questions</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((qq, i) => (
              <button key={qq.id} onClick={() => setCurrentQ(i)} className={`w-9 h-9 rounded-lg text-xs font-medium transition ${i === currentQ ? 'bg-indigo-600 text-white' : answers[qq.id] ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t space-y-1 text-xs text-gray-500">
            <div className="flex items-center"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></span> Answered</div>
            <div className="flex items-center"><span className="w-3 h-3 bg-gray-100 rounded mr-2"></span> Not answered</div>
            <div className="flex items-center"><span className="w-3 h-3 bg-indigo-600 rounded mr-2"></span> Current</div>
          </div>
          <button onClick={() => setShowConfirm(true)} className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
            Submit Exam
          </button>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-2 text-yellow-600 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold">Submit Exam?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">You have answered {answered} out of {questions.length} questions.</p>
            {answered < questions.length && <p className="text-sm text-red-500 mb-4">{questions.length - answered} question(s) are unanswered.</p>}
            <div className="flex space-x-3 mt-4">
              <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={() => handleSubmit(false)} disabled={submitting} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
