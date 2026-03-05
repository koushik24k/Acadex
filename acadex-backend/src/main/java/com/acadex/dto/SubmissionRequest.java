package com.acadex.dto;

import lombok.Data;
import java.util.List;

@Data
public class SubmissionRequest {
    private Long examId;
    private List<AnswerRequest> answers;
    private Boolean autoSubmitted;
}
