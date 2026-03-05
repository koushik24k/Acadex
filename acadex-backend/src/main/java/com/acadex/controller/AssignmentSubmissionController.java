package com.acadex.controller;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.AssignmentSubmission;
import com.acadex.entity.User;
import com.acadex.repository.AssignmentSubmissionRepository;
import com.acadex.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assignment-submissions")
public class AssignmentSubmissionController {

    @Autowired private AssignmentSubmissionRepository submissionRepository;
    @Autowired private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> listSubmissions(
            @RequestParam(required = false) Long assignmentId,
            @RequestParam(required = false) String status) {
        List<AssignmentSubmission> list;
        if (assignmentId != null && status != null) {
            list = submissionRepository.findByAssignmentIdAndStatus(assignmentId, status);
        } else if (assignmentId != null) {
            list = submissionRepository.findByAssignmentId(assignmentId);
        } else if (status != null) {
            list = submissionRepository.findByStatus(status);
        } else {
            list = submissionRepository.findAll();
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSubmission(@PathVariable Long id) {
        return submissionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> submit(@RequestBody Map<String, Object> body, Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();

        Long assignmentId = Long.parseLong(body.get("assignmentId").toString());

        // Check for existing
        if (submissionRepository.findByAssignmentIdAndStudentId(assignmentId, user.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Already submitted"));
        }

        AssignmentSubmission sub = AssignmentSubmission.builder()
                .assignmentId(assignmentId)
                .studentId(user.getId())
                .submissionText((String) body.get("submissionText"))
                .fileUrl((String) body.get("fileUrl"))
                .submittedAt(LocalDateTime.now().toString())
                .status("submitted")
                .build();
        submissionRepository.save(sub);
        return ResponseEntity.ok(sub);
    }

    @PutMapping("/{id}/grade")
    public ResponseEntity<?> grade(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        AssignmentSubmission sub = submissionRepository.findById(id).orElse(null);
        if (sub == null) return ResponseEntity.notFound().build();

        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();

        sub.setMarksAwarded(Integer.parseInt(body.get("marksAwarded").toString()));
        sub.setFeedback((String) body.get("feedback"));
        sub.setGradedBy(user.getId());
        sub.setGradedAt(LocalDateTime.now().toString());
        sub.setStatus("graded");
        submissionRepository.save(sub);
        return ResponseEntity.ok(ApiResponse.success("Graded successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!submissionRepository.existsById(id)) return ResponseEntity.notFound().build();
        submissionRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Submission deleted"));
    }
}
