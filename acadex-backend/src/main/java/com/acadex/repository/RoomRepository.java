package com.acadex.repository;

import com.acadex.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByName(String name);
    List<Room> findByIsActive(Boolean isActive);
    List<Room> findByRoomType(String roomType);
}
