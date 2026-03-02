package com.acadex.repository;

import com.acadex.entity.RevaluationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RevaluationRequestRepository extends JpaRepository<RevaluationRequest, Long> {
    List<RevaluationRequest> findByStudentId(String studentId);
    List<RevaluationRequest> findByStatus(String status);
    List<RevaluationRequest> findByResultId(Long resultId);
}
