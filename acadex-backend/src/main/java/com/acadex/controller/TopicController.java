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

import com.acadex.entity.Topic;
import com.acadex.repository.SubjectRepository;
import com.acadex.repository.TopicRepository;

@RestController
@RequestMapping("/api/topics")
public class TopicController {

    @Autowired private TopicRepository topicRepository;
    @Autowired private SubjectRepository subjectRepository;

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ LIST TOPICS BY SUBJECT ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) Long subjectId) {
        List<Topic> topics;
        if (subjectId != null) {
            topics = topicRepository.findBySubjectIdOrderByUnitNoAsc(subjectId);
        } else {
            topics = topicRepository.findAll();
        }
        return ResponseEntity.ok(topics.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        return topicRepository.findById(id)
                .map(t -> ResponseEntity.ok(toMap(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ CREATE TOPIC ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Long subjectId = Long.valueOf(body.get("subjectId").toString());
        Integer unitNo = Integer.valueOf(body.get("unitNo").toString());
        String topicName = body.get("topicName").toString();

        Topic topic = Topic.builder()
                .subjectId(subjectId)
                .unitNo(unitNo)
                .topicName(topicName)
                .build();
        topic = topicRepository.save(topic);
        return ResponseEntity.ok(toMap(topic));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ UPDATE TOPIC ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Topic topic = topicRepository.findById(id).orElse(null);
        if (topic == null) return ResponseEntity.notFound().build();

        if (body.containsKey("topicName")) topic.setTopicName(body.get("topicName").toString());
        if (body.containsKey("unitNo")) topic.setUnitNo(Integer.valueOf(body.get("unitNo").toString()));
        topicRepository.save(topic);
        return ResponseEntity.ok(toMap(topic));
    }

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ DELETE TOPIC ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        topicRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Topic deleted"));
    }

    private Map<String, Object> toMap(Topic t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("subjectId", t.getSubjectId());
        m.put("unitNo", t.getUnitNo());
        m.put("topicName", t.getTopicName());
        subjectRepository.findById(t.getSubjectId()).ifPresent(s -> {
            m.put("subjectName", s.getSubjectName());
            m.put("subjectCode", s.getSubjectCode());
        });
        return m;
    }
}
