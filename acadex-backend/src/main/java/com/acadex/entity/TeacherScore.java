package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "teacher_scores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherScore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "teacher_id", nullable = false, unique = true)
    private String teacherId;

    @Column(name = "credibility_score", nullable = false)
    @Builder.Default
    private Double credibilityScore = 100.0;

    @Column(name = "avg_yes_votes")
    @Builder.Default
    private Double avgYesVotes = 0.0;

    @Column(name = "avg_no_votes")
    @Builder.Default
    private Double avgNoVotes = 0.0;

    @Column(name = "avg_partial_votes")
    @Builder.Default
    private Double avgPartialVotes = 0.0;

    @Column(name = "attendance_consistency")
    @Builder.Default
    private Double attendanceConsistency = 100.0;

    @Column(name = "total_sessions_verified")
    @Builder.Default
    private Integer totalSessionsVerified = 0;

    @Column(name = "risk_level")
    @Builder.Default
    private String riskLevel = "Normal"; // Normal, Suspicious, High Risk

    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;

    @PrePersist
    protected void onCreate() {
        lastUpdated = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }
}
