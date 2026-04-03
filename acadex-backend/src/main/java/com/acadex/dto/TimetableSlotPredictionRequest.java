package com.acadex.dto;

import java.util.List;

public record TimetableSlotPredictionRequest(
        List<Item> items
) {
    public record Item(
            Long courseId,
            String subject,
            String facultyId,
            String semester,
            String difficulty,
            String sessionType,
            String preferredSlot
    ) {}
}
