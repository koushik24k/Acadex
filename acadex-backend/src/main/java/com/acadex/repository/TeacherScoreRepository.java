package com.acadex.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.TeacherScore;

public interface TeacherScoreRepository extends JpaRepository<TeacherScore, Long> {
    Optional<TeacherScore> findByTeacherId(String teacherId);
    List<TeacherScore> findByRiskLevel(String riskLevel);
    List<TeacherScore> findAllByOrderByCredibilityScoreDesc();
}
