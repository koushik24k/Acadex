package com.acadex.dto;

import lombok.Data;

@Data
public class SubjectRequest {
    private String subjectName;
    private String subjectCode;
    private String facultyId;
    private String section;
    private String department;
    private String semester;
}
