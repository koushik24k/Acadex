package com.acadex.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "exam_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_id", nullable = false)
    private Long examId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "total_marks", nullable = false)
    private Integer totalMarks;

    @Column(name = "obtained_marks", nullable = false)
    private Integer obtainedMarks;

    @Column(nullable = false)
    private Integer percentage;

    @Column(nullable = false)
    private String grade;

    @Column(name = "`rank`")
    private Integer rank;

    @Column(name = "published_at")
    private String publishedAt;
}
