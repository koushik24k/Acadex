package com.acadex.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.acadex.entity.TopicVerification;

public interface TopicVerificationRepository extends JpaRepository<TopicVerification, Long> {
    List<TopicVerification> findBySessionId(Long sessionId);
    List<TopicVerification> findByStudentId(String studentId);
    Optional<TopicVerification> findBySessionIdAndStudentId(Long sessionId, String studentId);
    long countBySessionId(Long sessionId);
    long countBySessionIdAndVote(Long sessionId, String vote);
}
