package com.acadex.controller;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.acadex.entity.*;
import com.acadex.repository.*;
import com.acadex.service.CourseRiskService;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    @Autowired private CourseRepository courseRepository;
    @Autowired private CourseUnitRepository courseUnitRepository;
    @Autowired private CourseTopicRepository courseTopicRepository;
    @Autowired private CourseFacultyMappingRepository courseFacultyMappingRepository;
    @Autowired private CourseEnrollmentRepository courseEnrollmentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CourseRiskService courseRiskService;
    @Autowired private AttendanceRecordRepository attendanceRecordRepository;

    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
    //  COURSE CRUD (Admin)
    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

    @GetMapping
    public ResponseEntity<?> listCourses(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String facultyId,
            @RequestParam(required = false) String studentId) {

        List<Course> courses;

        if (studentId != null) {
            // Get courses student is enrolled in
            List<CourseEnrollment> enrollments = courseEnrollmentRepository.findByStudentId(studentId);
            List<Long> courseIds = enrollments.stream().map(CourseEnrollment::getCourseId).collect(Collectors.toList());
            courses = courseIds.isEmpty() ? List.of() : courseRepository.findAllById(courseIds);
        } else if (facultyId != null) {
            // Get courses assigned to faculty
            List<CourseFacultyMapping> mappings = courseFacultyMappingRepository.findByFacultyId(facultyId);
            List<Long> courseIds = mappings.stream().map(CourseFacultyMapping::getCourseId).collect(Collectors.toList());
            courses = courseIds.isEmpty() ? List.of() : courseRepository.findAllById(courseIds);
        } else if (department != null && semester != null) {
            courses = courseRepository.findByDepartmentAndSemester(department, semester);
        } else if (department != null) {
            courses = courseRepository.findByDepartment(department);
        } else if (semester != null) {
            courses = courseRepository.findBySemester(semester);
        } else if (status != null) {
            courses = courseRepository.findByStatus(status);
        } else {
            courses = courseRepository.findAll();
        }

        return ResponseEntity.ok(courses.stream().map(this::toCourseMap).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCourse(@PathVariable Long id) {
        return courseRepository.findById(id)
                .map(c -> ResponseEntity.ok(toCourseDetailMap(c)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createCourse(@RequestBody Map<String, Object> body) {
        Course course = Course.builder()
                .courseCode(body.get("courseCode").toString())
                .courseName(body.get("courseName").toString())
                .department(body.get("department").toString())
                .semester(body.get("semester").toString())
                .credits(Integer.valueOf(body.get("credits").toString()))
                .type(body.getOrDefault("type", "Core").toString())
                .totalHours(body.containsKey("totalHours") ? Integer.valueOf(body.get("totalHours").toString()) : null)
                .description(body.containsKey("description") ? body.get("description").toString() : null)
                .status("Draft")
                .createdBy(body.containsKey("createdBy") ? body.get("createdBy").toString() : null)
                .build();
        course = courseRepository.save(course);
        return ResponseEntity.ok(toCourseMap(course));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Course course = courseRepository.findById(id).orElse(null);
        if (course == null) return ResponseEntity.notFound().build();
        if ("Locked".equals(course.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Course is locked and cannot be edited"));
        }

        if (body.containsKey("courseName")) course.setCourseName(body.get("courseName").toString());
        if (body.containsKey("courseCode")) course.setCourseCode(body.get("courseCode").toString());
        if (body.containsKey("department")) course.setDepartment(body.get("department").toString());
        if (body.containsKey("semester")) course.setSemester(body.get("semester").toString());
        if (body.containsKey("credits")) course.setCredits(Integer.valueOf(body.get("credits").toString()));
        if (body.containsKey("type")) course.setType(body.get("type").toString());
        if (body.containsKey("totalHours")) course.setTotalHours(Integer.valueOf(body.get("totalHours").toString()));
        if (body.containsKey("description")) course.setDescription(body.get("description").toString());

        courseRepository.save(course);
        return ResponseEntity.ok(toCourseMap(course));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable Long id) {
        Course course = courseRepository.findById(id).orElse(null);
        if (course == null) return ResponseEntity.notFound().build();
        if ("Locked".equals(course.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot delete a locked course"));
        }
        // Cascade delete related data
        courseTopicRepository.findByCourseId(id).forEach(t -> courseTopicRepository.delete(t));
        courseUnitRepository.findByCourseId(id).forEach(u -> courseUnitRepository.delete(u));
        courseFacultyMappingRepository.findByCourseId(id).forEach(f -> courseFacultyMappingRepository.delete(f));
        courseEnrollmentRepository.findByCourseId(id).forEach(e -> courseEnrollmentRepository.delete(e));
        courseRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Course deleted"));
    }

    // ΓöÇΓöÇ Publish / Lock ΓöÇΓöÇ

    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publishCourse(@PathVariable Long id) {
        Course course = courseRepository.findById(id).orElse(null);
        if (course == null) return ResponseEntity.notFound().build();
        course.setStatus("Published");
        courseRepository.save(course);
        return ResponseEntity.ok(Map.of("message", "Course published", "status", "Published"));
    }

    @PostMapping("/{id}/lock")
    public ResponseEntity<?> lockCourse(@PathVariable Long id) {
        Course course = courseRepository.findById(id).orElse(null);
        if (course == null) return ResponseEntity.notFound().build();
        course.setStatus("Locked");
        courseRepository.save(course);
        return ResponseEntity.ok(Map.of("message", "Course locked", "status", "Locked"));
    }

    // ΓöÇΓöÇ Clone Course ΓöÇΓöÇ

    @PostMapping("/{id}/clone")
    public ResponseEntity<?> cloneCourse(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Course original = courseRepository.findById(id).orElse(null);
        if (original == null) return ResponseEntity.notFound().build();

        String newSemester = body.getOrDefault("semester", original.getSemester()).toString();
        String newCode = body.getOrDefault("courseCode", original.getCourseCode() + "-COPY").toString();

        Course clone = Course.builder()
                .courseCode(newCode)
                .courseName(original.getCourseName())
                .department(original.getDepartment())
                .semester(newSemester)
                .credits(original.getCredits())
                .type(original.getType())
                .totalHours(original.getTotalHours())
                .description(original.getDescription())
                .status("Draft")
                .createdBy(body.containsKey("createdBy") ? body.get("createdBy").toString() : original.getCreatedBy())
                .build();
        clone = courseRepository.save(clone);

        // Clone units and topics
        List<CourseUnit> units = courseUnitRepository.findByCourseIdOrderByUnitNumberAsc(id);
        for (CourseUnit unit : units) {
            CourseUnit newUnit = CourseUnit.builder()
                    .courseId(clone.getId())
                    .unitNumber(unit.getUnitNumber())
                    .unitTitle(unit.getUnitTitle())
                    .expectedHours(unit.getExpectedHours())
                    .build();
            newUnit = courseUnitRepository.save(newUnit);

            List<CourseTopic> topics = courseTopicRepository.findByUnitId(unit.getId());
            for (CourseTopic topic : topics) {
                courseTopicRepository.save(CourseTopic.builder()
                        .unitId(newUnit.getId())
                        .courseId(clone.getId())
                        .topicName(topic.getTopicName())
                        .description(topic.getDescription())
                        .completed(false)
                        .build());
            }
        }

        return ResponseEntity.ok(toCourseMap(clone));
    }

    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
    //  UNITS CRUD
    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

    @GetMapping("/{courseId}/units")
    public ResponseEntity<?> listUnits(@PathVariable Long courseId) {
        List<CourseUnit> units = courseUnitRepository.findByCourseIdOrderByUnitNumberAsc(courseId);
        return ResponseEntity.ok(units.stream().map(this::toUnitMap).collect(Collectors.toList()));
    }

    @PostMapping("/{courseId}/units")
    public ResponseEntity<?> createUnit(@PathVariable Long courseId, @RequestBody Map<String, Object> body) {
        CourseUnit unit = CourseUnit.builder()
                .courseId(courseId)
                .unitNumber(Integer.valueOf(body.get("unitNumber").toString()))
                .unitTitle(body.get("unitTitle").toString())
                .expectedHours(body.containsKey("expectedHours") ? Integer.valueOf(body.get("expectedHours").toString()) : null)
                .build();
        unit = courseUnitRepository.save(unit);
        return ResponseEntity.ok(toUnitMap(unit));
    }

    @PutMapping("/{courseId}/units/{unitId}")
    public ResponseEntity<?> updateUnit(@PathVariable Long courseId, @PathVariable Long unitId, @RequestBody Map<String, Object> body) {
        CourseUnit unit = courseUnitRepository.findById(unitId).orElse(null);
        if (unit == null) return ResponseEntity.notFound().build();
        if (body.containsKey("unitTitle")) unit.setUnitTitle(body.get("unitTitle").toString());
        if (body.containsKey("unitNumber")) unit.setUnitNumber(Integer.valueOf(body.get("unitNumber").toString()));
        if (body.containsKey("expectedHours")) unit.setExpectedHours(Integer.valueOf(body.get("expectedHours").toString()));
        courseUnitRepository.save(unit);
        return ResponseEntity.ok(toUnitMap(unit));
    }

    @DeleteMapping("/{courseId}/units/{unitId}")
    public ResponseEntity<?> deleteUnit(@PathVariable Long courseId, @PathVariable Long unitId) {
        courseTopicRepository.findByUnitId(unitId).forEach(t -> courseTopicRepository.delete(t));
        courseUnitRepository.deleteById(unitId);
        return ResponseEntity.ok(Map.of("message", "Unit deleted"));
    }

    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
    //  TOPICS CRUD
    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

    @GetMapping("/{courseId}/topics")
    public ResponseEntity<?> listTopics(@PathVariable Long courseId, @RequestParam(required = false) Long unitId) {
        List<CourseTopic> topics;
        if (unitId != null) {
            topics = courseTopicRepository.findByUnitId(unitId);
        } else {
            topics = courseTopicRepository.findByCourseId(courseId);
        }
        return ResponseEntity.ok(topics.stream().map(this::toTopicMap).collect(Collectors.toList()));
    }

    @PostMapping("/{courseId}/topics")
    public ResponseEntity<?> createTopic(@PathVariable Long courseId, @RequestBody Map<String, Object> body) {
        CourseTopic topic = CourseTopic.builder()
                .unitId(Long.valueOf(body.get("unitId").toString()))
                .courseId(courseId)
                .topicName(body.get("topicName").toString())
                .description(body.containsKey("description") ? body.get("description").toString() : null)
                .plannedDate(body.containsKey("plannedDate") ? LocalDate.parse(body.get("plannedDate").toString()) : null)
                .completed(false)
                .build();
        topic = courseTopicRepository.save(topic);
        return ResponseEntity.ok(toTopicMap(topic));
    }

    @PutMapping("/{courseId}/topics/{topicId}")
    public ResponseEntity<?> updateTopic(@PathVariable Long courseId, @PathVariable Long topicId, @RequestBody Map<String, Object> body) {
        CourseTopic topic = courseTopicRepository.findById(topicId).orElse(null);
        if (topic == null) return ResponseEntity.notFound().build();
        if (body.containsKey("topicName")) topic.setTopicName(body.get("topicName").toString());
        if (body.containsKey("description")) topic.setDescription(body.get("description").toString());
        if (body.containsKey("plannedDate")) topic.setPlannedDate(LocalDate.parse(body.get("plannedDate").toString()));
        courseTopicRepository.save(topic);
        return ResponseEntity.ok(toTopicMap(topic));
    }

    @DeleteMapping("/{courseId}/topics/{topicId}")
    public ResponseEntity<?> deleteTopic(@PathVariable Long courseId, @PathVariable Long topicId) {
        courseTopicRepository.deleteById(topicId);
        return ResponseEntity.ok(Map.of("message", "Topic deleted"));
    }

    // ΓöÇΓöÇ Mark Topic Completed (Faculty) ΓöÇΓöÇ

    @PostMapping("/{courseId}/topics/{topicId}/complete")
    public ResponseEntity<?> markTopicCompleted(@PathVariable Long courseId, @PathVariable Long topicId) {
        CourseTopic topic = courseTopicRepository.findById(topicId).orElse(null);
        if (topic == null) return ResponseEntity.notFound().build();
        topic.setCompleted(true);
        topic.setCompletedDate(LocalDate.now());
        courseTopicRepository.save(topic);
        return ResponseEntity.ok(Map.of("message", "Topic marked completed", "topicId", topicId));
    }

    @PostMapping("/{courseId}/topics/{topicId}/uncomplete")
    public ResponseEntity<?> unmarkTopicCompleted(@PathVariable Long courseId, @PathVariable Long topicId) {
        CourseTopic topic = courseTopicRepository.findById(topicId).orElse(null);
        if (topic == null) return ResponseEntity.notFound().build();
        topic.setCompleted(false);
        topic.setCompletedDate(null);
        courseTopicRepository.save(topic);
        return ResponseEntity.ok(Map.of("message", "Topic unmarked", "topicId", topicId));
    }

    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
    //  FACULTY MAPPING
    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

    @GetMapping("/{courseId}/faculty")
    public ResponseEntity<?> listFaculty(@PathVariable Long courseId) {
        List<CourseFacultyMapping> mappings = courseFacultyMappingRepository.findByCourseId(courseId);
        return ResponseEntity.ok(mappings.stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", m.getId());
            map.put("courseId", m.getCourseId());
            map.put("facultyId", m.getFacultyId());
            map.put("section", m.getSection());
            userRepository.findById(m.getFacultyId()).ifPresent(u -> map.put("facultyName", u.getName()));
            return map;
        }).collect(Collectors.toList()));
    }

    @PostMapping("/{courseId}/faculty")
    public ResponseEntity<?> assignFaculty(@PathVariable Long courseId, @RequestBody Map<String, Object> body) {
        String facultyId = body.get("facultyId").toString();
        String section = body.getOrDefault("section", "A").toString();

        // Check if already assigned
        if (courseFacultyMappingRepository.findByCourseIdAndFacultyIdAndSection(courseId, facultyId, section).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Faculty already assigned to this course section"));
        }

        CourseFacultyMapping mapping = CourseFacultyMapping.builder()
                .courseId(courseId)
                .facultyId(facultyId)
                .section(section)
                .build();
        courseFacultyMappingRepository.save(mapping);
        return ResponseEntity.ok(Map.of("message", "Faculty assigned"));
    }

    @DeleteMapping("/{courseId}/faculty/{mappingId}")
    public ResponseEntity<?> removeFaculty(@PathVariable Long courseId, @PathVariable Long mappingId) {
        courseFacultyMappingRepository.deleteById(mappingId);
        return ResponseEntity.ok(Map.of("message", "Faculty removed"));
    }

    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
    //  ENROLLMENT
    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

    @GetMapping("/{courseId}/enrollments")
    public ResponseEntity<?> listEnrollments(@PathVariable Long courseId) {
        List<CourseEnrollment> enrollments = courseEnrollmentRepository.findByCourseId(courseId);
        return ResponseEntity.ok(enrollments.stream().map(e -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", e.getId());
            map.put("courseId", e.getCourseId());
            map.put("studentId", e.getStudentId());
            map.put("section", e.getSection());
            userRepository.findById(e.getStudentId()).ifPresent(u -> map.put("studentName", u.getName()));
            return map;
        }).collect(Collectors.toList()));
    }

    @PostMapping("/{courseId}/enroll")
    public ResponseEntity<?> enrollStudent(@PathVariable Long courseId, @RequestBody Map<String, Object> body) {
        String studentId = body.get("studentId").toString();
        String section = body.getOrDefault("section", "A").toString();

        if (courseEnrollmentRepository.findByCourseIdAndStudentId(courseId, studentId).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student already enrolled"));
        }

        CourseEnrollment enrollment = CourseEnrollment.builder()
                .courseId(courseId)
                .studentId(studentId)
                .section(section)
                .build();
        courseEnrollmentRepository.save(enrollment);
        return ResponseEntity.ok(Map.of("message", "Student enrolled"));
    }

    @DeleteMapping("/{courseId}/enrollments/{enrollmentId}")
    public ResponseEntity<?> unenrollStudent(@PathVariable Long courseId, @PathVariable Long enrollmentId) {
        courseEnrollmentRepository.deleteById(enrollmentId);
        return ResponseEntity.ok(Map.of("message", "Student unenrolled"));
    }

    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
    //  PROGRESS & ANALYTICS
    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

    @GetMapping("/{id}/progress")
    public ResponseEntity<?> getCourseProgress(@PathVariable Long id) {
        Course course = courseRepository.findById(id).orElse(null);
        if (course == null) return ResponseEntity.notFound().build();

        long total = courseTopicRepository.countByCourseId(id);
        long completed = courseTopicRepository.countByCourseIdAndCompleted(id, true);
        double coverage = total > 0 ? Math.round(completed * 1000.0 / total) / 10.0 : 0;

        List<CourseUnit> units = courseUnitRepository.findByCourseIdOrderByUnitNumberAsc(id);
        List<Map<String, Object>> unitProgress = units.stream().map(u -> {
            Map<String, Object> um = new LinkedHashMap<>();
            um.put("unitId", u.getId());
            um.put("unitNumber", u.getUnitNumber());
            um.put("unitTitle", u.getUnitTitle());
            List<CourseTopic> topics = courseTopicRepository.findByUnitId(u.getId());
            long unitTotal = topics.size();
            long unitDone = topics.stream().filter(CourseTopic::getCompleted).count();
            um.put("totalTopics", unitTotal);
            um.put("completedTopics", unitDone);
            um.put("coverage", unitTotal > 0 ? Math.round(unitDone * 1000.0 / unitTotal) / 10.0 : 0);
            return um;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("courseId", id);
        result.put("courseName", course.getCourseName());
        result.put("totalTopics", total);
        result.put("completedTopics", completed);
        result.put("syllabusCoverage", coverage);
        result.put("unitProgress", unitProgress);
        return ResponseEntity.ok(result);
    }

    // ΓöÇΓöÇ ML Risk Assessment ΓöÇΓöÇ

    @GetMapping("/{id}/risk")
    public ResponseEntity<?> getCourseRisk(@PathVariable Long id) {
        return ResponseEntity.ok(courseRiskService.assessCourseRisk(id));
    }

    @GetMapping("/risk/all")
    public ResponseEntity<?> getAllCourseRisks() {
        return ResponseEntity.ok(courseRiskService.assessAllCourses());
    }

    // ΓöÇΓöÇ Eligibility Check ΓöÇΓöÇ

    @GetMapping("/{courseId}/eligibility/{studentId}")
    public ResponseEntity<?> checkEligibility(@PathVariable Long courseId, @PathVariable String studentId) {
        Course course = courseRepository.findById(courseId).orElse(null);
        if (course == null) return ResponseEntity.notFound().build();

        long totalTopics = courseTopicRepository.countByCourseId(courseId);
        long completedTopics = courseTopicRepository.countByCourseIdAndCompleted(courseId, true);
        double syllabusCoverage = totalTopics > 0 ? (completedTopics * 100.0 / totalTopics) : 100;

        // Calculate real attendance from records
        List<AttendanceRecord> records = attendanceRecordRepository.findByStudentId(studentId);
        long totalRecords = records.size();
        long presentRecords = records.stream().filter(r -> "present".equals(r.getStatus())).count();
        double attendance = totalRecords > 0 ? Math.round((presentRecords * 100.0 / totalRecords) * 10.0) / 10.0 : 100.0;

        boolean eligible = attendance >= 75 && syllabusCoverage >= 80;
        List<String> reasons = new ArrayList<>();
        if (attendance < 75) reasons.add("Attendance below 75% (" + attendance + "%)");
        if (syllabusCoverage < 80) reasons.add("Syllabus coverage below 80% (" + Math.round(syllabusCoverage) + "%)");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("courseId", courseId);
        result.put("studentId", studentId);
        result.put("eligible", eligible);
        result.put("attendance", attendance);
        result.put("syllabusCoverage", Math.round(syllabusCoverage * 10.0) / 10.0);
        result.put("reasons", reasons);
        return ResponseEntity.ok(result);
    }

    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
    //  HELPER MAPPERS
    // ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

    private Map<String, Object> toCourseMap(Course c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("courseCode", c.getCourseCode());
        m.put("courseName", c.getCourseName());
        m.put("department", c.getDepartment());
        m.put("semester", c.getSemester());
        m.put("credits", c.getCredits());
        m.put("type", c.getType());
        m.put("totalHours", c.getTotalHours());
        m.put("status", c.getStatus());
        m.put("description", c.getDescription());

        // Enrichments
        long totalTopics = courseTopicRepository.countByCourseId(c.getId());
        long completedTopics = courseTopicRepository.countByCourseIdAndCompleted(c.getId(), true);
        m.put("totalTopics", totalTopics);
        m.put("completedTopics", completedTopics);
        m.put("syllabusCoverage", totalTopics > 0 ? Math.round(completedTopics * 1000.0 / totalTopics) / 10.0 : 0);

        long enrollments = courseEnrollmentRepository.countByCourseId(c.getId());
        m.put("enrolledStudents", enrollments);

        List<CourseFacultyMapping> facMappings = courseFacultyMappingRepository.findByCourseId(c.getId());
        List<String> facultyNames = facMappings.stream().map(f -> {
            return userRepository.findById(f.getFacultyId()).map(User::getName).orElse(f.getFacultyId());
        }).collect(Collectors.toList());
        m.put("facultyNames", facultyNames);

        return m;
    }

    private Map<String, Object> toCourseDetailMap(Course c) {
        Map<String, Object> m = toCourseMap(c);

        // Include units with their topics
        List<CourseUnit> units = courseUnitRepository.findByCourseIdOrderByUnitNumberAsc(c.getId());
        List<Map<String, Object>> unitsList = units.stream().map(u -> {
            Map<String, Object> um = toUnitMap(u);
            List<CourseTopic> topics = courseTopicRepository.findByUnitId(u.getId());
            um.put("topics", topics.stream().map(this::toTopicMap).collect(Collectors.toList()));
            return um;
        }).collect(Collectors.toList());
        m.put("units", unitsList);

        // Faculty mappings
        List<CourseFacultyMapping> facMappings = courseFacultyMappingRepository.findByCourseId(c.getId());
        m.put("faculty", facMappings.stream().map(f -> {
            Map<String, Object> fm = new LinkedHashMap<>();
            fm.put("id", f.getId());
            fm.put("facultyId", f.getFacultyId());
            fm.put("section", f.getSection());
            userRepository.findById(f.getFacultyId()).ifPresent(u -> fm.put("facultyName", u.getName()));
            return fm;
        }).collect(Collectors.toList()));

        // Enrollments
        m.put("enrollmentCount", courseEnrollmentRepository.countByCourseId(c.getId()));

        return m;
    }

    private Map<String, Object> toUnitMap(CourseUnit u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("courseId", u.getCourseId());
        m.put("unitNumber", u.getUnitNumber());
        m.put("unitTitle", u.getUnitTitle());
        m.put("expectedHours", u.getExpectedHours());
        return m;
    }

    private Map<String, Object> toTopicMap(CourseTopic t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("unitId", t.getUnitId());
        m.put("courseId", t.getCourseId());
        m.put("topicName", t.getTopicName());
        m.put("description", t.getDescription());
        m.put("plannedDate", t.getPlannedDate());
        m.put("completed", t.getCompleted());
        m.put("completedDate", t.getCompletedDate());
        return m;
    }
}
