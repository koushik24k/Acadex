package com.acadex.controller;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.dto.TopicVerificationRequest;
import com.acadex.entity.ClassSession;
import com.acadex.entity.TeacherScore;
import com.acadex.entity.TopicVerification;
import com.acadex.entity.User;
import com.acadex.entity.UserRole;
import com.acadex.repository.AttendanceRecordRepository;
import com.acadex.repository.ClassSessionRepository;
import com.acadex.repository.SubjectRepository;
import com.acadex.repository.TeacherScoreRepository;
import com.acadex.repository.TopicRepository;
import com.acadex.repository.TopicVerificationRepository;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;
import com.acadex.service.CredibilityScoreService;

@RestController
@RequestMapping("/api/topic-verification")
public class TopicVerificationController {

    @Autowired private TopicVerificationRepository verificationRepo;
    @Autowired private ClassSessionRepository sessionRepo;
    @Autowired private TopicRepository topicRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private TeacherScoreRepository teacherScoreRepo;
    @Autowired private UserRepository userRepository;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private AttendanceRecordRepository attendanceRepo;
    @Autowired private CredibilityScoreService credibilityService;

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ STUDENT: GET PENDING VERIFICATIONS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingVerifications(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User student = userRepository.findByEmail(email).orElseThrow();

        // Find sessions from 3+ days ago that student attended but hasn't verified
        LocalDate threeDaysAgo = LocalDate.now().minusDays(3);
        List<ClassSession> recentSessions = sessionRepo.findByDateBetween(
                threeDaysAgo.minusDays(14), threeDaysAgo);

        List<Map<String, Object>> pending = new ArrayList<>();
        for (ClassSession session : recentSessions) {
            // Check if student attended this class
            var attendance = attendanceRepo.findByStudentIdAndSubjectIdAndDate(
                    student.getId(), session.getSubjectId(), session.getDate());
            if (attendance.isEmpty() || !"present".equals(attendance.get().getStatus())) continue;

            // Check if already verified
            if (verificationRepo.findBySessionIdAndStudentId(session.getId(), student.getId()).isPresent())
                continue;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("sessionId", session.getId());
            m.put("date", session.getDate().toString());
            m.put("subjectId", session.getSubjectId());
            subjectRepository.findById(session.getSubjectId()).ifPresent(s -> {
                m.put("subjectName", s.getSubjectName());
                m.put("subjectCode", s.getSubjectCode());
            });
            topicRepository.findById(session.getTopicId()).ifPresent(t -> {
                m.put("topicId", t.getId());
                m.put("topicName", t.getTopicName());
                m.put("unitNo", t.getUnitNo());
            });
            userRepository.findById(session.getTeacherId()).ifPresent(u ->
                    m.put("teacherName", u.getName()));
            m.put("notes", session.getNotes());
            pending.add(m);
        }

        return ResponseEntity.ok(pending);
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ STUDENT: SUBMIT VOTE ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @PostMapping("/vote")
    public ResponseEntity<?> submitVote(@RequestBody TopicVerificationRequest request,
                                         Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User student = userRepository.findByEmail(email).orElseThrow();

        // Validate vote
        String vote = request.getVote();
        if (!List.of("Yes", "No", "Partial").contains(vote)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vote must be Yes, No, or Partial"));
        }

        // Check if already voted
        if (verificationRepo.findBySessionIdAndStudentId(request.getSessionId(), student.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Already voted for this session"));
        }

        // Check session exists
        ClassSession session = sessionRepo.findById(request.getSessionId()).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();

        TopicVerification v = TopicVerification.builder()
                .sessionId(request.getSessionId())
                .studentId(student.getId())
                .vote(vote)
                .build();
        verificationRepo.save(v);

        // Recalculate teacher credibility after each vote
        credibilityService.recalculateScore(session.getTeacherId());

        return ResponseEntity.ok(Map.of("message", "Vote recorded", "vote", vote));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ STUDENT: TOPIC HISTORY ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/history")
    public ResponseEntity<?> getTopicHistory(Authentication auth,
                                              @RequestParam(required = false) Long subjectId) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User student = userRepository.findByEmail(email).orElseThrow();

        List<ClassSession> sessions;
        if (subjectId != null) {
            sessions = sessionRepo.findBySubjectIdOrderByDateDesc(subjectId);
        } else {
            sessions = sessionRepo.findAll();
        }

        List<Map<String, Object>> history = new ArrayList<>();
        for (ClassSession s : sessions) {
            // Only show sessions where student was present
            var att = attendanceRepo.findByStudentIdAndSubjectIdAndDate(
                    student.getId(), s.getSubjectId(), s.getDate());
            if (att.isEmpty()) continue;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("sessionId", s.getId());
            m.put("date", s.getDate().toString());
            subjectRepository.findById(s.getSubjectId()).ifPresent(sub -> {
                m.put("subjectName", sub.getSubjectName());
                m.put("subjectCode", sub.getSubjectCode());
            });
            topicRepository.findById(s.getTopicId()).ifPresent(t -> {
                m.put("topicName", t.getTopicName());
                m.put("unitNo", t.getUnitNo());
            });
            // Check if student voted
            var myVote = verificationRepo.findBySessionIdAndStudentId(s.getId(), student.getId());
            m.put("voted", myVote.isPresent());
            myVote.ifPresent(tv -> m.put("myVote", tv.getVote()));
            m.put("attended", att.isPresent() && "present".equals(att.get().getStatus()));
            history.add(m);
        }
        return ResponseEntity.ok(history);
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ ADMIN: GET ALL SESSION VERIFICATION STATS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/stats")
    public ResponseEntity<?> getVerificationStats(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String teacherId) {

        List<ClassSession> sessions;
        if (subjectId != null) {
            sessions = sessionRepo.findBySubjectIdOrderByDateDesc(subjectId);
        } else if (teacherId != null) {
            sessions = sessionRepo.findByTeacherIdOrderByDateDesc(teacherId);
        } else {
            sessions = sessionRepo.findAll();
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (ClassSession s : sessions) {
            long total = verificationRepo.countBySessionId(s.getId());
            long yesCount = verificationRepo.countBySessionIdAndVote(s.getId(), "Yes");
            long noCount = verificationRepo.countBySessionIdAndVote(s.getId(), "No");
            long partialCount = verificationRepo.countBySessionIdAndVote(s.getId(), "Partial");

            double yesPct = total > 0 ? Math.round((yesCount * 100.0 / total) * 10.0) / 10.0 : 0;
            double noPct = total > 0 ? Math.round((noCount * 100.0 / total) * 10.0) / 10.0 : 0;
            double partialPct = total > 0 ? Math.round((partialCount * 100.0 / total) * 10.0) / 10.0 : 0;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("sessionId", s.getId());
            m.put("date", s.getDate().toString());
            m.put("subjectId", s.getSubjectId());
            subjectRepository.findById(s.getSubjectId()).ifPresent(sub -> {
                m.put("subjectName", sub.getSubjectName());
                m.put("subjectCode", sub.getSubjectCode());
            });
            topicRepository.findById(s.getTopicId()).ifPresent(t -> {
                m.put("topicName", t.getTopicName());
                m.put("unitNo", t.getUnitNo());
            });
            userRepository.findById(s.getTeacherId()).ifPresent(u ->
                    m.put("teacherName", u.getName()));
            m.put("totalVotes", total);
            m.put("yesVotes", yesCount);
            m.put("noVotes", noCount);
            m.put("partialVotes", partialCount);
            m.put("yesPercentage", yesPct);
            m.put("noPercentage", noPct);
            m.put("partialPercentage", partialPct);

            // Flag suspicious: >40% No or Yes < 60% with high attendance
            String flag = "Normal";
            if (total > 0) {
                if (noPct > 40) flag = "High Risk";
                else if (yesPct < 60) flag = "Suspicious";
            }
            m.put("flag", flag);
            m.put("notes", s.getNotes());
            results.add(m);
        }
        return ResponseEntity.ok(results);
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ ADMIN: TEACHER CREDIBILITY SCORES ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/teacher-scores")
    public ResponseEntity<?> getTeacherScores() {
        List<TeacherScore> scores = teacherScoreRepo.findAllByOrderByCredibilityScoreDesc();
        List<Map<String, Object>> result = new ArrayList<>();
        for (TeacherScore ts : scores) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("teacherId", ts.getTeacherId());
            userRepository.findById(ts.getTeacherId()).ifPresent(u -> m.put("teacherName", u.getName()));
            m.put("credibilityScore", ts.getCredibilityScore());
            m.put("avgYesVotes", ts.getAvgYesVotes());
            m.put("avgNoVotes", ts.getAvgNoVotes());
            m.put("avgPartialVotes", ts.getAvgPartialVotes());
            m.put("attendanceConsistency", ts.getAttendanceConsistency());
            m.put("totalSessionsVerified", ts.getTotalSessionsVerified());
            m.put("riskLevel", ts.getRiskLevel());
            m.put("lastUpdated", ts.getLastUpdated().toString());
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ ADMIN: RECALCULATE ALL SCORES ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @PostMapping("/recalculate")
    public ResponseEntity<?> recalculateAll() {
        // Find all teachers
        List<UserRole> facultyRoles = userRoleRepository.findAll().stream()
                .filter(r -> "faculty".equals(r.getRole()))
                .collect(Collectors.toList());

        int count = 0;
        for (UserRole role : facultyRoles) {
            credibilityService.recalculateScore(role.getUser().getId());
            count++;
        }
        return ResponseEntity.ok(Map.of("message", "Recalculated scores", "teacherCount", count));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ GET CLASS SESSIONS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/sessions")
    public ResponseEntity<?> getSessions(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String teacherId) {

        List<ClassSession> sessions;
        if (subjectId != null) {
            sessions = sessionRepo.findBySubjectIdOrderByDateDesc(subjectId);
        } else if (teacherId != null) {
            sessions = sessionRepo.findByTeacherIdOrderByDateDesc(teacherId);
        } else {
            sessions = sessionRepo.findAll();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (ClassSession s : sessions) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("subjectId", s.getSubjectId());
            m.put("teacherId", s.getTeacherId());
            m.put("date", s.getDate().toString());
            m.put("topicId", s.getTopicId());
            m.put("attendanceMarked", s.getAttendanceMarked());
            m.put("notes", s.getNotes());
            subjectRepository.findById(s.getSubjectId()).ifPresent(sub -> {
                m.put("subjectName", sub.getSubjectName());
                m.put("subjectCode", sub.getSubjectCode());
            });
            topicRepository.findById(s.getTopicId()).ifPresent(t -> {
                m.put("topicName", t.getTopicName());
                m.put("unitNo", t.getUnitNo());
            });
            userRepository.findById(s.getTeacherId()).ifPresent(u ->
                    m.put("teacherName", u.getName()));
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }
}
