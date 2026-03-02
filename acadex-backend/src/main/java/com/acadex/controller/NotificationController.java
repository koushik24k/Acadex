package com.acadex.controller;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.Notification;
import com.acadex.entity.User;
import com.acadex.repository.NotificationRepository;
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
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> list(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();
        return ResponseEntity.ok(notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();
        int count = notificationRepository.countByUserIdAndIsRead(user.getId(), false);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        Notification n = notificationRepository.findById(id).orElse(null);
        if (n == null) return ResponseEntity.notFound().build();
        n.setIsRead(true);
        notificationRepository.save(n);
        return ResponseEntity.ok(ApiResponse.success("Marked as read"));
    }

    @PutMapping("/mark-all-read")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadOrderByCreatedAtDesc(user.getId(), false);
        unread.forEach(n -> { n.setIsRead(true); notificationRepository.save(n); });
        return ResponseEntity.ok(ApiResponse.success("All marked as read"));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Notification n = Notification.builder()
                .userId((String) body.get("userId"))
                .type((String) body.get("type"))
                .title((String) body.get("title"))
                .message((String) body.get("message"))
                .isRead(false)
                .createdAt(LocalDateTime.now().toString())
                .build();
        notificationRepository.save(n);
        return ResponseEntity.ok(n);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!notificationRepository.existsById(id)) return ResponseEntity.notFound().build();
        notificationRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Notification deleted"));
    }
}
