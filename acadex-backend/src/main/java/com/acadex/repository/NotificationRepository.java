package com.acadex.repository;

import com.acadex.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Notification> findByUserIdAndIsReadOrderByCreatedAtDesc(String userId, Boolean isRead);
    int countByUserIdAndIsRead(String userId, Boolean isRead);
}
