package com.acadex.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.Assignment;
import com.acadex.entity.AssignmentSubmission;
import com.acadex.entity.User;
import com.acadex.repository.AssignmentRepository;
import com.acadex.repository.AssignmentSubmissionRepository;
import com.acadex.repository.UserRepository;

@RestController
@RequestMapping("/api/assignment-submissions")
public class AssignmentSubmissionController {

    @Autowired private AssignmentSubmissionRepository submissionRepository;
    @Autowired private AssignmentRepository assignmentRepository;
    @Autowired private UserRepository userRepository;

    @Value("${app.storage.assignment-submissions-dir:uploads/assignment-submissions}")
    private String assignmentSubmissionsDir;

    @GetMapping
    public ResponseEntity<?> listSubmissions(
            @RequestParam(required = false) Long assignmentId,
            @RequestParam(required = false) String status,
            Authentication auth) {
        User user = getCurrentUser(auth);

        List<AssignmentSubmission> list;

        if (hasRole(user, "student")) {
            list = submissionRepository.findByStudentId(user.getId());
            if (assignmentId != null) {
                list = list.stream()
                        .filter(s -> Objects.equals(s.getAssignmentId(), assignmentId))
                        .collect(Collectors.toList());
            }
            if (status != null) {
                list = list.stream()
                        .filter(s -> status.equalsIgnoreCase(s.getStatus()))
                        .collect(Collectors.toList());
            }
        } else {
            if (assignmentId != null && status != null) {
                list = submissionRepository.findByAssignmentIdAndStatus(assignmentId, status);
            } else if (assignmentId != null) {
                list = submissionRepository.findByAssignmentId(assignmentId);
            } else if (status != null) {
                list = submissionRepository.findByStatus(status);
            } else {
                list = submissionRepository.findAll();
            }
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
        User user = getCurrentUser(auth);

        Long assignmentId = Long.parseLong(body.get("assignmentId").toString());
        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Assignment not found"));
        }

        // Check for existing
        if (submissionRepository.findByAssignmentIdAndStudentId(assignmentId, user.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Already submitted"));
        }

        String submissionText = (String) body.get("submissionText");
        String fileUrl = (String) body.get("fileUrl");

        if ((submissionText == null || submissionText.isBlank()) && (fileUrl == null || fileUrl.isBlank())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("submissionText or fileUrl is required"));
        }

        AssignmentSubmission sub = AssignmentSubmission.builder()
                .assignmentId(assignmentId)
                .studentId(user.getId())
                .submissionText(submissionText)
                .fileUrl(fileUrl)
                .submittedAt(LocalDateTime.now().toString())
                .status("submitted")
                .build();
        submissionRepository.save(sub);
        return ResponseEntity.ok(sub);
    }

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<?> submitWithFile(
            @RequestParam("assignmentId") Long assignmentId,
            @RequestParam(value = "submissionText", required = false) String submissionText,
            @RequestParam(value = "file", required = false) MultipartFile file,
            Authentication auth) {
        User user = getCurrentUser(auth);

        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Assignment not found"));
        }

        if (submissionRepository.findByAssignmentIdAndStudentId(assignmentId, user.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Already submitted"));
        }

        if ((submissionText == null || submissionText.isBlank()) && (file == null || file.isEmpty())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Please provide text or attach a file"));
        }

        String fileUrl = null;
        if (file != null && !file.isEmpty()) {
            String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "assignment" : file.getOriginalFilename());
            String extension = "";
            int extIdx = originalName.lastIndexOf('.');
            if (extIdx >= 0) {
                extension = originalName.substring(extIdx).toLowerCase();
            }

            if (!List.of(".pdf", ".doc", ".docx").contains(extension)) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Only PDF, DOC, and DOCX files are allowed"));
            }

            String storedName = assignmentId + "_" + user.getId() + "_" + UUID.randomUUID() + extension;
            Path uploadDir = Paths.get(assignmentSubmissionsDir);
            Path destination = uploadDir.resolve(storedName).normalize();

            try {
                Files.createDirectories(uploadDir);
                Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(ApiResponse.error("Failed to save uploaded file"));
            }

            String relativeUrl = "/uploads/assignment-submissions/" + storedName;
            fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath().path(relativeUrl).toUriString();
        }

        AssignmentSubmission sub = AssignmentSubmission.builder()
                .assignmentId(assignmentId)
                .studentId(user.getId())
                .submissionText(submissionText)
                .fileUrl(fileUrl)
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

        User user = getCurrentUser(auth);

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
}
