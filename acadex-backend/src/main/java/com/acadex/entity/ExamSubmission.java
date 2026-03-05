package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "exam_submissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_id", nullable = false)
    private Long examId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "started_at", nullable = false)
    private String startedAt;

    @Column(name = "submitted_at")
    private String submittedAt;

    @Column(nullable = false)
    @Builder.Default
    private String status = "in-progress";

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "graded_by")
    private String gradedBy;

    @Column(name = "graded_at")
    private String gradedAt;
}
