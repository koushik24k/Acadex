package com.acadex.controller;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.RevaluationRequest;
import com.acadex.entity.User;
import com.acadex.repository.RevaluationRequestRepository;
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
@RequestMapping("/api/revaluations")
public class RevaluationController {

    @Autowired private RevaluationRequestRepository revaluationRepository;
    @Autowired private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String status, Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();

        // Check if user is admin/faculty
        boolean isAdmin = user.getRoles() != null && user.getRoles().stream()
                .anyMatch(r -> "admin".equals(r.getRole()) || "faculty".equals(r.getRole()));

        List<RevaluationRequest> list;
        if (isAdmin) {
            list = status != null ? revaluationRepository.findByStatus(status) : revaluationRepository.findAll();
        } else {
            list = revaluationRepository.findByStudentId(user.getId());
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();

        RevaluationRequest req = RevaluationRequest.builder()
                .resultId(Long.parseLong(body.get("resultId") != null ? body.get("resultId").toString() : body.get("examId").toString()))
                .studentId(user.getId())
                .reason((String) body.get("reason"))
                .status("pending")
                .requestedAt(LocalDateTime.now().toString())
                .build();
        revaluationRepository.save(req);
        return ResponseEntity.ok(ApiResponse.success("Revaluation requested"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> review(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        RevaluationRequest req = revaluationRepository.findById(id).orElse(null);
        if (req == null) return ResponseEntity.notFound().build();

        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();

        req.setStatus((String) body.get("status"));
        req.setComments((String) body.get("comments"));
        req.setReviewedBy(user.getId());
        req.setReviewedAt(LocalDateTime.now().toString());
        revaluationRepository.save(req);
        return ResponseEntity.ok(ApiResponse.success("Revaluation reviewed"));
    }
}
