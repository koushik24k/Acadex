package com.acadex.dto;

import lombok.Data;

@Data
public class AnswerRequest {
    private Long questionId;
    private String answer;
    private Boolean isCorrect;
    private Integer marksAwarded;
}
