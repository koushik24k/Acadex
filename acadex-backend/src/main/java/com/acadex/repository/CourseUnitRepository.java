package com.acadex.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.CourseUnit;

public interface CourseUnitRepository extends JpaRepository<CourseUnit, Long> {
    List<CourseUnit> findByCourseId(Long courseId);
    List<CourseUnit> findByCourseIdOrderByUnitNumberAsc(Long courseId);
}
