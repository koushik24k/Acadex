package com.acadex.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.CourseFacultyMapping;

public interface CourseFacultyMappingRepository extends JpaRepository<CourseFacultyMapping, Long> {
    List<CourseFacultyMapping> findByCourseId(Long courseId);
    List<CourseFacultyMapping> findByFacultyId(String facultyId);
    Optional<CourseFacultyMapping> findByCourseIdAndFacultyIdAndSection(Long courseId, String facultyId, String section);
}
