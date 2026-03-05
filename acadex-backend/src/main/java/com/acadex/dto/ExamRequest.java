package com.acadex.dto;

import lombok.Data;
import java.util.List;

@Data
public class ExamRequest {
    private String title;
    private String description;
    private Integer duration;
    private Integer totalMarks;
    private Integer passingMarks;
    private String scheduledDate;
    private String scheduledTime;
    private String endTime;
    private String status;
    private Boolean randomizeQuestions;
    private Boolean randomizeOptions;
    private Long roomId;
    private String classId;
    private List<QuestionRequest> questions;
}
