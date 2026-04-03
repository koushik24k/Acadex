package com.acadex.dto;

public record TimetableAutoGenerateRequest(
        String semester,
        String department,
        Boolean overwriteExisting
) {
}
