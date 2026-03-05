package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "revaluation_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevaluationRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "result_id", nullable = false)
    private Long resultId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false)
    @Builder.Default
    private String status = "pending";

    @Column(name = "requested_at", nullable = false)
    private String requestedAt;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private String reviewedAt;

    @Column(columnDefinition = "TEXT")
    private String comments;
}
