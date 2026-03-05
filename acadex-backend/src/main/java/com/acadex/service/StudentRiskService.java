package com.acadex.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.acadex.entity.AssignmentSubmission;
import com.acadex.entity.AttendanceRecord;
import com.acadex.entity.ExamResult;
import com.acadex.entity.User;
import com.acadex.entity.UserRole;
import com.acadex.repository.AssignmentSubmissionRepository;
import com.acadex.repository.AttendanceRecordRepository;
import com.acadex.repository.ExamResultRepository;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;

/**
 * ML-based Student Risk Prediction Service
 *
 * Identifies students at academic risk using multiple signals:
 *   - attendance_percentage
 *   - assignment_average (graded assignments avg score)
 *   - exam_scores (average exam percentage)
 *
 * Risk Formula (rule-based, ML-ready):
 *   risk_score = (0.35 × attendance_deficit) + (0.35 × exam_deficit) + (0.30 × assignment_deficit)
 *
 * Risk Levels:
 *   risk_score < 25  → LOW
 *   risk_score 25-50  → MEDIUM
 *   risk_score > 50   → HIGH
 */
@Service
public class StudentRiskService {

    @Autowired private UserRepository userRepository;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private AttendanceRecordRepository attendanceRecordRepository;
    @Autowired private AssignmentSubmissionRepository assignmentSubmissionRepository;
    @Autowired private ExamResultRepository examResultRepository;

    /**
     * Assess risk for a single student.
     */
    public Map<String, Object> assessStudentRisk(String studentId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("studentId", studentId);

        User user = userRepository.findById(studentId).orElse(null);
        if (user != null) {
            result.put("studentName", user.getName());
            result.put("email", user.getEmail());
        }

        // 1. Attendance percentage
        List<AttendanceRecord> records = attendanceRecordRepository.findByStudentId(studentId);
        long totalAttendance = records.size();
        long presentCount = records.stream().filter(r -> "present".equals(r.getStatus())).count();
        double attendancePercentage = totalAttendance > 0 ? (presentCount * 100.0 / totalAttendance) : 100.0;
        attendancePercentage = Math.round(attendancePercentage * 10.0) / 10.0;

        result.put("attendancePercentage", attendancePercentage);
        result.put("totalClasses", totalAttendance);
        result.put("classesAttended", presentCount);

        // 2. Assignment average
        List<AssignmentSubmission> submissions = assignmentSubmissionRepository.findByStudentId(studentId);
        List<AssignmentSubmission> graded = submissions.stream()
                .filter(s -> s.getMarksAwarded() != null)
                .collect(Collectors.toList());
        double assignmentAverage = 0;
        if (!graded.isEmpty()) {
            // Assume max marks per assignment is 100 for normalization
            assignmentAverage = graded.stream()
                    .mapToInt(AssignmentSubmission::getMarksAwarded)
                    .average()
                    .orElse(0);
        }
        assignmentAverage = Math.round(assignmentAverage * 10.0) / 10.0;

        result.put("assignmentAverage", assignmentAverage);
        result.put("totalAssignments", submissions.size());
        result.put("gradedAssignments", graded.size());

        // 3. Exam scores average
        List<ExamResult> examResults = examResultRepository.findByStudentId(studentId);
        double examScoreAverage = 0;
        if (!examResults.isEmpty()) {
            examScoreAverage = examResults.stream()
                    .mapToInt(ExamResult::getPercentage)
                    .average()
                    .orElse(0);
        }
        examScoreAverage = Math.round(examScoreAverage * 10.0) / 10.0;

        result.put("examScoreAverage", examScoreAverage);
        result.put("totalExamsTaken", examResults.size());

        // Calculate risk score
        double attendanceDeficit = Math.max(0, 100.0 - attendancePercentage);
        double examDeficit = Math.max(0, 100.0 - examScoreAverage);
        double assignmentDeficit = Math.max(0, 100.0 - assignmentAverage);

        double riskScore = (0.35 * attendanceDeficit) + (0.35 * examDeficit) + (0.30 * assignmentDeficit);
        riskScore = Math.round(riskScore * 10.0) / 10.0;
        riskScore = Math.max(0, Math.min(100, riskScore));

        String riskLevel;
        if (riskScore < 25) riskLevel = "LOW";
        else if (riskScore <= 50) riskLevel = "MEDIUM";
        else riskLevel = "HIGH";

        result.put("riskScore", riskScore);
        result.put("riskLevel", riskLevel);

        // Flags
        List<String> flags = new ArrayList<>();
        if (attendancePercentage < 75) flags.add("Attendance below 75%");
        if (examScoreAverage > 0 && examScoreAverage < 40) flags.add("Exam average below 40%");
        if (assignmentAverage > 0 && assignmentAverage < 50) flags.add("Assignment average below 50%");
        if (submissions.isEmpty()) flags.add("No assignments submitted");
        if (examResults.isEmpty()) flags.add("No exams taken");
        result.put("flags", flags);

        return result;
    }

    /**
     * Assess all students and return risk analysis.
     */
    public List<Map<String, Object>> assessAllStudents() {
        List<UserRole> studentRoles = userRoleRepository.findByRole("student");
        return studentRoles.stream()
                .map(r -> assessStudentRisk(r.getUser().getId()))
                .sorted((a, b) -> Double.compare(
                    ((Number) b.getOrDefault("riskScore", 0)).doubleValue(),
                    ((Number) a.getOrDefault("riskScore", 0)).doubleValue()))
                .collect(Collectors.toList());
    }

    /**
     * Get risk distribution summary.
     */
    public Map<String, Long> getRiskDistribution() {
        List<Map<String, Object>> allRisks = assessAllStudents();
        Map<String, Long> distribution = new LinkedHashMap<>();
        distribution.put("LOW", allRisks.stream().filter(r -> "LOW".equals(r.get("riskLevel"))).count());
        distribution.put("MEDIUM", allRisks.stream().filter(r -> "MEDIUM".equals(r.get("riskLevel"))).count());
        distribution.put("HIGH", allRisks.stream().filter(r -> "HIGH".equals(r.get("riskLevel"))).count());
        distribution.put("total", (long) allRisks.size());
        return distribution;
    }
}
