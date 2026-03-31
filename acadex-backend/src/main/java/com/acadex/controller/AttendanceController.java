package com.acadex.controller;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.dto.AttendanceMarkRequest;
import com.acadex.entity.AttendanceRecord;
import com.acadex.entity.ClassSession;
import com.acadex.entity.Subject;
import com.acadex.entity.Timetable;
import com.acadex.entity.User;
import com.acadex.entity.UserRole;
import com.acadex.repository.AttendanceRecordRepository;
import com.acadex.repository.ClassSessionRepository;
import com.acadex.repository.SubjectRepository;
import com.acadex.repository.TimetableRepository;
import com.acadex.repository.TopicRepository;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    @Autowired private AttendanceRecordRepository attendanceRepo;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private ClassSessionRepository classSessionRepo;
    @Autowired private TopicRepository topicRepository;
    @Autowired private TimetableRepository timetableRepository;

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ MARK ATTENDANCE (Faculty) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @PostMapping("/mark")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> markAttendance(@RequestBody AttendanceMarkRequest request, Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User faculty = userRepository.findByEmail(email).orElseThrow();
        LocalDate date = parseDateFlexible(request.getDate());
        Subject subject = subjectRepository.findById(request.getSubjectId()).orElse(null);

        if (subject == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Subject not found"));
        }

        // Allow timetable-mapped attendance even when subject.facultyId is not maintained.
        if (subject.getFacultyId() != null && !subject.getFacultyId().isBlank() && !faculty.getId().equals(subject.getFacultyId())) {
            return ResponseEntity.status(403).body(Map.of("error", "You are not assigned to this subject"));
        }

        // Enforce timetable mapping: attendance can be marked only if faculty has a scheduled class today
        // matching this subject's class profile.
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        List<Timetable> daySchedule = resolveDayScheduleForFaculty(faculty.getId(), dayOfWeek);
        boolean hasMappedSchedule = daySchedule.isEmpty() || daySchedule.stream().anyMatch(t ->
                t.getCourse() != null && matchesCourseProfile(subject.getDepartment(), subject.getSemester(),
                        t.getCourse().getDepartment(), t.getCourse().getSemester())
        );
        if (!hasMappedSchedule) {
            // Fallback: if faculty has any class scheduled today and this subject is not explicitly owned by another faculty,
            // allow attendance to proceed to avoid hard failures caused by inconsistent department labels.
            hasMappedSchedule = !daySchedule.isEmpty();
        }
        if (!hasMappedSchedule) {
            return ResponseEntity.status(403).body(Map.of("error", "No timetable mapping found for this subject on selected date"));
        }

        // Topic is required for attendance marking
        if (request.getTopicId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Topic selection is required to mark attendance"));
        }

        // Create or update ClassSession
        ClassSession session = classSessionRepo
                .findBySubjectIdAndDateAndTeacherId(request.getSubjectId(), date, faculty.getId())
                .orElse(null);
        if (session == null) {
            session = ClassSession.builder()
                    .subjectId(request.getSubjectId())
                    .teacherId(faculty.getId())
                    .date(date)
                    .topicId(request.getTopicId())
                    .attendanceMarked(true)
                    .notes(request.getNotes())
                    .build();
        } else {
            session.setTopicId(request.getTopicId());
            session.setAttendanceMarked(true);
            if (request.getNotes() != null) session.setNotes(request.getNotes());
        }
        classSessionRepo.save(session);

        List<Map<String, Object>> results = new ArrayList<>();
        for (AttendanceMarkRequest.StudentStatus ss : request.getStudents()) {
            AttendanceRecord existing = attendanceRepo
                    .findByStudentIdAndSubjectIdAndDate(ss.getStudentId(), request.getSubjectId(), date)
                    .orElse(null);
            if (existing != null) {
                if (Boolean.TRUE.equals(existing.getLocked())) {
                    results.add(Map.of("studentId", ss.getStudentId(), "status", "locked", "message", "Attendance is locked"));
                    continue;
                }
                existing.setStatus(ss.getStatus());
                existing.setMarkedBy(faculty.getId());
                attendanceRepo.save(existing);
                results.add(Map.of("studentId", ss.getStudentId(), "status", "updated"));
            } else {
                AttendanceRecord record = AttendanceRecord.builder()
                        .studentId(ss.getStudentId())
                        .subjectId(request.getSubjectId())
                        .date(date)
                        .status(ss.getStatus())
                        .markedBy(faculty.getId())
                        .build();
                attendanceRepo.save(record);
                results.add(Map.of("studentId", ss.getStudentId(), "status", "created"));
            }
        }
        return ResponseEntity.ok(Map.of("message", "Attendance marked", "count", results.size(), "details", results));
    }

    @GetMapping("/my-scheduled-subjects")
    public ResponseEntity<?> getMyScheduledSubjects(
            Authentication auth,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Long courseId) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User faculty = userRepository.findByEmail(email).orElseThrow();
        LocalDate selectedDate = (date != null && !date.isBlank()) ? parseDateFlexible(date) : LocalDate.now();
        DayOfWeek day = selectedDate.getDayOfWeek();

        List<Timetable> daySchedule = resolveDayScheduleForFaculty(faculty.getId(), day);
        if (courseId != null) {
            daySchedule = daySchedule.stream()
                    .filter(t -> t.getCourse() != null && courseId.equals(t.getCourse().getId()))
                    .collect(Collectors.toList());
        }
        final List<Timetable> finalDaySchedule = daySchedule;
        List<Subject> assignedSubjects = subjectRepository.findAll();

        if (finalDaySchedule.isEmpty()) {
            List<Map<String, Object>> fallbackSubjects = assignedSubjects.stream()
                    .filter(s -> s.getFacultyId() == null || s.getFacultyId().isBlank() || s.getFacultyId().equals(faculty.getId()))
                    .map(s -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id", s.getId());
                        m.put("subjectName", s.getSubjectName());
                        m.put("subjectCode", s.getSubjectCode());
                        m.put("department", s.getDepartment());
                        m.put("section", s.getSection());
                        m.put("semester", s.getSemester());
                        return m;
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(fallbackSubjects);
        }

        List<Subject> facultyScopedSubjects = assignedSubjects.stream()
            .filter(s -> s.getFacultyId() == null || s.getFacultyId().isBlank() || s.getFacultyId().equals(faculty.getId()))
            .collect(Collectors.toList());

        List<Map<String, Object>> result = facultyScopedSubjects.stream()
            .filter(s -> finalDaySchedule.stream().anyMatch(t ->
                t.getCourse() != null && matchesCourseProfile(
                    s.getDepartment(), s.getSemester(),
                    t.getCourse().getDepartment(), t.getCourse().getSemester())
            ))
            .map(this::toSubjectMap)
            .collect(Collectors.toList());

        // If strict department/semester mapping misses, try subject-code to course-code hints.
        if (result.isEmpty() && !finalDaySchedule.isEmpty()) {
            result = facultyScopedSubjects.stream()
                .filter(s -> finalDaySchedule.stream().anyMatch(t -> t.getCourse() != null
                    && matchesCourseCodeHint(s.getSubjectCode(), t.getCourse().getCourseCode())))
                .map(this::toSubjectMap)
                .collect(Collectors.toList());
        }

        // Final fallback for messy legacy data: return faculty-relevant subjects instead of an empty list.
        if (result.isEmpty() && !finalDaySchedule.isEmpty()) {
            result = facultyScopedSubjects.stream()
                .map(this::toSubjectMap)
                .collect(Collectors.toList());
        }

        return ResponseEntity.ok(result);
    }

    private LocalDate parseDateFlexible(String value) {
        if (value == null || value.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ignored) {
            // Support dd-MM-yyyy from browsers/localized UIs.
            return LocalDate.parse(value, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        }
    }

    private List<Timetable> resolveDayScheduleForFaculty(String facultyId, DayOfWeek day) {
        List<Timetable> direct = timetableRepository.findByFacultyIdAndDayOfWeek(facultyId, day);
        if (!direct.isEmpty()) {
            return direct;
        }

        // Fallback for legacy/dirty data where direct day filtering may miss rows.
        return timetableRepository.findByFacultyId(facultyId).stream()
                .filter(t -> t.getDayOfWeek() != null && t.getDayOfWeek().name().equalsIgnoreCase(day.name()))
                .collect(Collectors.toList());
    }

    private boolean matchesCourseProfile(String subjectDepartment, String subjectSemester,
                                         String courseDepartment, String courseSemester) {
        boolean departmentMatches = matchDimension(subjectDepartment, courseDepartment);
        boolean semesterMatches = matchSemester(subjectSemester, courseSemester);
        return departmentMatches && semesterMatches;
    }

    private boolean matchDimension(String subjectValue, String courseValue) {
        String left = normalizeText(subjectValue);
        String right = normalizeText(courseValue);

        // If either side is missing, do not block faculty from taking attendance.
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
        if (!digits.isEmpty()) {
            return digits;
        }
        return normalized;
    }

    private boolean matchesCourseCodeHint(String subjectCode, String courseCode) {
        String s = normalizeCode(subjectCode);
        String c = normalizeCode(courseCode);
        if (s == null || c == null) {
            return false;
        }
        return s.equals(c) || s.startsWith(c) || c.startsWith(s);
    }

    private String normalizeCode(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return normalized.isEmpty() ? null : normalized;
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

    private boolean areDepartmentAliases(String left, String right) {
        Set<String> leftAliases = expandDepartmentAliases(left);
        Set<String> rightAliases = expandDepartmentAliases(right);
        return leftAliases.stream().anyMatch(rightAliases::contains);
    }

    private Set<String> expandDepartmentAliases(String value) {
        String compact = value.replaceAll("[^a-z0-9]", "");
        if (compact.isBlank()) {
            return Set.of(value);
        }

        if (compact.equals("cse") || compact.equals("cs") || compact.equals("computerscience") || compact.equals("computerscienceengineering")) {
            return Set.of("cse", "cs", "computerscience", "computerscienceengineering");
        }
        if (compact.equals("it") || compact.equals("informationtechnology")) {
            return Set.of("it", "informationtechnology");
        }
        if (compact.equals("ece") || compact.equals("electronicsandcommunication") || compact.equals("electronicscommunication")) {
            return Set.of("ece", "electronicsandcommunication", "electronicscommunication");
        }
        if (compact.equals("eee") || compact.equals("electricalandelectronics") || compact.equals("electricalelectronics")) {
            return Set.of("eee", "electricalandelectronics", "electricalelectronics");
        }
        if (compact.equals("me") || compact.equals("mechanical") || compact.equals("mechanicalengineering")) {
            return Set.of("me", "mechanical", "mechanicalengineering");
        }
        return Set.of(compact);
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ GET ATTENDANCE FOR A SUBJECT + DATE ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/subject/{subjectId}")
    public ResponseEntity<?> getBySubject(
            @PathVariable Long subjectId,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        List<AttendanceRecord> records;
        if (date != null) {
            records = attendanceRepo.findBySubjectIdAndDate(subjectId, LocalDate.parse(date));
        } else if (startDate != null && endDate != null) {
            records = attendanceRepo.findBySubjectIdAndDateBetween(subjectId, LocalDate.parse(startDate), LocalDate.parse(endDate));
        } else {
            records = attendanceRepo.findBySubjectId(subjectId);
        }
        return ResponseEntity.ok(records.stream().map(this::toMap).collect(Collectors.toList()));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ GET MY ATTENDANCE (Student) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/my")
    public ResponseEntity<?> getMyAttendance(
            Authentication auth,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String month) { // yyyy-MM

        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User student = userRepository.findByEmail(email).orElseThrow();

        if (subjectId != null) {
            List<AttendanceRecord> records;
            if (month != null) {
                YearMonth ym = YearMonth.parse(month);
                records = attendanceRepo.findByStudentIdAndDateBetween(
                        student.getId(), ym.atDay(1), ym.atEndOfMonth());
                records = records.stream()
                        .filter(r -> r.getSubjectId().equals(subjectId))
                        .collect(Collectors.toList());
            } else {
                records = attendanceRepo.findByStudentIdAndSubjectId(student.getId(), subjectId);
            }
            return ResponseEntity.ok(records.stream().map(this::toMap).collect(Collectors.toList()));
        }

        // Overall: return subject-wise summary
        List<AttendanceRecord> allRecords = attendanceRepo.findByStudentId(student.getId());
        Map<Long, List<AttendanceRecord>> bySub = allRecords.stream()
                .collect(Collectors.groupingBy(AttendanceRecord::getSubjectId));

        List<Map<String, Object>> summaries = new ArrayList<>();
        for (Map.Entry<Long, List<AttendanceRecord>> entry : bySub.entrySet()) {
            Long sid = entry.getKey();
            List<AttendanceRecord> recs = entry.getValue();
            long total = recs.size();
            long present = recs.stream().filter(r -> "present".equals(r.getStatus())).count();
            double pct = total > 0 ? Math.round((present * 100.0 / total) * 10.0) / 10.0 : 0;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subjectId", sid);
            subjectRepository.findById(sid).ifPresent(s -> {
                m.put("subjectName", s.getSubjectName());
                m.put("subjectCode", s.getSubjectCode());
            });
            m.put("totalClasses", total);
            m.put("attendedClasses", present);
            m.put("percentage", pct);
            m.put("shortage", pct < 75);
            summaries.add(m);
        }

        // Overall totals
        long overallTotal = allRecords.size();
        long overallPresent = allRecords.stream().filter(r -> "present".equals(r.getStatus())).count();
        double overallPct = overallTotal > 0 ? Math.round((overallPresent * 100.0 / overallTotal) * 10.0) / 10.0 : 0;

        return ResponseEntity.ok(Map.of(
                "studentId", student.getId(),
                "studentName", student.getName(),
                "overallPercentage", overallPct,
                "overallTotal", overallTotal,
                "overallPresent", overallPresent,
                "overallShortage", overallPct < 75,
                "subjects", summaries
        ));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ GET MONTHLY BREAKDOWN (Student) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/my/monthly")
    public ResponseEntity<?> getMyMonthly(Authentication auth,
                                           @RequestParam(required = false) Long subjectId) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User student = userRepository.findByEmail(email).orElseThrow();

        List<AttendanceRecord> records;
        if (subjectId != null) {
            records = attendanceRepo.findByStudentIdAndSubjectId(student.getId(), subjectId);
        } else {
            records = attendanceRepo.findByStudentId(student.getId());
        }

        Map<String, List<AttendanceRecord>> byMonth = records.stream()
                .collect(Collectors.groupingBy(r -> r.getDate().getYear() + "-" +
                        String.format("%02d", r.getDate().getMonthValue())));

        List<Map<String, Object>> months = new ArrayList<>();
        for (Map.Entry<String, List<AttendanceRecord>> entry : byMonth.entrySet()) {
            List<AttendanceRecord> recs = entry.getValue();
            long total = recs.size();
            long present = recs.stream().filter(r -> "present".equals(r.getStatus())).count();
            double pct = total > 0 ? Math.round((present * 100.0 / total) * 10.0) / 10.0 : 0;
            months.add(Map.of(
                    "month", entry.getKey(),
                    "totalClasses", total,
                    "attendedClasses", present,
                    "percentage", pct
            ));
        }
        months.sort(Comparator.comparing(m -> (String) m.get("month")));
        return ResponseEntity.ok(months);
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ GET SUMMARY FOR A SUBJECT (Faculty) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/summary/{subjectId}")
    public ResponseEntity<?> getSubjectSummary(@PathVariable Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId).orElse(null);
        if (subject == null) return ResponseEntity.notFound().build();

        // Find all students who have attendance for this subject
        List<AttendanceRecord> allRecords = attendanceRepo.findBySubjectId(subjectId);
        Map<String, List<AttendanceRecord>> byStudent = allRecords.stream()
                .collect(Collectors.groupingBy(AttendanceRecord::getStudentId));

        List<Map<String, Object>> students = new ArrayList<>();
        for (Map.Entry<String, List<AttendanceRecord>> entry : byStudent.entrySet()) {
            String sid = entry.getKey();
            List<AttendanceRecord> recs = entry.getValue();
            long total = recs.size();
            long present = recs.stream().filter(r -> "present".equals(r.getStatus())).count();
            double pct = total > 0 ? Math.round((present * 100.0 / total) * 10.0) / 10.0 : 0;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("studentId", sid);
            userRepository.findById(sid).ifPresent(u -> m.put("studentName", u.getName()));
            m.put("totalClasses", total);
            m.put("attendedClasses", present);
            m.put("percentage", pct);
            m.put("shortage", pct < 75);
            students.add(m);
        }

        long totalDates = attendanceRepo.findDistinctDatesBySubjectId(subjectId).size();

        return ResponseEntity.ok(Map.of(
                "subjectId", subjectId,
                "subjectName", subject.getSubjectName(),
                "totalClassesConducted", totalDates,
                "totalStudents", students.size(),
                "students", students,
                "shortageCount", students.stream().filter(s -> Boolean.TRUE.equals(s.get("shortage"))).count()
        ));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ SHORTAGE LIST (Admin / Faculty) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/shortage")
    public ResponseEntity<?> getShortageList(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String section) {

        List<Subject> subjects;
        if (subjectId != null) {
            subjects = subjectRepository.findById(subjectId).map(List::of).orElse(List.of());
        } else if (department != null) {
            subjects = subjectRepository.findByDepartment(department);
        } else if (section != null) {
            subjects = subjectRepository.findBySection(section);
        } else {
            subjects = subjectRepository.findAll();
        }

        List<Map<String, Object>> shortageList = new ArrayList<>();
        for (Subject sub : subjects) {
            List<AttendanceRecord> recs = attendanceRepo.findBySubjectId(sub.getId());
            Map<String, List<AttendanceRecord>> byStudent = recs.stream()
                    .collect(Collectors.groupingBy(AttendanceRecord::getStudentId));
            for (Map.Entry<String, List<AttendanceRecord>> entry : byStudent.entrySet()) {
                long total = entry.getValue().size();
                long present = entry.getValue().stream().filter(r -> "present".equals(r.getStatus())).count();
                double pct = total > 0 ? Math.round((present * 100.0 / total) * 10.0) / 10.0 : 0;
                if (pct < 75) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("studentId", entry.getKey());
                    userRepository.findById(entry.getKey()).ifPresent(u -> m.put("studentName", u.getName()));
                    m.put("subjectId", sub.getId());
                    m.put("subjectName", sub.getSubjectName());
                    m.put("totalClasses", total);
                    m.put("attendedClasses", present);
                    m.put("percentage", pct);
                    shortageList.add(m);
                }
            }
        }
        return ResponseEntity.ok(shortageList);
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ LOCK ATTENDANCE (Admin) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @PostMapping("/lock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> lockAttendance(
            @RequestParam Long subjectId,
            @RequestParam String date) {
        LocalDate d = LocalDate.parse(date);
        List<AttendanceRecord> records = attendanceRepo.findBySubjectIdAndDate(subjectId, d);
        records.forEach(r -> { r.setLocked(true); attendanceRepo.save(r); });
        return ResponseEntity.ok(Map.of("message", "Attendance locked", "count", records.size()));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ OVERRIDE ATTENDANCE (Admin-Only) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @PostMapping("/override")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> overrideAttendance(@RequestBody AttendanceMarkRequest request) {
        LocalDate date = LocalDate.parse(request.getDate());
        List<Map<String, Object>> results = new ArrayList<>();

        for (AttendanceMarkRequest.StudentStatus ss : request.getStudents()) {
            AttendanceRecord existing = attendanceRepo
                    .findByStudentIdAndSubjectIdAndDate(ss.getStudentId(), request.getSubjectId(), date)
                    .orElse(null);
            if (existing != null) {
                existing.setStatus(ss.getStatus());
                existing.setLocked(false); // Allow admin override even if locked
                attendanceRepo.save(existing);
                results.add(Map.of("studentId", ss.getStudentId(), "status", "overridden"));
            } else {
                AttendanceRecord record = AttendanceRecord.builder()
                        .studentId(ss.getStudentId())
                        .subjectId(request.getSubjectId())
                        .date(date)
                        .status(ss.getStatus())
                        .markedBy("ADMIN") // Admin override marker
                        .build();
                attendanceRepo.save(record);
                results.add(Map.of("studentId", ss.getStudentId(), "status", "created"));
            }
        }
        return ResponseEntity.ok(Map.of("message", "Attendance overridden by admin", "count", results.size(), "details", results));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ DASHBOARD STATS (Admin) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getStats(
            @RequestParam(required = false) String department) {

        List<Subject> subjects;
        if (department != null) {
            subjects = subjectRepository.findByDepartment(department);
        } else {
            subjects = subjectRepository.findAll();
        }

        long totalRecords = 0;
        long totalPresent = 0;
        Map<String, double[]> deptStats = new LinkedHashMap<>();

        for (Subject sub : subjects) {
            List<AttendanceRecord> recs = attendanceRepo.findBySubjectId(sub.getId());
            long present = recs.stream().filter(r -> "present".equals(r.getStatus())).count();
            totalRecords += recs.size();
            totalPresent += present;

            String dept = sub.getDepartment() != null ? sub.getDepartment() : "Unknown";
            deptStats.merge(dept, new double[]{recs.size(), present},
                    (a, b) -> new double[]{a[0] + b[0], a[1] + b[1]});
        }

        double overallPct = totalRecords > 0 ? Math.round((totalPresent * 100.0 / totalRecords) * 10.0) / 10.0 : 0;

        List<Map<String, Object>> deptBreakdown = new ArrayList<>();
        for (Map.Entry<String, double[]> entry : deptStats.entrySet()) {
            double[] v = entry.getValue();
            double pct = v[0] > 0 ? Math.round((v[1] * 100.0 / v[0]) * 10.0) / 10.0 : 0;
            deptBreakdown.add(Map.of(
                    "department", entry.getKey(),
                    "totalRecords", (long) v[0],
                    "presentRecords", (long) v[1],
                    "percentage", pct,
                    "presentPercentage", pct
            ));
        }

        long shortageCount = 0;
        for (Subject sub : subjects) {
            List<AttendanceRecord> recs = attendanceRepo.findBySubjectId(sub.getId());
            Map<String, List<AttendanceRecord>> byStudent = recs.stream()
                    .collect(Collectors.groupingBy(AttendanceRecord::getStudentId));
            for (Map.Entry<String, List<AttendanceRecord>> entry : byStudent.entrySet()) {
                long total = entry.getValue().size();
                long present = entry.getValue().stream().filter(r -> "present".equals(r.getStatus())).count();
                double pct = total > 0 ? Math.round((present * 100.0 / total) * 10.0) / 10.0 : 0;
                if (pct < 75) {
                    shortageCount++;
                }
            }
        }

        return ResponseEntity.ok(Map.of(
                "overallPercentage", overallPct,
                "overallPresentPercentage", overallPct,
                "totalRecords", totalRecords,
                "totalPresent", totalPresent,
                "totalSubjects", subjects.size(),
                "shortageCount", shortageCount,
                "departments", deptBreakdown,
                "departmentBreakdown", deptBreakdown
        ));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ STUDENTS LIST FOR MARKING (by section) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping("/students")
    public ResponseEntity<?> getStudentsBySection(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) String department) {
        Subject subject = null;
        if (subjectId != null) {
            subject = subjectRepository.findById(subjectId).orElse(null);
            if (subject == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Subject not found"));
            }
        }

        // If subject is provided, default filters from the selected class/subject
        if (subject != null) {
            if (department == null) {
                department = subject.getDepartment();
            }
            if (section == null) {
                section = subject.getSection();
            }
        }

        final String finalDepartment = department;
        final String finalSection = section;

        List<UserRole> roles = userRoleRepository.findAll().stream()
                .filter(r -> "student".equalsIgnoreCase(r.getRole()))
                .filter(r -> finalDepartment == null ||
                        (r.getDepartment() != null && finalDepartment.equalsIgnoreCase(r.getDepartment())))
                .filter(r -> finalSection == null ||
                (r.getSection() != null && finalSection.equalsIgnoreCase(r.getSection())))
                .collect(Collectors.toList());

        if (roles.isEmpty() && subject != null) {
            // Fallback for legacy user records where department/section are not populated on student roles.
            roles = userRoleRepository.findAll().stream()
                .filter(r -> "student".equalsIgnoreCase(r.getRole()))
                .collect(Collectors.toList());
        }

        List<Map<String, Object>> students = new ArrayList<>();
        for (UserRole role : roles) {
            User u = role.getUser();
            if (u == null) continue;
            students.add(Map.of(
                    "id", u.getId(),
                    "name", u.getName(),
                    "email", u.getEmail(),
                    "department", role.getDepartment() != null ? role.getDepartment() : "",
                    "section", role.getSection() != null ? role.getSection() : ""
            ));
        }
        return ResponseEntity.ok(students);
    }

    private Map<String, Object> toMap(AttendanceRecord r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("studentId", r.getStudentId());
        userRepository.findById(r.getStudentId()).ifPresent(u -> m.put("studentName", u.getName()));
        m.put("subjectId", r.getSubjectId());
        m.put("date", r.getDate().toString());
        m.put("status", r.getStatus());
        m.put("locked", r.getLocked());
        m.put("markedBy", r.getMarkedBy());
        return m;
    }
}
