package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "exam_registrations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamRegistration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "registration_status", nullable = false)
    @Builder.Default
    private String registrationStatus = "pending";

    @Column(name = "eligibility_checked")
    @Builder.Default
    private Boolean eligibilityChecked = false;

    @Column(name = "enrollment_status")
    private String enrollmentStatus;

    @Column(name = "seat_number")
    private String seatNumber;

    @Column(name = "registered_at", nullable = false)
    private String registeredAt;
}
