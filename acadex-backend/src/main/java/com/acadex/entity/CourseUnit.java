package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_units")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseUnit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "unit_number", nullable = false)
    private Integer unitNumber;

    @Column(name = "unit_title", nullable = false)
    private String unitTitle;

    @Column(name = "expected_hours")
    private Integer expectedHours;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
