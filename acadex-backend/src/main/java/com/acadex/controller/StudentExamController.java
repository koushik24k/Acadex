package com.acadex.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.entity.CourseEnrollment;
import com.acadex.entity.Exam;
import com.acadex.entity.ExamRegistration;
import com.acadex.entity.Question;
import com.acadex.entity.User;
import com.acadex.repository.CourseEnrollmentRepository;
import com.acadex.repository.CourseRepository;
import com.acadex.repository.ExamRegistrationRepository;
import com.acadex.repository.ExamRepository;
import com.acadex.repository.QuestionRepository;
import com.acadex.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/student/exams")
public class StudentExamController {

    @Autowired private ExamRepository examRepository;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private ExamRegistrationRepository registrationRepository;
    @Autowired private CourseEnrollmentRepository courseEnrollmentRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<?> listMyExams(Authentication auth) {
        User user = getCurrentUser(auth);
        Set<String> enrolledCourseIds = courseEnrollmentRepository.findByStudentId(user.getId()).stream()
                .map(CourseEnrollment::getCourseId)
                .map(String::valueOf)
                .collect(Collectors.toSet());

        List<Map<String, Object>> exams = examRepository.findAll().stream()
                .filter(exam -> isVisibleToStudent(exam, enrolledCourseIds))
                .map(this::toMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(exams);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getExam(@PathVariable Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        Set<String> enrolledCourseIds = courseEnrollmentRepository.findByStudentId(user.getId()).stream()
                .map(CourseEnrollment::getCourseId)
                .map(String::valueOf)
                .collect(Collectors.toSet());

        return examRepository.findById(id)
                .filter(exam -> isVisibleToStudent(exam, enrolledCourseIds))
                .map(exam -> ResponseEntity.ok(toMap(exam)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/questions")
    public ResponseEntity<?> getQuestions(@PathVariable Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        Set<String> enrolledCourseIds = courseEnrollmentRepository.findByStudentId(user.getId()).stream()
                .map(CourseEnrollment::getCourseId)
                .map(String::valueOf)
                .collect(Collectors.toSet());

        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null || !isVisibleToStudent(exam, enrolledCourseIds)) {
            return ResponseEntity.notFound().build();
        }

        List<Map<String, Object>> questions = questionRepository.findByExamIdOrderByOrderAsc(id).stream()
                .map(this::questionToMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(questions);
    }

    @GetMapping("/{id}/check-registration")
    public ResponseEntity<?> checkRegistration(@PathVariable Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        Optional<ExamRegistration> reg = registrationRepository.findByExamIdAndStudentId(id, user.getId());
        if (reg.isPresent()) {
            Map<String, Object> result = new HashMap<>();
            result.put("registered", true);
            result.put("seatNumber", reg.get().getSeatNumber());
            result.put("status", reg.get().getRegistrationStatus());
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.ok(Map.of("registered", false));
    }

    @PostMapping("/{id}/register")
    public ResponseEntity<?> register(@PathVariable Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        Set<String> enrolledCourseIds = courseEnrollmentRepository.findByStudentId(user.getId()).stream()
                .map(CourseEnrollment::getCourseId)
                .map(String::valueOf)
                .collect(Collectors.toSet());

        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null || !isVisibleToStudent(exam, enrolledCourseIds)) {
            return ResponseEntity.notFound().build();
        }

        if (registrationRepository.findByExamIdAndStudentId(id, user.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Already registered"));
        }

        ExamRegistration reg = ExamRegistration.builder()
                .exam(exam)
                .studentId(user.getId())
                .registrationStatus("approved")
                .eligibilityChecked(true)
                .registeredAt(LocalDateTime.now().toString())
                .build();
        registrationRepository.save(reg);
        return ResponseEntity.ok(Map.of("message", "Registered successfully"));
    }

    private boolean isVisibleToStudent(Exam exam, Set<String> enrolledCourseIds) {
        if (exam == null || exam.getClassId() == null) return false;
        String status = exam.getStatus() != null ? exam.getStatus().trim().toLowerCase() : "";
        if ("draft".equals(status)) return false;
        Long courseId = parseCourseId(exam.getClassId());
        return courseId != null && enrolledCourseIds.contains(String.valueOf(courseId));
    }

    private Long parseCourseId(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Long.valueOf(raw.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private User getCurrentUser(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByEmail(email).orElseThrow();
    }

    private Map<String, Object> toMap(Exam exam) {
        Map<String, Object> result = new HashMap<>();
        long questionCount = questionRepository.countByExamId(exam.getId());
        Long courseId = parseCourseId(exam.getClassId());
        result.put("id", exam.getId());
        result.put("title", exam.getTitle());
        result.put("description", exam.getDescription());
        result.put("duration", exam.getDuration());
        result.put("totalMarks", exam.getTotalMarks());
        result.put("passingMarks", exam.getPassingMarks());
        result.put("scheduledDate", exam.getScheduledDate());
        result.put("scheduledTime", exam.getScheduledTime());
        result.put("date", exam.getScheduledDate());
        result.put("endTime", exam.getEndTime());
        result.put("status", exam.getStatus());
        result.put("roomId", exam.getRoom() != null ? exam.getRoom().getId() : null);
        result.put("classId", exam.getClassId());
        result.put("courseId", courseId);
        if (courseId != null) {
            courseRepository.findById(courseId).ifPresent(course -> {
                result.put("courseName", course.getCourseName());
                result.put("courseCode", course.getCourseCode());
            });
        }
        result.put("createdBy", exam.getCreatedBy());
        result.put("createdByRole", exam.getCreatedByRole());
        result.put("createdAt", exam.getCreatedAt());
        result.put("updatedAt", exam.getUpdatedAt());
        result.put("questionCount", questionCount);
        result.put("examMode", questionCount > 0 ? "online" : "offline");
        result.put("registrationCount", registrationRepository.countByExamId(exam.getId()));
        return result;
    }

    private Map<String, Object> questionToMap(Question question) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", question.getId());
        result.put("questionText", question.getQuestionText());
        result.put("text", question.getQuestionText());
        result.put("type", question.getQuestionType());
        result.put("questionType", question.getQuestionType());
        result.put("correctAnswer", question.getCorrectAnswer());
        result.put("marks", question.getMarks());
        result.put("order", question.getOrder());
        try {
            result.put("options", question.getOptions() != null ? objectMapper.readValue(question.getOptions(), List.class) : null);
        } catch (Exception ex) {
            result.put("options", question.getOptions());
        }
        return result;
    }
}