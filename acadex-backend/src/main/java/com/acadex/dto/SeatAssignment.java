package com.acadex.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SeatAssignment {
    private String studentId;
    private String studentName;
    private String rollNumber;
    private String department;
    private String hallName;
    private String seatNumber;
    private int row;
    private int col;
    private int bench;
    private double separationScore;
}
