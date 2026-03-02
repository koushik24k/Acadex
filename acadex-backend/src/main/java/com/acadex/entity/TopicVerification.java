package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "topic_verifications",
       uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "student_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopicVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(nullable = false)
    private String vote; // Yes, No, Partial

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
