package com.acadex.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

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
import com.acadex.service.CsvStudentRiskFeatureService.CsvFeatures;

/**
 * Student risk service.
 *
 * Uses external ML prediction first, then falls back to the internal rule-based model
 * when the ML service is unavailable.
 */
@Service
public class StudentRiskService {

    @Autowired private UserRepository userRepository;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private AttendanceRecordRepository attendanceRecordRepository;
    @Autowired private AssignmentSubmissionRepository assignmentSubmissionRepository;
    @Autowired private ExamResultRepository examResultRepository;
    @Autowired private CsvStudentRiskFeatureService csvStudentRiskFeatureService;
    @Autowired(required = false) private RestTemplate restTemplate;

    @Value("${app.ml.risk-api.enabled:true}")
    private boolean mlApiEnabled;

    @Value("${app.ml.risk-api.url:http://localhost:5001/predict}")
    private String mlApiUrl;

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

        StudentFeatures features = buildFeatures(studentId, user);

        result.put("attendancePercentage", features.attendancePercentage);
        result.put("totalClasses", features.totalClasses);
        result.put("classesAttended", features.classesAttended);
        result.put("absences", features.absences);

        result.put("assignmentAverage", features.assignmentAverage);
        result.put("totalAssignments", features.totalAssignments);
        result.put("gradedAssignments", features.gradedAssignments);

        result.put("examScoreAverage", features.examAverage);
        result.put("totalExamsTaken", features.totalExamsTaken);
        result.put("failures", features.failures);
        result.put("studyTime", features.studyTime);

        Map<String, Object> fallback = computeRuleBasedRisk(features);
        Map<String, Object> mlPrediction = predictRiskWithMl(features);
        Map<String, Object> selectedPrediction = mlPrediction;

        boolean mlUsed = selectedPrediction != null;
        String riskLevel;
        if (selectedPrediction != null) {
            riskLevel = String.valueOf(selectedPrediction.getOrDefault("risk", fallback.get("riskLevel")));
        } else {
            riskLevel = String.valueOf(fallback.get("riskLevel"));
        }
        Double mlConfidence = extractConfidence(selectedPrediction);
        double riskScore = mlUsed ? deriveRiskScore(riskLevel, mlConfidence)
                                  : ((Number) fallback.get("riskScore")).doubleValue();

        result.put("riskScore", riskScore);
        result.put("riskLevel", riskLevel);
        result.put("mlPredictedRisk", riskLevel);
        result.put("mlConfidence", mlConfidence);
        result.put("predictionSource", mlUsed ? "ML" : "RULE_BASED_FALLBACK");

        // Flags
        List<String> flags = new ArrayList<>();
        if (features.attendancePercentage < 75) flags.add("Attendance below 75%");
        if (features.examAverage > 0 && features.examAverage < 40) flags.add("Exam average below 40%");
        if (features.assignmentAverage > 0 && features.assignmentAverage < 50) flags.add("Assignment average below 50%");
        if (features.totalAssignments == 0) flags.add("No assignments submitted");
        if (features.totalExamsTaken == 0) flags.add("No exams taken");
        result.put("flags", flags);

