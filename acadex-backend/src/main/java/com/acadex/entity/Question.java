package com.acadex.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "question_type", nullable = false)
    private String questionType; // mcq, subjective, fill-blank

    @Column(columnDefinition = "TEXT")
    private String options; // JSON array for MCQ options

    @Column(name = "correct_answer")
    private String correctAnswer;

    @Column(nullable = false)
    private Integer marks;

    @Column(name = "question_order", nullable = false)
    private Integer order;
}
