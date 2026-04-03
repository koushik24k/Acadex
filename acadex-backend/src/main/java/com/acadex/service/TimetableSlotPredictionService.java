package com.acadex.service;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.acadex.dto.TimetableSlotPredictionRequest;
import com.acadex.entity.Timetable;
import com.acadex.repository.TimetableRepository;

@Service
public class TimetableSlotPredictionService {

    @Autowired(required = false)
    private RestTemplate restTemplate;

    @Autowired
    private TimetableRepository timetableRepository;

    @Value("${app.ml.timetable-api.enabled:true}")
    private boolean mlEnabled;

    @Value("${app.ml.timetable-api.url:http://localhost:5001/predict-slots}")
    private String mlUrl;

    private static final List<Slot> CATALOG = buildCatalog();

    public Map<String, Object> predictSlots(TimetableSlotPredictionRequest request) {
        List<TimetableSlotPredictionRequest.Item> items = request != null && request.items() != null
                ? request.items() : List.of();

        if (items.isEmpty()) {
            return Map.of("predictions", List.of(), "source", "none");
        }

        List<Map<String, Object>> rawPredictions = getMlPredictions(items);

        Set<String> occupied = new HashSet<>();
        Map<String, List<Timetable>> byFaculty = new LinkedHashMap<>();
        for (TimetableSlotPredictionRequest.Item item : items) {
            String facultyId = normalize(item.facultyId());
            if (facultyId == null || byFaculty.containsKey(facultyId)) {
                continue;
            }
            byFaculty.put(facultyId, timetableRepository.findByFacultyId(facultyId));
        }

        for (Map.Entry<String, List<Timetable>> e : byFaculty.entrySet()) {
            for (Timetable t : e.getValue()) {
                if (t.getDayOfWeek() == null || t.getStartTime() == null || t.getEndTime() == null) {
                    continue;
                }
                occupied.add(slotKey(e.getKey(), t.getDayOfWeek(), t.getStartTime(), t.getEndTime()));
            }
        }

        List<Map<String, Object>> resolved = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            TimetableSlotPredictionRequest.Item item = items.get(i);
            Map<String, Object> raw = i < rawPredictions.size() ? rawPredictions.get(i) : Map.of();
            Slot preferred = parseSlot(raw);
            if (preferred == null) {
                preferred = heuristicSlot(item);
            }

            Slot assigned = preferred;
            String facultyId = normalize(item.facultyId());
            boolean conflict = facultyId != null && occupied.contains(slotKey(facultyId, preferred.day(), preferred.start(), preferred.end()));

            if (facultyId != null) {
                assigned = resolveConflict(preferred, facultyId, occupied);
                occupied.add(slotKey(facultyId, assigned.day(), assigned.start(), assigned.end()));
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("courseId", item.courseId());
            row.put("subject", item.subject());
            row.put("facultyId", item.facultyId());
            row.put("semester", item.semester());
            row.put("day", assigned.day().name());
            row.put("startTime", assigned.start().toString());
            row.put("endTime", assigned.end().toString());
            row.put("predictedSlot", assigned.day().name() + " " + assigned.start());
            row.put("conflictAdjusted", conflict || !assigned.equals(preferred));
            resolved.add(row);
        }

        return Map.of(
                "predictions", resolved,
                "source", mlEnabled ? "ML+RULES" : "RULES_ONLY",
                "notes", "ML predicts preferred slots; backend resolves clashes using timetable constraints"
        );
    }

    private List<Map<String, Object>> getMlPredictions(List<TimetableSlotPredictionRequest.Item> items) {
        if (!mlEnabled || restTemplate == null) {
            return List.of();
        }

        List<Map<String, Object>> payloadItems = items.stream().map(i -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subject", i.subject());
            m.put("faculty", i.facultyId());
            m.put("semester", i.semester());
            m.put("difficulty", i.difficulty());
            m.put("sessionType", i.sessionType());
            m.put("preferredSlot", i.preferredSlot());
            return m;
        }).toList();

        Map<String, Object> payload = Map.of("items", payloadItems);