        return result;
    }

    private StudentFeatures buildFeatures(String studentId, User user) {
        List<AttendanceRecord> records = attendanceRecordRepository.findByStudentId(studentId);
        long totalAttendance = records.size();
        long presentCount = records.stream().filter(r -> "present".equalsIgnoreCase(r.getStatus())).count();
        long absences = Math.max(0, totalAttendance - presentCount);
        double attendancePercentage = totalAttendance > 0 ? (presentCount * 100.0 / totalAttendance) : 100.0;
        attendancePercentage = round1(attendancePercentage);

        List<AssignmentSubmission> submissions = assignmentSubmissionRepository.findByStudentId(studentId);
        List<AssignmentSubmission> graded = submissions.stream()
                .filter(s -> s.getMarksAwarded() != null)
                .collect(Collectors.toList());
        double assignmentAverage = graded.stream()
                .mapToInt(AssignmentSubmission::getMarksAwarded)
                .average()
                .orElse(0.0);
        assignmentAverage = round1(assignmentAverage);

        List<ExamResult> examResults = examResultRepository.findByStudentId(studentId);
        double examAverage = examResults.stream()
                .mapToInt(ExamResult::getPercentage)
                .average()
                .orElse(0.0);
        examAverage = round1(examAverage);

        long failures = examResults.stream()
                .filter(e -> e.getPercentage() != null && e.getPercentage() < 40)
                .count();

        boolean hasLiveAcademicData = totalAttendance > 0 || !graded.isEmpty() || !examResults.isEmpty();
        if (!hasLiveAcademicData) {
            CsvFeatures csv = csvStudentRiskFeatureService.resolveForUser(user, studentId).orElse(null);
            if (csv != null) {
                attendancePercentage = round1(csv.attendance());
                examAverage = round1(csv.exam());
                assignmentAverage = round1(csv.assignment());
                failures = csv.failures();
                absences = Math.max(0, Math.round((100.0 - attendancePercentage) / 100.0 * 75.0));
                totalAttendance = Math.max(1, absences + 40);
                presentCount = Math.max(0, totalAttendance - absences);
                return new StudentFeatures(
                        attendancePercentage,
                        totalAttendance,
                        presentCount,
                        absences,
                        assignmentAverage,
                        submissions.size(),
                        graded.size(),
                        examAverage,
                        examResults.size(),
                        failures,
                        round1(csv.studyTime())
                );
            }
        }

        return new StudentFeatures(
                attendancePercentage,
                totalAttendance,
                presentCount,
                absences,
                assignmentAverage,
                submissions.size(),
                graded.size(),
                examAverage,
                examResults.size(),
                failures,
                2.0 // study time is unavailable in DB today; send neutral default
        );
    }

    private Map<String, Object> predictRiskWithMl(StudentFeatures features) {
        if (!mlApiEnabled || restTemplate == null) {
            return null;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("attendance", features.attendancePercentage);
        payload.put("exam", features.examAverage);
        payload.put("assignment", features.assignmentAverage);
        payload.put("failures", features.failures);
        payload.put("study_time", features.studyTime);

        try {
            ResponseEntity<Object> response = restTemplate.postForEntity(mlApiUrl, payload, Object.class);
            if (!(response.getBody() instanceof Map<?, ?> rawBody)) {
                return null;
            }

            Map<String, Object> body = new HashMap<>();
            rawBody.forEach((k, v) -> {
                if (k != null) {
                    body.put(String.valueOf(k), v);
                }
            });

            Object risk = body.get("risk");
            if (risk == null) {
                return null;
            }

            Map<String, Object> normalized = new HashMap<>();
            normalized.put("risk", String.valueOf(risk).toUpperCase());
            normalized.put("confidence", body.get("confidence"));
            return normalized;
        } catch (RestClientException ignored) {
            return null;
        }
    }

    private Map<String, Object> computeRuleBasedRisk(StudentFeatures features) {
        double attendanceDeficit = Math.max(0, 100.0 - features.attendancePercentage);
        double examDeficit = Math.max(0, 100.0 - features.examAverage);
        double assignmentDeficit = Math.max(0, 100.0 - features.assignmentAverage);

        double riskScore = (0.35 * attendanceDeficit) + (0.35 * examDeficit) + (0.30 * assignmentDeficit);
        riskScore = Math.max(0, Math.min(100, round1(riskScore)));

        String riskLevel;
        if (riskScore < 25) {
            riskLevel = "LOW";
        } else if (riskScore <= 50) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "HIGH";
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("riskScore", riskScore);
        result.put("riskLevel", riskLevel);
        return result;
    }

    private double deriveRiskScore(String riskLevel, Double confidence) {
        double base;
        switch (riskLevel) {
            case "LOW":
                base = 20;
                break;
            case "HIGH":
                base = 80;
                break;
            case "MEDIUM":
            default:
                base = 50;
                break;
        }

        if (confidence != null) {
            base = Math.min(100, Math.max(0, base + ((confidence - 0.5) * 20)));
        }
        return round1(base);
    }

    private Double extractConfidence(Map<String, Object> mlPrediction) {
        if (mlPrediction == null) {
            return null;
        }

        Object confidence = mlPrediction.get("confidence");
        if (!(confidence instanceof Number)) {
            return null;
        }
        return Math.round(((Number) confidence).doubleValue() * 1000.0) / 1000.0;
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record StudentFeatures(
            double attendancePercentage,
            long totalClasses,
            long classesAttended,
            long absences,
            double assignmentAverage,
            long totalAssignments,
            long gradedAssignments,
            double examAverage,
            long totalExamsTaken,
            long failures,
            double studyTime
    ) {}

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
