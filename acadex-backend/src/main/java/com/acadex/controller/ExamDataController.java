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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
@RequestMapping("/api/exam-data")
public class ExamDataController {

    @Autowired private ExamRepository examRepository;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private ExamRegistrationRepository registrationRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private CourseFacultyMappingRepository courseFacultyMappingRepository;
    @Autowired private CourseEnrollmentRepository courseEnrollmentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<?> listAllByRole(Authentication auth) {
        User user = getCurrentUser(auth);
        List<Exam> exams = examRepository.findAll();
        return ResponseEntity.ok(filterByRole(user, exams).stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/faculty")
    public ResponseEntity<?> listFaculty(@RequestParam(required = false) Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        List<Exam> exams = examRepository.findAll();
        List<Exam> filtered = exams.stream().filter(e -> canFacultyManage(user, e)).collect(Collectors.toList());

        if (id != null) {
            return filtered.stream()
                    .filter(e -> e.getId().equals(id))
                    .findFirst()
                    .map(e -> ResponseEntity.ok(toMap(e)))
                    .orElse(ResponseEntity.notFound().build());
        }

        return ResponseEntity.ok(filtered.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping("/faculty")
    public ResponseEntity<?> facultyAction(@RequestParam String action, @RequestParam Long id, Authentication auth) {
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

    @GetMapping("/student")
    public ResponseEntity<?> listStudent(@RequestParam(required = false) Long id,
                                         @RequestParam(required = false) String mode,
                                         Authentication auth) {
        User user = getCurrentUser(auth);
        if (id != null && "questions".equalsIgnoreCase(mode)) {
            return getQuestions(id, auth);
        }
        if (id != null && "check-registration".equalsIgnoreCase(mode)) {
            return checkRegistration(id, auth);
        }
        if (id != null) {
            return examRepository.findById(id)
                    .filter(e -> canAccess(user, e))
                    .map(e -> ResponseEntity.ok(toMap(e)))
                    .orElse(ResponseEntity.notFound().build());
        }

        List<Exam> exams = examRepository.findAll();
        List<Exam> filtered = filterByRole(user, exams);
        return ResponseEntity.ok(filtered.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping("/student")
    public ResponseEntity<?> studentAction(@RequestParam String action, @RequestParam Long id, Authentication auth) {
        if ("register".equalsIgnoreCase(action)) {
            return register(id, auth);
        }
        return ResponseEntity.badRequest().body(ApiResponse.error("Unsupported action"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        return examRepository.findById(id)
                .filter(e -> canAccess(user, e))
                .map(e -> ResponseEntity.ok(toMap(e)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/detail")
    public ResponseEntity<?> getOneByQuery(@RequestParam Long id, Authentication auth) {
        return getOne(id, auth);
    }

    @GetMapping("/{id}/questions")
    public ResponseEntity<?> getQuestions(@PathVariable Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null || !canAccess(user, exam)) return ResponseEntity.notFound().build();

        List<Map<String, Object>> questions = questionRepository.findByExamIdOrderByOrderAsc(id).stream()
                .map(this::questionToMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(questions);
    }

    @GetMapping("/questions")
    public ResponseEntity<?> getQuestionsByQuery(@RequestParam Long id, Authentication auth) {
        return getQuestions(id, auth);
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

    @GetMapping("/check-registration")
    public ResponseEntity<?> checkRegistrationByQuery(@RequestParam Long id, Authentication auth) {
        return checkRegistration(id, auth);
    }

    @PostMapping("/{id}/register")
    public ResponseEntity<?> register(@PathVariable Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null || !canAccess(user, exam)) return ResponseEntity.notFound().build();

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

    @PostMapping("/register")
    public ResponseEntity<?> registerByQuery(@RequestParam Long id, Authentication auth) {
        return register(id, auth);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOne(@PathVariable Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null) return ResponseEntity.notFound().build();

        if (!canFacultyManage(user, exam) && !hasRole(user, "admin")) {
            return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized to delete this exam"));
        }

        examRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Exam deleted"));
    }

    @PostMapping("/{id}/delete")
    public ResponseEntity<?> deleteOneViaPost(@PathVariable Long id, Authentication auth) {
        return deleteOne(id, auth);
    }

    @PostMapping("/delete")
    public ResponseEntity<?> deleteOneByQuery(@RequestParam Long id, Authentication auth) {
        return deleteOne(id, auth);
    }

    private User getCurrentUser(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByEmail(email).orElseThrow();
    }

    private List<Exam> filterByRole(User user, List<Exam> exams) {
        if (hasRole(user, "admin")) {
            return exams;
        }

        if (hasRole(user, "faculty")) {
            return exams.stream().filter(e -> canFacultyManage(user, e)).collect(Collectors.toList());
        }

        if (hasRole(user, "student")) {
            Set<String> enrolledCourseIds = courseEnrollmentRepository.findByStudentId(user.getId()).stream()
                    .map(CourseEnrollment::getCourseId)
                    .map(String::valueOf)
                    .collect(Collectors.toSet());
            return exams.stream().filter(e -> isVisibleToStudent(e, enrolledCourseIds)).collect(Collectors.toList());
        }

        return List.of();
    }

    private boolean canAccess(User user, Exam exam) {
        if (hasRole(user, "admin")) return true;
        if (hasRole(user, "faculty")) return canFacultyManage(user, exam);
        if (hasRole(user, "student")) {
            Set<String> enrolledCourseIds = courseEnrollmentRepository.findByStudentId(user.getId()).stream()
                    .map(CourseEnrollment::getCourseId)
                    .map(String::valueOf)
                    .collect(Collectors.toSet());
            return isVisibleToStudent(exam, enrolledCourseIds);
        }
        return false;
    }

    private boolean canFacultyManage(User user, Exam exam) {
        if (user == null || exam == null) return false;
        if (exam.getCreatedBy() != null && exam.getCreatedBy().equals(user.getId())) return true;
        Long courseId = parseCourseId(exam.getClassId());
        return courseId != null && courseFacultyMappingRepository.existsByCourseIdAndFacultyId(courseId, user.getId());
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

    private boolean hasRole(User user, String role) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().stream()
                .anyMatch(r -> r.getRole() != null && r.getRole().equalsIgnoreCase(role));
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
