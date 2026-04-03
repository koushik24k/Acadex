import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { authService, courseService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Link2,
  Music2,
  PlayCircle,
  Sparkles,
  Video,
} from 'lucide-react';

const resourceMeta = {
  PDF: { label: 'PDF', badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10', icon: FileText, iconBg: 'bg-rose-100 text-rose-700' },
  Video: { label: 'Video', badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/10', icon: Video, iconBg: 'bg-sky-100 text-sky-700' },
  Link: { label: 'Link', badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/10', icon: Link2, iconBg: 'bg-violet-100 text-violet-700' },
  Document: { label: 'Document', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10', icon: FileText, iconBg: 'bg-emerald-100 text-emerald-700' },
  Image: { label: 'Image', badge: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/10', icon: ImageIcon, iconBg: 'bg-amber-100 text-amber-700' },
  Audio: { label: 'Audio', badge: 'bg-pink-50 text-pink-700 ring-1 ring-pink-600/10', icon: Music2, iconBg: 'bg-pink-100 text-pink-700' },
};

const getResourceMeta = (resourceType) => resourceMeta[resourceType] || {
  label: resourceType || 'File',
  badge: 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/10',
  icon: PlayCircle,
  iconBg: 'bg-slate-100 text-slate-700',
};

export default function StudentCourseResources() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const resolveStudentId = async () => {
      try {
        const session = await authService.getSession();
        const sessionUserId = session?.user?.id;
        if (sessionUserId) return sessionUserId;
      } catch {
        // Fall through to cached auth state.
      }

      return user?.id || authService.getUser()?.id || null;
    };

    const init = async () => {
      const studentId = await resolveStudentId();
      if (!active || !studentId) {
        setLoading(false);
        return;
      }
      await loadStudentCourses(studentId);
    };

    init();
    return () => { active = false; };
  }, [user?.id]);

  const loadStudentCourses = async (studentId) => {
    try {
      setLoading(true);
      const data = await courseService.list({ studentId });
      setCourses(Array.isArray(data) ? data : []);
      if (data?.length > 0 && !selectedCourse) {
        selectCourse(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectCourse = async (course) => {
    setSelectedCourse(course);
    await loadResources(course.id);
  };

  const loadResources = async (courseId) => {
    try {
      setResourcesLoading(true);
      const response = await fetch(`/api/courses/${courseId}/resources`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      } else {
        setResources([]);
      }
    } catch (e) {
      console.error(e);
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleOpenResource = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      // Local resource - try to download or open
      window.open(url, '_blank');
    }
  };

  if (loading) return (
    <DashboardLayout role="student">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-strong rounded-3xl px-8 py-10 shadow-xl border border-white/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">Loading course resources</p>
            <p className="text-sm text-slate-500">Preparing your enrolled courses and uploaded materials.</p>
          </div>
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <section className="relative overflow-hidden glass-strong rounded-[2rem] border border-white/60 shadow-xl shadow-slate-900/5">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-transparent to-teal-500/10" />
          <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-indigo-300/20 blur-3xl" />
          <div className="relative p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 text-slate-600 text-xs font-semibold ring-1 ring-slate-200/80 mb-4">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Learning materials
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Course Resources
              </h1>
              <p className="mt-3 text-slate-600 max-w-xl leading-relaxed">
                Find lecture notes, videos, documents, and reference links for your enrolled courses in one clean workspace.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 lg:text-right">
              <div className="rounded-2xl bg-white/80 backdrop-blur px-4 py-3 ring-1 ring-slate-200/80 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Enrolled courses</p>
                <p className="text-2xl font-bold text-slate-900">{courses.length}</p>
              </div>
              <button
                onClick={() => navigate('/student/courses')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white font-semibold shadow-lg shadow-slate-900/10 hover:bg-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Courses
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Course Selector */}
          <aside className="glass-strong rounded-[1.75rem] border border-white/60 shadow-xl shadow-slate-900/5 p-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">My Courses</h2>
                <p className="text-sm text-slate-500">Choose a course to view its materials.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {courses.length}
              </span>
            </div>

            <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
              {courses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                  No courses enrolled yet.
                </div>
              ) : (
                courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => selectCourse(course)}
                    className={`group w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                      selectedCourse?.id === course.id
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-lg shadow-indigo-500/20'
                        : 'bg-white/80 text-slate-700 border-slate-200 hover:border-indigo-200 hover:shadow-md hover:shadow-slate-900/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{course.courseCode}</div>
                        <div className={`text-xs mt-1 line-clamp-2 ${selectedCourse?.id === course.id ? 'text-white/80' : 'text-slate-500'}`}>
                          {course.courseName}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 transition-transform ${selectedCourse?.id === course.id ? 'text-white' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:text-indigo-500'}`} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Resources Panel */}
          <section className="lg:col-span-3 glass-strong rounded-[1.75rem] border border-white/60 shadow-xl shadow-slate-900/5 p-6 sm:p-7">
            {selectedCourse ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-slate-200/80">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold mb-2">Selected course</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{selectedCourse.courseCode}</h2>
                    <p className="text-slate-600 mt-1 max-w-2xl">{selectedCourse.courseName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/80 min-w-[120px]">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Resources</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{resources.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/80 min-w-[120px]">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Status</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">Live</p>
                    </div>
                  </div>
                </div>

                {resourcesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/80">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      <span className="text-sm font-medium text-slate-600">Loading resources...</span>
                    </div>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="relative overflow-hidden rounded-[1.5rem] border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-slate-900">No resources available yet</p>
                    <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                      Your instructor has not uploaded any learning materials for this course yet. Check back later.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-slate-600">
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-600/10">
                        <Sparkles className="w-4 h-4" />
                        {resources.length} resource{resources.length !== 1 ? 's' : ''} available
                      </span>
                      <span className="text-sm text-slate-500">
                        Latest materials stay visible here.
                      </span>
                    </div>

                    <div className="grid gap-4">
                      {resources.map((resource) => {
                        const meta = getResourceMeta(resource.resourceType);
                        const ResourceIcon = meta.icon;

                        return (
                          <article key={resource.id} className="group rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${meta.iconBg} ring-1 ring-black/5`}>
                                <ResourceIcon className="h-6 w-6" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <h3 className="text-lg font-semibold text-slate-900 truncate">{resource.title}</h3>
                                    {resource.description ? (
                                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                        {resource.description}
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-sm text-slate-400 italic">No description provided.</p>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleOpenResource(resource.resourceUrl)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
                                  >
                                    Open
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}>
                                    {meta.label}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    Uploaded on {new Date(resource.uploadedAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[28rem] items-center justify-center text-center">
                <div className="max-w-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">Select a course</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Choose a course from the left panel to view its uploaded materials and reference links.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
