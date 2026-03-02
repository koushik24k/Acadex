package com.acadex.service;

import com.acadex.dto.SeatAllocationResponse;
import com.acadex.dto.SeatAssignment;
import com.acadex.entity.Room;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * ML-inspired Seating Allocation Service.
 *
 * Uses a constraint-satisfaction + optimization approach:
 *   1. Groups students by department
 *   2. Distributes across rooms proportionally (bin-packing)
 *   3. Places students using a checkerboard interleaving pattern
 *      that maximises physical distance between same-department students
 *   4. Applies iterative swap-optimization to improve the separation score
 *
 * The "separation score" is the average Manhattan distance between every
 * student and their nearest same-department neighbour in the room grid.
 * Higher = better anti-cheating arrangement.
 */
@Service
public class SeatingAllocatorService {

    // ΓöÇΓöÇΓöÇ data holder for a student to be seated ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    public record StudentInfo(String id, String name, String rollNumber, String department) {}

    // ΓöÇΓöÇΓöÇ internal placement ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    private record Seat(int row, int col, int bench) {}
    private record Placement(Seat seat, StudentInfo student) {}

    // ====================================================================
    //  PUBLIC  ENTRY POINT
    // ====================================================================

    public SeatAllocationResponse allocate(
            List<StudentInfo> students,
            List<Room> rooms,
            Integer customMembersPerBench,
            String strategy) {

        if (students.isEmpty() || rooms.isEmpty()) {
            return SeatAllocationResponse.builder()
                    .totalStudents(0).totalSeatsUsed(0).totalCapacity(0)
                    .overallSeparationScore(0).strategy(strategy)
                    .assignments(List.of()).roomSummaries(List.of())
                    .departmentDistribution(Map.of()).build();
        }

        // 1. Compute effective capacity for each room
        Map<Room, Integer> roomCaps = new LinkedHashMap<>();
        int totalCap = 0;
        for (Room r : rooms) {
            int mpb = customMembersPerBench != null ? customMembersPerBench : r.getMembersPerBench();
            int cap = r.getRows() * r.getColumns() * mpb;
            roomCaps.put(r, cap);
            totalCap += cap;
        }

        // 2. Group students by department
        Map<String, List<StudentInfo>> deptMap = students.stream()
                .collect(Collectors.groupingBy(s -> s.department() != null ? s.department() : "General",
                        LinkedHashMap::new, Collectors.toList()));

        // 3. Distribute students to rooms (proportional bin-packing)
        Map<Room, List<StudentInfo>> roomStudents = distributeToRooms(deptMap, roomCaps, totalCap);

        // 4. Place students in each room using the chosen strategy
        List<SeatAssignment> allAssignments = new ArrayList<>();
        List<SeatAllocationResponse.RoomSummary> summaries = new ArrayList<>();
        double totalScore = 0;
        int totalPlaced = 0;

        for (var entry : roomStudents.entrySet()) {
            Room room = entry.getKey();
            List<StudentInfo> studs = entry.getValue();
            if (studs.isEmpty()) continue;

            int mpb = customMembersPerBench != null ? customMembersPerBench : room.getMembersPerBench();

            List<Placement> placements;
            switch (strategy != null ? strategy : "ml_optimized") {
                case "random" -> placements = placeRandom(studs, room, mpb);
                case "sequential" -> placements = placeSequential(studs, room, mpb);
                default -> placements = placeMLOptimized(studs, room, mpb);
            }

            double roomScore = computeSeparationScore(placements, room.getRows(), room.getColumns() * mpb);
            totalScore += roomScore * placements.size();
            totalPlaced += placements.size();

            // Build grid visualisation (dept abbreviation per cell)
            List<List<String>> grid = buildGrid(placements, room, mpb);

            for (Placement p : placements) {
                String seatLabel = room.getName() + "-R" + (p.seat().row() + 1) + "C" + (p.seat().col() + 1);
                if (mpb > 1) seatLabel += "B" + (p.seat().bench() + 1);

                allAssignments.add(SeatAssignment.builder()
                        .studentId(p.student().id())
                        .studentName(p.student().name())
                        .rollNumber(p.student().rollNumber())
                        .department(p.student().department())
                        .hallName(room.getName())
                        .seatNumber(seatLabel)
                        .row(p.seat().row())
                        .col(p.seat().col())
                        .bench(p.seat().bench())
                        .separationScore(roomScore)
                        .build());
            }

            summaries.add(SeatAllocationResponse.RoomSummary.builder()
                    .roomId(room.getId())
                    .roomName(room.getName())
                    .capacity(roomCaps.get(room))
                    .assigned(placements.size())
                    .rows(room.getRows())
                    .columns(room.getColumns())
                    .grid(grid)
                    .build());
        }

        // Department distribution stats
        Map<String, Integer> deptDist = new LinkedHashMap<>();
        for (var e : deptMap.entrySet()) deptDist.put(e.getKey(), e.getValue().size());

        double avgScore = totalPlaced > 0 ? totalScore / totalPlaced : 0;

        return SeatAllocationResponse.builder()
                .totalStudents(students.size())
                .totalSeatsUsed(allAssignments.size())
                .totalCapacity(totalCap)
                .overallSeparationScore(Math.round(avgScore * 100.0) / 100.0)
                .strategy(strategy != null ? strategy : "ml_optimized")
                .assignments(allAssignments)
                .roomSummaries(summaries)
                .departmentDistribution(deptDist)
                .build();
    }

