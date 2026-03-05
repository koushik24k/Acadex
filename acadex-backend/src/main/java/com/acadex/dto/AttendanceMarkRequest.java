package com.acadex.dto;

import java.util.List;

import lombok.Data;

@Data
public class AttendanceMarkRequest {
    private Long subjectId;
    private String section;
    private String date;          // yyyy-MM-dd
    private Long topicId;         // required ΓÇô topic covered in this session
    private String notes;         // optional teacher notes
    private List<StudentStatus> students;

    @Data
    public static class StudentStatus {
        private String studentId;
        private String status; // present / absent
    }
}
