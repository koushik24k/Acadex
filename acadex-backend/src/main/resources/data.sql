-- Insert test data for Acadex

-- First, check if test subject and room exist, if not create them
INSERT IGNORE INTO subjects (subject_name, subject_code, department, semester, section)
VALUES ('Mathematics', 'MATH101', 'Engineering', 'Sem-1', 'A');

INSERT IGNORE INTO rooms (name, board_position, capacity, building, floor, room_type, rows_count, columns_count, members_per_bench)
VALUES ('A101', 'Front', 50, 'Building A', '1', 'Examination', 5, 10, 1);

-- Get the IDs (assuming they were just created or already existed)
SELECT id INTO @subject_id FROM subjects WHERE subject_code = 'MATH101' LIMIT 1;
SELECT id INTO @room_id FROM rooms WHERE name = 'A101' LIMIT 1;

-- Check if subject_id is NULL (meaning insert failed due to IGNORE)
SELECT IFNULL(@subject_id, (SELECT MIN(id) FROM subjects)) INTO @subject_id;
SELECT IFNULL(@room_id, (SELECT MIN(id) FROM rooms)) INTO @room_id;

-- Insert a test exam
INSERT INTO exams (title, description, status, scheduled_date, scheduled_time, end_time, duration, total_marks, passing_marks, room_id, created_by, created_by_role, class_id, created_at, updated_at)
VALUES ('Math Final Exam', 'Final examination for Mathematics', 'published', '2024-12-20', '10:00:00', '11:00:00', 60, 100, 40, @room_id, 'admin', 'ADMIN', '1', NOW(), NOW());

-- Get the exam ID that was just inserted
SELECT LAST_INSERT_ID() INTO @exam_id;

-- Insert test questions for the exam
INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, question_order)
VALUES 
  (@exam_id, 'What is 2+2?', 'mcq', '["3","4","5","6"]', '4', 1, 1),
  (@exam_id, 'What is the capital of France?', 'mcq', '["London","Paris","Berlin","Madrid"]', 'Paris', 1, 2),
  (@exam_id, 'What is 5*5?', 'fill-in-blank', NULL, '25', 1, 3),
  (@exam_id, 'Explain the theory of relativity.', 'subjective', NULL, NULL, 10, 4);

