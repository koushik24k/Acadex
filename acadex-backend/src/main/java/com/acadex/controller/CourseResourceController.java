package com.acadex.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.acadex.dto.CourseResourceDTO;
import com.acadex.entity.CourseFacultyMapping;
import com.acadex.entity.CourseResource;
import com.acadex.entity.User;
import com.acadex.repository.CourseFacultyMappingRepository;
import com.acadex.repository.CourseResourceRepository;
import com.acadex.repository.UserRepository;

@RestController
@RequestMapping("/api/courses/{courseId}/resources")
public class CourseResourceController {

    @Autowired private CourseResourceRepository courseResourceRepository;
    @Autowired private CourseFacultyMappingRepository courseFacultyMappingRepository;
    @Autowired private UserRepository userRepository;

    @Value("${app.storage.course-resources-dir:uploads/course-resources}")
    private String courseResourcesDir;

    /**
     * Get visible resources for a course (for students)
     */
    @GetMapping
    public ResponseEntity<?> getResources(@PathVariable Long courseId) {
        List<CourseResource> resources = courseResourceRepository.findByCourseIdAndIsVisibleTrue(courseId);
        List<CourseResourceDTO> dtos = resources.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of(
                "courseId", courseId,
                "resources", dtos,
                "count", dtos.size()
        ));
    }

    /**
     * Get all resources for a course including hidden (for coordinators)
     */
    @GetMapping("/all")
    public ResponseEntity<?> getAllResources(@PathVariable Long courseId, Authentication authentication) {
        String facultyId = resolveCurrentUserId(authentication);
        if (facultyId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        // Verify user is coordinator/HOD for this course
        if (!isCoordinatorOrHodForCourse(courseId, facultyId)) {
            return ResponseEntity.status(403).body(Map.of("error", "You don't have permission to view all resources for this course"));
        }

        List<CourseResource> resources = courseResourceRepository.findByCourseId(courseId);
        List<CourseResourceDTO> dtos = resources.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of(
                "courseId", courseId,
                "resources", dtos,
                "count", dtos.size()
        ));
    }

    /**
     * Add a resource to a course (coordinators only)
     */
    @PostMapping
    public ResponseEntity<?> addResource(
            @PathVariable Long courseId,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {

        String facultyId = resolveCurrentUserId(authentication);
        if (facultyId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        // Verify user is coordinator/HOD for this course
        if (!isCoordinatorOrHodForCourse(courseId, facultyId)) {
            return ResponseEntity.status(403).body(Map.of("error", "You don't have permission to add resources for this course"));
        }

        String title = (String) body.get("title");
        String description = (String) body.get("description");
        String resourceType = (String) body.get("resourceType");
        String resourceUrl = (String) body.get("resourceUrl");
        Boolean visibleFromBody = (Boolean) body.get("isVisible");
        boolean isVisible = visibleFromBody == null ? true : visibleFromBody;

        if (title == null || title.isBlank() || resourceUrl == null || resourceUrl.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "title and resourceUrl are required"));
        }

        CourseResource resource = CourseResource.builder()
                .courseId(courseId)
                .title(title)
                .description(description)
                .resourceType(resourceType != null ? resourceType : "Document")
                .resourceUrl(resourceUrl)
                .uploadedBy(facultyId)
                .uploadedAt(LocalDateTime.now())
                .isVisible(isVisible)
                .build();

        CourseResource saved = courseResourceRepository.save(resource);
        return ResponseEntity.ok(Map.of(
                "message", "Resource added successfully",
                "resource", toDTO(saved)
        ));
    }

    /**
     * Upload a resource file to a course (coordinators only)
     */
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadResource(
            @PathVariable Long courseId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "resourceType", required = false) String resourceType,
            @RequestParam(value = "isVisible", required = false, defaultValue = "true") Boolean isVisible,
            Authentication authentication) {

        String facultyId = resolveCurrentUserId(authentication);
        if (facultyId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        if (!isCoordinatorOrHodForCourse(courseId, facultyId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You don't have permission to upload resources for this course"));
        }

        if (title == null || title.isBlank() || file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "title and file are required"));
        }

        String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "resource" : file.getOriginalFilename());
        String extension = "";
        int extIdx = originalName.lastIndexOf('.');
        if (extIdx >= 0) {
            extension = originalName.substring(extIdx);
        }

        String storedName = courseId + "_" + UUID.randomUUID() + extension;
        Path uploadDir = Paths.get(courseResourcesDir);
        Path destination = uploadDir.resolve(storedName).normalize();

        try {
            Files.createDirectories(uploadDir);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save uploaded file"));
        }

        String relativeUrl = "/uploads/course-resources/" + storedName;
        String publicUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(relativeUrl)
                .toUriString();

        CourseResource resource = CourseResource.builder()
                .courseId(courseId)
                .title(title)
                .description(description)
                .resourceType((resourceType == null || resourceType.isBlank()) ? "Document" : resourceType)
                .resourceUrl(publicUrl)
                .uploadedBy(facultyId)
                .uploadedAt(LocalDateTime.now())
                .isVisible(isVisible)
                .build();

        CourseResource saved = courseResourceRepository.save(resource);
        return ResponseEntity.ok(Map.of(
                "message", "Resource uploaded successfully",
                "resource", toDTO(saved)
        ));
    }

    /**
     * Update resource visibility or details (coordinators only)
     */
    @PutMapping("/{resourceId}")
    public ResponseEntity<?> updateResource(
            @PathVariable Long courseId,
            @PathVariable Long resourceId,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {

        String facultyId = resolveCurrentUserId(authentication);
        if (facultyId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        if (!isCoordinatorOrHodForCourse(courseId, facultyId)) {
            return ResponseEntity.status(403).body(Map.of("error", "You don't have permission to update resources for this course"));
        }

        return courseResourceRepository.findById(resourceId)
                .map(resource -> {
                    if (!resource.getCourseId().equals(courseId)) {
                        return ResponseEntity.badRequest().<Object>body(Map.of("error", "Resource does not belong to this course"));
                    }

                    if (body.containsKey("title")) {
                        resource.setTitle((String) body.get("title"));
                    }
                    if (body.containsKey("description")) {
                        resource.setDescription((String) body.get("description"));
                    }
                    if (body.containsKey("isVisible")) {
                        resource.setIsVisible((Boolean) body.get("isVisible"));
                    }
                    if (body.containsKey("resourceType")) {
                        resource.setResourceType((String) body.get("resourceType"));
                    }

                    CourseResource updated = courseResourceRepository.save(resource);
                    return ResponseEntity.ok(Map.of(
                            "message", "Resource updated successfully",
                            "resource", toDTO(updated)
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete a resource (coordinators only)
     */
    @DeleteMapping("/{resourceId}")
    public ResponseEntity<?> deleteResource(
            @PathVariable Long courseId,
            @PathVariable Long resourceId,
            Authentication authentication) {

        String facultyId = resolveCurrentUserId(authentication);
        if (facultyId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        if (!isCoordinatorOrHodForCourse(courseId, facultyId)) {
            return ResponseEntity.status(403).body(Map.of("error", "You don't have permission to delete resources for this course"));
        }

        return courseResourceRepository.findById(resourceId)
                .map(resource -> {
                    if (!resource.getCourseId().equals(courseId)) {
                        return ResponseEntity.badRequest().<Object>body(Map.of("error", "Resource does not belong to this course"));
                    }
                    courseResourceRepository.deleteById(resourceId);
                    return ResponseEntity.ok(Map.of("message", "Resource deleted successfully"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ====== Helper methods ======

    private boolean isCoordinatorOrHodForCourse(Long courseId, String facultyId) {
        Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getAuthorities() != null) {
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(authority -> "ROLE_ADMIN".equalsIgnoreCase(authority.getAuthority()));
            if (isAdmin) {
                return true;
            }
        }

        List<CourseFacultyMapping> mappings = courseFacultyMappingRepository.findByCourseIdAndFacultyId(courseId, facultyId);
        if (mappings.isEmpty()) {
            return false;
        }

        return mappings.stream()
                .anyMatch(m -> {
                    String role = m.getRole() == null ? "" : m.getRole().trim().toUpperCase();
                    return "COORDINATOR".equals(role) || "HOD".equals(role);
                });
    }

    private String resolveCurrentUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email).map(User::getId).orElse(null);
    }

    private CourseResourceDTO toDTO(CourseResource resource) {
        return CourseResourceDTO.builder()
                .id(resource.getId())
                .courseId(resource.getCourseId())
                .title(resource.getTitle())
                .description(resource.getDescription())
                .resourceType(resource.getResourceType())
                .resourceUrl(resource.getResourceUrl())
                .uploadedBy(resource.getUploadedBy())
                .uploadedAt(resource.getUploadedAt())
                .isVisible(resource.getIsVisible())
                .createdAt(resource.getCreatedAt())
                .updatedAt(resource.getUpdatedAt())
                .build();
    }
}
