import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { courseService } from '../../services';
import { useAuth } from '../../context/AuthContext';

export default function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detail, setDetail] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.list({ studentId: user?.id });
      setCourses(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const openCourse = async (course) => {
    try {
      setSelectedCourse(course);
      const [det, prog] = await Promise.all([courseService.get(course.id), courseService.getProgress(course.id)]);
      setDetail(det);
      setProgress(prog);
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <DashboardLayout role="student">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  // ── Detail View ──
  if (selectedCourse && detail) return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedCourse(null); setDetail(null); setProgress(null); }} className="p-2 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors">←</button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{detail.courseName}</h1>
            <p className="text-sm text-slate-500">{detail.courseCode} · {detail.department} · Sem {detail.semester} · {detail.credits} Credits</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${detail.type === 'Core' ? 'bg-indigo-50 text-indigo-600' : detail.type === 'Lab' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{detail.type}</span>
        </div>

        {/* Progress */}
        {progress && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/50 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Course Progress</h3>
              <div className="text-right">
                <span className={`text-3xl font-bold ${progress.syllabusCoverage >= 80 ? 'text-emerald-600' : progress.syllabusCoverage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{progress.syllabusCoverage}%</span>
                <p className="text-xs text-slate-400">{progress.completedTopics}/{progress.totalTopics} topics covered</p>
              </div>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${progress.syllabusCoverage >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : progress.syllabusCoverage >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-rose-500 to-pink-500'}`} style={{ width: `${progress.syllabusCoverage}%` }} />
            </div>

            {/* Unit-wise progress */}
            {progress.unitProgress && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {progress.unitProgress.map(u => (
                  <div key={u.unitId} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Unit {u.unitNumber}: {u.unitTitle}</span>
                      <span className="text-slate-500">{u.coverage}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${u.coverage >= 80 ? 'bg-indigo-400' : u.coverage >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${u.coverage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Syllabus Tree */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/50 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Syllabus</h3>
          {detail.units && detail.units.length > 0 ? (
            <div className="space-y-4">
              {detail.units.map(unit => (
                <div key={unit.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold">Unit {unit.unitNumber}</span>
                    <span className="font-medium text-slate-700">{unit.unitTitle}</span>
                    {unit.expectedHours && <span className="text-xs text-slate-400 ml-auto">{unit.expectedHours}h</span>}
                  </div>
                  {unit.topics && unit.topics.length > 0 ? (
                    <div className="space-y-1.5 ml-2">
                      {unit.topics.map(topic => (
                        <div key={topic.id} className={`flex items-center gap-3 py-2 px-3 rounded-lg ${topic.completed ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border border-slate-100'}`}>
                          <span className="text-lg">{topic.completed ? '✅' : '⬜'}</span>
                          <div className="flex-1">
                            <span className={`text-sm ${topic.completed ? 'text-emerald-700 font-medium' : 'text-slate-700'}`}>{topic.topicName}</span>
                            {topic.description && <p className="text-[10px] text-slate-400 mt-0.5">{topic.description}</p>}
                          </div>
                          {topic.completedDate && <span className="text-[10px] text-emerald-500">Covered {topic.completedDate}</span>}
                          {topic.plannedDate && !topic.completed && <span className="text-[10px] text-amber-500">📅 {topic.plannedDate}</span>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 ml-2">No topics listed</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400">Syllabus not yet published for this course</p>}
        </div>

        {/* Description */}
        {detail.description && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/50 p-6">
            <h3 className="font-semibold text-slate-800 mb-2">About</h3>
            <p className="text-sm text-slate-600">{detail.description}</p>
          </div>
        )}

        {/* Faculty */}
        {detail.faculty && detail.faculty.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/50 p-6">
            <h3 className="font-semibold text-slate-800 mb-3">Faculty</h3>
            <div className="flex flex-wrap gap-2">
              {detail.faculty.map(f => (
                <span key={f.id} className="text-xs px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">{f.facultyName || f.facultyId} · Sec {f.section}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  // ── List View ──
  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Courses</h1>
          <p className="text-slate-500 text-sm mt-1">View enrolled courses, track syllabus coverage & progress</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-indigo-100/50 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{courses.length}</div>
            <div className="text-xs text-slate-500">Enrolled</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-indigo-100/50 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{courses.filter(c => c.syllabusCoverage >= 80).length}</div>
            <div className="text-xs text-slate-500">On Track</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-indigo-100/50 p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{courses.reduce((s, c) => s + (c.credits || 0), 0)}</div>
            <div className="text-xs text-slate-500">Total Credits</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-indigo-100/50 p-4 text-center">
            <div className="text-2xl font-bold text-slate-600">{courses.length > 0 ? Math.round(courses.reduce((s, c) => s + (c.syllabusCoverage || 0), 0) / courses.length) : 0}%</div>
            <div className="text-xs text-slate-500">Avg Coverage</div>
          </div>
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => (
              <div key={c.id} onClick={() => openCourse(c)} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/50 p-5 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">{c.courseCode}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.type === 'Core' ? 'bg-indigo-50 text-indigo-600' : c.type === 'Lab' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{c.type}</span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{c.courseName}</h3>
                <p className="text-xs text-slate-500 mb-4">Sem {c.semester} · {c.credits} Credits</p>

                {/* Progress bar */}
                <div className="mb-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Syllabus Progress</span>
                    <span className={`font-bold ${c.syllabusCoverage >= 80 ? 'text-emerald-600' : c.syllabusCoverage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{c.syllabusCoverage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${c.syllabusCoverage >= 80 ? 'bg-indigo-500' : c.syllabusCoverage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${c.syllabusCoverage}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{c.completedTopics}/{c.totalTopics} topics covered</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100/50 p-12 text-center">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-slate-400">You are not enrolled in any courses yet</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
