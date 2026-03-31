package com.acadex.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.entity.AttendanceRecord;
import com.acadex.entity.Course;
import com.acadex.entity.TeacherScore;
import com.acadex.entity.User;
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
    @PreAuthorize("hasRole('ADMIN')")
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

    @GetMapping("/attendance-trends")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAttendanceTrends() {
        // Aggregate attendance by month
        List<AttendanceRecord> allRecords = attendanceRecordRepository.findAll();
        Map<String, List<AttendanceRecord>> byMonth = allRecords.stream()
                .collect(Collectors.groupingBy(r -> r.getDate().getYear() + "-" + String.format("%02d", r.getDate().getMonthValue())));

        List<Map<String, Object>> monthlyStats = new ArrayList<>();
        byMonth.entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(entry -> {
            List<AttendanceRecord> recs = entry.getValue();
            long total = recs.size();
            long present = recs.stream().filter(r -> "present".equals(r.getStatus())).count();
            double pct = total > 0 ? Math.round((present * 100.0 / total)) : 0;
            monthlyStats.add(Map.of("month", entry.getKey(), "percentage", pct, "total", total, "present", present));
        });

        return ResponseEntity.ok(monthlyStats);
    }

    @GetMapping("/course-completion")
    @PreAuthorize("hasRole('ADMIN') or hasRole('HOD')")
    public ResponseEntity<?> getCourseCompletionStats() {
        long draft = courseRepository.findByStatus("Draft").size();
        long published = courseRepository.findByStatus("Published").size();
        long locked = courseRepository.findByStatus("Locked").size();

        List<Map<String, Object>> completionStats = new ArrayList<>();
        completionStats.add(Map.of("name", "Draft", "value", draft));
        completionStats.add(Map.of("name", "Published", "value", published));
        completionStats.add(Map.of("name", "Locked", "value", locked));

        return ResponseEntity.ok(completionStats);
    }

    // ══════════════════════════════════════════
    //  GET /api/analytics/faculty-performance
    // ══════════════════════════════════════════

    @GetMapping("/faculty-performance")
    @PreAuthorize("hasRole('ADMIN') or hasRole('HOD')")
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
    @PreAuthorize("hasRole('ADMIN') or hasRole('HOD')")
    public ResponseEntity<?> getStudentRisk(@RequestParam(required = false) String studentId) {
        if (studentId != null && !studentId.isEmpty()) {
            return ResponseEntity.ok(studentRiskService.assessStudentRisk(studentId));
        }
        return ResponseEntity.ok(studentRiskService.assessAllStudents());
    }

    // ══════════════════════════════════════════
    //  GET /api/analytics/hod/department-summary
    //  HOD-specific read-only analytics
    // ══════════════════════════════════════════

    @GetMapping("/hod/department-summary")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> getDepartmentSummary(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User hod = userRepository.findByEmail(email).orElseThrow();
        String department = hod.getRoles() != null && !hod.getRoles().isEmpty()
                ? hod.getRoles().get(0).getDepartment() : null;

        if (department == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "HOD department not found"));
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("department", department);
        summary.put("hod", hod.getName());

        // Courses in department
        List<Course> courses = courseRepository.findByDepartment(department);
        summary.put("totalCourses", courses.size());
        summary.put("publishedCourses", courses.stream().filter(c -> "Published".equals(c.getStatus())).count());
        summary.put("draftCourses", courses.stream().filter(c -> "Draft".equals(c.getStatus())).count());

        // Students in department
        List<UserRole> deptStudents = userRoleRepository.findAll().stream()
                .filter(r -> "student".equals(r.getRole()) && department.equals(r.getDepartment()))
                .collect(Collectors.toList());
        summary.put("totalStudents", deptStudents.size());

        // Faculty in department
        List<UserRole> deptFaculty = userRoleRepository.findAll().stream()
                .filter(r -> "faculty".equals(r.getRole()) && department.equals(r.getDepartment()))
                .collect(Collectors.toList());
        summary.put("totalFaculty", deptFaculty.size());

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/hod/attendance-overview")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> getHodAttendanceOverview(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User hod = userRepository.findByEmail(email).orElseThrow();
        String department = hod.getRoles() != null && !hod.getRoles().isEmpty()
                ? hod.getRoles().get(0).getDepartment() : null;

        if (department == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "HOD department not found"));
        }

        // Get all students in department
        List<UserRole> deptStudents = userRoleRepository.findAll().stream()
                .filter(r -> "student".equals(r.getRole()) && department.equals(r.getDepartment()))
                .collect(Collectors.toList());

        List<Map<String, Object>> studentAttendance = new ArrayList<>();
        long totalRecords = 0, totalPresent = 0;

        for (UserRole sr : deptStudents) {
            List<AttendanceRecord> records = attendanceRecordRepository.findByStudentId(sr.getUser().getId());
            if (!records.isEmpty()) {
                long present = records.stream().filter(r -> "present".equals(r.getStatus())).count();
                double pct = Math.round((present * 100.0 / records.size()) * 10.0) / 10.0;
                totalRecords += records.size();
                totalPresent += present;

                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("studentId", sr.getUser().getId());
                entry.put("studentName", sr.getUser().getName());
                entry.put("totalClasses", records.size());
                entry.put("attendedClasses", present);
                entry.put("percentage", pct);
                entry.put("shortage", pct < 75);
                studentAttendance.add(entry);
            }
        }

        double overallPct = totalRecords > 0 ? Math.round((totalPresent * 100.0 / totalRecords) * 10.0) / 10.0 : 0;

        return ResponseEntity.ok(Map.of(
                "department", department,
                "overallPercentage", overallPct,
                "totalRecords", totalRecords,
                "presentRecords", totalPresent,
                "shortageCount", studentAttendance.stream().filter(s -> (Boolean) s.get("shortage")).count(),
                "students", studentAttendance
        ));
    }

    @GetMapping("/hod/faculty-credibility")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> getHodFacultyCredibility(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User hod = userRepository.findByEmail(email).orElseThrow();
        String department = hod.getRoles() != null && !hod.getRoles().isEmpty()
                ? hod.getRoles().get(0).getDepartment() : null;

        if (department == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "HOD department not found"));
        }

        // Get faculty in department and their scores
        List<UserRole> deptFaculty = userRoleRepository.findAll().stream()
                .filter(r -> "faculty".equals(r.getRole()) && department.equals(r.getDepartment()))
                .collect(Collectors.toList());

        List<Map<String, Object>> facultyScores = new ArrayList<>();
        for (UserRole fr : deptFaculty) {
            String facultyId = fr.getUser().getId();
            TeacherScore score = credibilityScoreService.recalculateScore(facultyId);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("facultyId", facultyId);
            entry.put("facultyName", fr.getUser().getName());
            entry.put("credibilityScore", score.getCredibilityScore());
            entry.put("riskLevel", score.getRiskLevel());
            entry.put("lowTrustFlag", score.getCredibilityScore() < 60);
            entry.put("sessionsVerified", score.getTotalSessionsVerified());
            facultyScores.add(entry);
        }

        facultyScores.sort((a, b) -> Double.compare(
                ((Number) b.get("credibilityScore")).doubleValue(),
                ((Number) a.get("credibilityScore")).doubleValue()));

        return ResponseEntity.ok(Map.of(
                "department", department,
                "facultyCount", facultyScores.size(),
                "faculty", facultyScores
        ));
    }
}
