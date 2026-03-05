package com.acadex.controller;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.Assignment;
import com.acadex.entity.User;
import com.acadex.repository.AssignmentRepository;
import com.acadex.repository.AssignmentSubmissionRepository;
import com.acadex.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {

    @Autowired private AssignmentRepository assignmentRepository;
    @Autowired private AssignmentSubmissionRepository submissionRepository;
    @Autowired private UserRepository userRepository;

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
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.getId());
            m.put("title", a.getTitle());
            m.put("description", a.getDescription());
            m.put("createdBy", a.getCreatedBy());
            m.put("dueDate", a.getDueDate());
            m.put("maxMarks", a.getMaxMarks());
            m.put("status", a.getStatus());
            m.put("subject", a.getSubject());
            m.put("createdAt", a.getCreatedAt());
            m.put("submissionCount", submissionRepository.findByAssignmentId(a.getId()).size());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAssignment(@PathVariable Long id) {
        return assignmentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createAssignment(@RequestBody Map<String, Object> body, Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();
        String now = LocalDateTime.now().toString();

        Assignment a = Assignment.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .createdBy(user.getId())
                .dueDate((String) body.get("dueDate"))
                .maxMarks(body.get("maxMarks") != null ? Integer.parseInt(body.get("maxMarks").toString()) : 100)
                .status(body.get("status") != null ? (String) body.get("status") : "draft")
                .subject((String) body.get("subject"))
                .createdAt(now)
                .updatedAt(now)
                .build();
        assignmentRepository.save(a);
        return ResponseEntity.ok(a);
    }

    // Query-param based update: PUT /assignments?id=X
    @PutMapping
    public ResponseEntity<?> updateAssignmentByParam(@RequestParam Long id, @RequestBody Map<String, Object> body) {
        return updateAssignment(id, body);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAssignment(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Assignment a = assignmentRepository.findById(id).orElse(null);
        if (a == null) return ResponseEntity.notFound().build();

        if (body.containsKey("title")) a.setTitle((String) body.get("title"));
        if (body.containsKey("description")) a.setDescription((String) body.get("description"));
        if (body.containsKey("dueDate")) a.setDueDate((String) body.get("dueDate"));
        if (body.containsKey("maxMarks")) a.setMaxMarks(Integer.parseInt(body.get("maxMarks").toString()));
        if (body.containsKey("status")) a.setStatus((String) body.get("status"));
        if (body.containsKey("subject")) a.setSubject((String) body.get("subject"));
        a.setUpdatedAt(LocalDateTime.now().toString());
        assignmentRepository.save(a);
        return ResponseEntity.ok(a);
    }

    // Query-param based delete: DELETE /assignments?id=X
    @DeleteMapping
    public ResponseEntity<?> deleteAssignmentByParam(@RequestParam Long id) {
        return deleteAssignment(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id) {
        if (!assignmentRepository.existsById(id)) return ResponseEntity.notFound().build();
        assignmentRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Assignment deleted"));
    }

    // GET /assignments/{id}/submissions
    @GetMapping("/{id}/submissions")
    public ResponseEntity<?> getSubmissions(@PathVariable Long id) {
        return ResponseEntity.ok(submissionRepository.findByAssignmentId(id));
    }
}
