package com.acadex.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.Assignment;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByCreatedBy(String createdBy);
    List<Assignment> findByStatus(String status);
    List<Assignment> findByCreatedByAndStatus(String createdBy, String status);
    List<Assignment> findByFacultyId(String facultyId);
    List<Assignment> findByFacultyIdAndStatus(String facultyId, String status);
    List<Assignment> findByCourseIdIn(List<Long> courseIds);
    List<Assignment> findByCourseIdInAndStatus(List<Long> courseIds, String status);
}
