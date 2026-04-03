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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.Course;
import com.acadex.entity.CourseEnrollment;
import com.acadex.entity.Exam;
import com.acadex.entity.ExamRegistration;
import com.acadex.entity.Question;
import com.acadex.entity.User;
import com.acadex.repository.CourseEnrollmentRepository;
import com.acadex.repository.CourseFacultyMappingRepository;
import com.acadex.repository.CourseRepository;
import com.acadex.repository.ExamRegistrationRepository;
import com.acadex.repository.ExamRepository;
import com.acadex.repository.QuestionRepository;
import com.acadex.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/datahub")
public class DataHubController {

    @Autowired private ExamRepository examRepository;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private ExamRegistrationRepository registrationRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private CourseFacultyMappingRepository courseFacultyMappingRepository;
    @Autowired private CourseEnrollmentRepository courseEnrollmentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ObjectMapper objectMapper;

    @GetMapping("/faculty-items")
    public ResponseEntity<?> facultyItems(@RequestParam(required = false) Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        List<Exam> exams = examRepository.findAll().stream().filter(e -> canFacultyManage(user, e)).collect(Collectors.toList());
        if (id != null) {
            return exams.stream()
                    .filter(e -> e.getId().equals(id))
                    .findFirst()
                    .map(e -> ResponseEntity.ok(toMap(e)))
                    .orElse(ResponseEntity.notFound().build());
        }
        return ResponseEntity.ok(exams.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping("/faculty-items")
    public ResponseEntity<?> facultyItemsAction(@RequestParam String action, @RequestParam Long id, Authentication auth) {
        if (!"delete".equalsIgnoreCase(action)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Unsupported action"));
        }
        User user = getCurrentUser(auth);
        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null) return ResponseEntity.notFound().build();
        if (!canFacultyManage(user, exam) && !hasRole(user, "admin")) {
            return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized to delete this exam"));
        }
        examRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Exam deleted"));
    }

    @GetMapping("/student-items")
    public ResponseEntity<?> studentItems(@RequestParam(required = false) Long id,
                                          @RequestParam(required = false) String mode,
                                          Authentication auth) {
        User user = getCurrentUser(auth);
        if (id != null && "questions".equalsIgnoreCase(mode)) {
            Exam exam = examRepository.findById(id).orElse(null);
            if (exam == null || !canStudentView(user, exam)) return ResponseEntity.notFound().build();
            List<Map<String, Object>> questions = questionRepository.findByExamIdOrderByOrderAsc(id).stream()
                    .map(this::questionToMap)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(questions);
        }

        if (id != null && "registration".equalsIgnoreCase(mode)) {
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

        if (id != null) {
            return examRepository.findById(id)
                    .filter(e -> canStudentView(user, e))
                    .map(e -> ResponseEntity.ok(toMap(e)))
                    .orElse(ResponseEntity.notFound().build());
        }

        List<Exam> exams = examRepository.findAll().stream().filter(e -> canStudentView(user, e)).collect(Collectors.toList());
        return ResponseEntity.ok(exams.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping("/student-items")
    public ResponseEntity<?> studentItemsAction(@RequestParam String action, @RequestParam Long id, Authentication auth) {
        if (!"register".equalsIgnoreCase(action)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Unsupported action"));
        }
        User user = getCurrentUser(auth);
        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null || !canStudentView(user, exam)) return ResponseEntity.notFound().build();

        if (registrationRepository.findByExamIdAndStudentId(id, user.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Already registered"));
        }

        ExamRegistration reg = ExamRegistration.builder()
                .exam(exam)
                .studentId(user.getId())
                .registrationStatus("approved")
                .eligibilityChecked(true)
                .registeredAt(LocalDateTime.now().toString())
                .build();
        registrationRepository.save(reg);
        return ResponseEntity.ok(ApiResponse.success("Registered successfully"));
    }

    private User getCurrentUser(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByEmail(email).orElseThrow();
    }

    private boolean hasRole(User user, String role) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().stream().anyMatch(r -> r.getRole() != null && r.getRole().equalsIgnoreCase(role));
    }

    private Long parseCourseId(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Long.valueOf(raw.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean canFacultyManage(User user, Exam exam) {
        if (user == null || exam == null) return false;
        if (hasRole(user, "admin")) return true;
        if (exam.getCreatedBy() != null && exam.getCreatedBy().equals(user.getId())) return true;
        Long courseId = parseCourseId(exam.getClassId());
        return courseId != null && courseFacultyMappingRepository.existsByCourseIdAndFacultyId(courseId, user.getId());
    }

    private boolean canStudentView(User user, Exam exam) {
        if (user == null || exam == null || exam.getClassId() == null) return false;
        String status = exam.getStatus() != null ? exam.getStatus().trim().toLowerCase() : "";
        if ("draft".equals(status)) return false;
        Long courseId = parseCourseId(exam.getClassId());
        if (courseId == null) return false;
        Set<String> enrolled = courseEnrollmentRepository.findByStudentId(user.getId()).stream()
                .map(CourseEnrollment::getCourseId)
                .map(String::valueOf)
                .collect(Collectors.toSet());
        return enrolled.contains(String.valueOf(courseId));
    }

    private Map<String, Object> toMap(Exam e) {
        Map<String, Object> m = new HashMap<>();
        long questionCount = questionRepository.countByExamId(e.getId());
        Long courseId = parseCourseId(e.getClassId());
        Course course = courseId != null ? courseRepository.findById(courseId).orElse(null) : null;
        m.put("id", e.getId());
        m.put("title", e.getTitle());
        m.put("description", e.getDescription());
        m.put("duration", e.getDuration());
        m.put("totalMarks", e.getTotalMarks());
        m.put("passingMarks", e.getPassingMarks());
        m.put("scheduledDate", e.getScheduledDate());
        m.put("scheduledTime", e.getScheduledTime());
        m.put("date", e.getScheduledDate());
        m.put("endTime", e.getEndTime());
        m.put("status", e.getStatus());
        m.put("randomizeQuestions", e.getRandomizeQuestions());
        m.put("randomizeOptions", e.getRandomizeOptions());
        m.put("roomId", e.getRoom() != null ? e.getRoom().getId() : null);
        m.put("classId", e.getClassId());
        m.put("courseId", courseId);
        m.put("courseName", course != null ? course.getCourseName() : null);
        m.put("courseCode", course != null ? course.getCourseCode() : null);
        m.put("createdBy", e.getCreatedBy());
        m.put("createdByRole", e.getCreatedByRole());
        m.put("createdAt", e.getCreatedAt());
        m.put("updatedAt", e.getUpdatedAt());
        m.put("questionCount", questionCount);
        m.put("examMode", questionCount > 0 ? "online" : "offline");
        m.put("registrationCount", registrationRepository.countByExamId(e.getId()));
        return m;
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
