package com.acadex.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import com.acadex.entity.SeatAllocation;

public interface SeatAllocationRepository extends JpaRepository<SeatAllocation, Long> {
    List<SeatAllocation> findByExamId(Long examId);
    List<SeatAllocation> findByRoomId(Long roomId);
    Optional<SeatAllocation> findByExamIdAndStudentId(Long examId, String studentId);
    @Modifying @Transactional
    void deleteByExamId(Long examId);
    int countByExamIdAndRoomId(Long examId, Long roomId);
}
