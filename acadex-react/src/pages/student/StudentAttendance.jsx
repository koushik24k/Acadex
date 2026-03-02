import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { attendanceService, topicVerificationService } from '../../services';

export default function StudentAttendance() {
  const [data, setData] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('attendance'); // attendance | verify | history
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [votingId, setVotingId] = useState(null);
  const [voteMsg, setVoteMsg] = useState('');

  useEffect(() => {
    Promise.all([
      attendanceService.getMy({}).catch(() => null),
      attendanceService.getMyMonthly({}).catch(() => []),
      topicVerificationService.getPending().catch(() => []),
      topicVerificationService.getHistory({}).catch(() => []),
    ]).then(([d, m, p, h]) => {
      setData(d);
      setMonthly(Array.isArray(m) ? m : []);
      setPending(Array.isArray(p) ? p : []);
      setHistory(Array.isArray(h) ? h : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    attendanceService.getMyMonthly(selectedSubject ? { subjectId: selectedSubject } : {}).then(setMonthly).catch(() => {});
  }, [selectedSubject]);

  const handleVote = async (sessionId, vote) => {
    setVotingId(sessionId);
    try {
      await topicVerificationService.vote({ sessionId, vote });
      setPending((prev) => prev.filter((p) => p.sessionId !== sessionId));
      setVoteMsg('Vote recorded!');
      setTimeout(() => setVoteMsg(''), 2000);
    } catch (e) {
      setVoteMsg('Failed to vote');
      setTimeout(() => setVoteMsg(''), 2000);
    }
    setVotingId(null);
  };

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const subjects = data?.subjects || [];
  const overallPct = data?.overallPercentage || 0;
  const overallShortage = data?.overallShortage || false;

  return (
    <DashboardLayout role="student">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>
        <div className="flex space-x-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-indigo-100/50">
          {[
            { key: 'attendance', label: 'Attendance' },
            { key: 'verify', label: `Verify Topics${pending.length > 0 ? ` (${pending.length})` : ''}` },
            { key: 'history', label: 'Topic History' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-indigo-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {voteMsg && (
        <div className={`mb-4 text-sm text-center py-2 px-4 rounded-lg ${
          voteMsg.includes('recorded') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
        }`}>{voteMsg}</div>
      )}

      {/* ── VERIFY TOPICS TAB ── */}
      {tab === 'verify' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-5 mb-2">
            <h3 className="font-semibold text-indigo-800 mb-1">Topic Verification</h3>
            <p className="text-sm text-indigo-600">Help verify which topics were actually covered in class. Your votes are anonymous.</p>
          </div>
          {pending.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-lg">No pending verifications</p>
              <p className="text-sm">Check back later — verifications appear 3 days after class.</p>
            </div>
          ) : (
            pending.map((p) => (
              <div key={p.sessionId} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{p.date} • {p.subjectName} ({p.subjectCode})</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      Did faculty cover "<span className="text-indigo-600">{p.topicName}</span>"?
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Unit {p.unitNo} • Faculty: {p.teacherName}</p>
                    {p.notes && <p className="text-xs text-slate-400 mt-1 italic">Notes: {p.notes}</p>}
                  </div>
                  <div className="flex items-center space-x-2">
                    {['Yes', 'No', 'Partial'].map((vote) => {
                      const colors = {
                        Yes: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200',
                        No: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
                        Partial: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200',
                      };
                      const icons = { Yes: '✅', No: '❌', Partial: '⚠️' };
                      return (
                        <button
                          key={vote}
                          onClick={() => handleVote(p.sessionId, vote)}
                          disabled={votingId === p.sessionId}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${colors[vote]} disabled:opacity-50`}
                        >
                          {icons[vote]} {vote}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TOPIC HISTORY TAB ── */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50">
            <h3 className="font-semibold text-slate-900">Topic Coverage History</h3>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No topic history available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Subject</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Topic</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Unit</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Attended</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">My Vote</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-500">{h.date}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{h.subjectName}</td>
                      <td className="py-3 px-4 text-slate-600">{h.topicName}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{h.unitNo}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          h.attended ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>{h.attended ? 'Yes' : 'No'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {h.voted ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            h.myVote === 'Yes' ? 'bg-emerald-100 text-emerald-700'
                            : h.myVote === 'No' ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                          }`}>{h.myVote}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {tab === 'attendance' && (
        <>

      {/* ── Overall card ── */}
      <div className={`rounded-2xl p-6 mb-6 border ${overallShortage ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-200'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-600">Overall Attendance</p>
            <p className={`text-4xl font-extrabold ${overallShortage ? 'text-red-700' : 'text-indigo-700'}`}>{overallPct}%</p>
            <p className="text-sm text-slate-500 mt-1">{data?.overallPresent || 0} / {data?.overallTotal || 0} classes attended</p>
          </div>
          {overallShortage && (
            <div className="flex items-center space-x-2 bg-red-100 border border-red-300 rounded-xl px-4 py-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-800">Attendance Shortage</p>
                <p className="text-xs text-red-600">Below 75% minimum requirement</p>
              </div>
            </div>
          )}
        </div>
        {/* Overall bar */}
        <div className="mt-4 h-3 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${overallShortage ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${Math.min(overallPct, 100)}%` }}
          />
        </div>
      </div>

      {/* ── Subject-wise bars ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Subject-wise Attendance</h2>
        {subjects.length === 0 ? (
          <p className="text-slate-400 text-sm">No attendance records yet.</p>
        ) : (
          <div className="space-y-4">
            {subjects.map((s) => {
              const isShortage = s.shortage;
              return (
                <button
                  key={s.subjectId}
                  onClick={() => setSelectedSubject(selectedSubject === s.subjectId ? null : s.subjectId)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedSubject === s.subjectId
                      ? 'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200'
                      : 'border-slate-200/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{s.subjectName}</p>
                      <p className="text-xs text-slate-500">{s.subjectCode} — {s.attendedClasses}/{s.totalClasses} classes</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xl font-bold ${isShortage ? 'text-red-600' : 'text-emerald-600'}`}>
                        {s.percentage}%
                      </span>
                      {isShortage && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Shortage</span>
                      )}
                    </div>
                  </div>
                  {/* Bar */}
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isShortage ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(s.percentage, 100)}%` }}
                    />
                  </div>
                  {/* 75% marker */}
                  <div className="relative h-0 mt-0">
                    <div className="absolute left-[75%] -top-2.5 w-px h-2.5 bg-slate-400 opacity-50" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Monthly breakdown ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Monthly Breakdown</h2>
          {selectedSubject && (
            <span className="text-sm text-indigo-600 font-medium">
              Filtered: {subjects.find((s) => s.subjectId === selectedSubject)?.subjectName || ''}
            </span>
          )}
        </div>
        {monthly.length === 0 ? (
          <p className="text-slate-400 text-sm">No monthly data available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthly.map((m) => {
              const pct = m.percentage;
              const isLow = pct < 75;
              return (
                <div key={m.month} className="border border-slate-200/60 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium text-slate-800">{m.month}</p>
                    <p className={`font-bold ${isLow ? 'text-red-600' : 'text-emerald-600'}`}>{pct}%</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{m.attendedClasses}/{m.totalClasses} classes</p>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isLow ? 'bg-red-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

        </>
      )}
    </DashboardLayout>
  );
}
