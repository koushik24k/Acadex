package com.acadex.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.acadex.entity.AttendanceRecord;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findByStudentId(String studentId);

    List<AttendanceRecord> findBySubjectId(Long subjectId);

    List<AttendanceRecord> findByStudentIdAndSubjectId(String studentId, Long subjectId);

    List<AttendanceRecord> findBySubjectIdAndDate(Long subjectId, LocalDate date);

    Optional<AttendanceRecord> findByStudentIdAndSubjectIdAndDate(String studentId, Long subjectId, LocalDate date);

    List<AttendanceRecord> findByStudentIdAndDateBetween(String studentId, LocalDate start, LocalDate end);

    List<AttendanceRecord> findBySubjectIdAndDateBetween(Long subjectId, LocalDate start, LocalDate end);

    @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.studentId = :studentId AND a.subjectId = :subjectId")
    long countByStudentIdAndSubjectId(@Param("studentId") String studentId, @Param("subjectId") Long subjectId);

    @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.studentId = :studentId AND a.subjectId = :subjectId AND a.status = 'present'")
    long countPresentByStudentIdAndSubjectId(@Param("studentId") String studentId, @Param("subjectId") Long subjectId);

    @Query("SELECT DISTINCT a.date FROM AttendanceRecord a WHERE a.subjectId = :subjectId ORDER BY a.date")
    List<LocalDate> findDistinctDatesBySubjectId(@Param("subjectId") Long subjectId);
}
