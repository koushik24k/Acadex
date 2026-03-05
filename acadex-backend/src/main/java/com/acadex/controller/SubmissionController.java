package com.acadex.controller;

import com.acadex.dto.*;
import com.acadex.entity.*;
import com.acadex.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    @Autowired private ExamSubmissionRepository submissionRepository;
    @Autowired private AnswerRepository answerRepository;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private ExamRepository examRepository;
    @Autowired private ExamResultRepository resultRepository;
    @Autowired private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> listSubmissions(
            @RequestParam(required = false) Long examId,
            @RequestParam(required = false) String status) {
        List<ExamSubmission> subs;
        if (examId != null && status != null) {
            subs = submissionRepository.findByExamIdAndStatus(examId, status);
        } else if (examId != null) {
            subs = submissionRepository.findByExamId(examId);
        } else if (status != null) {
            subs = submissionRepository.findByStatus(status);
        } else {
            subs = submissionRepository.findAll();
        }
        return ResponseEntity.ok(subs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSubmission(@PathVariable Long id) {
        ExamSubmission sub = submissionRepository.findById(id).orElse(null);
        if (sub == null) return ResponseEntity.notFound().build();

        Map<String, Object> result = new HashMap<>();
        result.put("submission", sub);
        result.put("answers", answerRepository.findBySubmissionId(id));
        return ResponseEntity.ok(result);
    }

    // POST /submissions — frontend sends examId in body
    @PostMapping
    public ResponseEntity<?> submitExamFromBody(@RequestBody SubmissionRequest request,
                                                 Authentication auth) {
        if (request.getExamId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("examId is required"));
        }
        return submitExam(request.getExamId(), request, auth);
    }

    @PostMapping("/{examId}")
    public ResponseEntity<?> submitExam(@PathVariable Long examId,
                                         @RequestBody SubmissionRequest request,
                                         Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();

        // Check for existing submission
        Optional<ExamSubmission> existing = submissionRepository.findByExamIdAndStudentId(examId, user.getId());
        if (existing.isPresent() && "submitted".equals(existing.get().getStatus())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Already submitted"));
        }

        String now = LocalDateTime.now().toString();
        ExamSubmission submission = existing.orElse(ExamSubmission.builder()
                .examId(examId)
                .studentId(user.getId())
                .startedAt(now)
                .build());

        submission.setSubmittedAt(now);
        submission.setStatus("submitted");
        submission = submissionRepository.save(submission);

        int totalScore = 0;
        if (request.getAnswers() != null) {
            for (AnswerRequest ar : request.getAnswers()) {
                Answer answer = Answer.builder()
                        .submissionId(submission.getId())
                        .questionId(ar.getQuestionId())
                        .answerText(ar.getAnswer())
                        .isCorrect(ar.getIsCorrect())
                        .marksAwarded(ar.getMarksAwarded() != null ? ar.getMarksAwarded() : 0)
                        .build();
                answerRepository.save(answer);
                if (ar.getMarksAwarded() != null) totalScore += ar.getMarksAwarded();
            }
        }

        submission.setTotalScore(totalScore);
        submissionRepository.save(submission);

        // Create result
        Exam exam = examRepository.findById(examId).orElse(null);
        if (exam != null) {
            int pct = exam.getTotalMarks() > 0 ? (totalScore * 100) / exam.getTotalMarks() : 0;
            String grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B"
                    : pct >= 50 ? "C+" : pct >= 40 ? "C" : pct >= 30 ? "D" : "F";

            ExamResult result = ExamResult.builder()
                    .examId(examId)
                    .studentId(user.getId())
                    .submissionId(submission.getId())
                    .totalMarks(exam.getTotalMarks())
                    .obtainedMarks(totalScore)
                    .percentage(pct)
                    .grade(grade)
                    .build();
            resultRepository.save(result);
        }

        return ResponseEntity.ok(ApiResponse.success("Exam submitted successfully"));
    }

    // POST /submissions/{id}/grade — bulk grade answers (used by frontend)
    @PostMapping("/{submissionId}/grade")
    public ResponseEntity<?> gradeSubmission(@PathVariable Long submissionId,
                                              @RequestBody Map<String, Object> body,
                                              Authentication auth) {
        ExamSubmission sub = submissionRepository.findById(submissionId).orElse(null);
        if (sub == null) return ResponseEntity.notFound().build();

        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> grades = (List<Map<String, Object>>) body.get("grades");
        if (grades != null) {
            for (Map<String, Object> g : grades) {
                Long answerId = Long.parseLong(g.get("answerId").toString());
                Answer answer = answerRepository.findById(answerId).orElse(null);
                if (answer != null) {
                    if (g.containsKey("marksAwarded")) answer.setMarksAwarded(Integer.parseInt(g.get("marksAwarded").toString()));
                    if (g.containsKey("isCorrect")) answer.setIsCorrect((Boolean) g.get("isCorrect"));
                    if (g.containsKey("feedback")) answer.setFeedback((String) g.get("feedback"));
                    answerRepository.save(answer);
                }
            }
        }

        // Recalculate total
        List<Answer> allAnswers = answerRepository.findBySubmissionId(submissionId);
        int total = allAnswers.stream().mapToInt(a -> a.getMarksAwarded() != null ? a.getMarksAwarded() : 0).sum();
        sub.setTotalScore(total);
        sub.setGradedBy(user.getId());
        sub.setGradedAt(LocalDateTime.now().toString());
        sub.setStatus("graded");
        submissionRepository.save(sub);

        // Update result
        Exam exam = examRepository.findById(sub.getExamId()).orElse(null);
        if (exam != null) {
            ExamResult result = resultRepository.findByExamIdAndStudentId(sub.getExamId(), sub.getStudentId()).orElse(null);
            if (result != null) {
                result.setObtainedMarks(total);
                int pct = exam.getTotalMarks() > 0 ? (total * 100) / exam.getTotalMarks() : 0;
                result.setPercentage(pct);
                String grade2 = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B"
                        : pct >= 50 ? "C+" : pct >= 40 ? "C" : pct >= 30 ? "D" : "F";
                result.setGrade(grade2);
                resultRepository.save(result);
            }
        }

        return ResponseEntity.ok(ApiResponse.success("Submission graded"));
    }

    // Grade a submission answer
    @PutMapping("/{submissionId}/answers/{answerId}/grade")
    public ResponseEntity<?> gradeAnswer(@PathVariable Long submissionId,
                                          @PathVariable Long answerId,
                                          @RequestBody GradeRequest request,
                                          Authentication auth) {
        Answer answer = answerRepository.findById(answerId).orElse(null);
        if (answer == null) return ResponseEntity.notFound().build();

        answer.setMarksAwarded(request.getMarksAwarded());
        answer.setFeedback(request.getFeedback());
        answer.setIsCorrect(request.getIsCorrect());
        answerRepository.save(answer);

        // Recalculate total score
        List<Answer> answers = answerRepository.findBySubmissionId(submissionId);
        int total = answers.stream().mapToInt(a -> a.getMarksAwarded() != null ? a.getMarksAwarded() : 0).sum();

        ExamSubmission sub = submissionRepository.findById(submissionId).orElse(null);
        if (sub != null) {
            sub.setTotalScore(total);
            String email = ((UserDetails) auth.getPrincipal()).getUsername();
            User user = userRepository.findByEmail(email).orElseThrow();
            sub.setGradedBy(user.getId());
            sub.setGradedAt(LocalDateTime.now().toString());
            submissionRepository.save(sub);
        }

        return ResponseEntity.ok(ApiResponse.success("Answer graded"));
    }

    // Mark submission as fully graded
    @PutMapping("/{submissionId}/complete-grading")
    public ResponseEntity<?> completeGrading(@PathVariable Long submissionId) {
        ExamSubmission sub = submissionRepository.findById(submissionId).orElse(null);
        if (sub == null) return ResponseEntity.notFound().build();

        sub.setStatus("graded");
        sub.setGradedAt(LocalDateTime.now().toString());
        submissionRepository.save(sub);

        return ResponseEntity.ok(ApiResponse.success("Grading completed"));
    }
}
