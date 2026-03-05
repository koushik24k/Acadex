package com.acadex.repository;

import com.acadex.entity.ExamRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExamRegistrationRepository extends JpaRepository<ExamRegistration, Long> {
    List<ExamRegistration> findByExamId(Long examId);
    List<ExamRegistration> findByStudentId(String studentId);
    Optional<ExamRegistration> findByExamIdAndStudentId(Long examId, String studentId);
    int countByExamId(Long examId);
}
