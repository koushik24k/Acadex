package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_faculty_mapping", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"course_id", "faculty_id", "section"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseFacultyMapping {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "faculty_id", nullable = false)
    private String facultyId;

    @Column(nullable = false)
    private String section;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
