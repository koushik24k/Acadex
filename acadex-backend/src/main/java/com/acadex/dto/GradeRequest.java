package com.acadex.dto;

import lombok.Data;

@Data
public class GradeRequest {
    private Integer marksAwarded;
    private String feedback;
    private Boolean isCorrect;
}
