package com.acadex.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.CourseEnrollment;

public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, Long> {
    List<CourseEnrollment> findByCourseId(Long courseId);
    List<CourseEnrollment> findByStudentId(String studentId);
    Optional<CourseEnrollment> findByCourseIdAndStudentId(Long courseId, String studentId);
    long countByCourseId(Long courseId);
}
