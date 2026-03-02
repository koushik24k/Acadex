package com.acadex.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class SeatAllocationResponse {
    private int totalStudents;
    private int totalSeatsUsed;
    private int totalCapacity;
    private double overallSeparationScore;
    private String strategy;
    private List<SeatAssignment> assignments;
    private List<RoomSummary> roomSummaries;
    private Map<String, Integer> departmentDistribution;

    @Data
    @Builder
    public static class RoomSummary {
        private Long roomId;
        private String roomName;
        private int capacity;
        private int assigned;
        private int rows;
        private int columns;
        private List<List<String>> grid; // 2D grid showing dept codes per seat
    }
}
