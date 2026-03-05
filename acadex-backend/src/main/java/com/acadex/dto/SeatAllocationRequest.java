package com.acadex.dto;

import java.util.List;

import lombok.Data;

@Data
public class SeatAllocationRequest {
    private Long examId;
    private List<Long> roomIds;
    private Integer customMembersPerBench;
    private String strategy; // "ml_optimized", "random", "sequential"
}
