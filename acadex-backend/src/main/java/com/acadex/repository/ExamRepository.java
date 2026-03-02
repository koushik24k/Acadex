package com.acadex.repository;

import com.acadex.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByStatus(String status);
    List<Exam> findByCreatedBy(String createdBy);
    List<Exam> findByCreatedByAndStatus(String createdBy, String status);
    List<Exam> findByTitleContainingIgnoreCase(String title);
}