    // ====================================================================
    //  ROOM DISTRIBUTION (Proportional Bin-Packing)
    // ====================================================================

    private Map<Room, List<StudentInfo>> distributeToRooms(
            Map<String, List<StudentInfo>> deptMap,
            Map<Room, Integer> roomCaps,
            int totalCap) {

        List<StudentInfo> allStudents = deptMap.values().stream()
                .flatMap(Collection::stream).collect(Collectors.toList());

        Map<Room, List<StudentInfo>> result = new LinkedHashMap<>();
        Map<Room, Integer> remaining = new LinkedHashMap<>(roomCaps);

        // Interleave departments so each room gets a mix
        List<StudentInfo> interleaved = interleaveDepartments(deptMap);

        int idx = 0;
        for (Room room : roomCaps.keySet()) {
            result.put(room, new ArrayList<>());
        }

        // Round-robin fill rooms proportionally
        List<Room> roomList = new ArrayList<>(roomCaps.keySet());
        int ri = 0;
        for (StudentInfo s : interleaved) {
            // Find next room with capacity
            int attempts = 0;
            while (attempts < roomList.size()) {
                Room room = roomList.get(ri % roomList.size());
                if (remaining.get(room) > 0) {
                    result.get(room).add(s);
                    remaining.put(room, remaining.get(room) - 1);
                    ri++;
                    break;
                }
                ri++;
                attempts++;
            }
        }

        return result;
    }

    /** Interleave students from different departments: A,B,C,A,B,C,... */
    private List<StudentInfo> interleaveDepartments(Map<String, List<StudentInfo>> deptMap) {
        List<List<StudentInfo>> lists = new ArrayList<>();
        for (var entry : deptMap.entrySet()) {
            List<StudentInfo> shuffled = new ArrayList<>(entry.getValue());
            Collections.shuffle(shuffled);
            lists.add(shuffled);
        }
        // Sort by size descending for better interleaving
        lists.sort((a, b) -> b.size() - a.size());

        List<StudentInfo> result = new ArrayList<>();
        int maxLen = lists.stream().mapToInt(List::size).max().orElse(0);
        for (int i = 0; i < maxLen; i++) {
            for (List<StudentInfo> list : lists) {
                if (i < list.size()) result.add(list.get(i));
            }
        }
        return result;
    }

    // ====================================================================
    //  ML-OPTIMIZED PLACEMENT (Checkerboard + Simulated Annealing Swaps)
    // ====================================================================

