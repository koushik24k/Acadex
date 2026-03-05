package com.acadex.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.ClassSession;

public interface ClassSessionRepository extends JpaRepository<ClassSession, Long> {
    List<ClassSession> findBySubjectId(Long subjectId);
    List<ClassSession> findByTeacherId(String teacherId);
    List<ClassSession> findBySubjectIdAndDate(Long subjectId, LocalDate date);
    Optional<ClassSession> findBySubjectIdAndDateAndTeacherId(Long subjectId, LocalDate date, String teacherId);
    List<ClassSession> findBySubjectIdOrderByDateDesc(Long subjectId);
    List<ClassSession> findByTeacherIdOrderByDateDesc(String teacherId);
    List<ClassSession> findByDateBetween(LocalDate start, LocalDate end);
    List<ClassSession> findBySubjectIdAndDateBetween(Long subjectId, LocalDate start, LocalDate end);
}
