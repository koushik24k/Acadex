package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "class_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "teacher_id", nullable = false)
    private String teacherId;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "topic_id", nullable = false)
    private Long topicId;

    @Column(name = "attendance_marked", nullable = false)
    @Builder.Default
    private Boolean attendanceMarked = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
