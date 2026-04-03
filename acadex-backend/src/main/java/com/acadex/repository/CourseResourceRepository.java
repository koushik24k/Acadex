package com.acadex.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.acadex.entity.CourseResource;

@Repository
public interface CourseResourceRepository extends JpaRepository<CourseResource, Long> {
    List<CourseResource> findByCourseIdAndIsVisibleTrue(Long courseId);
    List<CourseResource> findByCourseId(Long courseId);
    void deleteByCourseIdAndId(Long courseId, Long id);
}
