package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_topics")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseTopic {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "unit_id", nullable = false)
    private Long unitId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "topic_name", nullable = false)
    private String topicName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "planned_date")
    private LocalDate plannedDate;

    @Column(name = "completed", nullable = false)
    private Boolean completed;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (completed == null) completed = false;
    }
}
