import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { attendanceService, subjectService, topicVerificationService } from '../../services';

export default function AdminAttendance() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [shortageList, setShortageList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ department: '', subjectId: '' });
  const [lockForm, setLockForm] = useState({ subjectId: '', date: new Date().toISOString().split('T')[0] });
  const [lockMsg, setLockMsg] = useState('');
  // Topic verification state
  const [teacherScores, setTeacherScores] = useState([]);
  const [verificationStats, setVerificationStats] = useState([]);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tab === 'shortage') loadShortage();
    if (tab === 'credibility') loadCredibility();
    if (tab === 'verification') loadVerificationStats();
  }, [tab, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, subjectData] = await Promise.all([
        attendanceService.getStats().catch(() => null),
        subjectService.list().catch(() => []),
      ]);
      setStats(statsData);
      setSubjects(Array.isArray(subjectData) ? subjectData : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadCredibility = async () => {
    try {
      const data = await topicVerificationService.getTeacherScores();
      setTeacherScores(Array.isArray(data) ? data : []);
    } catch (e) { setTeacherScores([]); }
  };

  const loadVerificationStats = async () => {
    try {
      const params = {};
      if (filters.subjectId) params.subjectId = filters.subjectId;
      const data = await topicVerificationService.getStats(params);
      setVerificationStats(Array.isArray(data) ? data : []);
    } catch (e) { setVerificationStats([]); }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await topicVerificationService.recalculate();
      await loadCredibility();
    } catch (e) {}
    setRecalculating(false);
  };

  const loadShortage = async () => {
    try {
      const params = {};
      if (filters.department) params.department = filters.department;
      if (filters.subjectId) params.subjectId = filters.subjectId;
      const data = await attendanceService.getShortage(params);
      setShortageList(Array.isArray(data) ? data : []);
    } catch (e) {
      setShortageList([]);
    }
  };

  const handleLock = async () => {
    if (!lockForm.subjectId || !lockForm.date) return;
    try {
      await attendanceService.lock({ subjectId: lockForm.subjectId, date: lockForm.date });
      setLockMsg('Attendance locked successfully!');
      setTimeout(() => setLockMsg(''), 3000);
    } catch (e) {
      setLockMsg('Failed to lock attendance.');
      setTimeout(() => setLockMsg(''), 3000);
    }
  };

  const departments = [...new Set(subjects.map(s => s.department).filter(Boolean))];

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'credibility', label: 'Faculty Credibility' },
    { key: 'verification', label: 'Verification Stats' },
    { key: 'shortage', label: 'Shortage List' },
    { key: 'lock', label: 'Lock Attendance' },
    { key: 'subjects', label: 'Subjects' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance Management</h1>
          <p className="text-slate-500 mt-1">Monitor attendance across departments & manage records</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-rose-100/50 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Total Subjects" value={stats.totalSubjects || 0} icon="📚" color="rose" />
              <StatCard label="Total Records" value={stats.totalRecords || 0} icon="📋" color="pink" />
              <StatCard label="Overall Present %" value={`${stats.overallPresentPercentage || 0}%`} icon="✅" color="emerald" />
              <StatCard label="Shortage Students" value={stats.shortageCount || 0} icon="⚠️" color="amber" />
            </div>

            {/* Department Breakdown */}
            {stats.departmentBreakdown && stats.departmentBreakdown.length > 0 && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Department-wise Attendance</h2>
                <div className="space-y-4">
                  {stats.departmentBreakdown.map((dept, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium text-slate-700 truncate">{dept.department}</div>
                      <div className="flex-1 relative">
                        <div className="h-8 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              dept.presentPercentage >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'
                            }`}
                            style={{ width: `${dept.presentPercentage || 0}%` }}
                          ></div>
                        </div>
                        {/* 75% marker */}
                        <div className="absolute top-0 bottom-0 left-[75%] w-px bg-slate-400/50 z-10">
                          <div className="absolute -top-5 -translate-x-1/2 text-[10px] text-slate-400">75%</div>
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className={`text-sm font-bold ${dept.presentPercentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {dept.presentPercentage || 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-6">
                <h3 className="text-md font-semibold text-slate-700 mb-3">Subject Distribution</h3>
                <div className="space-y-2">
                  {subjects.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{s.subjectName}</span>
                        <span className="text-xs text-slate-400 ml-2">({s.subjectCode})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{s.department}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Sec {s.section}</span>
                      </div>
                    </div>
                  ))}
                  {subjects.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No subjects found</p>
                  )}
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-6">
                <h3 className="text-md font-semibold text-slate-700 mb-3">Attendance Health</h3>
                <div className="flex items-center justify-center h-40">
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                      <circle
                        cx="60" cy="60" r="54" fill="none"
                        stroke={stats.overallPresentPercentage >= 75 ? '#10b981' : '#f43f5e'}
                        strokeWidth="10"
                        strokeDasharray={`${(stats.overallPresentPercentage || 0) * 3.39} 339.29`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${stats.overallPresentPercentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {stats.overallPresentPercentage || 0}%
                        </div>
                        <div className="text-xs text-slate-400">Overall</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shortage Tab */}
        {tab === 'shortage' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-rose-100/50">
              <select
                value={filters.department}
                onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={filters.subjectId}
                onChange={e => setFilters(f => ({ ...f, subjectId: e.target.value }))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
              >
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>)}
              </select>
            </div>

            {/* Shortage Table */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-rose-100/50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Students Below 75% Attendance</h2>
                <span className="text-xs px-3 py-1 rounded-full bg-rose-50 text-rose-600 font-medium">
                  {shortageList.length} student{shortageList.length !== 1 ? 's' : ''}
                </span>
              </div>
              {shortageList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-rose-50/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Present</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Percentage</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shortageList.map((item, i) => (
                        <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-500">{i + 1}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-800">{item.studentName || item.studentId}</div>
                            {item.studentEmail && <div className="text-xs text-slate-400">{item.studentEmail}</div>}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{item.subjectName || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{item.presentCount || 0}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{item.totalClasses || 0}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-rose-500 rounded-full"
                                  style={{ width: `${item.percentage || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-rose-600">{item.percentage || 0}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700">
                              Shortage
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-slate-500">No students with attendance shortage!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lock Tab */}
        {tab === 'lock' && (
          <div className="max-w-lg space-y-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Lock Attendance Record</h2>
                <p className="text-sm text-slate-500 mt-1">Locked records cannot be modified by faculty</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select
                  value={lockForm.subjectId}
                  onChange={e => setLockForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                >
                  <option value="">Select subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={lockForm.date}
                  onChange={e => setLockForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>

              <button
                onClick={handleLock}
                disabled={!lockForm.subjectId || !lockForm.date}
                className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:from-rose-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                🔒 Lock Attendance
              </button>

              {lockMsg && (
                <div className={`text-sm text-center py-2 px-4 rounded-lg ${
                  lockMsg.includes('success') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {lockMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subjects Tab */}
        {tab === 'subjects' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-100/50">
              <h2 className="text-lg font-semibold text-slate-800">All Subjects</h2>
            </div>
            {subjects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-rose-50/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Faculty</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Section</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Semester</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjects.map((s, i) => (
                      <tr key={s.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-500">{i + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{s.subjectName}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono">{s.subjectCode}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{s.facultyName || s.facultyId}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-600">{s.department}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{s.section}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">Sem {s.semester}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">No subjects configured</p>
              </div>
            )}
          </div>
        )}

        {/* Faculty Credibility Tab */}
        {tab === 'credibility' && (
          <div className="space-y-6">
            {/* Header with Recalculate */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Faculty Credibility Scores</h2>
                <p className="text-sm text-slate-500 mt-1">ML-powered credibility analysis based on student verification votes</p>
              </div>
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {recalculating ? (
                  <><span className="animate-spin">⟳</span> Recalculating...</>
                ) : (
                  <><span>🔄</span> Recalculate All</>
                )}
              </button>
            </div>

            {/* Risk Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-emerald-100/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">✅</div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {teacherScores.filter(t => t.riskLevel === 'Normal').length}
                    </div>
                    <div className="text-sm text-slate-500">Normal</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-amber-100/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg">⚠️</div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {teacherScores.filter(t => t.riskLevel === 'Suspicious').length}
                    </div>
                    <div className="text-sm text-slate-500">Suspicious</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-lg">🚨</div>
                  <div>
                    <div className="text-2xl font-bold text-rose-600">
                      {teacherScores.filter(t => t.riskLevel === 'High Risk').length}
                    </div>
                    <div className="text-sm text-slate-500">High Risk</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credibility Table */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 overflow-hidden">
              {teacherScores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-rose-50/50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Faculty</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Credibility</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Yes %</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">No %</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Partial %</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Consistency</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Sessions</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teacherScores.map((t) => (
                        <tr key={t.teacherId} className="hover:bg-rose-50/30 transition-colors">
                          <td className="px-5 py-4 text-sm font-medium text-slate-800">{t.teacherName || t.teacherId}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    t.credibilityScore >= 85 ? 'bg-emerald-500' :
                                    t.credibilityScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(t.credibilityScore, 100)}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold ${
                                t.credibilityScore >= 85 ? 'text-emerald-600' :
                                t.credibilityScore >= 60 ? 'text-amber-600' : 'text-rose-600'
                              }`}>
                                {t.credibilityScore?.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-emerald-600 font-medium">{t.avgYesVotes?.toFixed(1)}%</td>
                          <td className="px-5 py-4 text-sm text-rose-600 font-medium">{t.avgNoVotes?.toFixed(1)}%</td>
                          <td className="px-5 py-4 text-sm text-amber-600 font-medium">{t.avgPartialVotes?.toFixed(1)}%</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${t.attendanceConsistency || 0}%` }} />
                              </div>
                              <span className="text-xs text-slate-500">{t.attendanceConsistency?.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600 text-center">{t.totalSessionsVerified || 0}</td>
                          <td className="px-5 py-4">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              t.riskLevel === 'Normal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              t.riskLevel === 'Suspicious' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {t.riskLevel === 'Normal' ? '✅' : t.riskLevel === 'Suspicious' ? '⚠️' : '🚨'} {t.riskLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-slate-400">No credibility data available yet</p>
                  <p className="text-xs text-slate-300 mt-1">Scores are generated after students verify topics</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Stats Tab */}
        {tab === 'verification' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Session Verification Stats</h2>
              <p className="text-sm text-slate-500 mt-1">Per-session voting breakdown with anomaly detection flags</p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 overflow-hidden">
              {verificationStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-rose-50/50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Subject</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Topic</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Faculty</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-rose-700 uppercase tracking-wider">Votes</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Breakdown</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {verificationStats.map((s, i) => {
                        const total = (s.yesVotes || 0) + (s.noVotes || 0) + (s.partialVotes || 0);
                        const yesPct = total > 0 ? ((s.yesVotes || 0) / total * 100) : 0;
                        const noPct = total > 0 ? ((s.noVotes || 0) / total * 100) : 0;
                        const partialPct = total > 0 ? ((s.partialVotes || 0) / total * 100) : 0;
                        return (
                          <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                            <td className="px-5 py-4 text-sm text-slate-600">{s.date}</td>
                            <td className="px-5 py-4">
                              <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono">{s.subjectName || s.subjectCode}</span>
                            </td>
                            <td className="px-5 py-4 text-sm font-medium text-slate-800">{s.topicName || '-'}</td>
                            <td className="px-5 py-4 text-sm text-slate-600">{s.teacherName || s.teacherId}</td>
                            <td className="px-5 py-4 text-sm text-slate-600 text-center font-medium">{total}</td>
                            <td className="px-5 py-4">
                              {total > 0 ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                      <div className="h-full bg-emerald-500" style={{ width: `${yesPct}%` }} />
                                      <div className="h-full bg-amber-500" style={{ width: `${partialPct}%` }} />
                                      <div className="h-full bg-rose-500" style={{ width: `${noPct}%` }} />
                                    </div>
                                  </div>
                                  <div className="flex gap-3 text-[10px]">
                                    <span className="text-emerald-600">Y:{yesPct.toFixed(0)}%</span>
                                    <span className="text-amber-600">P:{partialPct.toFixed(0)}%</span>
                                    <span className="text-rose-600">N:{noPct.toFixed(0)}%</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-300">No votes</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                s.flag === 'Normal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                s.flag === 'Suspicious' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                s.flag === 'High Risk' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                'bg-slate-50 text-slate-500 border border-slate-200'
                              }`}>
                                {s.flag === 'Normal' ? '✅' : s.flag === 'Suspicious' ? '⚠️' : s.flag === 'High Risk' ? '🚨' : '—'} {s.flag || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🗳️</div>
                  <p className="text-slate-400">No verification data available yet</p>
                  <p className="text-xs text-slate-300 mt-1">Stats appear after students submit topic verification votes</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    rose: 'from-rose-500 to-pink-500 bg-rose-50 text-rose-600',
    pink: 'from-pink-500 to-fuchsia-500 bg-pink-50 text-pink-600',
    emerald: 'from-emerald-500 to-teal-500 bg-emerald-50 text-emerald-600',
    amber: 'from-amber-500 to-orange-500 bg-amber-50 text-amber-600',
  };
  const c = colorMap[color] || colorMap.rose;
  const [grad, bg, text] = [c.split(' ')[0] + ' ' + c.split(' ')[1], c.split(' ')[2], c.split(' ')[3]];

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-5 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${bg} ${text}`}>Live</span>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}
