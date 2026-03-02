package com.acadex.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.Subject;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByFacultyId(String facultyId);
    List<Subject> findBySection(String section);
    List<Subject> findByDepartment(String department);
    List<Subject> findByFacultyIdAndSection(String facultyId, String section);
    Optional<Subject> findBySubjectCode(String subjectCode);
}
