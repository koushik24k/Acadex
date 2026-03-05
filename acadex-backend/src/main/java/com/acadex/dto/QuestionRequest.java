package com.acadex.dto;

import lombok.Data;
import java.util.List;

@Data
public class QuestionRequest {
    private String questionText;
    private String questionType;
    private List<String> options;
    private String correctAnswer;
    private Integer marks;
    private Integer order;
}
