package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "courses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_code", unique = true, nullable = false)
    private String courseCode;

    @Column(name = "course_name", nullable = false)
    private String courseName;

    @Column(nullable = false)
    private String department;

    @Column(nullable = false)
    private String semester;

    @Column(nullable = false)
    private Integer credits;

    @Column(nullable = false)
    private String type; // Core, Elective, Lab

    @Column(name = "total_hours")
    private Integer totalHours;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "syllabus_pdf_url")
    private String syllabusPdfUrl;

    @Column(nullable = false)
    private String status; // Draft, Published, Locked

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "Draft";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
