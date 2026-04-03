package com.acadex.config;

import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Value("${app.storage.course-resources-dir:uploads/course-resources}")
    private String courseResourcesDir;

    @Value("${app.storage.assignment-submissions-dir:uploads/assignment-submissions}")
    private String assignmentSubmissionsDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path courseUploadPath = Paths.get(courseResourcesDir).toAbsolutePath().normalize();
        String courseLocation = courseUploadPath.toUri().toString();

        Path assignmentUploadPath = Paths.get(assignmentSubmissionsDir).toAbsolutePath().normalize();
        String assignmentLocation = assignmentUploadPath.toUri().toString();

        registry.addResourceHandler("/uploads/course-resources/**")
            .addResourceLocations(courseLocation.endsWith("/") ? courseLocation : courseLocation + "/");

        registry.addResourceHandler("/uploads/assignment-submissions/**")
            .addResourceLocations(assignmentLocation.endsWith("/") ? assignmentLocation : assignmentLocation + "/");
    }
}
