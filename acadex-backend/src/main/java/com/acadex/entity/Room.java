package com.acadex.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rooms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String building;
    private String floor;

    @Column(name = "rows_count", nullable = false)
    private Integer rows;

    @Column(name = "columns_count", nullable = false)
    private Integer columns;

    @Column(name = "members_per_bench", nullable = false)
    private Integer membersPerBench;

    @Column(nullable = false)
    private Integer capacity;

    @Column(name = "room_type", nullable = false)
    @Builder.Default
    private String roomType = "classroom";

    @Column(name = "custom_layout", columnDefinition = "TEXT")
    private String customLayout; // JSON

    @Column(name = "board_position", nullable = false)
    @Builder.Default
    private String boardPosition = "top";

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private String createdAt;

    @Column(name = "updated_at", nullable = false)
    private String updatedAt;
}
