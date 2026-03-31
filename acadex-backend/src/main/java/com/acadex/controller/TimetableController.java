package com.acadex.controller;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.entity.Subject;
import com.acadex.entity.Timetable;
import com.acadex.repository.CourseFacultyMappingRepository;
import com.acadex.repository.SubjectRepository;
import com.acadex.service.TimetableService;

@RestController
@RequestMapping("/api/timetable")
public class TimetableController {

    private final TimetableService timetableService;
    private final CourseFacultyMappingRepository courseFacultyMappingRepository;
    private final SubjectRepository subjectRepository;

    @Autowired
    public TimetableController(TimetableService timetableService,
                               CourseFacultyMappingRepository courseFacultyMappingRepository,
                               SubjectRepository subjectRepository) {
        this.timetableService = timetableService;
        this.courseFacultyMappingRepository = courseFacultyMappingRepository;
        this.subjectRepository = subjectRepository;
    }

    @GetMapping
    public List<Timetable> getAllTimetableEntries() {
        return timetableService.getAllTimetableEntries();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Timetable> getTimetableEntryById(@PathVariable Long id) {
        return timetableService.getTimetableEntryById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createTimetableEntry(@RequestBody Timetable timetable) {
        if (timetable.getCourse() == null || timetable.getCourse().getId() == null ||
            timetable.getFaculty() == null || timetable.getFaculty().getId() == null) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "course and faculty are required"));
        }

        if (!courseFacultyMappingRepository.existsByCourseIdAndFacultyId(
                timetable.getCourse().getId(), timetable.getFaculty().getId())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Faculty is not assigned to this course"));
        }

