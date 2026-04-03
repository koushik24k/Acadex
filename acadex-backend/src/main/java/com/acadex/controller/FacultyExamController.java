package com.acadex.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.entity.CourseFacultyMapping;
import com.acadex.entity.Exam;
import com.acadex.entity.User;
import com.acadex.repository.CourseFacultyMappingRepository;
import com.acadex.repository.CourseRepository;
import com.acadex.repository.ExamRegistrationRepository;
import com.acadex.repository.ExamRepository;
import com.acadex.repository.QuestionRepository;
import com.acadex.repository.UserRepository;

@RestController
@RequestMapping("/api/faculty/exams")
public class FacultyExamController {

    @Autowired private ExamRepository examRepository;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private ExamRegistrationRepository registrationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private CourseFacultyMappingRepository courseFacultyMappingRepository;

    @GetMapping
    public ResponseEntity<?> listMyExams(Authentication auth) {
        User user = getCurrentUser(auth);
        List<Exam> exams = examRepository.findAll();
        java.util.Set<String> mappedCourseIds = courseFacultyMappingRepository.findByFacultyId(user.getId()).stream()
                .map(CourseFacultyMapping::getCourseId)
                .map(String::valueOf)
                .collect(Collectors.toSet());

        List<Exam> filtered = exams.stream()
                .filter(e -> user.getId().equals(e.getCreatedBy())
                        || (e.getClassId() != null && mappedCourseIds.contains(e.getClassId())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(filtered.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMyExam(@PathVariable Long id, Authentication auth) {
        User user = getCurrentUser(auth);
        return examRepository.findById(id)
                .filter(e -> user.getId().equals(e.getCreatedBy()) || canAccessCourse(user, e))
                .map(e -> ResponseEntity.ok(toMap(e)))
                .orElse(ResponseEntity.notFound().build());
    }

    private boolean canAccessCourse(User user, Exam exam) {
        Long courseId = parseCourseId(exam.getClassId());
        if (courseId == null) return false;
        return courseFacultyMappingRepository.existsByCourseIdAndFacultyId(courseId, user.getId());
    }

    private Long parseCourseId(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try { return Long.valueOf(raw.trim()); } catch (NumberFormatException ex) { return null; }
    }

    private User getCurrentUser(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByEmail(email).orElseThrow();
    }

    private Map<String, Object> toMap(Exam e) {
        Map<String, Object> m = new HashMap<>();
        long questionCount = questionRepository.countByExamId(e.getId());
        Long courseId = parseCourseId(e.getClassId());
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
        if (courseId != null) {
            courseRepository.findById(courseId).ifPresent(c -> {
                m.put("courseName", c.getCourseName());
                m.put("courseCode", c.getCourseCode());
            });
        }
        m.put("createdBy", e.getCreatedBy());
        m.put("createdByRole", e.getCreatedByRole());
        m.put("createdAt", e.getCreatedAt());
        m.put("updatedAt", e.getUpdatedAt());
        m.put("questionCount", questionCount);
        m.put("examMode", questionCount > 0 ? "online" : "offline");
        m.put("registrationCount", registrationRepository.countByExamId(e.getId()));
        return m;
    }
}