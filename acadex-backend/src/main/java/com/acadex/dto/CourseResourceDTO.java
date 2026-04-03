package com.acadex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseResourceDTO {
    private Long id;
    private Long courseId;
    private String title;
    private String description;
    private String resourceType;
    private String resourceUrl;
    private String uploadedBy;
    private LocalDateTime uploadedAt;
    private Boolean isVisible;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
