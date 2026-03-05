package com.acadex.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.acadex.entity.AttendanceRecord;
import com.acadex.entity.ClassSession;
import com.acadex.entity.Notification;
import com.acadex.entity.Subject;
import com.acadex.entity.Topic;
import com.acadex.repository.AttendanceRecordRepository;
import com.acadex.repository.ClassSessionRepository;
import com.acadex.repository.NotificationRepository;
import com.acadex.repository.SubjectRepository;
import com.acadex.repository.TopicRepository;
import com.acadex.repository.TopicVerificationRepository;

/**
 * Scheduled service that runs every day to generate topic verification notifications.
 * For sessions that are exactly 3 days old, it creates notifications for students
 * who attended that class asking them to verify the topic covered.
 */
@Service
public class TopicVerificationScheduler {

    @Autowired private ClassSessionRepository sessionRepo;
    @Autowired private AttendanceRecordRepository attendanceRepo;
    @Autowired private TopicVerificationRepository verificationRepo;
    @Autowired private TopicRepository topicRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private NotificationRepository notificationRepo;

    /**
     * Runs daily at 9 AM. For each class session from 3 days ago,
     * sends verification notifications to attending students.
     */
    @Scheduled(cron = "0 0 9 * * *") // 9 AM daily
    public void generateVerificationNotifications() {
        LocalDate targetDate = LocalDate.now().minusDays(3);
        List<ClassSession> sessions = sessionRepo.findByDateBetween(targetDate, targetDate);

        for (ClassSession session : sessions) {
            // Get attending students
            List<AttendanceRecord> present = attendanceRepo.findBySubjectIdAndDate(
                    session.getSubjectId(), session.getDate());

            String topicName = topicRepository.findById(session.getTopicId())
                    .map(Topic::getTopicName).orElse("Unknown Topic");
            String subjectName = subjectRepository.findById(session.getSubjectId())
                    .map(Subject::getSubjectName).orElse("Unknown Subject");

            for (AttendanceRecord record : present) {
                if (!"present".equals(record.getStatus())) continue;

                // Skip if already notified/verified
                if (verificationRepo.findBySessionIdAndStudentId(
                        session.getId(), record.getStudentId()).isPresent()) continue;

                // Create notification
                Notification notification = Notification.builder()
                        .userId(record.getStudentId())
                        .type("topic_verification")
                        .title("Verify Topic Coverage")
                        .message("Did faculty cover '" + topicName + "' in " + subjectName
                                + " on " + session.getDate() + "? Please verify in your Attendance page.")
                        .isRead(false)
                        .createdAt(LocalDateTime.now().toString())
                        .build();
                notificationRepo.save(notification);
            }
        }
    }
}
