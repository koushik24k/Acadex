package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "assignment_submissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "submission_text", columnDefinition = "TEXT")
    private String submissionText;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "submitted_at", nullable = false)
    private String submittedAt;

    @Column(name = "marks_awarded")
    private Integer marksAwarded;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "graded_by")
    private String gradedBy;

    @Column(name = "graded_at")
    private String gradedAt;

    @Column(nullable = false)
    @Builder.Default
    private String status = "pending";
}
