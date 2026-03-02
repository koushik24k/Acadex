package com.acadex.dto;

import lombok.Data;

@Data
public class TopicVerificationRequest {
    private Long sessionId;
    private String vote; // Yes, No, Partial
}
