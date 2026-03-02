package com.acadex.repository;

import com.acadex.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByCreatedBy(String createdBy);
    List<Assignment> findByStatus(String status);
    List<Assignment> findByCreatedByAndStatus(String createdBy, String status);
}