-- Mock Courses
INSERT IGNORE INTO courses (id, course_code, course_name, description, credits, department, semester, type, status, created_at, updated_at) VALUES
(101, 'CS101', 'Data Structures', 'Fundamental data structures and algorithms.', 4, 'Computer Science', '2', 'Core', 'Published', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(102, 'CS102', 'Algorithms', 'Design and analysis of algorithms.', 4, 'Computer Science', '2', 'Core', 'Published', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(103, 'CS201', 'Operating Systems', 'Core concepts of modern operating systems.', 3, 'Computer Science', '4', 'Core', 'Draft', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(104, 'CS202', 'Database Management Systems', 'Introduction to database design and SQL.', 3, 'Computer Science', '3', 'Core', 'Published', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(105, 'CS301', 'Computer Networks', 'Principles of computer networking.', 3, 'Computer Science', '4', 'Elective', 'Locked', '2024-01-01 10:00:00', '2024-01-01 10:00:00');

-- More Rooms
INSERT IGNORE INTO rooms (id, name, building, floor, rows_count, columns_count, members_per_bench, capacity, room_type, board_position, is_active, created_at, updated_at) VALUES
(201, 'D-301', 'Block D', '3', 12, 8, 2, 192, 'classroom', 'top', true, '2024-01-01 11:00:00', '2024-01-01 11:00:00'),
(202, 'E-105', 'Block E', '1', 10, 10, 2, 200, 'classroom', 'top', true, '2024-01-01 11:00:00', '2024-01-01 11:00:00'),
(203, 'D-LAB-02', 'Block D', 'Ground', 15, 2, 1, 30, 'lab', 'top', true, '2024-01-01 11:00:00', '2024-01-01 11:00:00');

-- =================================================================
--  MOCK DATA FOR ALL FEATURES
-- =================================================================

-- More Users (Students & Faculty)
-- Note: Passwords are 'password'
INSERT IGNORE INTO users (id, name, email, password, created_at, updated_at) VALUES
('user_student_03', 'Charlie Brown', 'charlie@acadex.com', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_04', 'Diana Prince', 'diana@acadex.com', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_faculty_03', 'Charles Xavier', 'xavier@acadex.com', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00');

INSERT IGNORE INTO user_roles (user_id, role, created_at) VALUES
('user_student_03', 'student', '2024-01-01 10:00:00'),
('user_student_04', 'student', '2024-01-01 10:00:00'),
('user_faculty_03', 'faculty', '2024-01-01 10:00:00');

-- Rooms
INSERT IGNORE INTO rooms (id, name, building, floor, rows_count, columns_count, members_per_bench, capacity, room_type, board_position, is_active, created_at, updated_at) VALUES
(101, 'A-101', 'Block A', '1', 10, 5, 2, 100, 'classroom', 'top', true, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(102, 'B-203', 'Block B', '2', 15, 6, 2, 180, 'classroom', 'top', true, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(103, 'C-LAB-01', 'Block C', 'Ground', 20, 2, 1, 40, 'lab', 'top', true, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(201, 'D-301', 'Block D', '3', 12, 8, 2, 192, 'classroom', 'top', true, '2024-01-01 11:00:00', '2024-01-01 11:00:00'),
(202, 'E-105', 'Block E', '1', 10, 10, 2, 200, 'classroom', 'top', true, '2024-01-01 11:00:00', '2024-01-01 11:00:00'),
(203, 'D-LAB-02', 'Block D', 'Ground', 15, 2, 1, 30, 'lab', 'top', true, '2024-01-01 11:00:00', '2024-01-01 11:00:00');

-- Course Units & Topics for CS101
INSERT INTO course_units (id, course_id, unit_name, description, created_at, updated_at) VALUES
(101, 101, 'Introduction to Data Structures', 'Basic concepts.', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(102, 101, 'Linear Data Structures', 'Arrays, Stacks, Queues, Linked Lists.', '2024-01-01 10:00:00', '2024-01-01 10:00:00');
INSERT INTO course_topics (id, unit_id, topic_name, description, completed, created_at, updated_at) VALUES
(101, 101, 'Arrays', 'Introduction to arrays.', true, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(102, 102, 'Stacks and Queues', 'LIFO and FIFO structures.', false, '2024-01-01 10:00:00', '2024-01-01 10:00:00');

-- Timetable Entries
INSERT INTO timetable (id, course_id, faculty_id, room_id, day_of_week, start_time, end_time) VALUES
(101, 101, 'user_faculty_01', 101, 'MONDAY', '09:00:00', '10:00:00'),
(102, 102, 'user_faculty_02', 102, 'TUESDAY', '10:00:00', '11:00:00'),
(103, 104, 'user_faculty_03', 101, 'WEDNESDAY', '11:00:00', '12:00:00');

-- Exams
INSERT INTO exams (id, title, description, scheduled_date, duration, total_marks, status, created_at, updated_at) VALUES
(101, 'Mid-Term Exam: Data Structures', 'Exam for CS101.', '2026-04-15 10:00:00', 90, 100, 'Published', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(102, 'Final Exam: Algorithms', 'Exam for CS102.', '2026-05-20 10:00:00', 120, 100, 'Draft', '2024-01-01 10:00:00', '2024-01-01 10:00:00');

-- Assignments
INSERT INTO assignments (id, course_id, title, description, due_date, created_at, updated_at) VALUES
(101, 101, 'Assignment 1: Array Operations', 'Implement basic array operations.', '2026-04-10 23:59:59', '2024-01-01 10:00:00', '2024-01-01 10:00:00');

-- Attendance Records
INSERT INTO attendance_records (id, student_id, topic_id, date, status, created_at, updated_at) VALUES
(101, 'user_student_01', 101, '2026-03-20 09:30:00', 'present', '2026-03-20 09:30:00', '2026-03-20 09:30:00'),
(102, 'user_student_02', 101, '2026-03-20 09:30:00', 'absent', '2026-03-20 09:30:00', '2026-03-20 09:30:00'),
(103, 'user_student_03', 101, '2026-03-20 09:30:00', 'present', '2026-03-20 09:30:00', '2026-03-20 09:30:00');

-- Exam Results
INSERT INTO exam_results (id, student_id, exam_id, obtained_marks, total_marks, percentage, grade, created_at, updated_at) VALUES
(101, 'user_student_01', 101, 85, 100, 85, 'A', '2026-04-20 14:00:00', '2026-04-20 14:00:00'),
(102, 'user_student_02', 101, 55, 100, 55, 'C', '2026-04-20 14:00:00', '2026-04-20 14:00:00');

-- Assignment Submissions
INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_date, file_path, marks_awarded, comments, created_at, updated_at) VALUES
(101, 101, 'user_student_01', '2026-04-09 18:00:00', '/submissions/assign1_student1.pdf', 90, 'Good work.', '2026-04-09 18:00:00', '2026-04-09 18:00:00');

-- =================================================================
--  BATCH OF STUDENTS (CS Department) - 15 Additional Students
-- =================================================================
INSERT IGNORE INTO users (id, name, email, password, created_at, updated_at) VALUES
('user_student_05', 'Arjun Patel', 'arjun@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_06', 'Priya Singh', 'priya@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_07', 'Rahul Kumar', 'rahul@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_08', 'Neha Sharma', 'neha@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_09', 'Vikram Desai', 'vikram@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_10', 'Anjali Reddy', 'anjali@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_11', 'Kartik Nair', 'kartik@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_12', 'Divya Menon', 'divya@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_13', 'Aditya Verma', 'aditya@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_14', 'Ishita Gupta', 'ishita@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_15', 'Rohan Bhatt', 'rohan@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_16', 'Sneha Kapoor', 'sneha@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_17', 'Sanjay Iyer', 'sanjay@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_18', 'Pooja Rao', 'pooja@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('user_student_19', 'Akshay Singh', 'akshay@student.edu', '$2a$10$2.G.swvDFh42b2l1Vv6Qy.2jZ1C.L4L5R/2p2.U.d5v5.d5v5.d5v', '2024-01-01 10:00:00', '2024-01-01 10:00:00');

INSERT IGNORE INTO user_roles (user_id, role, created_at) VALUES
('user_student_05', 'student', '2024-01-01 10:00:00'),
('user_student_06', 'student', '2024-01-01 10:00:00'),
('user_student_07', 'student', '2024-01-01 10:00:00'),
('user_student_08', 'student', '2024-01-01 10:00:00'),
('user_student_09', 'student', '2024-01-01 10:00:00'),
('user_student_10', 'student', '2024-01-01 10:00:00'),
('user_student_11', 'student', '2024-01-01 10:00:00'),
('user_student_12', 'student', '2024-01-01 10:00:00'),
('user_student_13', 'student', '2024-01-01 10:00:00'),
('user_student_14', 'student', '2024-01-01 10:00:00'),
('user_student_15', 'student', '2024-01-01 10:00:00'),
('user_student_16', 'student', '2024-01-01 10:00:00'),
('user_student_17', 'student', '2024-01-01 10:00:00'),
('user_student_18', 'student', '2024-01-01 10:00:00'),
('user_student_19', 'student', '2024-01-01 10:00:00');

-- =================================================================
--  MORE COURSES AND ADDITIONAL TIMETABLE ENTRIES
-- =================================================================
INSERT IGNORE INTO courses (id, course_code, course_name, description, credits, department, semester, type, status, created_at, updated_at) VALUES
(106, 'CS103', 'Web Development', 'Full-stack development using modern frameworks.', 3, 'Computer Science', '3', 'Elective', 'Published', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(107, 'CS201A', 'Operating Systems Advanced', 'Advanced OS concepts and design patterns.', 3, 'Computer Science', '4', 'Core', 'Published', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(108, 'CS303', 'Machine Learning', 'Introduction to ML algorithms and applications.', 4, 'Computer Science', '5', 'Elective', 'Draft', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(109, 'CS304', 'Cloud Computing', 'Distributed systems and cloud infrastructure.', 3, 'Computer Science', '5', 'Elective', 'Published', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(110, 'CS401', 'Cybersecurity', 'Security principles and cryptography.', 3, 'Computer Science', '6', 'Elective', 'Published', '2024-01-01 10:00:00', '2024-01-01 10:00:00');

-- =================================================================
--  EXTENDED TIMETABLE ENTRIES FOR ALL COURSES
-- =================================================================
-- CS102 (Algorithms) - More sessions
INSERT IGNORE INTO timetable (id, course_id, faculty_id, room_id, day_of_week, start_time, end_time) VALUES
(104, 102, 'user_faculty_02', 101, 'MONDAY', '14:00:00', '15:30:00'),
(105, 102, 'user_faculty_02', 102, 'WEDNESDAY', '14:00:00', '15:30:00'),

-- CS103 (Web Development)
(106, 106, 'user_faculty_03', 103, 'TUESDAY', '10:00:00', '11:30:00'),
(107, 106, 'user_faculty_03', 103, 'THURSDAY', '10:00:00', '11:30:00'),

-- CS201A (Operating Systems Advanced)
(108, 107, 'user_faculty_01', 102, 'MONDAY', '15:30:00', '17:00:00'),
(109, 107, 'user_faculty_01', 102, 'FRIDAY', '15:30:00', '17:00:00'),

-- CS303 (Machine Learning)
(110, 108, 'user_faculty_02', 101, 'WEDNESDAY', '10:00:00', '11:30:00'),
(111, 108, 'user_faculty_02', 101, 'FRIDAY', '10:00:00', '11:30:00'),

-- CS304 (Cloud Computing)
(112, 109, 'user_faculty_03', 202, 'TUESDAY', '11:30:00', '13:00:00'),
(113, 109, 'user_faculty_03', 202, 'THURSDAY', '11:30:00', '13:00:00'),

-- CS401 (Cybersecurity)
(114, 110, 'user_faculty_01', 203, 'MONDAY', '13:00:00', '14:30:00'),
(115, 110, 'user_faculty_01', 203, 'WEDNESDAY', '13:00:00', '14:30:00');
