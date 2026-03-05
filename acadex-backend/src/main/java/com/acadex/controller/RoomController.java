package com.acadex.controller;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.Room;
import com.acadex.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired private RoomRepository roomRepository;

    @GetMapping
    public ResponseEntity<?> listRooms(@RequestParam(required = false) String type,
                                        @RequestParam(required = false) Long id) {
        if (id != null) {
            return roomRepository.findById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }
        List<Room> rooms;
        if (type != null) {
            rooms = roomRepository.findByRoomType(type);
        } else {
            rooms = roomRepository.findByIsActive(true);
        }
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRoom(@PathVariable Long id) {
        return roomRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody Map<String, Object> body) {
        String now = LocalDateTime.now().toString();
        Room room = Room.builder()
                .name((String) body.get("name"))
                .building((String) body.get("building"))
                .floor((String) body.get("floor"))
                .rows(Integer.parseInt(body.get("rows").toString()))
                .columns(Integer.parseInt(body.get("columns").toString()))
                .membersPerBench(Integer.parseInt(body.get("membersPerBench").toString()))
                .capacity(Integer.parseInt(body.get("capacity").toString()))
                .roomType(body.get("roomType") != null ? (String) body.get("roomType") : "classroom")
                .boardPosition(body.get("boardPosition") != null ? (String) body.get("boardPosition") : "top")
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        roomRepository.save(room);
        return ResponseEntity.ok(room);
    }

    // Query-param based update: PUT /rooms?id=X
    @PutMapping
    public ResponseEntity<?> updateRoomByParam(@RequestParam Long id, @RequestBody Map<String, Object> body) {
        return updateRoom(id, body);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRoom(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Room room = roomRepository.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();

        if (body.containsKey("name")) room.setName((String) body.get("name"));
        if (body.containsKey("building")) room.setBuilding((String) body.get("building"));
        if (body.containsKey("floor")) room.setFloor((String) body.get("floor"));
        if (body.containsKey("rows")) room.setRows(Integer.parseInt(body.get("rows").toString()));
        if (body.containsKey("columns")) room.setColumns(Integer.parseInt(body.get("columns").toString()));
        if (body.containsKey("membersPerBench")) room.setMembersPerBench(Integer.parseInt(body.get("membersPerBench").toString()));
        if (body.containsKey("capacity")) room.setCapacity(Integer.parseInt(body.get("capacity").toString()));
        if (body.containsKey("roomType")) room.setRoomType((String) body.get("roomType"));
        if (body.containsKey("boardPosition")) room.setBoardPosition((String) body.get("boardPosition"));
        if (body.containsKey("isActive")) room.setIsActive((Boolean) body.get("isActive"));
        room.setUpdatedAt(LocalDateTime.now().toString());
        roomRepository.save(room);
        return ResponseEntity.ok(room);
    }

    // Query-param based delete: DELETE /rooms?id=X
    @DeleteMapping
    public ResponseEntity<?> deleteRoomByParam(@RequestParam Long id) {
        return deleteRoom(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoom(@PathVariable Long id) {
        if (!roomRepository.existsById(id)) return ResponseEntity.notFound().build();
        roomRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Room deleted"));
    }
}
