package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "exams")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exam {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Integer duration;

    @Column(name = "total_marks", nullable = false)
    private Integer totalMarks;

    @Column(name = "passing_marks", nullable = false)
    private Integer passingMarks;

    @Column(name = "scheduled_date", nullable = false)
    private String scheduledDate;

    @Column(name = "scheduled_time", nullable = false)
    private String scheduledTime;

    @Column(name = "end_time", nullable = false)
    private String endTime;

    @Column(nullable = false)
    @Builder.Default
    private String status = "draft";

    @Column(name = "randomize_questions")
    @Builder.Default
    private Boolean randomizeQuestions = false;

    @Column(name = "randomize_options")
    @Builder.Default
    private Boolean randomizeOptions = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column(name = "class_id")
    private String classId;

    @Column(name = "created_by_role", nullable = false)
    private String createdByRole;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private String createdAt;

    @Column(name = "updated_at", nullable = false)
    private String updatedAt;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Question> questions;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL)
    private List<ExamRegistration> registrations;
}
