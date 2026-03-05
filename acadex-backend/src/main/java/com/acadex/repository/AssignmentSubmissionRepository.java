package com.acadex.repository;

import com.acadex.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {
    List<AssignmentSubmission> findByAssignmentId(Long assignmentId);
    List<AssignmentSubmission> findByStudentId(String studentId);
    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(Long assignmentId, String studentId);
    List<AssignmentSubmission> findByStatus(String status);
    List<AssignmentSubmission> findByAssignmentIdAndStatus(Long assignmentId, String status);
}
