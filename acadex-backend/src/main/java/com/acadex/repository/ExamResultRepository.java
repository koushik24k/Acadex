package com.acadex.repository;

import com.acadex.entity.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {
    List<ExamResult> findByExamId(Long examId);
    List<ExamResult> findByStudentId(String studentId);
    List<ExamResult> findByStudentIdAndPublishedAtIsNotNull(String studentId);
    Optional<ExamResult> findByExamIdAndStudentId(Long examId, String studentId);
    List<ExamResult> findByExamIdOrderByObtainedMarksDesc(Long examId);
}
