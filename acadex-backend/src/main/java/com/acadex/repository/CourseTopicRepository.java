package com.acadex.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.CourseTopic;

public interface CourseTopicRepository extends JpaRepository<CourseTopic, Long> {
    List<CourseTopic> findByUnitId(Long unitId);
    List<CourseTopic> findByCourseId(Long courseId);
    List<CourseTopic> findByCourseIdAndCompleted(Long courseId, Boolean completed);
    long countByCourseId(Long courseId);
    long countByCourseIdAndCompleted(Long courseId, Boolean completed);
}