        return ResponseEntity.ok(timetableService.saveTimetableEntry(timetable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTimetableEntry(@PathVariable Long id, @RequestBody Timetable timetableDetails) {
        return timetableService.getTimetableEntryById(id)
                .map(existingTimetable -> {
                    if (timetableDetails.getCourse() == null || timetableDetails.getCourse().getId() == null ||
                        timetableDetails.getFaculty() == null || timetableDetails.getFaculty().getId() == null) {
                        return ResponseEntity.badRequest().body(java.util.Map.of("error", "course and faculty are required"));
                    }

                    if (!courseFacultyMappingRepository.existsByCourseIdAndFacultyId(
                            timetableDetails.getCourse().getId(), timetableDetails.getFaculty().getId())) {
                        return ResponseEntity.badRequest().body(java.util.Map.of("error", "Faculty is not assigned to this course"));
                    }

                    existingTimetable.setCourse(timetableDetails.getCourse());
                    existingTimetable.setFaculty(timetableDetails.getFaculty());
                    existingTimetable.setRoom(timetableDetails.getRoom());
                    existingTimetable.setDayOfWeek(timetableDetails.getDayOfWeek());
                    existingTimetable.setStartTime(timetableDetails.getStartTime());
                    existingTimetable.setEndTime(timetableDetails.getEndTime());
                    return ResponseEntity.ok(timetableService.saveTimetableEntry(existingTimetable));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTimetableEntry(@PathVariable Long id) {
        timetableService.deleteTimetableEntry(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/faculty/{facultyId}", params = "scheduledSubjects")
    public ResponseEntity<?> getScheduledSubjectsForFaculty(
            @PathVariable String facultyId,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Boolean scheduledSubjects) {
        // scheduledSubjects param is used only for route disambiguation.
        if (scheduledSubjects == null || !scheduledSubjects) {
            return ResponseEntity.badRequest().body(Map.of("error", "scheduledSubjects=true is required"));
        }
        LocalDate selectedDate = parseDateFlexible(date);
        DayOfWeek day = selectedDate.getDayOfWeek();

        List<Timetable> daySchedule = timetableService.getTimetableForFaculty(facultyId).stream()
                .filter(t -> t.getDayOfWeek() != null && t.getDayOfWeek().name().equalsIgnoreCase(day.name()))
                .collect(Collectors.toList());

        if (courseId != null) {
            daySchedule = daySchedule.stream()
                    .filter(t -> t.getCourse() != null && courseId.equals(t.getCourse().getId()))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(buildScheduledSubjects(facultyId, daySchedule));
    }

    @GetMapping("/faculty/{facultyId}")
    public List<Timetable> getTimetableForFaculty(@PathVariable String facultyId) {
        return timetableService.getTimetableForFaculty(facultyId);
    }

    @GetMapping("/course/{courseId}")
    public List<Timetable> getTimetableForCourse(@PathVariable Long courseId) {
        return timetableService.getTimetableForCourse(courseId);
    }

    @GetMapping("/faculty/{facultyId}/scheduled-subjects")
    public ResponseEntity<?> getScheduledSubjectsForFacultyLegacy(
            @PathVariable String facultyId,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Long courseId) {
        LocalDate selectedDate = parseDateFlexible(date);
        DayOfWeek day = selectedDate.getDayOfWeek();

        List<Timetable> daySchedule = timetableService.getTimetableForFaculty(facultyId).stream()
                .filter(t -> t.getDayOfWeek() != null && t.getDayOfWeek().name().equalsIgnoreCase(day.name()))
                .collect(Collectors.toList());

        if (courseId != null) {
            daySchedule = daySchedule.stream()
                    .filter(t -> t.getCourse() != null && courseId.equals(t.getCourse().getId()))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(buildScheduledSubjects(facultyId, daySchedule));
    }

    private List<Map<String, Object>> buildScheduledSubjects(String facultyId, List<Timetable> schedule) {
        if (schedule == null || schedule.isEmpty()) {
            return List.of();
        }

        List<Subject> allSubjects = subjectRepository.findAll();

        List<Map<String, Object>> preferred = allSubjects.stream()
                .filter(s -> s.getFacultyId() == null || s.getFacultyId().isBlank() || s.getFacultyId().equals(facultyId))
                .filter(s -> schedule.stream().anyMatch(t -> t.getCourse() != null &&
                        matchesCourseProfile(s.getDepartment(), s.getSemester(),
                                t.getCourse().getDepartment(), t.getCourse().getSemester())))
                .map(this::toSubjectMap)
                .collect(Collectors.toList());
        if (!preferred.isEmpty()) {
            return preferred;
        }

        List<Map<String, Object>> fallbackByProfile = allSubjects.stream()
            .filter(s -> s.getFacultyId() == null || s.getFacultyId().isBlank() || s.getFacultyId().equals(facultyId))
            .filter(s -> schedule.stream().anyMatch(t -> t.getCourse() != null &&
                matchesCourseProfile(s.getDepartment(), s.getSemester(),
                    t.getCourse().getDepartment(), t.getCourse().getSemester())))
                .map(this::toSubjectMap)
                .collect(Collectors.toList());
        if (!fallbackByProfile.isEmpty()) {
            return fallbackByProfile;
        }

        // Final fallback: do not write into DB here; return faculty-relevant subjects to keep attendance usable.
        List<Map<String, Object>> relaxed = allSubjects.stream()
                .filter(s -> s.getFacultyId() == null || s.getFacultyId().isBlank() || s.getFacultyId().equals(facultyId))
                .map(this::toSubjectMap)
                .collect(Collectors.toList());

        if (!relaxed.isEmpty()) {
            return relaxed;
        }

        return allSubjects.stream().map(this::toSubjectMap).collect(Collectors.toList());
    }

    private Map<String, Object> toSubjectMap(Subject s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("subjectName", s.getSubjectName());
        m.put("subjectCode", s.getSubjectCode());
        m.put("department", s.getDepartment());
        m.put("section", s.getSection());
        m.put("semester", s.getSemester());
        return m;
    }

    private LocalDate parseDateFlexible(String value) {
        if (value == null || value.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ignored) {
            return LocalDate.parse(value, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        }
    }

    private boolean matchesCourseProfile(String subjectDepartment, String subjectSemester,
                                         String courseDepartment, String courseSemester) {
        return matchDimension(subjectDepartment, courseDepartment)
                && matchSemester(subjectSemester, courseSemester);
    }

    private boolean matchDimension(String subjectValue, String courseValue) {
        String left = normalizeText(subjectValue);
        String right = normalizeText(courseValue);
        if (left == null || right == null) {
            return true;
        }
        return left.equals(right) || areDepartmentAliases(left, right);
    }

    private boolean matchSemester(String subjectSemester, String courseSemester) {
        String left = normalizeSemester(subjectSemester);
        String right = normalizeSemester(courseSemester);
        if (left == null || right == null) {
            return true;
        }
        return left.equals(right);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeSemester(String value) {
        String normalized = normalizeText(value);
        if (normalized == null) {
            return null;
        }
        String digits = normalized.replaceAll("[^0-9]", "");
        return digits.isEmpty() ? normalized : digits;
    }

    private boolean areDepartmentAliases(String left, String right) {
        return expandDepartmentAliases(left).stream().anyMatch(expandDepartmentAliases(right)::contains);
    }

    private java.util.Set<String> expandDepartmentAliases(String value) {
        String compact = value.replaceAll("[^a-z0-9]", "");
        if (compact.isBlank()) {
            return java.util.Set.of(value);
        }
        if (compact.equals("cse") || compact.equals("cs") || compact.equals("computerscience") || compact.equals("computerscienceengineering")) {
            return java.util.Set.of("cse", "cs", "computerscience", "computerscienceengineering");
        }
        if (compact.equals("it") || compact.equals("informationtechnology")) {
            return java.util.Set.of("it", "informationtechnology");
        }
        if (compact.equals("ece") || compact.equals("electronicsandcommunication") || compact.equals("electronicscommunication")) {
            return java.util.Set.of("ece", "electronicsandcommunication", "electronicscommunication");
        }
        if (compact.equals("eee") || compact.equals("electricalandelectronics") || compact.equals("electricalelectronics")) {
            return java.util.Set.of("eee", "electricalandelectronics", "electricalelectronics");
        }
        if (compact.equals("me") || compact.equals("mechanical") || compact.equals("mechanicalengineering")) {
            return java.util.Set.of("me", "mechanical", "mechanicalengineering");
        }
        return java.util.Set.of(compact);
    }
}
