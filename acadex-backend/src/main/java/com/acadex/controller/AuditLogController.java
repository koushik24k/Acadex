package com.acadex.controller;

import com.acadex.entity.AuditLog;
import com.acadex.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    @Autowired private AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String entity,
            @RequestParam(required = false) String userId) {
        List<AuditLog> logs;
        if (entity != null) {
            logs = auditLogRepository.findByEntityOrderByCreatedAtDesc(entity);
        } else if (userId != null) {
            logs = auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
        } else {
            logs = auditLogRepository.findAllByOrderByCreatedAtDesc();
        }
        return ResponseEntity.ok(logs);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        AuditLog log = AuditLog.builder()
                .userId((String) body.get("userId"))
                .action((String) body.get("action"))
                .entity((String) body.get("entity"))
                .entityId((String) body.get("entityId"))
                .details((String) body.get("details"))
                .ipAddress((String) body.get("ipAddress"))
                .createdAt(LocalDateTime.now().toString())
                .build();
        auditLogRepository.save(log);
        return ResponseEntity.ok(log);
    }
}
