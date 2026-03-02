package com.acadex.repository;

import com.acadex.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByExamIdOrderByOrderAsc(Long examId);

    @Modifying
    @Transactional
    void deleteByExamId(Long examId);

    int countByExamId(Long examId);
}