        try {
            ResponseEntity<Object> resp = restTemplate.postForEntity(mlUrl, payload, Object.class);
            if (!(resp.getBody() instanceof Map<?, ?> map)) {
                return List.of();
            }
            Object predictions = map.get("predictions");
            if (!(predictions instanceof List<?> list)) {
                return List.of();
            }

            List<Map<String, Object>> rows = new ArrayList<>();
            for (Object o : list) {
                if (o instanceof Map<?, ?> rm) {
                    Map<String, Object> normalized = new LinkedHashMap<>();
                    rm.forEach((k, v) -> {
                        if (k != null) normalized.put(String.valueOf(k), v);
                    });
                    rows.add(normalized);
                }
            }
            return rows;
        } catch (RestClientException ex) {
            return List.of();
        }
    }

    private Slot resolveConflict(Slot preferred, String facultyId, Set<String> occupied) {
        int startIdx = indexOfClosest(preferred);
        for (int i = 0; i < CATALOG.size(); i++) {
            Slot candidate = CATALOG.get((startIdx + i) % CATALOG.size());
            String key = slotKey(facultyId, candidate.day(), candidate.start(), candidate.end());
            if (!occupied.contains(key)) {
                return candidate;
            }
        }
        return preferred;
    }

    private int indexOfClosest(Slot slot) {
        for (int i = 0; i < CATALOG.size(); i++) {
            Slot c = CATALOG.get(i);
            if (c.day() == slot.day() && c.start().equals(slot.start())) {
                return i;
            }
        }
        return 0;
    }

    private Slot parseSlot(Map<String, Object> raw) {
        Object dayObj = raw.get("day");
        Object startObj = raw.get("startTime");
        Object endObj = raw.get("endTime");

        if (dayObj == null && raw.get("slot") != null) {
            String slot = String.valueOf(raw.get("slot")).trim();
            String[] parts = slot.split("\\s+");
            if (parts.length >= 2) {
                dayObj = parts[0];
                startObj = parts[1];
            }
        }

        DayOfWeek day = parseDay(dayObj);
        LocalTime start = parseTime(startObj);
        LocalTime end = parseTime(endObj);
        if (day == null || start == null) {
            return null;
        }
        if (end == null) {
            end = start.plusHours(1);
        }
        return new Slot(day, start, end);
    }

    private Slot heuristicSlot(TimetableSlotPredictionRequest.Item item) {
        int base = Math.abs((normalize(item.subject()) + "|" + normalize(item.facultyId()) + "|" + normalize(item.semester())).hashCode());
        Slot seed = CATALOG.get(base % CATALOG.size());

        String difficulty = normalize(item.difficulty());
        if ("HIGH".equals(difficulty)) {
            return new Slot(seed.day(), LocalTime.of(8, 15), LocalTime.of(9, 5));
        }

        String type = normalize(item.sessionType());
        if ("LAB".equals(type) || "PRACTICAL".equals(type)) {
            return new Slot(seed.day(), LocalTime.of(13, 30), LocalTime.of(14, 20));
        }

        return seed;
    }

    private static List<Slot> buildCatalog() {
        List<DayOfWeek> days = Arrays.asList(
                DayOfWeek.MONDAY,
                DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY,
                DayOfWeek.SATURDAY
        );
        List<LocalTime[]> periods = Arrays.asList(
                new LocalTime[]{LocalTime.of(8, 15), LocalTime.of(9, 5)},
                new LocalTime[]{LocalTime.of(9, 5), LocalTime.of(9, 55)},
                new LocalTime[]{LocalTime.of(10, 10), LocalTime.of(11, 0)},
                new LocalTime[]{LocalTime.of(11, 0), LocalTime.of(11, 50)},
                new LocalTime[]{LocalTime.of(11, 50), LocalTime.of(12, 45)},
                new LocalTime[]{LocalTime.of(12, 45), LocalTime.of(13, 30)},
                new LocalTime[]{LocalTime.of(13, 30), LocalTime.of(14, 20)},
                new LocalTime[]{LocalTime.of(14, 20), LocalTime.of(15, 10)},
                new LocalTime[]{LocalTime.of(15, 10), LocalTime.of(16, 0)}
        );
        List<Slot> slots = new ArrayList<>();
        for (DayOfWeek day : days) {
            for (LocalTime[] period : periods) {
                slots.add(new Slot(day, period[0], period[1]));
            }
        }
        return List.copyOf(slots);
    }

    private DayOfWeek parseDay(Object raw) {
        if (raw == null) return null;
        String d = String.valueOf(raw).trim().toUpperCase(Locale.ROOT);
        if (d.length() >= 3) {
            d = switch (d.substring(0, 3)) {
                case "MON" -> "MONDAY";
                case "TUE" -> "TUESDAY";
                case "WED" -> "WEDNESDAY";
                case "THU" -> "THURSDAY";
                case "FRI" -> "FRIDAY";
                case "SAT" -> "SATURDAY";
                case "SUN" -> "SUNDAY";
                default -> d;
            };
        }
        try {
            return DayOfWeek.valueOf(d);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private LocalTime parseTime(Object raw) {
        if (raw == null) return null;
        String t = String.valueOf(raw).trim();
        if (t.matches("^\\d{1,2}(AM|PM|am|pm)$")) {
            int hour = Integer.parseInt(t.substring(0, t.length() - 2));
            String ampm = t.substring(t.length() - 2).toUpperCase(Locale.ROOT);
            if (hour == 12) hour = 0;
            if ("PM".equals(ampm)) hour += 12;
            return LocalTime.of(hour, 0);
        }
        if (t.matches("^\\d{1,2}:\\d{2}$")) {
            return LocalTime.parse(t);
        }
        if (t.matches("^\\d{1,2}$")) {
            return LocalTime.of(Integer.parseInt(t), 0);
        }
        return null;
    }

    private String normalize(String v) {
        return v == null ? "" : v.trim().toUpperCase(Locale.ROOT);
    }

    private String slotKey(String facultyId, DayOfWeek day, LocalTime start, LocalTime end) {
        return normalize(facultyId) + "|" + day.name() + "|" + start + "|" + end;
    }

    private record Slot(DayOfWeek day, LocalTime start, LocalTime end) {}
}
