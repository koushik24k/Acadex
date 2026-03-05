package com.acadex.controller;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.ExamResult;
import com.acadex.entity.User;
import com.acadex.repository.ExamResultRepository;
import com.acadex.repository.ExamRepository;
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
@RequestMapping("/api/results")
public class ResultController {

    @Autowired private ExamResultRepository resultRepository;
    @Autowired private ExamRepository examRepository;
    @Autowired private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> listResults(
            @RequestParam(required = false) Long examId,
            @RequestParam(required = false) Boolean published,
            Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();

        List<ExamResult> results;
        if (examId != null) {
            results = resultRepository.findByExamId(examId);
        } else if (Boolean.TRUE.equals(published)) {
            results = resultRepository.findByStudentIdAndPublishedAtIsNotNull(user.getId());
        } else {
            results = resultRepository.findByStudentId(user.getId());
        }

        List<Map<String, Object>> enriched = results.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("examId", r.getExamId());
            m.put("studentId", r.getStudentId());
            m.put("submissionId", r.getSubmissionId());
            m.put("totalMarks", r.getTotalMarks());
            m.put("obtainedMarks", r.getObtainedMarks());
            m.put("marksObtained", r.getObtainedMarks());
            m.put("percentage", r.getPercentage());
            m.put("grade", r.getGrade());
            m.put("rank", r.getRank());
            m.put("publishedAt", r.getPublishedAt());
            examRepository.findById(r.getExamId()).ifPresent(e -> {
                m.put("examTitle", e.getTitle());
                m.put("subject", e.getClassId());
            });
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(enriched);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getResult(@PathVariable Long id) {
        return resultRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Publish results for an exam
    @PostMapping("/publish/{examId}")
    public ResponseEntity<?> publishResults(@PathVariable Long examId) {
        List<ExamResult> results = resultRepository.findByExamIdOrderByObtainedMarksDesc(examId);
        String now = LocalDateTime.now().toString();
        int rank = 1;
        for (ExamResult r : results) {
            r.setRank(rank++);
            r.setPublishedAt(now);
            resultRepository.save(r);
        }
        return ResponseEntity.ok(ApiResponse.success("Results published for " + results.size() + " students"));
    }
}
