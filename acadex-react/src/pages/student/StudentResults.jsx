import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { resultService, revaluationService } from '../../services';
import { Award, TrendingUp, BarChart3 } from 'lucide-react';

export default function StudentResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revalModal, setRevalModal] = useState(null);
  const [revalReason, setRevalReason] = useState('');
  const [submittingReval, setSubmittingReval] = useState(false);

  useEffect(() => {
    resultService.list({ published: true }).then((d) => {
      setResults(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleRevaluation = async () => {
    setSubmittingReval(true);
    try {
      await revaluationService.request({ examId: revalModal.examId, reason: revalReason });
      alert('Revaluation request submitted!');
      setRevalModal(null);
      setRevalReason('');
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSubmittingReval(false); }
  };

  const totalMarks = results.reduce((s, r) => s + (r.marksObtained || 0), 0);
  const totalPossible = results.reduce((s, r) => s + (r.totalMarks || 0), 0);
  const avgPercentage = totalPossible > 0 ? Math.round((totalMarks / totalPossible) * 100) : 0;

  const getGradeColor = (grade) => {
    const m = { 'A+': 'green', A: 'green', 'B+': 'blue', B: 'blue', 'C+': 'yellow', C: 'yellow', D: 'orange', F: 'red' };
    return m[grade] || 'gray';
  };

  return (
    <DashboardLayout role="student">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Results</h1>

      {/* Stats */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Exams Taken</p>
                <p className="text-2xl font-bold text-gray-900">{results.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Marks</p>
                <p className="text-2xl font-bold text-gray-900">{totalMarks}/{totalPossible}</p>
              </div>
              <Award className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Average</p>
                <p className="text-2xl font-bold text-gray-900">{avgPercentage}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No results available yet.</p>
          <p className="text-sm mt-1">Results will appear here once your exams are graded and published.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r) => {
            const pct = r.totalMarks > 0 ? Math.round((r.marksObtained / r.totalMarks) * 100) : 0;
            const gc = getGradeColor(r.grade);
            return (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{r.examTitle || `Exam #${r.examId}`}</h3>
                    {r.subject && <p className="text-sm text-gray-500">{r.subject}</p>}
                  </div>
                  <div className="flex items-center space-x-6">
                    {/* Score */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Score</p>
                      <p className="text-lg font-bold text-gray-900">{r.marksObtained}<span className="text-sm text-gray-400">/{r.totalMarks}</span></p>
                    </div>
                    {/* Percentage */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Percentage</p>
                      <p className={`text-lg font-bold ${pct >= 60 ? 'text-green-600' : pct >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</p>
                    </div>
                    {/* Grade */}
                    {r.grade && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Grade</p>
                        <span className={`inline-block px-3 py-1 bg-${gc}-100 text-${gc}-700 rounded-full text-sm font-bold`}>{r.grade}</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${pct >= 60 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }}></div>
                </div>
                {/* Actions */}
                <div className="mt-3 flex justify-end">
                  <button onClick={() => setRevalModal(r)} className="text-xs text-indigo-600 hover:underline">Request Revaluation</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Revaluation Modal */}
      {revalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="font-semibold text-lg mb-1">Request Revaluation</h3>
            <p className="text-sm text-gray-500 mb-4">{revalModal.examTitle || `Exam #${revalModal.examId}`}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea value={revalReason} onChange={(e) => setRevalReason(e.target.value)} rows={4} placeholder="Explain why you're requesting a revaluation..." className="w-full px-3 py-2 border rounded-lg outline-none text-sm mb-4" />
            <div className="flex space-x-3">
              <button onClick={() => { setRevalModal(null); setRevalReason(''); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleRevaluation} disabled={!revalReason.trim() || submittingReval} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {submittingReval ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
