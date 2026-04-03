package com.acadex.service;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.acadex.entity.Course;
import com.acadex.entity.CourseFacultyMapping;
import com.acadex.entity.Room;
import com.acadex.entity.Timetable;
import com.acadex.entity.User;
import com.acadex.repository.CourseFacultyMappingRepository;
import com.acadex.repository.CourseRepository;
import com.acadex.repository.RoomRepository;
import com.acadex.repository.TimetableRepository;
import com.acadex.repository.UserRepository;

@Service
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final CourseRepository courseRepository;
    private final CourseFacultyMappingRepository courseFacultyMappingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final TimetableSlotPredictionService timetableSlotPredictionService;

    private static final List<Slot> CATALOG = buildCatalog();

    public TimetableService(TimetableRepository timetableRepository,
                            CourseRepository courseRepository,
                            CourseFacultyMappingRepository courseFacultyMappingRepository,
                            RoomRepository roomRepository,
                            UserRepository userRepository,
                            TimetableSlotPredictionService timetableSlotPredictionService) {
        this.timetableRepository = timetableRepository;
        this.courseRepository = courseRepository;
        this.courseFacultyMappingRepository = courseFacultyMappingRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.timetableSlotPredictionService = timetableSlotPredictionService;
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

    public Map<String, Object> autoGenerateSemesterTimetable(String semester, String department, boolean overwriteExisting) {
        List<Course> semesterCourses = (department != null && !department.isBlank())
                ? courseRepository.findByDepartmentAndSemester(department, semester)
                : courseRepository.findBySemester(semester);

        if (semesterCourses.isEmpty()) {
            return Map.of("message", "No courses found", "created", 0, "skipped", 0);
        }

        List<Room> rooms = roomRepository.findByIsActive(true);
        if (rooms.isEmpty()) rooms = roomRepository.findAll();
        if (rooms.isEmpty()) {
            return Map.of("message", "No rooms available", "created", 0, "skipped", CATALOG.size());
        }

        Map<Long, CourseFacultyMapping> mappingByCourse = new LinkedHashMap<>();
        List<Course> eligibleCourses = new ArrayList<>();

        for (Course course : semesterCourses) {
            List<CourseFacultyMapping> mappings = courseFacultyMappingRepository.findByCourseId(course.getId());
            if (!mappings.isEmpty()) {
                mappingByCourse.put(course.getId(), mappings.get(0));
                eligibleCourses.add(course);
            }
        }

        if (eligibleCourses.isEmpty()) {
            return Map.of("message", "No faculty mappings", "created", 0, "skipped", 0);
        }

        if (overwriteExisting) {
            timetableRepository.deleteAll();
        }

        // ===== EXISTING BUSY TRACKING =====
        Set<String> facultyBusy = new HashSet<>();
        Set<String> roomBusy = new HashSet<>();

        List<Timetable> existingAll = timetableRepository.findAll();
        for (Timetable t : existingAll) {
            if (t.getFaculty() != null && t.getRoom() != null) {
                facultyBusy.add(slotKey(t.getFaculty().getId(), t.getDayOfWeek(), t.getStartTime(), t.getEndTime()));
                roomBusy.add(slotKey(String.valueOf(t.getRoom().getId()), t.getDayOfWeek(), t.getStartTime(), t.getEndTime()));
            }
        }

        int created = 0;
        int skipped = 0;
        List<Map<String, Object>> createdEntries = new ArrayList<>();
        List<Map<String, Object>> skippedEntries = new ArrayList<>();

        // Fill each slot by trying all course/faculty/room combinations before giving up.
        int courseCursor = 0;
        int roomCursor = 0;
        Map<Long, User> facultyCache = new HashMap<>();

        for (Slot slot : CATALOG) {
            boolean assigned = false;

            for (int ci = 0; ci < eligibleCourses.size() && !assigned; ci++) {
                int cIdx = (courseCursor + ci) % eligibleCourses.size();
                Course course = eligibleCourses.get(cIdx);
                CourseFacultyMapping mapping = mappingByCourse.get(course.getId());
                if (mapping == null) {
                    continue;
                }

                User faculty = facultyCache.computeIfAbsent(course.getId(),
                        id -> userRepository.findById(mapping.getFacultyId()).orElse(null));
                if (faculty == null) {
                    continue;
                }

                String facultyKey = slotKey(faculty.getId(), slot.day(), slot.start(), slot.end());
                if (facultyBusy.contains(facultyKey)) {
                    continue;
                }

                for (int ri = 0; ri < rooms.size() && !assigned; ri++) {
                    Room room = rooms.get((roomCursor + ri) % rooms.size());
                    String roomKey = slotKey(String.valueOf(room.getId()), slot.day(), slot.start(), slot.end());
                    if (roomBusy.contains(roomKey)) {
                        continue;
                    }

                    Timetable t = new Timetable();
                    t.setCourse(course);
                    t.setFaculty(faculty);
                    t.setRoom(room);
                    t.setDayOfWeek(slot.day());
                    t.setStartTime(slot.start());
                    t.setEndTime(slot.end());
                    timetableRepository.save(t);

                    facultyBusy.add(facultyKey);
                    roomBusy.add(roomKey);
                    created++;

                    Map<String, Object> detail = new LinkedHashMap<>();
                    detail.put("courseId", course.getId());
                    detail.put("courseName", course.getCourseName());
                    detail.put("facultyId", faculty.getId());
                    detail.put("room", room.getName());
                    detail.put("day", slot.day().name());
                    detail.put("startTime", slot.start().toString());
                    detail.put("endTime", slot.end().toString());
                    detail.put("conflictAdjusted", ci > 0 || ri > 0);
                    createdEntries.add(detail);

                    courseCursor = (cIdx + 1) % eligibleCourses.size();
                    roomCursor = (roomCursor + ri + 1) % rooms.size();
                    assigned = true;
                }
            }

            if (!assigned) {
                skipped++;
                skippedEntries.add(Map.of(
                        "day", slot.day().name(),
                        "startTime", slot.start().toString(),
                        "endTime", slot.end().toString(),
                        "reason", "no available faculty-room combination"
                ));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "FULL timetable generated");
        result.put("created", created);
        result.put("skipped", skipped);
        result.put("createdEntries", createdEntries);
        result.put("skippedEntries", skippedEntries);

        return result;
    }

    private Assignment resolveAssignment(Slot preferred,
                                         String facultyId,
                                         List<Room> rooms,
                                         Set<String> facultyBusy,
                                         Set<String> roomBusy,
                                         Set<DayOfWeek> usedCourseDays) {
        Assignment direct = tryAssign(preferred, facultyId, rooms, facultyBusy, roomBusy, usedCourseDays, true);
        if (direct != null) {
            return direct;
        }

        int startIdx = indexOf(preferred);
        for (int i = 0; i < CATALOG.size(); i++) {
            Slot candidate = CATALOG.get((startIdx + i) % CATALOG.size());
            Assignment found = tryAssign(candidate, facultyId, rooms, facultyBusy, roomBusy, usedCourseDays, true);
            if (found != null) {
                return found;
            }
        }

        for (int i = 0; i < CATALOG.size(); i++) {
            Slot candidate = CATALOG.get((startIdx + i) % CATALOG.size());
            Assignment found = tryAssign(candidate, facultyId, rooms, facultyBusy, roomBusy, usedCourseDays, false);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    private Assignment tryAssign(Slot slot,
                                 String facultyId,
                                 List<Room> rooms,
                                 Set<String> facultyBusy,
                                 Set<String> roomBusy,
                                 Set<DayOfWeek> usedCourseDays,
                                 boolean preferNewDay) {
        if (facultyBusy.contains(slotKey(facultyId, slot.day(), slot.start(), slot.end()))) {
            return null;
        }
        if (preferNewDay && usedCourseDays != null && usedCourseDays.contains(slot.day())
                && usedCourseDays.size() < DayOfWeek.SATURDAY.getValue()) {
            return null;
        }
        for (Room room : rooms) {
            String roomKey = slotKey(String.valueOf(room.getId()), slot.day(), slot.start(), slot.end());
            if (!roomBusy.contains(roomKey)) {
                return new Assignment(slot, room);
            }
        }
        return null;
    }

    private int indexOf(Slot slot) {
        for (int i = 0; i < CATALOG.size(); i++) {
            Slot c = CATALOG.get(i);
            if (c.day() == slot.day() && c.start().equals(slot.start())) {
                return i;
            }
        }
        return 0;
    }

    private Slot offsetSlot(Slot base, int offset) {
        int idx = indexOf(base);
        int shifted = (idx + Math.max(0, offset)) % CATALOG.size();
        return CATALOG.get(shifted);
    }

    private int calculateSessionsPerWeek(Course course) {
        Integer totalHours = course.getTotalHours();
        Integer credits = course.getCredits();
        int requested;
        if (totalHours != null && totalHours > 0) {
            requested = totalHours;
        } else if (credits != null && credits > 0) {
            requested = credits;
        } else {
            requested = 3;
        }

        String type = course.getType() == null ? "" : course.getType().trim().toLowerCase();
        if (type.contains("lab")) {
            requested = Math.max(requested, 2);
        }

        return Math.max(1, Math.min(requested, 6));
    }

    private static List<Slot> buildCatalog() {
        List<DayOfWeek> days = Arrays.asList(
                DayOfWeek.MONDAY,
                DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY,
                DayOfWeek.SATURDAY
        );
        List<LocalTime[]> periods = Arrays.asList(
                new LocalTime[]{LocalTime.of(8, 15), LocalTime.of(9, 5)},
                new LocalTime[]{LocalTime.of(9, 5), LocalTime.of(9, 55)},
                new LocalTime[]{LocalTime.of(10, 10), LocalTime.of(11, 0)},
                new LocalTime[]{LocalTime.of(11, 0), LocalTime.of(11, 50)},
                new LocalTime[]{LocalTime.of(11, 50), LocalTime.of(12, 45)},
                new LocalTime[]{LocalTime.of(12, 45), LocalTime.of(13, 30)},
                new LocalTime[]{LocalTime.of(13, 30), LocalTime.of(14, 20)},
                new LocalTime[]{LocalTime.of(14, 20), LocalTime.of(15, 10)},
                new LocalTime[]{LocalTime.of(15, 10), LocalTime.of(16, 0)}
        );
        List<Slot> slots = new ArrayList<>();
        for (DayOfWeek day : days) {
            for (LocalTime[] period : periods) {
                slots.add(new Slot(day, period[0], period[1]));
            }
        }
        return List.copyOf(slots);
    }

    private List<Map<String, Object>> extractPredictions(Map<String, Object> prediction) {
        Object rows = prediction.get("predictions");
        if (!(rows instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object o : list) {
            if (o instanceof Map<?, ?> m) {
                Map<String, Object> row = new LinkedHashMap<>();
                m.forEach((k, v) -> {
                    if (k != null) row.put(String.valueOf(k), v);
                });
                result.add(row);
            }
        }
        return result;
    }

    private Slot toSlot(Map<String, Object> row) {
        if (row == null) {
            return null;
        }
        DayOfWeek day = parseDay(row.get("day"));
        LocalTime start = parseTime(row.get("startTime"));
        LocalTime end = parseTime(row.get("endTime"));
        if (day == null || start == null) {
            return null;
        }
        if (end == null) {
            end = start.plusHours(1);
        }
        return new Slot(day, start, end);
    }

    private DayOfWeek parseDay(Object raw) {
        if (raw == null) return null;
        String d = String.valueOf(raw).trim().toUpperCase();
        if (d.length() >= 3) {
            d = switch (d.substring(0, 3)) {
                case "MON" -> "MONDAY";
                case "TUE" -> "TUESDAY";
                case "WED" -> "WEDNESDAY";
                case "THU" -> "THURSDAY";
                case "FRI" -> "FRIDAY";
                case "SAT" -> "SATURDAY";
                case "SUN" -> "SUNDAY";
                default -> d;
            };
        }
        try {
            return DayOfWeek.valueOf(d);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private LocalTime parseTime(Object raw) {
        if (raw == null) return null;
        String t = String.valueOf(raw).trim();
        if (t.matches("^\\d{1,2}:\\d{2}$")) {
            return LocalTime.parse(t);
        }
        if (t.matches("^\\d{1,2}$")) {
            return LocalTime.of(Integer.parseInt(t), 0);
        }
        return null;
    }

    private Long toLong(Object raw) {
        if (raw == null) return null;
        try {
            return Long.valueOf(String.valueOf(raw));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String slotKey(String key, DayOfWeek day, LocalTime start, LocalTime end) {
        return key + "|" + day.name() + "|" + start + "|" + end;
    }

    private record Slot(DayOfWeek day, LocalTime start, LocalTime end) {}
    private record Assignment(Slot slot, Room room) {}
}
