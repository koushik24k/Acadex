package com.acadex.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.acadex.entity.Timetable;
import com.acadex.repository.TimetableRepository;

@Service
public class TimetableService {

    private final TimetableRepository timetableRepository;

    @Autowired
    public TimetableService(TimetableRepository timetableRepository) {
        this.timetableRepository = timetableRepository;
    }

    public List<Timetable> getAllTimetableEntries() {
        return timetableRepository.findAll();
    }

    public Optional<Timetable> getTimetableEntryById(Long id) {
        return timetableRepository.findById(id);
    }

    public Timetable saveTimetableEntry(Timetable timetable) {
        // Add validation logic here if needed
        return timetableRepository.save(timetable);
    }

    public void deleteTimetableEntry(Long id) {
        timetableRepository.deleteById(id);
    }

    public List<Timetable> getTimetableForFaculty(String facultyId) {
        return timetableRepository.findByFacultyId(facultyId);
    }

    public List<Timetable> getTimetableForCourse(Long courseId) {
        return timetableRepository.findByCourseId(courseId);
    }
}
