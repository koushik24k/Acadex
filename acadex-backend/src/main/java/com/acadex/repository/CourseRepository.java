package com.acadex.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.Course;

public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByCourseCode(String courseCode);
    List<Course> findByDepartment(String department);
    List<Course> findBySemester(String semester);
    List<Course> findByDepartmentAndSemester(String department, String semester);
    List<Course> findByStatus(String status);
    List<Course> findByCreatedBy(String createdBy);
    List<Course> findByType(String type);
}
