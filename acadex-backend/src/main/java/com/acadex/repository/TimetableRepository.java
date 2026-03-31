package com.acadex.repository;

import java.time.DayOfWeek;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.acadex.entity.Timetable;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, Long> {
    List<Timetable> findByFacultyId(String facultyId);
    List<Timetable> findByCourseId(Long courseId);
    List<Timetable> findByFacultyIdAndDayOfWeek(String facultyId, DayOfWeek dayOfWeek);
}
