import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { analyticsService } from '../../services';
import { AttendanceTrendChart, CourseCompletionChart } from '../../components/AnalyticsCharts';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [courseCompletion, setCourseCompletion] = useState([]);

  useEffect(() => {
    Promise.all([
      analyticsService.getDashboard().catch(() => null),
      analyticsService.getAttendanceTrends().catch(() => []),
      analyticsService.getCourseCompletion().catch(() => []),
    ]).then(([dashboardData, trendsData, completionData]) => {
      if (dashboardData) {
        setStats(dashboardData);
      }
      setAttendanceTrends(trendsData);
      setCourseCompletion(completionData);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return (
      <DashboardLayout role="admin">
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const summary = stats.summary;
  const attendanceStats = stats.attendanceStatistics;

  return (
    <DashboardLayout role="admin">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Students', value: summary.usersByRole.student, color: 'blue' },
          { label: 'Total Faculty', value: summary.usersByRole.faculty, color: 'green' },
          { label: 'Total Courses', value: summary.totalCourses, color: 'purple' },
          { label: 'Overall Attendance', value: `${attendanceStats.overallAttendancePercentage}%`, color: 'orange' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border p-6 transition hover:shadow-md hover:-translate-y-1">
            <p className="text-sm font-medium text-gray-500">{s.label}</p>
            <p className="text-4xl font-bold text-gray-800 mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Attendance Trends</h3>
          <AttendanceTrendChart data={attendanceTrends} />
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Course Status Distribution</h3>
          <CourseCompletionChart data={courseCompletion} />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Faculty Credibility</h3>
              {stats.facultyCredibilityScores.map(f => (
                  <div key={f.facultyId} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-gray-700">{f.facultyName}</span>
                      <span className={`font-medium px-2 py-1 text-xs rounded-full ${f.credibilityScore > 80 ? 'bg-emerald-100 text-emerald-800' : f.credibilityScore > 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{f.credibilityScore.toFixed(1)}</span>
                  </div>
              ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Student Risk Distribution</h3>
              {Object.entries(stats.studentRiskDistribution).map(([level, count]) => (
                  <div key={level} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="capitalize text-gray-700">{level.toLowerCase()} Risk</span>
                      <span className="font-medium text-gray-800">{count} students</span>
                  </div>
              ))}
          </div>
      </div>

    </DashboardLayout>
  );
}
