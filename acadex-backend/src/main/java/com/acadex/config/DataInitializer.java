package com.acadex.config;

import java.time.LocalDate;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.acadex.entity.AttendanceRecord;
import com.acadex.entity.ClassSession;
import com.acadex.entity.Course;
import com.acadex.entity.CourseEnrollment;
import com.acadex.entity.CourseFacultyMapping;
import com.acadex.entity.CourseTopic;
import com.acadex.entity.CourseUnit;
import com.acadex.entity.Subject;
import com.acadex.entity.TeacherScore;
import com.acadex.entity.Topic;
import com.acadex.entity.TopicVerification;
import com.acadex.entity.User;
import com.acadex.entity.UserRole;
import com.acadex.repository.AttendanceRecordRepository;
import com.acadex.repository.ClassSessionRepository;
import com.acadex.repository.CourseEnrollmentRepository;
import com.acadex.repository.CourseFacultyMappingRepository;
import com.acadex.repository.CourseRepository;
import com.acadex.repository.CourseTopicRepository;
import com.acadex.repository.CourseUnitRepository;
import com.acadex.repository.SubjectRepository;
import com.acadex.repository.TeacherScoreRepository;
import com.acadex.repository.TopicRepository;
import com.acadex.repository.TopicVerificationRepository;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired private UserRepository userRepository;
    @Autowired private UserRoleRepository userRoleRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private AttendanceRecordRepository attendanceRecordRepository;
    @Autowired private TopicRepository topicRepository;
    @Autowired private ClassSessionRepository classSessionRepository;
    @Autowired private TopicVerificationRepository topicVerificationRepository;
    @Autowired private TeacherScoreRepository teacherScoreRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private CourseUnitRepository courseUnitRepository;
    @Autowired private CourseTopicRepository courseTopicRepository;
    @Autowired private CourseFacultyMappingRepository courseFacultyMappingRepository;
    @Autowired private CourseEnrollmentRepository courseEnrollmentRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            // Create admin
            User admin = User.builder()
                    .name("Admin User")
                    .email("admin@acadex.com")
                    .password(passwordEncoder.encode("admin123"))
                    .emailVerified(true)
                    .build();
            admin = userRepository.save(admin);
            userRoleRepository.save(UserRole.builder().user(admin).role("admin").department("Administration").build());

            // Create faculty
            User faculty = User.builder()
                    .name("Faculty User")
                    .email("faculty@acadex.com")
                    .password(passwordEncoder.encode("faculty123"))
                    .emailVerified(true)
                    .build();
            faculty = userRepository.save(faculty);
            userRoleRepository.save(UserRole.builder().user(faculty).role("faculty").department("Computer Science").build());

            // Create student
            User student = User.builder()
                    .name("Student User")
                    .email("student@acadex.com")
                    .password(passwordEncoder.encode("student123"))
                    .emailVerified(true)
                    .build();
            student = userRepository.save(student);
            userRoleRepository.save(UserRole.builder().user(student).role("student").department("Computer Science").build());

            System.out.println("=== Seed data created ===");
            System.out.println("Admin: admin@acadex.com / admin123");
            System.out.println("Faculty: faculty@acadex.com / faculty123");
            System.out.println("Student: student@acadex.com / student123");

            // ΓöÇΓöÇ Seed Subjects ΓöÇΓöÇ
            Subject sub1 = subjectRepository.save(Subject.builder()
                    .subjectName("Data Structures").subjectCode("CS201")
                    .facultyId(faculty.getId()).section("A").department("Computer Science").semester("3").build());
            Subject sub2 = subjectRepository.save(Subject.builder()
                    .subjectName("Operating Systems").subjectCode("CS301")
                    .facultyId(faculty.getId()).section("A").department("Computer Science").semester("3").build());
            Subject sub3 = subjectRepository.save(Subject.builder()
                    .subjectName("Database Management").subjectCode("CS302")
                    .facultyId(faculty.getId()).section("A").department("Computer Science").semester("3").build());

            // ΓöÇΓöÇ Seed Attendance (last 30 days, Mon-Fri) ΓöÇΓöÇ
            Random rng = new Random(42);
            LocalDate today = LocalDate.now();
            Subject[] subjects = {sub1, sub2, sub3};

            // ΓöÇΓöÇ Seed Topics for each subject ΓöÇΓöÇ
            // Data Structures topics
            Topic t1_1 = topicRepository.save(Topic.builder().subjectId(sub1.getId()).unitNo(1).topicName("Arrays & Linked Lists").build());
            Topic t1_2 = topicRepository.save(Topic.builder().subjectId(sub1.getId()).unitNo(1).topicName("Stacks & Queues").build());
            Topic t1_3 = topicRepository.save(Topic.builder().subjectId(sub1.getId()).unitNo(2).topicName("Binary Trees").build());
            Topic t1_4 = topicRepository.save(Topic.builder().subjectId(sub1.getId()).unitNo(2).topicName("Binary Search Trees").build());
            Topic t1_5 = topicRepository.save(Topic.builder().subjectId(sub1.getId()).unitNo(3).topicName("Sorting Algorithms").build());
            Topic t1_6 = topicRepository.save(Topic.builder().subjectId(sub1.getId()).unitNo(3).topicName("Searching Techniques").build());
            Topic t1_7 = topicRepository.save(Topic.builder().subjectId(sub1.getId()).unitNo(4).topicName("Graphs & Traversals").build());

            // Operating Systems topics
            Topic t2_1 = topicRepository.save(Topic.builder().subjectId(sub2.getId()).unitNo(1).topicName("Process Management").build());
            Topic t2_2 = topicRepository.save(Topic.builder().subjectId(sub2.getId()).unitNo(1).topicName("CPU Scheduling").build());
            Topic t2_3 = topicRepository.save(Topic.builder().subjectId(sub2.getId()).unitNo(2).topicName("Memory Management").build());
            Topic t2_4 = topicRepository.save(Topic.builder().subjectId(sub2.getId()).unitNo(2).topicName("Virtual Memory").build());
            Topic t2_5 = topicRepository.save(Topic.builder().subjectId(sub2.getId()).unitNo(3).topicName("File Systems").build());
            Topic t2_6 = topicRepository.save(Topic.builder().subjectId(sub2.getId()).unitNo(3).topicName("Deadlocks").build());

            // Database Management topics
            Topic t3_1 = topicRepository.save(Topic.builder().subjectId(sub3.getId()).unitNo(1).topicName("ER Modeling").build());
            Topic t3_2 = topicRepository.save(Topic.builder().subjectId(sub3.getId()).unitNo(1).topicName("Relational Algebra").build());
            Topic t3_3 = topicRepository.save(Topic.builder().subjectId(sub3.getId()).unitNo(2).topicName("SQL Queries").build());
            Topic t3_4 = topicRepository.save(Topic.builder().subjectId(sub3.getId()).unitNo(2).topicName("Normalization").build());
            Topic t3_5 = topicRepository.save(Topic.builder().subjectId(sub3.getId()).unitNo(3).topicName("Transactions & Concurrency").build());
            Topic t3_6 = topicRepository.save(Topic.builder().subjectId(sub3.getId()).unitNo(3).topicName("Indexing & Hashing").build());

            Topic[][] topicsBySubject = {
                {t1_1, t1_2, t1_3, t1_4, t1_5, t1_6, t1_7},
                {t2_1, t2_2, t2_3, t2_4, t2_5, t2_6},
                {t3_1, t3_2, t3_3, t3_4, t3_5, t3_6}
            };

            for (int si = 0; si < subjects.length; si++) {
                Subject sub = subjects[si];
                Topic[] subTopics = topicsBySubject[si];
                int topicIdx = 0;

                for (int day = 30; day >= 1; day--) {
                    LocalDate d = today.minusDays(day);
                    if (d.getDayOfWeek().getValue() > 5) continue; // skip weekends

                    // Cycle through topics
                    Topic currentTopic = subTopics[topicIdx % subTopics.length];
                    topicIdx++;

                    // Vary attendance: sub1=90%, sub2=80%, sub3=65%
                    double chance = sub == sub1 ? 0.90 : sub == sub2 ? 0.80 : 0.65;
                    String status = rng.nextDouble() < chance ? "present" : "absent";
                    attendanceRecordRepository.save(AttendanceRecord.builder()
                            .studentId(student.getId())
                            .subjectId(sub.getId())
                            .date(d)
                            .status(status)
                            .markedBy(faculty.getId())
                            .build());

                    // Create ClassSession for each day
                    ClassSession session = classSessionRepository.save(ClassSession.builder()
                            .subjectId(sub.getId())
                            .teacherId(faculty.getId())
                            .date(d)
                            .topicId(currentTopic.getId())
                            .attendanceMarked(true)
                            .notes("Covered " + currentTopic.getTopicName())
                            .build());

                    // Create topic verifications for sessions older than 3 days (student voted)
                    if (day > 3 && "present".equals(status)) {
                        String[] votes = {"Yes", "Yes", "Yes", "Partial", "No"};
                        // DS: mostly Yes, OS: mixed, DBMS: more No
                        String vote;
                        if (sub == sub1) vote = rng.nextDouble() < 0.85 ? "Yes" : "Partial";
                        else if (sub == sub2) vote = rng.nextDouble() < 0.70 ? "Yes" : (rng.nextDouble() < 0.5 ? "Partial" : "No");
                        else vote = rng.nextDouble() < 0.50 ? "Yes" : (rng.nextDouble() < 0.5 ? "Partial" : "No");

                        topicVerificationRepository.save(TopicVerification.builder()
                                .sessionId(session.getId())
                                .studentId(student.getId())
                                .vote(vote)
                                .build());
                    }
                }
            }

            // ΓöÇΓöÇ Seed Teacher Credibility Score ΓöÇΓöÇ
            teacherScoreRepository.save(TeacherScore.builder()
                    .teacherId(faculty.getId())
                    .credibilityScore(78.5)
                    .avgYesVotes(68.2)
                    .avgNoVotes(12.3)
                    .avgPartialVotes(19.5)
                    .attendanceConsistency(85.0)
                    .totalSessionsVerified(18)
                    .riskLevel("Suspicious")
                    .build());

            System.out.println("=== Attendance + Topics + Verification seed data created ===");

            // ΓöÇΓöÇ Seed Courses Module ΓöÇΓöÇ
            // Course 1: Data Structures (Core)
            Course course1 = courseRepository.save(Course.builder()
                    .courseCode("CS201").courseName("Data Structures & Algorithms")
                    .department("Computer Science").semester("3").credits(4).type("Core")
                    .totalHours(60).description("Fundamental data structures and algorithmic paradigms")
                    .status("Published").createdBy(admin.getId()).build());

            // Course 2: Operating Systems (Core)
            Course course2 = courseRepository.save(Course.builder()
                    .courseCode("CS301").courseName("Operating Systems")
                    .department("Computer Science").semester("3").credits(4).type("Core")
                    .totalHours(55).description("Process management, memory management, and file systems")
                    .status("Published").createdBy(admin.getId()).build());

            // Course 3: Database Management (Core)
            Course course3 = courseRepository.save(Course.builder()
                    .courseCode("CS302").courseName("Database Management Systems")
                    .department("Computer Science").semester("3").credits(3).type("Core")
                    .totalHours(45).description("Relational databases, SQL, normalization, and transactions")
                    .status("Published").createdBy(admin.getId()).build());

            // Course 4: Machine Learning (Elective)
            Course course4 = courseRepository.save(Course.builder()
                    .courseCode("CS401").courseName("Machine Learning")
                    .department("Computer Science").semester("5").credits(3).type("Elective")
                    .totalHours(40).description("Supervised & unsupervised learning, neural networks")
                    .status("Draft").createdBy(admin.getId()).build());

            // Course 5: Data Structures Lab
            Course course5 = courseRepository.save(Course.builder()
                    .courseCode("CS201L").courseName("Data Structures Lab")
                    .department("Computer Science").semester("3").credits(2).type("Lab")
                    .totalHours(30).description("Practical implementation of data structures")
                    .status("Published").createdBy(admin.getId()).build());

            // ΓöÇΓöÇ Course Units & Topics ΓöÇΓöÇ
            // DS Units
            CourseUnit cu1_1 = courseUnitRepository.save(CourseUnit.builder().courseId(course1.getId()).unitNumber(1).unitTitle("Linear Data Structures").expectedHours(15).build());
            CourseUnit cu1_2 = courseUnitRepository.save(CourseUnit.builder().courseId(course1.getId()).unitNumber(2).unitTitle("Non-Linear Data Structures").expectedHours(15).build());
            CourseUnit cu1_3 = courseUnitRepository.save(CourseUnit.builder().courseId(course1.getId()).unitNumber(3).unitTitle("Sorting & Searching").expectedHours(15).build());
            CourseUnit cu1_4 = courseUnitRepository.save(CourseUnit.builder().courseId(course1.getId()).unitNumber(4).unitTitle("Graph Algorithms").expectedHours(15).build());

            // DS Topics (some completed)
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_1.getId()).courseId(course1.getId()).topicName("Arrays & Memory Layout").completed(true).completedDate(today.minusDays(25)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_1.getId()).courseId(course1.getId()).topicName("Linked Lists").completed(true).completedDate(today.minusDays(22)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_1.getId()).courseId(course1.getId()).topicName("Stacks & Queues").completed(true).completedDate(today.minusDays(18)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_2.getId()).courseId(course1.getId()).topicName("Binary Trees").completed(true).completedDate(today.minusDays(14)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_2.getId()).courseId(course1.getId()).topicName("BST Operations").completed(true).completedDate(today.minusDays(10)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_2.getId()).courseId(course1.getId()).topicName("AVL Trees & Heaps").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_3.getId()).courseId(course1.getId()).topicName("Bubble, Selection & Insertion Sort").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_3.getId()).courseId(course1.getId()).topicName("Merge Sort & Quick Sort").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_3.getId()).courseId(course1.getId()).topicName("Binary & Linear Search").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_4.getId()).courseId(course1.getId()).topicName("Graph Representations").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_4.getId()).courseId(course1.getId()).topicName("BFS & DFS").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu1_4.getId()).courseId(course1.getId()).topicName("Shortest Path Algorithms").completed(false).build());

            // OS Units
            CourseUnit cu2_1 = courseUnitRepository.save(CourseUnit.builder().courseId(course2.getId()).unitNumber(1).unitTitle("Process Management").expectedHours(14).build());
            CourseUnit cu2_2 = courseUnitRepository.save(CourseUnit.builder().courseId(course2.getId()).unitNumber(2).unitTitle("Memory Management").expectedHours(14).build());
            CourseUnit cu2_3 = courseUnitRepository.save(CourseUnit.builder().courseId(course2.getId()).unitNumber(3).unitTitle("Storage & I/O").expectedHours(14).build());

            courseTopicRepository.save(CourseTopic.builder().unitId(cu2_1.getId()).courseId(course2.getId()).topicName("Process Lifecycle").completed(true).completedDate(today.minusDays(20)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu2_1.getId()).courseId(course2.getId()).topicName("CPU Scheduling Algorithms").completed(true).completedDate(today.minusDays(16)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu2_1.getId()).courseId(course2.getId()).topicName("Inter-Process Communication").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu2_2.getId()).courseId(course2.getId()).topicName("Paging & Segmentation").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu2_2.getId()).courseId(course2.getId()).topicName("Virtual Memory").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu2_3.getId()).courseId(course2.getId()).topicName("File System Implementation").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu2_3.getId()).courseId(course2.getId()).topicName("Deadlock Detection & Recovery").completed(false).build());

            // DBMS Units
            CourseUnit cu3_1 = courseUnitRepository.save(CourseUnit.builder().courseId(course3.getId()).unitNumber(1).unitTitle("Database Design").expectedHours(12).build());
            CourseUnit cu3_2 = courseUnitRepository.save(CourseUnit.builder().courseId(course3.getId()).unitNumber(2).unitTitle("SQL & Query Processing").expectedHours(12).build());
            CourseUnit cu3_3 = courseUnitRepository.save(CourseUnit.builder().courseId(course3.getId()).unitNumber(3).unitTitle("Advanced Topics").expectedHours(12).build());

            courseTopicRepository.save(CourseTopic.builder().unitId(cu3_1.getId()).courseId(course3.getId()).topicName("ER Modeling & Design").completed(true).completedDate(today.minusDays(18)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu3_1.getId()).courseId(course3.getId()).topicName("Relational Model & Algebra").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu3_2.getId()).courseId(course3.getId()).topicName("SQL DDL & DML").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu3_2.getId()).courseId(course3.getId()).topicName("Normalization (1NF-BCNF)").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu3_3.getId()).courseId(course3.getId()).topicName("Transaction & Concurrency Control").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu3_3.getId()).courseId(course3.getId()).topicName("Indexing & B-Trees").completed(false).build());

            // ML Elective Units (Draft course)
            CourseUnit cu4_1 = courseUnitRepository.save(CourseUnit.builder().courseId(course4.getId()).unitNumber(1).unitTitle("Foundations of ML").expectedHours(10).build());
            CourseUnit cu4_2 = courseUnitRepository.save(CourseUnit.builder().courseId(course4.getId()).unitNumber(2).unitTitle("Supervised Learning").expectedHours(15).build());
            CourseUnit cu4_3 = courseUnitRepository.save(CourseUnit.builder().courseId(course4.getId()).unitNumber(3).unitTitle("Neural Networks").expectedHours(15).build());

            courseTopicRepository.save(CourseTopic.builder().unitId(cu4_1.getId()).courseId(course4.getId()).topicName("Probability & Statistics Review").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu4_1.getId()).courseId(course4.getId()).topicName("Feature Engineering").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu4_2.getId()).courseId(course4.getId()).topicName("Linear & Logistic Regression").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu4_2.getId()).courseId(course4.getId()).topicName("Decision Trees & Random Forests").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu4_3.getId()).courseId(course4.getId()).topicName("Perceptrons & Backpropagation").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu4_3.getId()).courseId(course4.getId()).topicName("CNNs & Transfer Learning").completed(false).build());

            // DS Lab Units
            CourseUnit cu5_1 = courseUnitRepository.save(CourseUnit.builder().courseId(course5.getId()).unitNumber(1).unitTitle("Basic Implementations").expectedHours(15).build());
            CourseUnit cu5_2 = courseUnitRepository.save(CourseUnit.builder().courseId(course5.getId()).unitNumber(2).unitTitle("Advanced Implementations").expectedHours(15).build());

            courseTopicRepository.save(CourseTopic.builder().unitId(cu5_1.getId()).courseId(course5.getId()).topicName("Array Operations Lab").completed(true).completedDate(today.minusDays(20)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu5_1.getId()).courseId(course5.getId()).topicName("Linked List Lab").completed(true).completedDate(today.minusDays(15)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu5_1.getId()).courseId(course5.getId()).topicName("Stack & Queue Lab").completed(true).completedDate(today.minusDays(10)).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu5_2.getId()).courseId(course5.getId()).topicName("Tree Traversal Lab").completed(false).build());
            courseTopicRepository.save(CourseTopic.builder().unitId(cu5_2.getId()).courseId(course5.getId()).topicName("Graph Algorithms Lab").completed(false).build());

            // ΓöÇΓöÇ Faculty Mappings ΓöÇΓöÇ
            courseFacultyMappingRepository.save(CourseFacultyMapping.builder().courseId(course1.getId()).facultyId(faculty.getId()).section("A").build());
            courseFacultyMappingRepository.save(CourseFacultyMapping.builder().courseId(course2.getId()).facultyId(faculty.getId()).section("A").build());
            courseFacultyMappingRepository.save(CourseFacultyMapping.builder().courseId(course3.getId()).facultyId(faculty.getId()).section("A").build());
            courseFacultyMappingRepository.save(CourseFacultyMapping.builder().courseId(course5.getId()).facultyId(faculty.getId()).section("A").build());

            // ΓöÇΓöÇ Student Enrollments ΓöÇΓöÇ
            courseEnrollmentRepository.save(CourseEnrollment.builder().courseId(course1.getId()).studentId(student.getId()).section("A").build());
            courseEnrollmentRepository.save(CourseEnrollment.builder().courseId(course2.getId()).studentId(student.getId()).section("A").build());
            courseEnrollmentRepository.save(CourseEnrollment.builder().courseId(course3.getId()).studentId(student.getId()).section("A").build());
            courseEnrollmentRepository.save(CourseEnrollment.builder().courseId(course5.getId()).studentId(student.getId()).section("A").build());

            System.out.println("=== Course module seed data created (5 courses) ===");
        }
    }
}
