package com.acadex.controller;

import java.util.LinkedHashMap;
import java.util.List;
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

import com.acadex.dto.SubjectRequest;
import com.acadex.entity.Subject;
import com.acadex.repository.SubjectRepository;
import com.acadex.repository.UserRepository;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    @Autowired private SubjectRepository subjectRepository;
    @Autowired private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String facultyId,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) String department) {
        List<Subject> subjects;
        if (facultyId != null && section != null) {
            subjects = subjectRepository.findByFacultyIdAndSection(facultyId, section);
        } else if (facultyId != null) {
            subjects = subjectRepository.findByFacultyId(facultyId);
        } else if (section != null) {
            subjects = subjectRepository.findBySection(section);
        } else if (department != null) {
            subjects = subjectRepository.findByDepartment(department);
        } else {
            subjects = subjectRepository.findAll();
        }
        return ResponseEntity.ok(subjects.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        return subjectRepository.findById(id)
                .map(s -> ResponseEntity.ok(toMap(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody SubjectRequest req) {
        Subject subject = Subject.builder()
                .subjectName(req.getSubjectName())
                .subjectCode(req.getSubjectCode())
                .facultyId(req.getFacultyId())
                .section(req.getSection())
                .department(req.getDepartment())
                .semester(req.getSemester())
                .build();
        subject = subjectRepository.save(subject);
        return ResponseEntity.ok(toMap(subject));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody SubjectRequest req) {
        Subject subject = subjectRepository.findById(id).orElse(null);
        if (subject == null) return ResponseEntity.notFound().build();
        if (req.getSubjectName() != null) subject.setSubjectName(req.getSubjectName());
        if (req.getSubjectCode() != null) subject.setSubjectCode(req.getSubjectCode());
        if (req.getFacultyId() != null) subject.setFacultyId(req.getFacultyId());
        if (req.getSection() != null) subject.setSection(req.getSection());
        if (req.getDepartment() != null) subject.setDepartment(req.getDepartment());
        if (req.getSemester() != null) subject.setSemester(req.getSemester());
        subject = subjectRepository.save(subject);
        return ResponseEntity.ok(toMap(subject));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        subjectRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Subject deleted"));
    }

    private Map<String, Object> toMap(Subject s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("subjectName", s.getSubjectName());
        m.put("subjectCode", s.getSubjectCode());
        m.put("facultyId", s.getFacultyId());
        m.put("section", s.getSection());
        m.put("department", s.getDepartment());
        m.put("semester", s.getSemester());
        // Resolve faculty name
        if (s.getFacultyId() != null) {
            userRepository.findById(s.getFacultyId())
                    .ifPresent(u -> m.put("facultyName", u.getName()));
        }
        return m;
    }
}
