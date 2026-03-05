package com.acadex.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.dto.ApiResponse;
import com.acadex.dto.RegisterRequest;
import com.acadex.dto.SeatAllocationRequest;
import com.acadex.dto.SeatAllocationResponse;
import com.acadex.dto.SeatAssignment;
import com.acadex.entity.Exam;
import com.acadex.entity.ExamRegistration;
import com.acadex.entity.Room;
import com.acadex.entity.User;
import com.acadex.entity.UserRole;
import com.acadex.repository.ExamRegistrationRepository;
import com.acadex.repository.ExamRepository;
import com.acadex.repository.ExamResultRepository;
import com.acadex.repository.ExamSubmissionRepository;
import com.acadex.repository.RoomRepository;
import com.acadex.repository.SeatAllocationRepository;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;
import com.acadex.service.SeatingAllocatorService;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired private UserRepository userRepository;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private ExamRepository examRepository;
    @Autowired private ExamSubmissionRepository submissionRepository;
    @Autowired private ExamResultRepository resultRepository;
    @Autowired private ExamRegistrationRepository registrationRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private SeatingAllocatorService seatingAllocatorService;
    @Autowired private SeatAllocationRepository seatAllocationRepository;
    @Autowired private com.acadex.service.StudentRiskService studentRiskService;
    @Autowired private com.acadex.repository.CourseRepository courseRepository;
    @Autowired private com.acadex.repository.CourseTopicRepository courseTopicRepository;
    @Autowired private com.acadex.repository.AttendanceRecordRepository attendanceRecordRepository;
    @Autowired private com.acadex.repository.TeacherScoreRepository teacherScoreRepository;

    // ========== User Management ==========

    @GetMapping("/users")
    public ResponseEntity<?> listUsers(@RequestParam(required = false) String role,
                                        @RequestParam(required = false) String search) {
        List<User> users;
        if (search != null && !search.isEmpty()) {
            users = userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(search, search);
        } else {
            users = userRepository.findAll();
        }

        if (role != null) {
            users = users.stream()
                    .filter(u -> u.getRoles() != null && u.getRoles().stream().anyMatch(r -> role.equals(r.getRole())))
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> result = users.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("name", u.getName());
            m.put("email", u.getEmail());
            m.put("createdAt", u.getCreatedAt());
            m.put("roles", u.getRoles() != null
                    ? u.getRoles().stream().map(UserRole::getRole).collect(Collectors.toList())
                    : List.of());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email already exists"));
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .build();
        user = userRepository.save(user);

        UserRole role = UserRole.builder()
                .user(user)
                .role(request.getRole() != null ? request.getRole() : "student")
                .department(request.getDepartment())
                .build();
        userRoleRepository.save(role);

        return ResponseEntity.ok(ApiResponse.success("User created", Map.of("id", user.getId())));
    }

    @PostMapping("/users/bulk")
    public ResponseEntity<?> bulkCreateUsers(@RequestBody List<RegisterRequest> requests) {
        int created = 0;
        List<String> errors = new ArrayList<>();
        for (RegisterRequest req : requests) {
            if (userRepository.existsByEmail(req.getEmail())) {
                errors.add("Email exists: " + req.getEmail());
                continue;
            }
            User user = User.builder()
                    .name(req.getName())
                    .email(req.getEmail())
                    .password(passwordEncoder.encode(req.getPassword()))
                    .emailVerified(false)
                    .build();
            user = userRepository.save(user);

            UserRole role = UserRole.builder()
                    .user(user)
                    .role(req.getRole() != null ? req.getRole() : "student")
                    .department(req.getDepartment())
                    .build();
            userRoleRepository.save(role);
            created++;
        }
        return ResponseEntity.ok(Map.of("created", created, "errors", errors));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody Map<String, Object> body) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        if (body.containsKey("name")) user.setName((String) body.get("name"));
        if (body.containsKey("email")) user.setEmail((String) body.get("email"));
        if (body.containsKey("password")) user.setPassword(passwordEncoder.encode((String) body.get("password")));
        userRepository.save(user);

        if (body.containsKey("role")) {
            userRoleRepository.deleteByUserId(id);
            UserRole role = UserRole.builder()
                    .user(user)
                    .role((String) body.get("role"))
                    .department((String) body.get("department"))
                    .build();
            userRoleRepository.save(role);
        }

        return ResponseEntity.ok(ApiResponse.success("User updated"));
    }

    // Frontend uses PATCH /admin/users/{id}
    @PatchMapping("/users/{id}")
    public ResponseEntity<?> patchUser(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return updateUser(id, body);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        userRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("User deleted"));
    }

    // ========== Analytics ==========

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics() {
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalUsers", userRepository.count());
        analytics.put("totalExams", examRepository.count());
        analytics.put("totalRooms", roomRepository.count());
        analytics.put("totalSubmissions", submissionRepository.count());

        // Users by role
        Map<String, Long> roleCount = new HashMap<>();
        List<UserRole> allRoles = userRoleRepository.findAll();
        for (UserRole r : allRoles) {
            roleCount.merge(r.getRole(), 1L, Long::sum);
        }
        analytics.put("usersByRole", roleCount);

        // Exams by status
        Map<String, Long> examStatus = new HashMap<>();
        for (Exam e : examRepository.findAll()) {
            examStatus.merge(e.getStatus(), 1L, Long::sum);
        }
        analytics.put("examsByStatus", examStatus);

        // Course progress
        var courses = courseRepository.findAll();
        double totalCoverage = 0;
        List<Map<String, Object>> courseProgress = new ArrayList<>();
        for (var c : courses) {
            long total = courseTopicRepository.countByCourseId(c.getId());
            long completed = courseTopicRepository.countByCourseIdAndCompleted(c.getId(), true);
            double coverage = total > 0 ? (completed * 100.0 / total) : 0;
            totalCoverage += coverage;
            Map<String, Object> cp = new HashMap<>();
            cp.put("courseId", c.getId());
            cp.put("courseName", c.getCourseName());
            cp.put("coveragePercentage", Math.round(coverage * 10.0) / 10.0);
            courseProgress.add(cp);
        }
        analytics.put("courseProgress", courseProgress);
        analytics.put("averageSyllabusCoverage", courses.isEmpty() ? 0 :
                Math.round((totalCoverage / courses.size()) * 10.0) / 10.0);

        // Faculty credibility scores
        var teacherScores = teacherScoreRepository.findAll();
        analytics.put("facultyCredibilityScores", teacherScores.stream().map(ts -> {
            Map<String, Object> m = new HashMap<>();
            m.put("facultyId", ts.getTeacherId());
            m.put("credibilityScore", ts.getCredibilityScore());
            m.put("riskLevel", ts.getRiskLevel());
            m.put("low_trust_flag", ts.getCredibilityScore() < 60);
            return m;
        }).collect(Collectors.toList()));

        // Attendance statistics
        var allRecords = attendanceRecordRepository.findAll();
        long totalRecords = allRecords.size();
        long presentRecords = allRecords.stream()
                .filter(r -> "present".equals(r.getStatus())).count();
        analytics.put("attendanceStats", Map.of(
            "totalRecords", totalRecords,
            "presentCount", presentRecords,
            "absentCount", totalRecords - presentRecords,
            "overallPercentage", totalRecords > 0 ?
                Math.round((presentRecords * 100.0 / totalRecords) * 10.0) / 10.0 : 0
        ));

        // Student risk distribution
        analytics.put("studentRiskDistribution", studentRiskService.getRiskDistribution());

        return ResponseEntity.ok(analytics);
    }

    // ========== Seat Allocation (ML-Optimized) ==========

    @PostMapping("/seat-allocation")
    public ResponseEntity<?> allocateSeatsML(@RequestBody SeatAllocationRequest request) {
        if (request.getExamId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("examId is required"));
        }
        if (request.getRoomIds() == null || request.getRoomIds().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("At least one room is required"));
        }

        // Fetch registrations
        List<ExamRegistration> regs = registrationRepository.findByExamId(request.getExamId());
        if (regs.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("No registrations found for this exam"));
        }

        // Fetch rooms
        List<Room> rooms = request.getRoomIds().stream()
                .map(roomRepository::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
        if (rooms.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("No valid rooms found"));
        }

        // Build student info list with department from UserRole
        List<SeatingAllocatorService.StudentInfo> students = regs.stream().map(reg -> {
            User user = userRepository.findById(reg.getStudentId()).orElse(null);
            String dept = "General";
            if (user != null && user.getRoles() != null) {
                dept = user.getRoles().stream()
                        .map(UserRole::getDepartment)
                        .filter(Objects::nonNull)
                        .findFirst().orElse("General");
            }
            return new SeatingAllocatorService.StudentInfo(
                    reg.getStudentId(),
                    user != null ? user.getName() : "Unknown",
                    user != null ? user.getEmail() : reg.getStudentId(),
                    dept
            );
        }).collect(Collectors.toList());

        // Run ML allocation
        SeatAllocationResponse result = seatingAllocatorService.allocate(
                students, rooms,
                request.getCustomMembersPerBench(),
                request.getStrategy() != null ? request.getStrategy() : "ml_optimized"
        );

        // Persist seat numbers back to registrations + SeatAllocation entities
        seatAllocationRepository.deleteByExamId(request.getExamId());
        Map<String, String> seatMap = result.getAssignments().stream()
                .collect(Collectors.toMap(SeatAssignment::getStudentId, SeatAssignment::getSeatNumber, (a, b) -> a));
        for (ExamRegistration reg : regs) {
            String seat = seatMap.get(reg.getStudentId());
            if (seat != null) {
                reg.setSeatNumber(seat);
                registrationRepository.save(reg);

                // Parse room
                Long roomId2 = rooms.get(0).getId();
                for (Room r : rooms) {
                    if (seat.startsWith(r.getName())) { roomId2 = r.getId(); break; }
                }
                seatAllocationRepository.save(com.acadex.entity.SeatAllocation.builder()
                        .examId(request.getExamId())
                        .roomId(roomId2)
                        .studentId(reg.getStudentId())
                        .seatNumber(seat)
                        .build());
            }
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/seat-allocation/{examId}")
    public ResponseEntity<?> allocateSeatsLegacy(@PathVariable Long examId, @RequestBody Map<String, Object> body) {
        // Legacy endpoint ΓÇö delegate to ML with defaults
        SeatAllocationRequest req = new SeatAllocationRequest();
        req.setExamId(examId);
        req.setStrategy("ml_optimized");

        Long roomId = body.get("roomId") != null ? Long.parseLong(body.get("roomId").toString()) : null;
        if (roomId != null) {
            req.setRoomIds(List.of(roomId));
        } else {
            // Use all active rooms
            req.setRoomIds(roomRepository.findByIsActive(true).stream().map(Room::getId).collect(Collectors.toList()));
        }
        return allocateSeatsML(req);
    }

    @GetMapping("/seat-allocation/{examId}")
    public ResponseEntity<?> getSeatAllocation(@PathVariable Long examId) {
        List<ExamRegistration> regs = registrationRepository.findByExamId(examId);
        List<Map<String, Object>> result = regs.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("studentId", r.getStudentId());
            m.put("seatNumber", r.getSeatNumber());
            m.put("status", r.getRegistrationStatus());
            userRepository.findById(r.getStudentId()).ifPresent(u -> {
                m.put("studentName", u.getName());
                m.put("studentEmail", u.getEmail());
                String dept = u.getRoles() != null ? u.getRoles().stream()
                        .map(UserRole::getDepartment)
                        .filter(Objects::nonNull)
                        .findFirst().orElse("General") : "General";
                m.put("department", dept);
            });
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
