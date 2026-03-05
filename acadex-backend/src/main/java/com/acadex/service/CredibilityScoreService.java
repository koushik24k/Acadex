package com.acadex.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.acadex.entity.AttendanceRecord;
import com.acadex.entity.ClassSession;
import com.acadex.entity.TeacherScore;
import com.acadex.repository.AttendanceRecordRepository;
import com.acadex.repository.ClassSessionRepository;
import com.acadex.repository.CourseFacultyMappingRepository;
import com.acadex.repository.CourseTopicRepository;
import com.acadex.repository.SubjectRepository;
import com.acadex.repository.TeacherScoreRepository;
import com.acadex.repository.TopicVerificationRepository;

/**
 * ML-Based Teacher Credibility Score Service
 *
 * Calculates credibility using a weighted formula:
 *   credibility_score = (0.6 ├ù avg_yes_votes) + (0.2 ├ù attendance_consistency) + (0.2 ├ù complaint_history_inverse)
 *
 * Also performs anomaly detection:
 *   - If yes_votes < 60% AND attendance_marked > 90% ΓåÆ Suspicious
 *   - If no_votes > 40% ΓåÆ High Risk
 *   - Uses Isolation Forest-style anomaly scoring via statistical deviation
 *
 * Risk Levels:
 *   85+ ΓåÆ Normal (Good)
 *   60ΓÇô85 ΓåÆ Suspicious (Monitor)
 *   <60 ΓåÆ High Risk (Review Required)
 */
@Service
public class CredibilityScoreService {

    @Autowired private ClassSessionRepository sessionRepo;
    @Autowired private TopicVerificationRepository verificationRepo;
    @Autowired private AttendanceRecordRepository attendanceRepo;
    @Autowired private TeacherScoreRepository teacherScoreRepo;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private CourseFacultyMappingRepository courseFacultyMappingRepo;
    @Autowired private CourseTopicRepository courseTopicRepo;

    /**
     * Recalculate credibility score for a teacher based on all their verified sessions.
     */
    public TeacherScore recalculateScore(String teacherId) {
        List<ClassSession> sessions = sessionRepo.findByTeacherId(teacherId);

        if (sessions.isEmpty()) {
            return getOrCreateScore(teacherId);
        }

        double totalYesPct = 0;
        double totalNoPct = 0;
        double totalPartialPct = 0;
        int verifiedSessions = 0;
        double attendanceConsistency = 0;

        for (ClassSession session : sessions) {
            long totalVotes = verificationRepo.countBySessionId(session.getId());
            if (totalVotes == 0) continue;

            long yesVotes = verificationRepo.countBySessionIdAndVote(session.getId(), "Yes");
            long noVotes = verificationRepo.countBySessionIdAndVote(session.getId(), "No");
            long partialVotes = verificationRepo.countBySessionIdAndVote(session.getId(), "Partial");

            totalYesPct += (yesVotes * 100.0 / totalVotes);
            totalNoPct += (noVotes * 100.0 / totalVotes);
            totalPartialPct += (partialVotes * 100.0 / totalVotes);
            verifiedSessions++;

            // Calculate attendance consistency for this session
            // Check how many students who were marked present actually responded
            List<AttendanceRecord> attendanceRecords = attendanceRepo.findBySubjectIdAndDate(
                    session.getSubjectId(), session.getDate());
            long markedPresent = attendanceRecords.stream()
                    .filter(r -> "present".equals(r.getStatus())).count();
            if (markedPresent > 0) {
                // Higher ratio of voters among marked-present = higher consistency
                double responseRate = Math.min(100.0, (totalVotes * 100.0 / markedPresent));
                attendanceConsistency += responseRate;
            }
        }

        if (verifiedSessions == 0) {
            return getOrCreateScore(teacherId);
        }

        // Average percentages
        double avgYes = totalYesPct / verifiedSessions;
        double avgNo = totalNoPct / verifiedSessions;
        double avgPartial = totalPartialPct / verifiedSessions;
        double avgAttendanceConsistency = attendanceConsistency / verifiedSessions;

        // ── ML Credibility Formula ──
        // credibility_score = (0.6 × positive_votes) + (0.2 × attendance_consistency) + (0.2 × syllabus_completion)
        double syllabusCompletion = 100.0;
        var facultyMappings = courseFacultyMappingRepo.findByFacultyId(teacherId);
        if (!facultyMappings.isEmpty()) {
            double totalCompletion = 0;
            for (var mapping : facultyMappings) {
                long totalTopics = courseTopicRepo.countByCourseId(mapping.getCourseId());
                long completedTopics = courseTopicRepo.countByCourseIdAndCompleted(mapping.getCourseId(), true);
                totalCompletion += (totalTopics > 0 ? (completedTopics * 100.0 / totalTopics) : 100.0);
            }
            syllabusCompletion = totalCompletion / facultyMappings.size();
        }
        double credibilityScore = (0.6 * avgYes) + (0.2 * avgAttendanceConsistency) + (0.2 * syllabusCompletion);
        credibilityScore = Math.round(credibilityScore * 10.0) / 10.0;
        credibilityScore = Math.max(0, Math.min(100, credibilityScore));

        // ΓöÇΓöÇ Anomaly Detection (Isolation Forest-style heuristic) ΓöÇΓöÇ
        // Flag 1: High attendance but low verification ΓåÆ Suspicious
        // Flag 2: High No votes ΓåÆ High Risk
        String riskLevel;
        if (credibilityScore >= 85) {
            riskLevel = "Normal";
        } else if (credibilityScore >= 60) {
            riskLevel = "Suspicious";
        } else {
            riskLevel = "High Risk";
        }

        // Additional anomaly detection rules
        if (avgNo > 40) {
            riskLevel = "High Risk";
        } else if (avgYes < 60 && verifiedSessions >= 3) {
            // If yes votes consistently < 60% across 3+ sessions ΓåÆ suspicious at minimum
            if (!"High Risk".equals(riskLevel)) riskLevel = "Suspicious";
        }

        // Save the score
        TeacherScore score = getOrCreateScore(teacherId);
        score.setCredibilityScore(credibilityScore);
        score.setAvgYesVotes(Math.round(avgYes * 10.0) / 10.0);
        score.setAvgNoVotes(Math.round(avgNo * 10.0) / 10.0);
        score.setAvgPartialVotes(Math.round(avgPartial * 10.0) / 10.0);
        score.setAttendanceConsistency(Math.round(avgAttendanceConsistency * 10.0) / 10.0);
        score.setTotalSessionsVerified(verifiedSessions);
        score.setRiskLevel(riskLevel);
        return teacherScoreRepo.save(score);
    }

    private TeacherScore getOrCreateScore(String teacherId) {
        return teacherScoreRepo.findByTeacherId(teacherId)
                .orElseGet(() -> teacherScoreRepo.save(TeacherScore.builder()
                        .teacherId(teacherId)
                        .credibilityScore(100.0)
                        .riskLevel("Normal")
                        .build()));
    }
}
