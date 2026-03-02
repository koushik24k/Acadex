package com.acadex.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.Topic;

public interface TopicRepository extends JpaRepository<Topic, Long> {
    List<Topic> findBySubjectId(Long subjectId);
    List<Topic> findBySubjectIdOrderByUnitNoAsc(Long subjectId);
    List<Topic> findBySubjectIdAndUnitNo(Long subjectId, Integer unitNo);
}
