package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseResource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long courseId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String resourceType; // PDF, Video, Document, Link, Image, etc.

    @Column(nullable = false)
    private String resourceUrl;

    @Column(nullable = false)
    private String uploadedBy; // Faculty/Coordinator username

    @Column(nullable = false)
    private LocalDateTime uploadedAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isVisible = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        uploadedAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
