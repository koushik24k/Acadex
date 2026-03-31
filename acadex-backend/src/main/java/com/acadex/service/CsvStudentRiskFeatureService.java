package com.acadex.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.acadex.entity.User;

@Service
public class CsvStudentRiskFeatureService {

    private final String datasetPath;
    private final List<CsvRow> rows = new ArrayList<>();
    private int maxAbsences = 75;
    private boolean loaded;

    public CsvStudentRiskFeatureService(
            @Value("${app.ml.risk-api.dataset-path:../ml-risk-service/student_data.csv}") String datasetPath
    ) {
        this.datasetPath = datasetPath;
    }

    public Optional<CsvFeatures> resolveForUser(User user, String studentId) {
        ensureLoaded();
        if (rows.isEmpty()) {
            return Optional.empty();
        }

        String key = buildUserKey(user, studentId);
        int index = computeIndex(key, rows.size());
        CsvRow row = rows.get(index);

        double attendance = 100.0 - (row.absences * 100.0 / Math.max(1, maxAbsences));
        attendance = clamp(attendance, 0, 100);

        double exam = clamp((row.g1 + row.g2) / 2.0, 0, 100);
        double assignment = clamp(row.assignment, 0, 100);
        double studyTime = Math.max(0, row.studyTime);
        long failures = Math.max(0, row.failures);

        return Optional.of(new CsvFeatures(attendance, exam, assignment, failures, studyTime));
    }

    private synchronized void ensureLoaded() {
        if (loaded) {
            return;
        }

        Path path = Paths.get(datasetPath).normalize();
        if (!Files.exists(path)) {
            loaded = true;
            return;
        }

        try (BufferedReader reader = Files.newBufferedReader(path)) {
            String header = reader.readLine();
            if (header == null) {
                loaded = true;
                return;
            }

            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(",");
                if (parts.length < 7) {
                    continue;
                }

                CsvRow row = new CsvRow(
                        parseInt(parts[0]),
                        parseDouble(parts[1]),
                        parseDouble(parts[2]),
                        parseDouble(parts[3]),
                        parseInt(parts[4]),
                        parseDouble(parts[5]),
                        parseDouble(parts[6])
                );
                rows.add(row);
            }

            maxAbsences = rows.stream()
                    .mapToInt(r -> r.absences)
                    .max()
                    .orElse(75);
        } catch (IOException ignored) {
            // If CSV load fails, service falls back to DB-only features.
        }

        loaded = true;
    }

    private String buildUserKey(User user, String studentId) {
        StringBuilder sb = new StringBuilder();
        if (user != null) {
            if (user.getName() != null) {
                sb.append(user.getName());
            }
            if (user.getEmail() != null) {
                sb.append(user.getEmail());
            }
        }
        if (studentId != null) {
            sb.append(studentId);
        }
        return sb.toString();
    }

    private int computeIndex(String key, int size) {
        String digits = key.replaceAll("\\D", "");
        if (!digits.isEmpty()) {
            String tail = digits.length() > 9 ? digits.substring(digits.length() - 9) : digits;
            try {
                long n = Long.parseLong(tail);
                return (int) (Math.floorMod(n, size));
            } catch (NumberFormatException ignored) {
                // Fall through to hash-based index.
            }
        }
        return Math.floorMod(key.hashCode(), size);
    }

    private int parseInt(String value) {
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private double parseDouble(String value) {
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private record CsvRow(
            int absences,
            double g1,
            double g2,
            double g3,
            int failures,
            double studyTime,
            double assignment
    ) {}

    public record CsvFeatures(
            double attendance,
            double exam,
            double assignment,
            long failures,
            double studyTime
    ) {}
}
