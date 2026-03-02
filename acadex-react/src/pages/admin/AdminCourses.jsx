import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { courseService, adminUserService } from '../../services';

export default function AdminCourses() {
  const [tab, setTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [detailCourse, setDetailCourse] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [msg, setMsg] = useState('');
  const [faculties, setFaculties] = useState([]);

  // Form state
  const [form, setForm] = useState({ courseCode: '', courseName: '', department: 'Computer Science', semester: '3', credits: 4, type: 'Core', totalHours: '', description: '' });

  // Unit/Topic creation
  const [unitForm, setUnitForm] = useState({ unitNumber: '', unitTitle: '', expectedHours: '' });
  const [topicForm, setTopicForm] = useState({ unitId: '', topicName: '', description: '', plannedDate: '' });
  const [assignFacultyId, setAssignFacultyId] = useState('');
  const [assignSection, setAssignSection] = useState('A');

  useEffect(() => { loadCourses(); loadFaculties(); }, []);
  useEffect(() => { if (tab === 'risk') loadRisks(); }, [tab]);

  const loadCourses = async () => {
    try { setLoading(true); const data = await courseService.list(); setCourses(data); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const loadRisks = async () => {
    try { const data = await courseService.getAllRisks(); setRisks(data); } catch (e) { console.error(e); }
  };
  const loadFaculties = async () => {
    try { const data = await adminUserService.list({ role: 'faculty' }); setFaculties(Array.isArray(data) ? data : data.users || []); } catch (e) { console.error(e); }
  };

  const openDetail = async (course) => {
    try {
      setDetailCourse(course);
      const [detail, prog] = await Promise.all([courseService.get(course.id), courseService.getProgress(course.id)]);
      setDetailData(detail);
      setProgress(prog);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    try {
      await courseService.create({ ...form, credits: Number(form.credits), totalHours: form.totalHours ? Number(form.totalHours) : null });
      setMsg('Course created!'); setShowCreate(false); setForm({ courseCode: '', courseName: '', department: 'Computer Science', semester: '3', credits: 4, type: 'Core', totalHours: '', description: '' });
      loadCourses();
    } catch (e) { setMsg(e.response?.data?.error || 'Error creating course'); }
  };

  const handleUpdate = async () => {
    try {
      await courseService.update(editCourse.id, { ...form, credits: Number(form.credits), totalHours: form.totalHours ? Number(form.totalHours) : null });
      setMsg('Course updated!'); setEditCourse(null); loadCourses();
    } catch (e) { setMsg(e.response?.data?.error || 'Error'); }
  };

  const handlePublish = async (id) => { await courseService.publish(id); setMsg('Published!'); loadCourses(); };
  const handleLock = async (id) => { await courseService.lock(id); setMsg('Locked!'); loadCourses(); };
  const handleDelete = async (id) => { if (confirm('Delete this course?')) { await courseService.remove(id); setMsg('Deleted'); loadCourses(); } };

  const handleClone = async (id) => {
    const code = prompt('New course code for clone:');
    if (code) { await courseService.clone(id, { courseCode: code }); setMsg('Cloned!'); loadCourses(); }
  };

  // Detail panel actions
  const addUnit = async () => {
    if (!unitForm.unitTitle) return;
    await courseService.createUnit(detailCourse.id, { ...unitForm, unitNumber: Number(unitForm.unitNumber), expectedHours: unitForm.expectedHours ? Number(unitForm.expectedHours) : null });
    setUnitForm({ unitNumber: '', unitTitle: '', expectedHours: '' });
    openDetail(detailCourse);
  };

  const addTopic = async () => {
    if (!topicForm.topicName || !topicForm.unitId) return;
    await courseService.createTopic(detailCourse.id, { ...topicForm, unitId: Number(topicForm.unitId), plannedDate: topicForm.plannedDate || null });
    setTopicForm({ unitId: '', topicName: '', description: '', plannedDate: '' });
    openDetail(detailCourse);
  };

  const assignFac = async () => {
    if (!assignFacultyId) return;
    await courseService.assignFaculty(detailCourse.id, { facultyId: assignFacultyId, section: assignSection });
    setAssignFacultyId(''); openDetail(detailCourse);
  };

  const removeFac = async (mappingId) => {
    await courseService.removeFaculty(detailCourse.id, mappingId);
    openDetail(detailCourse);
  };

  const deleteUnit = async (unitId) => {
    await courseService.deleteUnit(detailCourse.id, unitId);
    openDetail(detailCourse);
  };

  const deleteTopic = async (topicId) => {
    await courseService.deleteTopic(detailCourse.id, topicId);
    openDetail(detailCourse);
  };

  const tabs = [
    { key: 'courses', label: 'All Courses', icon: '📚' },
    { key: 'risk', label: 'Risk Analysis', icon: '🤖' },
  ];

  const statusColors = {
    Draft: 'bg-slate-100 text-slate-600',
    Published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Locked: 'bg-rose-50 text-rose-700 border border-rose-200',
  };
  const typeIcons = { Core: '📘', Elective: '📗', Lab: '🔬' };
  const riskColors = { Normal: 'bg-emerald-50 text-emerald-700', Delayed: 'bg-amber-50 text-amber-700', 'At Risk': 'bg-rose-50 text-rose-700' };

  if (loading) return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  // ── Detail View ──
  if (detailCourse && detailData) return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => { setDetailCourse(null); setDetailData(null); }} className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">←</button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{typeIcons[detailData.type] || '📘'}</span>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{detailData.courseName}</h1>
                <p className="text-sm text-slate-500">{detailData.courseCode} · {detailData.department} · Sem {detailData.semester} · {detailData.credits} Credits</p>
              </div>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[detailData.status]}`}>{detailData.status}</span>
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Syllabus Coverage</h3>
              <span className={`text-2xl font-bold ${progress.syllabusCoverage >= 80 ? 'text-emerald-600' : progress.syllabusCoverage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{progress.syllabusCoverage}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${progress.syllabusCoverage >= 80 ? 'bg-emerald-500' : progress.syllabusCoverage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${progress.syllabusCoverage}%` }} />
            </div>
            <p className="text-sm text-slate-500 mt-2">{progress.completedTopics} of {progress.totalTopics} topics completed</p>

            {/* Unit-wise progress */}
            {progress.unitProgress && progress.unitProgress.length > 0 && (
              <div className="mt-4 space-y-2">
                {progress.unitProgress.map(u => (
                  <div key={u.unitId} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-40 truncate">Unit {u.unitNumber}: {u.unitTitle}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${u.coverage >= 80 ? 'bg-emerald-400' : u.coverage >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${u.coverage}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-16 text-right">{u.completedTopics}/{u.totalTopics}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Units & Topics */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Units & Topics</h3>
          {detailData.units && detailData.units.length > 0 ? (
            <div className="space-y-4">
              {detailData.units.map(unit => (
                <div key={unit.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-700">Unit {unit.unitNumber}: {unit.unitTitle} {unit.expectedHours ? `(${unit.expectedHours}h)` : ''}</span>
                    {detailData.status !== 'Locked' && (
                      <button onClick={() => deleteUnit(unit.id)} className="text-xs text-rose-400 hover:text-rose-600">Remove</button>
                    )}
                  </div>
                  {unit.topics && unit.topics.length > 0 ? (
                    <div className="space-y-1 ml-4">
                      {unit.topics.map(topic => (
                        <div key={topic.id} className="flex items-center gap-2 py-1">
                          <span className={`text-sm ${topic.completed ? 'text-emerald-600 line-through' : 'text-slate-600'}`}>
                            {topic.completed ? '✅' : '⬜'} {topic.topicName}
                          </span>
                          {topic.completedDate && <span className="text-[10px] text-slate-400">{topic.completedDate}</span>}
                          {topic.plannedDate && !topic.completed && <span className="text-[10px] text-amber-500">📅 {topic.plannedDate}</span>}
                          {detailData.status !== 'Locked' && (
                            <button onClick={() => deleteTopic(topic.id)} className="text-[10px] text-rose-300 hover:text-rose-500 ml-auto">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 ml-4">No topics yet</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm">No units defined yet</p>}

          {/* Add Unit */}
          {detailData.status !== 'Locked' && (
            <div className="mt-4 p-4 bg-rose-50/50 rounded-xl space-y-3">
              <h4 className="text-sm font-medium text-slate-700">Add Unit</h4>
              <div className="flex gap-2">
                <input type="number" placeholder="Unit #" value={unitForm.unitNumber} onChange={e => setUnitForm({ ...unitForm, unitNumber: e.target.value })} className="w-20 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                <input placeholder="Unit Title" value={unitForm.unitTitle} onChange={e => setUnitForm({ ...unitForm, unitTitle: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                <input type="number" placeholder="Hours" value={unitForm.expectedHours} onChange={e => setUnitForm({ ...unitForm, expectedHours: e.target.value })} className="w-20 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                <button onClick={addUnit} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600">Add</button>
              </div>

              <h4 className="text-sm font-medium text-slate-700 mt-3">Add Topic</h4>
              <div className="flex gap-2 flex-wrap">
                <select value={topicForm.unitId} onChange={e => setTopicForm({ ...topicForm, unitId: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                  <option value="">Select Unit</option>
                  {(detailData.units || []).map(u => <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>)}
                </select>
                <input placeholder="Topic Name" value={topicForm.topicName} onChange={e => setTopicForm({ ...topicForm, topicName: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm min-w-[200px]" />
                <input type="date" value={topicForm.plannedDate} onChange={e => setTopicForm({ ...topicForm, plannedDate: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                <button onClick={addTopic} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600">Add</button>
              </div>
            </div>
          )}
        </div>

        {/* Faculty Mapping */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Assigned Faculty</h3>
          {detailData.faculty && detailData.faculty.length > 0 ? (
            <div className="space-y-2">
              {detailData.faculty.map(f => (
                <div key={f.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">{f.facultyName || f.facultyId} — Section {f.section}</span>
                  <button onClick={() => removeFac(f.id)} className="text-xs text-rose-400 hover:text-rose-600">Remove</button>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">No faculty assigned</p>}

          <div className="mt-3 flex gap-2">
            <select value={assignFacultyId} onChange={e => setAssignFacultyId(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
              <option value="">Select Faculty</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input placeholder="Section" value={assignSection} onChange={e => setAssignSection(e.target.value)} className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <button onClick={assignFac} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600">Assign</button>
          </div>
        </div>

        {/* Enrollments */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-6">
          <h3 className="font-semibold text-slate-800 mb-2">Enrollments</h3>
          <p className="text-sm text-slate-500">{detailData.enrollmentCount} students enrolled</p>
        </div>
      </div>
    </DashboardLayout>
  );

  // ── Main View ──
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Course Management</h1>
            <p className="text-slate-500 text-sm mt-1">Create, manage courses, track syllabus & ML risk analysis</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all">+ Create Course</button>
        </div>

        {msg && (
          <div className={`text-sm text-center py-2 px-4 rounded-lg ${msg.includes('Error') || msg.includes('error') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{msg}</div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Courses" value={courses.length} icon="📚" color="rose" />
          <StatCard label="Core" value={courses.filter(c => c.type === 'Core').length} icon="📘" color="pink" />
          <StatCard label="Elective" value={courses.filter(c => c.type === 'Elective').length} icon="📗" color="emerald" />
          <StatCard label="Lab" value={courses.filter(c => c.type === 'Lab').length} icon="🔬" color="amber" />
          <StatCard label="Published" value={courses.filter(c => c.status === 'Published').length} icon="✅" color="rose" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-rose-100/50">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50/50'}`}>
              <span className="mr-1.5">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Courses Tab */}
        {tab === 'courses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => (
              <div key={c.id} onClick={() => openDetail(c)} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-5 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeIcons[c.type] || '📘'}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">{c.courseCode}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[c.status]}`}>{c.status}</span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-rose-600 transition-colors">{c.courseName}</h3>
                <p className="text-xs text-slate-500 mb-3">{c.department} · Sem {c.semester} · {c.credits} Credits</p>

                {/* Coverage bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Syllabus Coverage</span>
                    <span className="font-medium">{c.syllabusCoverage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.syllabusCoverage >= 80 ? 'bg-emerald-500' : c.syllabusCoverage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${c.syllabusCoverage}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{c.enrolledStudents} students</span>
                  <span>{c.facultyNames?.join(', ') || 'No faculty'}</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                  {c.status === 'Draft' && <button onClick={() => handlePublish(c.id)} className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100">Publish</button>}
                  {c.status === 'Published' && <button onClick={() => handleLock(c.id)} className="text-[10px] px-2 py-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100">Lock</button>}
                  <button onClick={() => handleClone(c.id)} className="text-[10px] px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100">Clone</button>
                  {c.status !== 'Locked' && <button onClick={() => { setEditCourse(c); setForm({ courseCode: c.courseCode, courseName: c.courseName, department: c.department, semester: c.semester, credits: c.credits, type: c.type, totalHours: c.totalHours || '', description: c.description || '' }); }} className="text-[10px] px-2 py-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100">Edit</button>}
                  {c.status !== 'Locked' && <button onClick={() => handleDelete(c.id)} className="text-[10px] px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100">Delete</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Risk Analysis Tab */}
        {tab === 'risk' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-emerald-100/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">✅</div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">{risks.filter(r => r.riskLevel === 'Normal').length}</div>
                    <div className="text-sm text-slate-500">Normal</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-amber-100/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg">⏳</div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{risks.filter(r => r.riskLevel === 'Delayed').length}</div>
                    <div className="text-sm text-slate-500">Delayed</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-lg">🚨</div>
                  <div>
                    <div className="text-2xl font-bold text-rose-600">{risks.filter(r => r.riskLevel === 'At Risk').length}</div>
                    <div className="text-sm text-slate-500">At Risk</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 overflow-hidden">
              <table className="w-full">
                <thead className="bg-rose-50/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Course</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Coverage</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Risk Score</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Level</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-rose-700 uppercase tracking-wider">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {risks.map(r => (
                    <tr key={r.courseId} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-slate-800">{r.courseName}</div>
                        <div className="text-xs text-slate-400">{r.courseCode}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${r.syllabusCoverage >= 80 ? 'bg-emerald-500' : r.syllabusCoverage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${r.syllabusCoverage}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{r.syllabusCoverage}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-600">{r.riskScore}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${riskColors[r.riskLevel] || ''}`}>
                          {r.riskLevel === 'Normal' ? '✅' : r.riskLevel === 'Delayed' ? '⏳' : '🚨'} {r.riskLevel}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(r.flags || []).map((f, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-600">{f}</span>
                          ))}
                          {(!r.flags || r.flags.length === 0) && <span className="text-[10px] text-slate-300">None</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {(showCreate || editCourse) && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">{editCourse ? 'Edit Course' : 'Create New Course'}</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Course Code *</label>
                    <input value={form.courseCode} onChange={e => setForm({ ...form, courseCode: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="CS201" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Credits *</label>
                    <input type="number" value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Course Name *</label>
                  <input value={form.courseName} onChange={e => setForm({ ...form, courseName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Data Structures & Algorithms" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Department</label>
                    <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Semester</label>
                    <input value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                      <option>Core</option><option>Elective</option><option>Lab</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Total Hours</label>
                  <input type="number" value={form.totalHours} onChange={e => setForm({ ...form, totalHours: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => { setShowCreate(false); setEditCourse(null); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={editCourse ? handleUpdate : handleCreate} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold hover:shadow-lg">{editCourse ? 'Update' : 'Create'}</button>
              </div>
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
  const [, bg, text] = c.split(' ');
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-rose-100/50 p-4 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${bg} ${text}`}>Live</span>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