    private List<Placement> placeMLOptimized(List<StudentInfo> students, Room room, int mpb) {
        int rows = room.getRows();
        int cols = room.getColumns();
        int totalSeats = rows * cols * mpb;

        // Phase 1: Build checkerboard pattern from interleaved dept list
        Map<String, List<StudentInfo>> localDept = students.stream()
                .collect(Collectors.groupingBy(s -> s.department() != null ? s.department() : "General",
                        LinkedHashMap::new, Collectors.toList()));

        List<String> deptOrder = new ArrayList<>(localDept.keySet());

        // Generate all seat positions in serpentine (zigzag) order
        List<Seat> seatOrder = new ArrayList<>();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                int actualCol = (r % 2 == 0) ? c : (cols - 1 - c); // serpentine
                for (int b = 0; b < mpb; b++) {
                    seatOrder.add(new Seat(r, actualCol, b));
                }
            }
        }

        // Assign students in checkerboard dept-interleave pattern
        List<StudentInfo> interleaved = interleaveDepartments(localDept);
        List<Placement> placements = new ArrayList<>();
        for (int i = 0; i < Math.min(interleaved.size(), seatOrder.size()); i++) {
            placements.add(new Placement(seatOrder.get(i), interleaved.get(i)));
        }

        // Phase 2: Simulated-Annealing style swap optimization
        // Try swapping students to increase separation score
        double currentScore = computeSeparationScore(placements, rows, cols * mpb);
        Random rng = new Random(42);
        int iterations = Math.min(students.size() * 50, 5000); // scale with class size

        for (int iter = 0; iter < iterations; iter++) {
            int a = rng.nextInt(placements.size());
            int b = rng.nextInt(placements.size());
            if (a == b) continue;

            // Only swap if students are from same department (improves separation)
            // OR with a probability (exploration)
            Placement pa = placements.get(a);
            Placement pb = placements.get(b);

            boolean sameDept = pa.student().department().equals(pb.student().department());
            if (sameDept) continue; // Swapping same-dept doesn't help

            // Try the swap
            placements.set(a, new Placement(pa.seat(), pb.student()));
            placements.set(b, new Placement(pb.seat(), pa.student()));

            double newScore = computeSeparationScore(placements, rows, cols * mpb);
            if (newScore >= currentScore) {
                currentScore = newScore; // Accept improvement
            } else {
                // Accept worse solution with decreasing probability (annealing)
                double temp = 1.0 - (double) iter / iterations;
                if (rng.nextDouble() < temp * 0.3) {
                    currentScore = newScore; // Accept anyway (exploration)
                } else {
                    // Revert swap
                    placements.set(a, pa);
                    placements.set(b, pb);
                }
            }
        }

        return placements;
    }

    // ====================================================================
    //  SIMPLE STRATEGIES
    // ====================================================================

    private List<Placement> placeRandom(List<StudentInfo> students, Room room, int mpb) {
        List<StudentInfo> shuffled = new ArrayList<>(students);
        Collections.shuffle(shuffled);
        return placeSequentialInto(shuffled, room, mpb);
    }

    private List<Placement> placeSequential(List<StudentInfo> students, Room room, int mpb) {
        return placeSequentialInto(students, room, mpb);
    }

    private List<Placement> placeSequentialInto(List<StudentInfo> students, Room room, int mpb) {
        List<Placement> result = new ArrayList<>();
        int idx = 0;
        for (int r = 0; r < room.getRows() && idx < students.size(); r++) {
            for (int c = 0; c < room.getColumns() && idx < students.size(); c++) {
                for (int b = 0; b < mpb && idx < students.size(); b++) {
                    result.add(new Placement(new Seat(r, c, b), students.get(idx++)));
                }
            }
        }
        return result;
    }

    // ====================================================================
    //  SCORING ΓÇö Average min-Manhattan-distance between same-dept students
    // ====================================================================

    private double computeSeparationScore(List<Placement> placements, int rows, int totalCols) {
        if (placements.size() <= 1) return rows + totalCols; // max possible

        // Group placements by department
        Map<String, List<Placement>> byDept = placements.stream()
                .collect(Collectors.groupingBy(p -> p.student().department()));

        double totalMinDist = 0;
        int count = 0;

        for (var entry : byDept.entrySet()) {
            List<Placement> deptPlacements = entry.getValue();
            if (deptPlacements.size() <= 1) {
                totalMinDist += rows + totalCols; // only one from this dept
                count++;
                continue;
            }

            for (int i = 0; i < deptPlacements.size(); i++) {
                double minDist = Double.MAX_VALUE;
                Seat si = deptPlacements.get(i).seat();
                for (int j = 0; j < deptPlacements.size(); j++) {
                    if (i == j) continue;
                    Seat sj = deptPlacements.get(j).seat();
                    double dist = Math.abs(si.row() - sj.row()) + Math.abs(si.col() - sj.col());
                    minDist = Math.min(minDist, dist);
                }
                totalMinDist += minDist;
                count++;
            }
        }

        return count > 0 ? totalMinDist / count : 0;
    }

    // ====================================================================
    //  GRID VISUALISATION
    // ====================================================================

    private List<List<String>> buildGrid(List<Placement> placements, Room room, int mpb) {
        String[][] grid = new String[room.getRows()][room.getColumns() * mpb];
        for (String[] row : grid) Arrays.fill(row, "ΓÇö");

        for (Placement p : placements) {
            int gridCol = p.seat().col() * mpb + p.seat().bench();
            String dept = p.student().department();
            grid[p.seat().row()][gridCol] = dept != null && dept.length() >= 3
                    ? dept.substring(0, 3).toUpperCase()
                    : (dept != null ? dept.toUpperCase() : "GEN");
        }

        List<List<String>> result = new ArrayList<>();
        for (String[] row : grid) result.add(List.of(row));
        return result;
    }
}
