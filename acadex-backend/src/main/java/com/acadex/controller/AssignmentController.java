package com.acadex.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.Assignment;
import com.acadex.entity.CourseFacultyMapping;
import com.acadex.entity.Notification;
import com.acadex.entity.User;
import com.acadex.repository.AssignmentRepository;
import com.acadex.repository.AssignmentSubmissionRepository;
import com.acadex.repository.CourseFacultyMappingRepository;
import com.acadex.repository.NotificationRepository;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {

    @Autowired private AssignmentRepository assignmentRepository;
    @Autowired private AssignmentSubmissionRepository submissionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private CourseFacultyMappingRepository courseFacultyMappingRepository;

    @GetMapping
    public ResponseEntity<?> listAssignments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String createdBy) {
        List<Assignment> list;
        if (createdBy != null && status != null) {
            list = assignmentRepository.findByCreatedByAndStatus(createdBy, status);
        } else if (status != null) {
            list = assignmentRepository.findByStatus(status);
        } else if (createdBy != null) {
            list = assignmentRepository.findByCreatedBy(createdBy);
        } else {
            list = assignmentRepository.findAll();
        }
        List<Map<String, Object>> result = list.stream().map(a -> {
            return toAssignmentMap(a);
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('FACULTY') or hasRole('COORDINATOR') or hasRole('HOD') or hasRole('ADMIN')")
    public ResponseEntity<?> listMyAssignments(
            @RequestParam(required = false) String status,
            Authentication auth) {
        User currentUser = getCurrentUser(auth);

        List<Assignment> list;
        if (hasRole(currentUser, "admin")) {
            list = status != null ? assignmentRepository.findByStatus(status) : assignmentRepository.findAll();
        } else {
            List<CourseFacultyMapping> mappings = courseFacultyMappingRepository.findByFacultyId(currentUser.getId());
            Set<Long> courseIds = mappings.stream().map(CourseFacultyMapping::getCourseId).collect(Collectors.toSet());
            boolean canManageCourseWide = mappings.stream()
                    .map(CourseFacultyMapping::getRole)
                    .filter(Objects::nonNull)
                    .map(String::toUpperCase)
                    .anyMatch(r -> "COORDINATOR".equals(r) || "HOD".equals(r));

            if (canManageCourseWide && !courseIds.isEmpty()) {
                list = status != null
                        ? assignmentRepository.findByCourseIdInAndStatus(List.copyOf(courseIds), status)
                        : assignmentRepository.findByCourseIdIn(List.copyOf(courseIds));
            } else {
                list = status != null
                        ? assignmentRepository.findByFacultyIdAndStatus(currentUser.getId(), status)
                        : assignmentRepository.findByFacultyId(currentUser.getId());
            }
        }

        List<Map<String, Object>> result = list.stream().map(this::toAssignmentMap).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('FACULTY') or hasRole('COORDINATOR') or hasRole('HOD') or hasRole('STUDENT') or hasRole('ADMIN')")
    public ResponseEntity<?> getAssignment(@PathVariable Long id, Authentication auth) {
        Assignment assignment = assignmentRepository.findById(id).orElse(null);
        if (assignment == null) return ResponseEntity.notFound().build();

        User currentUser = getCurrentUser(auth);
        if (!canViewAssignment(currentUser, assignment)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized to view this assignment"));
        }

        return ResponseEntity.ok(assignment);
    }

    @PostMapping
    @PreAuthorize("hasRole('FACULTY') or hasRole('ADMIN')")
    public ResponseEntity<?> createAssignment(@RequestBody Map<String, Object> body, Authentication auth) {
        User user = getCurrentUser(auth);
        String now = LocalDateTime.now().toString();

        Long courseId = null;
        if (body.get("courseId") != null) {
            courseId = Long.parseLong(body.get("courseId").toString());
        }

        if (!hasRole(user, "admin")) {
            if (courseId == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("courseId is required"));
            }
            if (!courseFacultyMappingRepository.existsByCourseIdAndFacultyId(courseId, user.getId())) {
                return ResponseEntity.status(403).body(ApiResponse.error("Not assigned to this course"));
            }
        }

        Assignment a = Assignment.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .createdBy(user.getId())
                .facultyId(user.getId())
                .courseId(courseId)
                .dueDate((String) body.get("dueDate"))
                .maxMarks(body.get("maxMarks") != null ? Integer.parseInt(body.get("maxMarks").toString()) : 100)
                .status(body.get("status") != null ? (String) body.get("status") : "draft")
                .subject((String) body.get("subject"))
                .createdAt(now)
                .updatedAt(now)
                .build();
        assignmentRepository.save(a);

        // Notify all students when a new assignment is created.
        String title = a.getTitle() != null ? a.getTitle() : "New Assignment";
        String due = a.getDueDate() != null ? a.getDueDate() : "N/A";
        String subject = a.getSubject() != null ? a.getSubject() : "General";
        String message = "New assignment: " + title + " (" + subject + ") - Due: " + due;

        notificationRepository.saveAll(
            userRoleRepository.findByRole("student").stream()
                .map(role -> role.getUser())
                .filter(Objects::nonNull)
                .map(student -> Notification.builder()
                    .userId(student.getId())
                    .type("assignment")
                    .title("New Assignment Published")
                    .message(message)
                    .isRead(false)
                    .createdAt(now)
                    .build())
                .collect(Collectors.toList())
        );

        return ResponseEntity.ok(toAssignmentMap(a));
    }

    // Query-param based update: PUT /assignments?id=X
    @PutMapping
    @PreAuthorize("hasRole('FACULTY') or hasRole('ADMIN')")
    public ResponseEntity<?> updateAssignmentByParam(@RequestParam Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        return updateAssignment(id, body, auth);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('FACULTY') or hasRole('ADMIN')")
    public ResponseEntity<?> updateAssignment(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        Assignment a = assignmentRepository.findById(id).orElse(null);
        if (a == null) return ResponseEntity.notFound().build();

        User currentUser = getCurrentUser(auth);
        if (!canManageAssignment(currentUser, a)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized to update this assignment"));
        }

        if (body.containsKey("title")) a.setTitle((String) body.get("title"));
        if (body.containsKey("description")) a.setDescription((String) body.get("description"));
        if (body.containsKey("dueDate")) a.setDueDate((String) body.get("dueDate"));
        if (body.containsKey("maxMarks")) a.setMaxMarks(Integer.parseInt(body.get("maxMarks").toString()));
        if (body.containsKey("status")) a.setStatus((String) body.get("status"));
        if (body.containsKey("subject")) a.setSubject((String) body.get("subject"));
        if (body.containsKey("courseId") && body.get("courseId") != null) {
            Long newCourseId = Long.parseLong(body.get("courseId").toString());
            if (!hasRole(currentUser, "admin") && !courseFacultyMappingRepository.existsByCourseIdAndFacultyId(newCourseId, currentUser.getId())) {
                return ResponseEntity.status(403).body(ApiResponse.error("Not assigned to this course"));
            }
            a.setCourseId(newCourseId);
        }
        a.setUpdatedAt(LocalDateTime.now().toString());
        assignmentRepository.save(a);
        return ResponseEntity.ok(toAssignmentMap(a));
    }

    // Query-param based delete: DELETE /assignments?id=X
    @DeleteMapping
    @PreAuthorize("hasRole('FACULTY') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteAssignmentByParam(@RequestParam Long id, Authentication auth) {
        return deleteAssignment(id, auth);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('FACULTY') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id, Authentication auth) {
        Assignment a = assignmentRepository.findById(id).orElse(null);
        if (a == null) return ResponseEntity.notFound().build();

        User currentUser = getCurrentUser(auth);
        if (!canManageAssignment(currentUser, a)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized to delete this assignment"));
        }

        assignmentRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Assignment deleted"));
    }

    // GET /assignments/{id}/submissions
    @GetMapping("/{id}/submissions")
    @PreAuthorize("hasRole('FACULTY') or hasRole('COORDINATOR') or hasRole('HOD') or hasRole('ADMIN')")
    public ResponseEntity<?> getSubmissions(@PathVariable Long id, Authentication auth) {
        Assignment assignment = assignmentRepository.findById(id).orElse(null);
        if (assignment == null) return ResponseEntity.notFound().build();

        User currentUser = getCurrentUser(auth);
        if (!canManageAssignment(currentUser, assignment)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized to view submissions"));
        }
        return ResponseEntity.ok(submissionRepository.findByAssignmentId(id));
    }

    private User getCurrentUser(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByEmail(email).orElseThrow();
    }

    private boolean hasRole(User user, String role) {
        return user.getRoles() != null && user.getRoles().stream()
                .map(r -> r.getRole())
                .filter(Objects::nonNull)
                .anyMatch(r -> r.equalsIgnoreCase(role));
    }

    private boolean canViewAssignment(User user, Assignment assignment) {
        if (hasRole(user, "admin")) return true;
        if (hasRole(user, "student")) {
            return "published".equalsIgnoreCase(assignment.getStatus());
        }
        return canManageAssignment(user, assignment);
    }

    private boolean canManageAssignment(User user, Assignment assignment) {
        if (hasRole(user, "admin")) return true;
        if (assignment.getFacultyId() != null && assignment.getFacultyId().equals(user.getId())) return true;
        if (assignment.getCreatedBy() != null && assignment.getCreatedBy().equals(user.getId())) return true;
        if (assignment.getCourseId() == null) return false;

        List<CourseFacultyMapping> mappings = courseFacultyMappingRepository.findByCourseIdAndFacultyId(assignment.getCourseId(), user.getId());
        return mappings.stream()
                .map(CourseFacultyMapping::getRole)
                .filter(Objects::nonNull)
                .map(String::toUpperCase)
                .anyMatch(r -> "COORDINATOR".equals(r) || "HOD".equals(r));
    }

    private Map<String, Object> toAssignmentMap(Assignment a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.getId());
        m.put("title", a.getTitle());
        m.put("description", a.getDescription());
        m.put("createdBy", a.getCreatedBy());
        m.put("facultyId", a.getFacultyId());
        m.put("courseId", a.getCourseId());
        m.put("dueDate", a.getDueDate());
        m.put("maxMarks", a.getMaxMarks());
        m.put("status", a.getStatus());
        m.put("subject", a.getSubject());
        m.put("createdAt", a.getCreatedAt());
        m.put("submissionCount", submissionRepository.findByAssignmentId(a.getId()).size());
        return m;
    }
}
