package com.acadex.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.entity.AttendanceRecord;
import com.acadex.entity.Course;
import com.acadex.entity.TeacherScore;
import com.acadex.entity.UserRole;
import com.acadex.repository.AttendanceRecordRepository;
import com.acadex.repository.CourseRepository;
import com.acadex.repository.CourseTopicRepository;
import com.acadex.repository.ExamRepository;
import com.acadex.repository.TeacherScoreRepository;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;
import com.acadex.service.CourseRiskService;
import com.acadex.service.CredibilityScoreService;
import com.acadex.service.StudentRiskService;

/**
 * Analytics Controller — Provides aggregated analytics endpoints.
 *
 * Endpoints:
 *   GET /api/analytics/dashboard          — Admin analytics dashboard
 *   GET /api/analytics/faculty-performance — Faculty credibility scores
 *   GET /api/analytics/student-risk        — Student risk predictions
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired private UserRepository userRepository;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private CourseTopicRepository courseTopicRepository;
    @Autowired private AttendanceRecordRepository attendanceRecordRepository;
    @Autowired private ExamRepository examRepository;
    @Autowired private TeacherScoreRepository teacherScoreRepository;
    @Autowired private CredibilityScoreService credibilityScoreService;
    @Autowired private StudentRiskService studentRiskService;
    @Autowired private CourseRiskService courseRiskService;

    // ══════════════════════════════════════════
    //  GET /api/analytics/dashboard
    // ══════════════════════════════════════════

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        Map<String, Object> dashboard = new LinkedHashMap<>();

        // --- Course Progress ---
        List<Course> courses = courseRepository.findAll();
        List<Map<String, Object>> courseProgress = new ArrayList<>();
        double totalCoverage = 0;
        for (Course c : courses) {
            long total = courseTopicRepository.countByCourseId(c.getId());
            long completed = courseTopicRepository.countByCourseIdAndCompleted(c.getId(), true);
            double coverage = total > 0 ? (completed * 100.0 / total) : 0;
            totalCoverage += coverage;

            Map<String, Object> cp = new LinkedHashMap<>();
            cp.put("courseId", c.getId());
            cp.put("courseCode", c.getCourseCode());
            cp.put("courseName", c.getCourseName());
            cp.put("totalTopics", total);
            cp.put("completedTopics", completed);
            cp.put("coveragePercentage", Math.round(coverage * 10.0) / 10.0);
            courseProgress.add(cp);
        }
        double avgCoverage = courses.isEmpty() ? 0 : totalCoverage / courses.size();
        dashboard.put("courseProgress", courseProgress);
        dashboard.put("averageSyllabusCoverage", Math.round(avgCoverage * 10.0) / 10.0);

        // --- Faculty Credibility Scores ---
        List<TeacherScore> scores = teacherScoreRepository.findAll();
        List<Map<String, Object>> facultyScores = new ArrayList<>();
        for (TeacherScore ts : scores) {
            Map<String, Object> fs = new LinkedHashMap<>();
            fs.put("facultyId", ts.getTeacherId());
            userRepository.findById(ts.getTeacherId()).ifPresent(u -> fs.put("facultyName", u.getName()));
            fs.put("credibilityScore", ts.getCredibilityScore());
            fs.put("riskLevel", ts.getRiskLevel());
            fs.put("low_trust_flag", ts.getCredibilityScore() < 60);
            fs.put("sessionsVerified", ts.getTotalSessionsVerified());
            facultyScores.add(fs);
        }
        dashboard.put("facultyCredibilityScores", facultyScores);

        // --- Attendance Statistics ---
        Map<String, Object> attendanceStats = new LinkedHashMap<>();
        List<AttendanceRecord> allRecords = attendanceRecordRepository.findAll();
        long totalRecords = allRecords.size();
        long presentRecords = allRecords.stream().filter(r -> "present".equals(r.getStatus())).count();
        long absentRecords = totalRecords - presentRecords;
        double overallAttendance = totalRecords > 0 ? (presentRecords * 100.0 / totalRecords) : 0;

        attendanceStats.put("totalRecords", totalRecords);
        attendanceStats.put("presentCount", presentRecords);
        attendanceStats.put("absentCount", absentRecords);
        attendanceStats.put("overallAttendancePercentage", Math.round(overallAttendance * 10.0) / 10.0);

        // Students below 75% threshold
        List<UserRole> studentRoles = userRoleRepository.findByRole("student");
        long shortageCount = 0;
        for (UserRole sr : studentRoles) {
            List<AttendanceRecord> studentRecords = attendanceRecordRepository.findByStudentId(sr.getUser().getId());
            if (!studentRecords.isEmpty()) {
                long present = studentRecords.stream().filter(r -> "present".equals(r.getStatus())).count();
                double pct = present * 100.0 / studentRecords.size();
                if (pct < 75) shortageCount++;
            }
        }
        attendanceStats.put("studentsWithShortage", shortageCount);
        attendanceStats.put("totalStudents", studentRoles.size());
        dashboard.put("attendanceStatistics", attendanceStats);

        // --- Student Risk Distribution ---
        Map<String, Long> riskDist = studentRiskService.getRiskDistribution();
        dashboard.put("studentRiskDistribution", riskDist);

        // --- Summary Counts ---
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalUsers", userRepository.count());
        summary.put("totalCourses", courses.size());
        summary.put("totalExams", examRepository.count());
        Map<String, Long> roleCount = new HashMap<>();
        for (UserRole r : userRoleRepository.findAll()) {
            roleCount.merge(r.getRole(), 1L, Long::sum);
        }
        summary.put("usersByRole", roleCount);
        dashboard.put("summary", summary);

        return ResponseEntity.ok(dashboard);
    }

    // ══════════════════════════════════════════
    //  GET /api/analytics/faculty-performance
    // ══════════════════════════════════════════

    @GetMapping("/faculty-performance")
    public ResponseEntity<?> getFacultyPerformance() {
        // Recalculate all scores
        List<UserRole> facultyRoles = userRoleRepository.findByRole("faculty");
        List<Map<String, Object>> results = new ArrayList<>();

        for (UserRole fr : facultyRoles) {
            String facultyId = fr.getUser().getId();
            TeacherScore score = credibilityScoreService.recalculateScore(facultyId);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("faculty_id", facultyId);
            entry.put("faculty_name", fr.getUser().getName());
            entry.put("credibility_score", score.getCredibilityScore());
            entry.put("low_trust_flag", score.getCredibilityScore() < 60);
            entry.put("risk_level", score.getRiskLevel());
            entry.put("avg_yes_votes", score.getAvgYesVotes());
            entry.put("avg_no_votes", score.getAvgNoVotes());
            entry.put("attendance_consistency", score.getAttendanceConsistency());
            entry.put("sessions_verified", score.getTotalSessionsVerified());
            results.add(entry);
        }

        results.sort((a, b) -> Double.compare(
            ((Number) b.get("credibility_score")).doubleValue(),
            ((Number) a.get("credibility_score")).doubleValue()));

        return ResponseEntity.ok(results);
    }

    // ══════════════════════════════════════════
    //  GET /api/analytics/student-risk
    // ══════════════════════════════════════════

    @GetMapping("/student-risk")
    public ResponseEntity<?> getStudentRisk(@RequestParam(required = false) String studentId) {
        if (studentId != null && !studentId.isEmpty()) {
            return ResponseEntity.ok(studentRiskService.assessStudentRisk(studentId));
        }
        return ResponseEntity.ok(studentRiskService.assessAllStudents());
    }
}
