package com.acadex.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.dto.ApiResponse;
import com.acadex.dto.ExamRequest;
import com.acadex.dto.QuestionRequest;
import com.acadex.dto.SeatAllocationResponse;
import com.acadex.dto.SeatAssignment;
import com.acadex.entity.Exam;
import com.acadex.entity.ExamRegistration;
import com.acadex.entity.Question;
import com.acadex.entity.Room;
import com.acadex.entity.SeatAllocation;
import com.acadex.entity.User;
import com.acadex.entity.UserRole;
import com.acadex.repository.ExamRegistrationRepository;
import com.acadex.repository.ExamRepository;
import com.acadex.repository.QuestionRepository;
import com.acadex.repository.RoomRepository;
import com.acadex.repository.SeatAllocationRepository;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    @Autowired private ExamRepository examRepository;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private ExamRegistrationRepository registrationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private SeatAllocationRepository seatAllocationRepository;
    @Autowired private com.acadex.service.SeatingAllocatorService seatingAllocatorService;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<?> listExams(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String createdBy,
            @RequestParam(required = false) Long id) {
        if (id != null) {
            return examRepository.findById(id)
                    .map(e -> ResponseEntity.ok(toMap(e)))
                    .orElse(ResponseEntity.notFound().build());
        }
        List<Exam> exams;
        if (createdBy != null && status != null) {
            exams = examRepository.findByCreatedByAndStatus(createdBy, status);
        } else if (status != null) {
            exams = examRepository.findByStatus(status);
        } else if (createdBy != null) {
            exams = examRepository.findByCreatedBy(createdBy);
        } else {
            exams = examRepository.findAll();
        }
        return ResponseEntity.ok(exams.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getExam(@PathVariable Long id) {
        return examRepository.findById(id)
                .map(e -> ResponseEntity.ok(toMap(e)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createExam(@RequestBody ExamRequest request, Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();
        String role = user.getRoles() != null && !user.getRoles().isEmpty()
                ? user.getRoles().get(0).getRole() : "faculty";

        String now = LocalDateTime.now().toString();
        Exam exam = Exam.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .duration(request.getDuration())
                .totalMarks(request.getTotalMarks())
                .passingMarks(request.getPassingMarks())
                .scheduledDate(request.getScheduledDate())
                .scheduledTime(request.getScheduledTime())
                .endTime(request.getEndTime())
                .status(request.getStatus() != null ? request.getStatus() : "draft")
                .randomizeQuestions(request.getRandomizeQuestions())
                .randomizeOptions(request.getRandomizeOptions())
                .classId(request.getClassId())
                .createdByRole(role)
                .createdBy(user.getId())
                .createdAt(now)
                .updatedAt(now)
                .build();

        if (request.getRoomId() != null) {
            roomRepository.findById(request.getRoomId()).ifPresent(exam::setRoom);
        }
        exam = examRepository.save(exam);

        if (request.getQuestions() != null) {
            for (QuestionRequest qr : request.getQuestions()) {
                Question q = Question.builder()
                        .exam(exam)
                        .questionText(qr.getQuestionText())
                        .questionType(qr.getQuestionType())
                        .correctAnswer(qr.getCorrectAnswer())
                        .marks(qr.getMarks())
                        .order(qr.getOrder() != null ? qr.getOrder() : 0)
                        .build();
                if (qr.getOptions() != null) {
                    try { q.setOptions(objectMapper.writeValueAsString(qr.getOptions())); }
                    catch (Exception ignored) {}
                }
                questionRepository.save(q);
            }
        }
        return ResponseEntity.ok(toMap(exam));
    }

    // Query-param based update: PUT /exams?id=X (used by frontend)
    @PutMapping
    public ResponseEntity<?> updateExamByParam(@RequestParam Long id, @RequestBody ExamRequest request) {
        return updateExam(id, request);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateExam(@PathVariable Long id, @RequestBody ExamRequest request) {
        Exam exam = examRepository.findById(id).orElse(null);
        if (exam == null) return ResponseEntity.notFound().build();

        if (request.getTitle() != null) exam.setTitle(request.getTitle());
        if (request.getDescription() != null) exam.setDescription(request.getDescription());
        if (request.getDuration() != null) exam.setDuration(request.getDuration());
        if (request.getTotalMarks() != null) exam.setTotalMarks(request.getTotalMarks());
        if (request.getPassingMarks() != null) exam.setPassingMarks(request.getPassingMarks());
        if (request.getScheduledDate() != null) exam.setScheduledDate(request.getScheduledDate());
        if (request.getScheduledTime() != null) exam.setScheduledTime(request.getScheduledTime());
        if (request.getEndTime() != null) exam.setEndTime(request.getEndTime());
        if (request.getStatus() != null) exam.setStatus(request.getStatus());
        if (request.getRandomizeQuestions() != null) exam.setRandomizeQuestions(request.getRandomizeQuestions());
        if (request.getRandomizeOptions() != null) exam.setRandomizeOptions(request.getRandomizeOptions());
        if (request.getClassId() != null) exam.setClassId(request.getClassId());
        if (request.getRoomId() != null) {
            roomRepository.findById(request.getRoomId()).ifPresent(exam::setRoom);
        }
        exam.setUpdatedAt(LocalDateTime.now().toString());
        examRepository.save(exam);

        if (request.getQuestions() != null) {
            questionRepository.deleteByExamId(id);
            for (QuestionRequest qr : request.getQuestions()) {
                Question q = Question.builder()
                        .exam(exam)
                        .questionText(qr.getQuestionText())
                        .questionType(qr.getQuestionType())
                        .correctAnswer(qr.getCorrectAnswer())
                        .marks(qr.getMarks())
                        .order(qr.getOrder() != null ? qr.getOrder() : 0)
                        .build();
                if (qr.getOptions() != null) {
                    try { q.setOptions(objectMapper.writeValueAsString(qr.getOptions())); }
                    catch (Exception ignored) {}
                }
                questionRepository.save(q);
            }
        }
        return ResponseEntity.ok(toMap(exam));
    }

    // Query-param based delete: DELETE /exams?id=X (used by frontend)
    @DeleteMapping
    public ResponseEntity<?> deleteExamByParam(@RequestParam Long id) {
        return deleteExam(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteExam(@PathVariable Long id) {
        if (!examRepository.existsById(id)) return ResponseEntity.notFound().build();
        examRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Exam deleted"));
    }

    // Exam Questions
    @GetMapping("/{examId}/questions")
    public ResponseEntity<?> getQuestions(@PathVariable Long examId) {
        List<Question> questions = questionRepository.findByExamIdOrderByOrderAsc(examId);
        return ResponseEntity.ok(questions.stream().map(this::questionToMap).collect(Collectors.toList()));
    }

    @PostMapping("/{examId}/questions")
    public ResponseEntity<?> addQuestion(@PathVariable Long examId, @RequestBody QuestionRequest request) {
        Exam exam = examRepository.findById(examId).orElse(null);
        if (exam == null) return ResponseEntity.notFound().build();

        Question q = Question.builder()
                .exam(exam)
                .questionText(request.getQuestionText())
                .questionType(request.getQuestionType())
                .correctAnswer(request.getCorrectAnswer())
                .marks(request.getMarks())
                .order(request.getOrder() != null ? request.getOrder() : 0)
                .build();
        if (request.getOptions() != null) {
            try { q.setOptions(objectMapper.writeValueAsString(request.getOptions())); }
            catch (Exception ignored) {}
        }
        questionRepository.save(q);
        return ResponseEntity.ok(questionToMap(q));
    }

    // Registrations
    @GetMapping("/{examId}/registrations")
    public ResponseEntity<?> getRegistrations(@PathVariable Long examId, Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();
        // Check if this is a student checking their own registration
        Optional<ExamRegistration> selfReg = registrationRepository.findByExamIdAndStudentId(examId, user.getId());
        if (selfReg.isPresent()) {
            Map<String, Object> r = new HashMap<>();
            r.put("registered", true);
            r.put("seatNumber", selfReg.get().getSeatNumber());
            r.put("status", selfReg.get().getRegistrationStatus());
            return ResponseEntity.ok(r);
        }
        // For faculty/admin ΓÇö list all registrations
        List<ExamRegistration> regs = registrationRepository.findByExamId(examId);
        return ResponseEntity.ok(regs);
    }

    // Check registration status for current student
    @GetMapping("/{examId}/check-registration")
    public ResponseEntity<?> checkRegistration(@PathVariable Long examId, Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();
        Optional<ExamRegistration> reg = registrationRepository.findByExamIdAndStudentId(examId, user.getId());
        if (reg.isPresent()) {
            Map<String, Object> r = new HashMap<>();
            r.put("registered", true);
            r.put("seatNumber", reg.get().getSeatNumber());
            r.put("status", reg.get().getRegistrationStatus());
            return ResponseEntity.ok(r);
        }
        return ResponseEntity.ok(Map.of("registered", false));
    }

    @PostMapping("/{examId}/register")
    public ResponseEntity<?> register(@PathVariable Long examId, Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElseThrow();

        if (registrationRepository.findByExamIdAndStudentId(examId, user.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Already registered"));
        }

        ExamRegistration reg = ExamRegistration.builder()
                .exam(examRepository.findById(examId).orElseThrow())
                .studentId(user.getId())
                .registrationStatus("approved")
                .eligibilityChecked(true)
                .registeredAt(LocalDateTime.now().toString())
                .build();
        registrationRepository.save(reg);
        return ResponseEntity.ok(ApiResponse.success("Registered successfully"));
    }

    private Map<String, Object> toMap(Exam e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", e.getId());
        m.put("title", e.getTitle());
        m.put("description", e.getDescription());
        m.put("duration", e.getDuration());
        m.put("totalMarks", e.getTotalMarks());
        m.put("passingMarks", e.getPassingMarks());
        m.put("scheduledDate", e.getScheduledDate());
        m.put("scheduledTime", e.getScheduledTime());
        m.put("date", e.getScheduledDate());
        m.put("endTime", e.getEndTime());
        m.put("status", e.getStatus());
        m.put("randomizeQuestions", e.getRandomizeQuestions());
        m.put("randomizeOptions", e.getRandomizeOptions());
        m.put("roomId", e.getRoom() != null ? e.getRoom().getId() : null);
        m.put("classId", e.getClassId());
        m.put("createdBy", e.getCreatedBy());
        m.put("createdByRole", e.getCreatedByRole());
        m.put("createdAt", e.getCreatedAt());
        m.put("updatedAt", e.getUpdatedAt());
        m.put("questionCount", questionRepository.countByExamId(e.getId()));
        m.put("registrationCount", registrationRepository.countByExamId(e.getId()));
        return m;
    }

    // ── Seating Allocation ──

    @PostMapping("/{examId}/generate-seating")
    public ResponseEntity<?> generateSeating(@PathVariable Long examId,
                                             @RequestBody(required = false) Map<String, Object> body) {
        Exam exam = examRepository.findById(examId).orElse(null);
        if (exam == null) return ResponseEntity.notFound().build();

        // Get registered students
        List<ExamRegistration> regs = registrationRepository.findByExamId(examId);
        if (regs.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No registrations found for this exam"));
        }

        // Determine rooms
        List<Room> rooms;
        if (body != null && body.containsKey("roomIds")) {
            List<Number> roomIds = (List<Number>) body.get("roomIds");
            rooms = roomIds.stream()
                    .map(id -> roomRepository.findById(id.longValue()).orElse(null))
                    .filter(r -> r != null)
                    .collect(Collectors.toList());
        } else {
            rooms = roomRepository.findByIsActive(true);
        }
        if (rooms.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No rooms available"));
        }

        String strategy = body != null && body.containsKey("strategy")
                ? (String) body.get("strategy") : "sequential";

        // Build student info
        List<com.acadex.service.SeatingAllocatorService.StudentInfo> students = regs.stream().map(reg -> {
            User user = userRepository.findById(reg.getStudentId()).orElse(null);
            String dept = "General";
            if (user != null && user.getRoles() != null) {
                dept = user.getRoles().stream()
                        .map(UserRole::getDepartment)
                        .filter(java.util.Objects::nonNull)
                        .findFirst().orElse("General");
            }
            return new com.acadex.service.SeatingAllocatorService.StudentInfo(
                    reg.getStudentId(),
                    user != null ? user.getName() : "Unknown",
                    user != null ? user.getEmail() : reg.getStudentId(),
                    dept
            );
        }).collect(Collectors.toList());

        // Run allocation
        SeatAllocationResponse result = seatingAllocatorService.allocate(students, rooms, null, strategy);

        // Persist SeatAllocation entities & update registrations
        seatAllocationRepository.deleteByExamId(examId);
        for (SeatAssignment sa : result.getAssignments()) {
            // Parse room from seat number (format: RoomName-R1C1B1)
            Long roomId = rooms.get(0).getId(); // default
            for (Room r : rooms) {
                if (sa.getSeatNumber() != null && sa.getSeatNumber().startsWith(r.getName())) {
                    roomId = r.getId();
                    break;
                }
            }
            SeatAllocation allocation = SeatAllocation.builder()
                    .examId(examId)
                    .roomId(roomId)
                    .studentId(sa.getStudentId())
                    .seatNumber(sa.getSeatNumber())
                    .build();
            seatAllocationRepository.save(allocation);

            // Also update registration
            regs.stream()
                    .filter(reg -> reg.getStudentId().equals(sa.getStudentId()))
                    .findFirst()
                    .ifPresent(reg -> {
                        reg.setSeatNumber(sa.getSeatNumber());
                        registrationRepository.save(reg);
                    });
        }

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> questionToMap(Question q) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", q.getId());
        m.put("examId", q.getExam().getId());
        m.put("questionText", q.getQuestionText());
        m.put("text", q.getQuestionText());
        m.put("questionType", q.getQuestionType());
        m.put("type", q.getQuestionType());
        m.put("options", q.getOptions());
        m.put("correctAnswer", q.getCorrectAnswer());
        m.put("marks", q.getMarks());
        m.put("order", q.getOrder());
        return m;
    }
}
