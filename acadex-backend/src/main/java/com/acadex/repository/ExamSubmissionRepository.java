package com.acadex.repository;

import com.acadex.entity.ExamSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExamSubmissionRepository extends JpaRepository<ExamSubmission, Long> {
    List<ExamSubmission> findByExamId(Long examId);
    List<ExamSubmission> findByStudentId(String studentId);
    Optional<ExamSubmission> findByExamIdAndStudentId(Long examId, String studentId);
    List<ExamSubmission> findByExamIdAndStatus(Long examId, String status);
    List<ExamSubmission> findByStatus(String status);
}
