package com.acadex.repository;

import com.acadex.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
    List<Answer> findBySubmissionId(Long submissionId);
    void deleteBySubmissionId(Long submissionId);
}
