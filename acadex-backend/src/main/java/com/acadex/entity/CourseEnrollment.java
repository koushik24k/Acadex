package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_enrollments", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"course_id", "student_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseEnrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(nullable = false)
    private String section;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
