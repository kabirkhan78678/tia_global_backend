-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jul 31, 2026 at 02:25 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tia_global_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `academy_master`
--

CREATE TABLE `academy_master` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `academy_master`
--

INSERT INTO `academy_master` (`id`, `name`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Global Academy', 'Secular, Quran, Islamic, and Arabic Studies', 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(2, 'Religious Academy', 'Quran, Islamic, and Arabic Studies', 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05');

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` text NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `name`, `email`, `phone`, `password`, `profile_image`, `status`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 'Jack Sparrow', 'jack@yopmail.com', '9876543210', '$2b$10$ffFbMwazltlyoenmULlDyOmjp8A6TScSEUCz9lojqIDkkepI/0iTi', '/uploads/profiles/1784790976206-119985135.png', 'active', '2026-07-31 13:28:18', '2026-06-25 06:56:08', '2026-07-31 07:58:18');

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `teacher_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `grade_level` varchar(50) NOT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `total_points` int(10) UNSIGNED NOT NULL DEFAULT 100,
  `attachment_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignments`
--

INSERT INTO `assignments` (`id`, `teacher_id`, `title`, `description`, `grade_level`, `subject`, `due_date`, `total_points`, `attachment_url`, `created_at`, `updated_at`) VALUES
(1, 8, 'Math Chapter 3 Homework', 'Solve exercise 3.1 to 3.5 in your notebook.', '1st Grade', 'Mathematics', '2026-07-30 23:59:59', 100, NULL, '2026-07-22 09:28:35', '2026-07-22 09:28:35');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_submissions`
--

CREATE TABLE `assignment_submissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `assignment_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `submission_text` text DEFAULT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `status` enum('pending','submitted','graded') NOT NULL DEFAULT 'pending',
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `grade` varchar(20) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  `graded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_conversations`
--

CREATE TABLE `chat_conversations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `conversation_type` enum('parent_teacher','student_teacher') NOT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `student_id` bigint(20) UNSIGNED DEFAULT NULL,
  `teacher_id` bigint(20) UNSIGNED NOT NULL,
  `created_by_role` enum('parent','teacher','student') NOT NULL,
  `created_by_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_conversations`
--

INSERT INTO `chat_conversations` (`id`, `conversation_type`, `parent_id`, `student_id`, `teacher_id`, `created_by_role`, `created_by_id`, `created_at`, `updated_at`) VALUES
(1, 'student_teacher', NULL, 10, 8, 'student', 10, '2026-07-15 09:47:47', '2026-07-15 11:35:34'),
(2, 'student_teacher', NULL, 7, 8, 'teacher', 8, '2026-07-15 12:23:12', '2026-07-28 10:46:52'),
(3, 'parent_teacher', 7, NULL, 8, 'parent', 7, '2026-07-17 09:33:35', '2026-07-31 07:40:32'),
(4, 'parent_teacher', 10, NULL, 8, 'teacher', 8, '2026-07-17 10:05:40', '2026-07-31 06:13:21');

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `conversation_id` bigint(20) UNSIGNED NOT NULL,
  `sender_role` enum('parent','teacher','student') NOT NULL,
  `sender_id` bigint(20) UNSIGNED NOT NULL,
  `body` text NOT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `conversation_id`, `sender_role`, `sender_id`, `body`, `attachment_url`, `attachment_name`, `attachment_type`, `created_at`, `deleted_at`) VALUES
(1, 1, 'student', 10, 'hello', NULL, NULL, NULL, '2026-07-15 09:56:30', NULL),
(2, 1, 'student', 10, 'kaise ho sir ji', NULL, NULL, NULL, '2026-07-15 10:02:41', NULL),
(3, 1, 'teacher', 8, 'i\'m good', NULL, NULL, NULL, '2026-07-15 11:22:26', NULL),
(4, 1, 'teacher', 8, 'what\'s about you ?', NULL, NULL, NULL, '2026-07-15 11:25:15', NULL),
(5, 1, 'teacher', 8, 'hii', NULL, NULL, NULL, '2026-07-15 11:35:34', NULL),
(6, 3, 'parent', 7, 'hello teacher', NULL, NULL, NULL, '2026-07-17 09:34:07', NULL),
(7, 3, 'teacher', 8, 'ha bolo', NULL, NULL, NULL, '2026-07-17 09:34:40', NULL),
(8, 3, 'parent', 7, 'kya bolu', NULL, NULL, NULL, '2026-07-17 09:34:55', NULL),
(9, 3, 'parent', 7, 'Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about leStay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.ssons, assignments, or books.Stay connected with your teachers and ask questions about lessons, assignments, or books.', NULL, NULL, NULL, '2026-07-17 10:10:42', NULL),
(10, 3, 'teacher', 8, 'ye kya h ?', NULL, NULL, NULL, '2026-07-17 10:14:26', NULL),
(11, 3, 'teacher', 8, 'ha', NULL, NULL, NULL, '2026-07-17 10:14:50', NULL),
(12, 3, 'teacher', 8, 'bolo', NULL, NULL, NULL, '2026-07-17 10:15:34', NULL),
(13, 3, 'teacher', 8, 'test', NULL, NULL, NULL, '2026-07-17 10:15:47', NULL),
(14, 3, 'parent', 7, 'ok', NULL, NULL, NULL, '2026-07-17 10:16:00', NULL),
(15, 2, 'student', 7, 'Test message with attachment from script', '/uploads/chat/1722153245-student_report.pdf', 'student_report.pdf', 'application/pdf', '2026-07-28 10:44:16', NULL),
(16, 2, 'student', 7, 'Hi, this is a test message from Postman with document attachment!', '/uploads/chat/1722153245-student_report.pdf', 'student_report.pdf', 'application/pdf', '2026-07-28 10:46:52', NULL),
(17, 4, 'teacher', 8, 'Hello, this is a text message sent via form-data!', NULL, NULL, NULL, '2026-07-31 06:13:08', NULL),
(18, 4, 'teacher', 8, 'Hello, here is the test document!', '/uploads/chat/1785478397477-test_doc.txt', 'test_doc.txt', 'text/plain', '2026-07-31 06:13:17', NULL),
(19, 4, 'teacher', 8, '', '/uploads/chat/1785478401523-test_doc.txt', 'test_doc.txt', 'text/plain', '2026-07-31 06:13:21', NULL),
(20, 3, 'parent', 7, '', '/uploads/chat/1785481898249-f04a8386-0cb2-4562-b073-fa9a8967f64e.png', 'f04a8386-0cb2-4562-b073-fa9a8967f64e.png', 'image/png', '2026-07-31 07:11:38', NULL),
(21, 3, 'parent', 7, '', '/uploads/chat/1785482108790-ZYNQ_Admin_Panel_Implementation_and_Internal_Validation_v1_3.pdf', 'ZYNQ_Admin_Panel_Implementation_and_Internal_Validation_v1.3.pdf', 'application/pdf', '2026-07-31 07:15:08', NULL),
(22, 3, 'teacher', 8, 'okay', '/uploads/chat/1785482915200-26249c4c-8fd5-4cfe-90b0-b465e0440486.png', '26249c4c-8fd5-4cfe-90b0-b465e0440486.png', 'image/png', '2026-07-31 07:28:35', NULL),
(23, 3, 'teacher', 8, '', '/uploads/chat/1785483632346-chatAttachment1785411344380.docx', 'chatAttachment1785411344380.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2026-07-31 07:40:32', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `chat_participant_reads`
--

CREATE TABLE `chat_participant_reads` (
  `conversation_id` bigint(20) UNSIGNED NOT NULL,
  `participant_role` enum('parent','teacher','student') NOT NULL,
  `participant_id` bigint(20) UNSIGNED NOT NULL,
  `last_read_message_id` bigint(20) UNSIGNED DEFAULT NULL,
  `last_read_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_participant_reads`
--

INSERT INTO `chat_participant_reads` (`conversation_id`, `participant_role`, `participant_id`, `last_read_message_id`, `last_read_at`) VALUES
(1, 'teacher', 8, 5, '2026-07-17 10:12:59'),
(1, 'student', 10, 2, '2026-07-15 10:02:41'),
(2, 'teacher', 8, 16, '2026-07-31 07:56:09'),
(2, 'student', 7, 16, '2026-07-28 10:46:52'),
(3, 'parent', 7, 23, '2026-07-31 07:55:59'),
(3, 'teacher', 8, 23, '2026-07-31 07:56:06'),
(4, 'teacher', 8, 19, '2026-07-31 07:56:08');

-- --------------------------------------------------------

--
-- Table structure for table `discount_master`
--

CREATE TABLE `discount_master` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `discount_name` varchar(150) NOT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `applicable_component` varchar(100) NOT NULL DEFAULT 'Tuition',
  `academy_id` bigint(20) UNSIGNED DEFAULT NULL,
  `grade_level_id` bigint(20) UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `discount_master`
--

INSERT INTO `discount_master` (`id`, `discount_name`, `discount_type`, `value`, `applicable_component`, `academy_id`, `grade_level_id`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Full Tuition Payment Discount', 'percentage', 10.00, 'Tuition', NULL, NULL, 1, '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(2, 'Sibling Discount', 'percentage', 10.00, 'Tuition', NULL, NULL, 1, '2026-07-21 10:02:05', '2026-07-21 10:02:05');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `event_date` date NOT NULL,
  `event_time` time DEFAULT NULL,
  `category` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `description`, `event_date`, `event_time`, `category`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'PTM Meeting', 'Parents meeting for Class 1 & 2', '2026-07-20', '10:00:00', 'STUDENT', '2026-07-15 11:56:05', '2026-07-23 07:48:17', '2026-07-23 07:48:17'),
(2, 'PTM Meeting', 'Parents meeting for Class 1 & 2', '2026-07-21', '11:00:00', '', '2026-07-17 07:31:34', '2026-07-17 07:31:34', NULL),
(3, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-16', '11:00:00', 'PARENT,STUDENT', '2026-07-17 07:34:49', '2026-07-23 07:50:17', NULL),
(4, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', '', '2026-07-17 07:41:22', '2026-07-17 07:46:45', '2026-07-17 07:46:45'),
(5, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', 'STUDENT,PARENT', '2026-07-17 07:44:22', '2026-07-23 07:48:19', '2026-07-23 07:48:19'),
(6, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', 'STUDENT,PARENT', '2026-07-17 08:21:45', '2026-07-23 07:48:21', '2026-07-23 07:48:21'),
(7, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', 'STUDENT,PARENT', '2026-07-17 08:22:01', '2026-07-23 07:48:23', '2026-07-23 07:48:23'),
(8, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', 'STUDENT,PARENT', '2026-07-17 08:22:02', '2026-07-23 07:48:24', '2026-07-23 07:48:24'),
(9, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', 'STUDENT,PARENT', '2026-07-17 08:22:10', '2026-07-23 07:48:26', '2026-07-23 07:48:26'),
(10, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', 'STUDENT,PARENT', '2026-07-17 08:24:29', '2026-07-23 07:48:28', '2026-07-23 07:48:28'),
(11, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', 'STUDENT,PARENT', '2026-07-17 08:25:53', '2026-07-23 07:48:29', '2026-07-23 07:48:29'),
(12, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', 'STUDENT,PARENT', '2026-07-17 08:26:23', '2026-07-23 07:48:31', '2026-07-23 07:48:31'),
(13, 'Ganesh Chaturthi', 'Ganesh celebration for Class 1 & 2', '2026-07-17', '11:00:00', 'STUDENT,PARENT', '2026-07-23 05:57:33', '2026-07-23 07:48:34', '2026-07-23 07:48:34'),
(14, 'Strategy Design Development', 'this Strategy Design Development event is only for testing purpose do not take it seriously', '2026-07-28', '14:30:00', 'PARENT,TEACHER', '2026-07-23 06:52:41', '2026-07-23 06:52:41', NULL),
(15, 'App Design Course', 'this is test description', '2026-07-28', '14:00:00', 'PARENT,TEACHER,STUDENT', '2026-07-23 07:09:25', '2026-07-23 10:17:52', NULL),
(16, 'Annual Science Fair', 'Science exhibition for primary school students.', '2026-08-15', '10:00:00', 'STUDENT,PARENT', '2026-07-23 07:15:13', '2026-07-23 07:19:46', '2026-07-23 07:19:46'),
(17, 'Annual Science Fair', 'Science exhibition for primary school students.', '2026-08-15', '10:00:00', 'STUDENT,PARENT', '2026-07-23 07:17:23', '2026-07-23 07:19:52', '2026-07-23 07:19:52');

-- --------------------------------------------------------

--
-- Table structure for table `event_student_grades`
--

CREATE TABLE `event_student_grades` (
  `id` bigint(20) NOT NULL,
  `event_id` bigint(20) NOT NULL,
  `grade` enum('Pre-K','Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_student_grades`
--

INSERT INTO `event_student_grades` (`id`, `event_id`, `grade`) VALUES
(1, 1, '1st Grade'),
(2, 1, '2nd Grade'),
(3, 2, '1st Grade'),
(4, 2, '2nd Grade'),
(7, 4, '1st Grade'),
(8, 4, '2nd Grade'),
(9, 5, '1st Grade'),
(10, 5, '2nd Grade'),
(11, 6, '1st Grade'),
(12, 6, '2nd Grade'),
(13, 7, '1st Grade'),
(14, 7, '2nd Grade'),
(15, 8, '1st Grade'),
(16, 8, '2nd Grade'),
(17, 9, '1st Grade'),
(18, 9, '2nd Grade'),
(19, 10, '1st Grade'),
(20, 10, '2nd Grade'),
(21, 11, '1st Grade'),
(22, 11, '2nd Grade'),
(23, 12, '1st Grade'),
(24, 12, '2nd Grade'),
(25, 13, '1st Grade'),
(26, 13, '2nd Grade'),
(27, 16, '1st Grade'),
(28, 16, '2nd Grade'),
(29, 16, '3rd Grade'),
(30, 17, '1st Grade'),
(31, 17, '2nd Grade'),
(32, 17, '3rd Grade'),
(35, 3, '1st Grade'),
(36, 3, '2nd Grade'),
(37, 15, '1st Grade'),
(38, 15, 'Kindergarten');

-- --------------------------------------------------------

--
-- Table structure for table `fee_component_master`
--

CREATE TABLE `fee_component_master` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `component_name` varchar(150) NOT NULL,
  `component_type` enum('Tuition','Enrollment','ReEnrollment','Technology','Textbook','Miscellaneous') NOT NULL,
  `frequency` enum('One Time','Monthly','Annual') NOT NULL DEFAULT 'Monthly',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fee_component_master`
--

INSERT INTO `fee_component_master` (`id`, `component_name`, `component_type`, `frequency`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Tuition Fee', 'Tuition', 'Monthly', 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(2, 'Enrollment Fee', 'Enrollment', 'One Time', 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(3, 'Re-Enrollment Fee', 'ReEnrollment', 'Annual', 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(4, 'Technology Fee', 'Technology', 'Annual', 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(5, 'Textbook Fee', 'Textbook', 'Annual', 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(6, 'Miscellaneous Fee', 'Miscellaneous', 'One Time', 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05');

-- --------------------------------------------------------

--
-- Table structure for table `fee_plan_items`
--

CREATE TABLE `fee_plan_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `fee_plan_id` bigint(20) UNSIGNED NOT NULL,
  `fee_component_id` bigint(20) UNSIGNED NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fee_plan_items`
--

INSERT INTO `fee_plan_items` (`id`, `fee_plan_id`, `fee_component_id`, `amount`, `is_required`, `display_order`, `created_at`) VALUES
(1, 1, 1, 350.00, 1, 1, '2026-07-22 13:11:41'),
(2, 1, 2, 150.00, 1, 2, '2026-07-22 13:11:41'),
(3, 1, 4, 200.00, 1, 3, '2026-07-22 13:11:41'),
(4, 2, 1, 350.00, 1, 1, '2026-07-22 13:11:41'),
(5, 2, 3, 75.00, 1, 2, '2026-07-22 13:11:41'),
(6, 2, 4, 200.00, 1, 3, '2026-07-22 13:11:41'),
(7, 3, 1, 250.00, 1, 1, '2026-07-22 13:11:41'),
(8, 3, 2, 150.00, 1, 2, '2026-07-22 13:11:41'),
(9, 4, 1, 250.00, 1, 1, '2026-07-22 13:11:41'),
(10, 4, 3, 75.00, 1, 2, '2026-07-22 13:11:41');

-- --------------------------------------------------------

--
-- Table structure for table `fee_plan_master`
--

CREATE TABLE `fee_plan_master` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `academy_id` bigint(20) UNSIGNED NOT NULL,
  `student_type` enum('new','returning','all') NOT NULL DEFAULT 'all',
  `plan_name` varchar(255) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fee_plan_master`
--

INSERT INTO `fee_plan_master` (`id`, `academy_id`, `student_type`, `plan_name`, `currency`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'new', 'Global Academy - New Student Plan', 'USD', 'active', '2026-07-22 13:11:41', '2026-07-22 13:11:41'),
(2, 1, 'returning', 'Global Academy - Returning Student Plan', 'USD', 'active', '2026-07-22 13:11:41', '2026-07-22 13:11:41'),
(3, 2, 'new', 'Religious Academy - New Student Plan', 'USD', 'active', '2026-07-22 13:11:41', '2026-07-22 13:11:41'),
(4, 2, 'returning', 'Religious Academy - Returning Student Plan', 'USD', 'active', '2026-07-22 13:11:41', '2026-07-22 13:11:41');

-- --------------------------------------------------------

--
-- Table structure for table `grade_level_master`
--

CREATE TABLE `grade_level_master` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `academy_id` bigint(20) UNSIGNED DEFAULT NULL,
  `grade_name` varchar(100) NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `grade_level_master`
--

INSERT INTO `grade_level_master` (`id`, `academy_id`, `grade_name`, `display_order`, `status`, `created_at`, `updated_at`) VALUES
(1, NULL, 'Pre-K', 1, 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(2, NULL, 'Kindergarten', 2, 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(3, NULL, '1st Grade', 3, 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(4, NULL, '2nd Grade', 4, 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(5, NULL, '3rd Grade', 5, 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05'),
(6, NULL, '4th Grade', 6, 'active', '2026-07-21 10:02:05', '2026-07-21 10:02:05');

-- --------------------------------------------------------

--
-- Table structure for table `handbooks`
--

CREATE TABLE `handbooks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `grade_level` varchar(100) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `handbooks`
--

INSERT INTO `handbooks` (`id`, `title`, `grade_level`, `file_url`, `file_name`, `created_at`, `updated_at`) VALUES
(1, '1st Grade Math Handbook', '1st Grade', '/uploads/handbooks/test_1st_grade.pdf', 'test_1st_grade.pdf', '2026-07-31 06:59:35', '2026-07-31 06:59:35'),
(5, 'test', '3rd Grade', '/uploads/handbooks/1785498680562-ZYNQ_Admin_Panel_Implementation_and_Internal_Validation_v1_3.pdf', 'ZYNQ_Admin_Panel_Implementation_and_Internal_Validation_v1.3.pdf', '2026-07-31 11:51:20', '2026-07-31 11:51:20');

-- --------------------------------------------------------

--
-- Table structure for table `parent_students`
--

CREATE TABLE `parent_students` (
  `id` bigint(20) NOT NULL,
  `parent_id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parent_students`
--

INSERT INTO `parent_students` (`id`, `parent_id`, `student_id`) VALUES
(1, 1, 1),
(2, 4, 2),
(3, 4, 3),
(4, 5, 4),
(5, 6, 5),
(6, 6, 6),
(7, 7, 7),
(8, 7, 8),
(9, 7, 9),
(10, 10, 10);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_requests`
--

CREATE TABLE `password_reset_requests` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `email` varchar(150) NOT NULL,
  `token` varchar(128) NOT NULL,
  `status` enum('pending','approved','used','expired') NOT NULL DEFAULT 'pending',
  `approved_at` timestamp NULL DEFAULT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_reset_requests`
--

INSERT INTO `password_reset_requests` (`id`, `user_id`, `email`, `token`, `status`, `approved_at`, `used_at`, `expires_at`, `created_at`) VALUES
(1, 1, 'rahul@yopmail.com', '2096cc1ae6e5ba45f1390a93ec26d84298bf13eb4285b4d9b1d889e9f9b7ec1f', 'approved', NULL, NULL, '2026-06-24 14:45:12', '2026-06-24 13:45:12'),
(2, 1, 'rahul@yopmail.com', '2c1e1a3fae17cbf0e65201358290eb6fd07fb578e348ff0cbaf5e5998b4cd29e', 'approved', NULL, NULL, '2026-06-24 14:54:19', '2026-06-24 13:54:19'),
(3, 1, 'rahul@yopmail.com', 'c4b3d48d85958f801070ac7c32fedc16326e62d9ddb1ec476a40c8a572ee31d2', 'pending', NULL, NULL, '2026-06-24 14:54:57', '2026-06-24 13:54:57'),
(4, 1, 'rahul@yopmail.com', '5c9905f85b56b6f1521ce5533fdddd479a2b6224ab67d20059154786a7ab4d4f', 'pending', NULL, NULL, '2026-06-25 08:38:27', '2026-06-25 07:38:27'),
(5, 1, 'rahul@yopmail.com', 'bc264bb4b014c207e78574b4b9ba7f4118eb043b2726ca781f0feea07f2d6895', 'used', NULL, '2026-06-25 07:47:48', '2026-06-25 08:47:19', '2026-06-25 07:47:19'),
(6, 3, 'priya@yopmail.com', '384a212391613af8520eb1bddafe578a175ec56ce9ee77abf359d2b086ded827', 'used', NULL, '2026-06-25 07:58:10', '2026-06-25 08:55:35', '2026-06-25 07:55:35'),
(7, 3, 'priya@yopmail.com', 'ae2d6d5d1705fe2fc3c19ca0f75cf9a44442dc023e217816ce182294ac9e0b46', 'used', NULL, '2026-06-25 08:13:43', '2026-06-25 09:11:18', '2026-06-25 08:11:18'),
(8, 1, 'jack@yopmail.com', '97553457c321b5defad45fd5e69b5aff1230e609a2e4ae81da361a0cc81c506a', 'pending', NULL, NULL, '2026-06-25 10:20:03', '2026-06-25 09:20:03'),
(9, 1, 'jack@yopmail.com', 'eafae311abf16cbb66c059664050987d13c6e301ddb104944b5b2d6b485c5769', 'used', NULL, '2026-06-25 09:28:00', '2026-06-25 10:25:58', '2026-06-25 09:25:58'),
(10, 4, 'qycegiqidi@mailinator.com', 'c70ffcc83543491ff8e7e1f273ed56372bbda7999956f811f1f5cd3f06e6b667', 'pending', NULL, NULL, '2026-07-08 11:04:08', '2026-07-08 10:04:08'),
(11, 4, 'qycegiqidi@mailinator.com', 'b81cc7bd176ad3d7cf45744dfd178eb3ba117fa9e2895e54992eb5d63ba1044f', 'pending', NULL, NULL, '2026-07-08 11:05:20', '2026-07-08 10:05:20'),
(12, 3, 'priya@yopmail.com', '923876e8a9f8c116a271ba453cfd9ba71a043730c691a81b5a43782f16f08b27', 'used', NULL, '2026-07-13 10:16:09', '2026-07-13 11:15:33', '2026-07-13 10:15:33'),
(13, 8, 'casey@mailinator.com', 'b25a2d492f0ad2debd9feca8a70300525c826c38bfee24154df7ea5a71982582', 'used', NULL, '2026-07-15 07:42:19', '2026-07-15 08:41:11', '2026-07-15 07:41:11'),
(14, 8, 'casey@mailinator.com', '4fb601949c68ae89c295071a1d1f47b59fbee3f01a6d9bd5d0509d39af5c8a34', 'pending', NULL, NULL, '2026-07-15 08:55:28', '2026-07-15 07:55:28'),
(15, 7, 'kane@mailinator.com', '210613cb1e0c389f08a1a3905b09f0fc5ef1c7fbb910b4c0dc0cb3c0c1b3521d', 'used', NULL, '2026-07-17 09:33:15', '2026-07-17 10:32:25', '2026-07-17 09:32:25'),
(16, 1, 'jack@yopmail.com', '8b9e05758fd58000dde3283ca214ab335909d6e6c29a576834f0d0522a14123e', 'used', NULL, '2026-07-31 07:58:05', '2026-07-31 08:57:27', '2026-07-31 07:57:27');

-- --------------------------------------------------------

--
-- Table structure for table `payment_provider_settings`
--

CREATE TABLE `payment_provider_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `provider` varchar(50) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `configuration_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`configuration_json`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_provider_settings`
--

INSERT INTO `payment_provider_settings` (`id`, `provider`, `enabled`, `configuration_json`, `created_at`, `updated_at`) VALUES
(1, 'manual', 1, '{\"mode\": \"manual\", \"auto_confirm\": false}', '2026-07-21 10:02:05', '2026-07-21 10:02:05');

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--

CREATE TABLE `payment_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `parent_id` bigint(20) UNSIGNED NOT NULL,
  `provider` enum('manual','stripe','paypal','razorpay') NOT NULL DEFAULT 'manual',
  `transaction_reference` varchar(255) DEFAULT NULL,
  `payment_status` enum('pending','processing','success','failed','refunded') NOT NULL DEFAULT 'pending',
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `payment_date` datetime DEFAULT NULL,
  `gateway_response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`gateway_response`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_transactions`
--

INSERT INTO `payment_transactions` (`id`, `invoice_id`, `student_id`, `parent_id`, `provider`, `transaction_reference`, `payment_status`, `amount`, `currency`, `payment_date`, `gateway_response`, `created_at`, `updated_at`) VALUES
(1, 2, 10, 10, 'manual', 'MANUAL-1785495656960-3B3C75', 'success', 150.00, 'USD', '2026-07-31 16:30:56', '{\"paymentMethod\":\"Credit Card\",\"initiatedAt\":\"2026-07-31T11:00:56.961Z\"}', '2026-07-31 11:00:56', '2026-07-31 11:00:56'),
(2, 5, 10, 10, 'manual', 'MANUAL-1785496350080-69004E', 'success', 100.00, 'USD', '2026-07-31 16:42:30', '{\"paymentMethod\":\"Credit Card\",\"initiatedAt\":\"2026-07-31T11:12:30.080Z\"}', '2026-07-31 11:12:30', '2026-07-31 11:12:30');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` bigint(20) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `dob` date NOT NULL,
  `grade_level` varchar(50) NOT NULL,
  `academy` enum('Global Academy','Religious Academy') DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `status` enum('pending','active','inactive') DEFAULT 'pending',
  `profile_image` varchar(500) DEFAULT NULL,
  `is_first_login` tinyint(1) NOT NULL DEFAULT 1,
  `first_login_at` datetime DEFAULT NULL,
  `is_password_generated` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `first_name`, `last_name`, `dob`, `grade_level`, `academy`, `email`, `password`, `status`, `profile_image`, `is_first_login`, `first_login_at`, `is_password_generated`, `created_at`) VALUES
(1, 'Aarav', 'Sharma', '2015-05-10', 'Kindergarten', NULL, 'student-1@pending.local', '$2b$10$2yfCwb9KgMXtX3fHSIxSbef.Dm37821EFJc55PiNTzGTMIxQLlmLS', 'pending', NULL, 1, NULL, 0, '2026-06-24 13:22:46'),
(2, 'Cynthia', 'Prince', '1992-06-01', 'Kindergarten', NULL, 'student-2@pending.local', '$2b$10$0ym9VCO.YRf18G69qAVPNuWfSmsLCagfW9mbeYnduUl9jfnLTm/bC', 'pending', NULL, 1, NULL, 0, '2026-07-08 09:37:40'),
(3, 'Tasha', 'Foreman', '1999-02-19', '1st Grade', NULL, 'student-3@pending.local', '$2b$10$TjmEMTjiRUwrwKKld2i/ReL8lk0Z844vh7ZFHZ0.Jag3jtYtquH2i', 'pending', NULL, 1, NULL, 0, '2026-07-08 09:37:40'),
(4, 'Aryaan', 'Sharma', '2015-05-10', 'Kindergarten', NULL, 'student-4@pending.local', '$2b$10$fFxTt7ajyWTo1ywpIy18N.kbnj.HxTZx6s9phbBqmq4jiAaq9YhNi', 'pending', NULL, 1, NULL, 0, '2026-07-08 10:00:18'),
(5, 'Mohit', 'Sharma', '2015-05-10', 'Kindergarten', NULL, 'Mohit@yopmail.com', '$2b$10$rKGDQgO7PNlvDC64v5ewV.X.rlqnIFQcRVycBF.Vv6PbwCx9rf/d2', 'active', NULL, 1, NULL, 1, '2026-07-08 11:18:50'),
(6, 'Rohit', 'Sharma', '2016-05-20', '2nd Grade', NULL, 'Rohit@yopmail.com', '$2b$10$rKGDQgO7PNlvDC64v5ewV.X.rlqnIFQcRVycBF.Vv6PbwCx9rf/d2', 'active', NULL, 1, NULL, 1, '2026-07-08 11:18:55'),
(7, 'Eliza', 'Son', '2015-01-10', '1st Grade', NULL, 'elizabeth@mailinator.com', '$2b$10$Ext.ybTLwxLpcR3FXpIJT.rWbkaljsCgsDuGGH2HmJKD4WKfOeCUW', 'active', '/uploads/profiles/1783515503623-877479811.jpg', 0, '2026-07-08 17:18:21', 1, '2026-07-08 11:23:01'),
(8, 'Clark123', 'Abbott', '2020-06-14', '3rd Grade', NULL, 'clark@mailinator.com', '$2b$10$rKGDQgO7PNlvDC64v5ewV.X.rlqnIFQcRVycBF.Vv6PbwCx9rf/d2', 'active', '/uploads/profiles/1783585561943-962684433.jpg', 0, '2026-07-09 11:45:02', 1, '2026-07-08 11:23:06'),
(9, 'New123', 'Child', '2026-07-07', '2nd Grade', NULL, 'Test@gmail.com', NULL, 'pending', NULL, 1, NULL, 0, '2026-07-09 12:01:14'),
(10, 'happy', 'singh', '2017-06-15', '1st Grade', 'Global Academy', 'happy@yopmail.com', '$2b$10$Evpkve7JuY7XZIm04/0wn.AzyJ5RqIrxyFKtOCctS53Zn0MppIkRi', 'active', NULL, 0, '2026-07-15 13:40:57', 1, '2026-07-15 08:07:37');

-- --------------------------------------------------------

--
-- Table structure for table `student_invoice`
--

CREATE TABLE `student_invoice` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_number` varchar(100) NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `parent_id` bigint(20) UNSIGNED NOT NULL,
  `academy_id` varchar(100) DEFAULT NULL,
  `fee_plan_id` bigint(20) UNSIGNED DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(10,2) NOT NULL DEFAULT 0.00,
  `grand_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `invoice_status` enum('pending','paid','cancelled','expired') NOT NULL DEFAULT 'pending',
  `calculation_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`calculation_snapshot`)),
  `generated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `due_date` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_invoice`
--

INSERT INTO `student_invoice` (`id`, `invoice_number`, `student_id`, `parent_id`, `academy_id`, `fee_plan_id`, `subtotal`, `discount`, `tax`, `grand_total`, `currency`, `invoice_status`, `calculation_snapshot`, `generated_at`, `due_date`, `paid_at`, `created_at`, `updated_at`) VALUES
(1, 'INV-TEST-1001', 10, 10, NULL, NULL, 100.00, 0.00, 0.00, 100.00, 'USD', 'paid', NULL, '2026-07-31 12:29:35', NULL, NULL, '2026-07-31 06:59:35', '2026-07-31 06:59:35'),
(2, 'INV-TEMP-1785495656937', 10, 10, NULL, NULL, 150.00, 0.00, 0.00, 150.00, 'USD', 'paid', NULL, '2026-07-31 16:30:56', NULL, '2026-07-31 16:30:56', '2026-07-31 11:00:56', '2026-07-31 11:00:56'),
(5, 'INV-MOCK-1785496350069', 10, 10, NULL, NULL, 100.00, 0.00, 0.00, 100.00, 'USD', 'paid', NULL, '2026-07-31 16:42:30', NULL, '2026-07-31 16:42:30', '2026-07-31 11:12:30', '2026-07-31 11:12:30');

-- --------------------------------------------------------

--
-- Table structure for table `student_invoice_items`
--

CREATE TABLE `student_invoice_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` bigint(20) UNSIGNED NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_invoice_items`
--

INSERT INTO `student_invoice_items` (`id`, `invoice_id`, `item_name`, `amount`, `quantity`, `total`, `created_at`) VALUES
(1, 5, 'Mock Tuition Fee', 100.00, 1, 100.00, '2026-07-31 11:12:30');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_profiles`
--

CREATE TABLE `teacher_profiles` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `specialization` varchar(255) DEFAULT NULL,
  `experience_years` int(11) DEFAULT NULL,
  `teaching_grade` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teacher_profiles`
--

INSERT INTO `teacher_profiles` (`id`, `user_id`, `qualification`, `specialization`, `experience_years`, `teaching_grade`, `created_at`) VALUES
(2, 3, 'M.Sc', 'Maths', 5, '2nd Grade', '2026-06-25 06:44:22'),
(3, 8, 'B.Ed', 'Science', 3, '1st Grade', '2026-07-09 11:14:41'),
(4, 9, 'M.PHD', 'Maths', 5, '1st Grade', '2026-07-13 10:16:49');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) NOT NULL,
  `role` enum('parent','teacher','admin') NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `profile_image` varchar(500) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `approval_status` enum('pending','active','inactive') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `role`, `first_name`, `last_name`, `email`, `profile_image`, `phone`, `password`, `approval_status`, `created_at`, `updated_at`) VALUES
(1, 'parent', 'Rahul', 'Sharma', 'rahul@yopmail.com', NULL, '9876543210', '$2b$10$ObNzi8vpxRDnf.vkA87iJ.oaCin3Z.Trve7x6tbWWQoGs2EDsv222', 'pending', '2026-06-24 13:22:46', '2026-06-25 07:47:48'),
(3, 'teacher', 'Priya', 'Mehta', 'priya@yopmail.com', NULL, '9876543211', '$2b$10$rKGDQgO7PNlvDC64v5ewV.X.rlqnIFQcRVycBF.Vv6PbwCx9rf/d2', 'active', '2026-06-25 06:44:22', '2026-07-15 07:37:36'),
(4, 'parent', 'Libby', 'Price', 'qycegiqidi@mailinator.com', NULL, '+1 (957) 131-6404', '$2b$10$HbKAkPQTBJ854ljNWCrD5eKr.nWX0X4VgZ70Yurl21A.B/0P8OP7y', 'active', '2026-07-08 09:37:40', '2026-07-08 09:40:01'),
(5, 'parent', 'Aman', 'Sharma', 'Aman@yopmail.com', NULL, '9876543210', '$2b$10$h7Si3.LsAx5MtNrOwrOSL.7YOMs88aD/i4ItrKl5PMOcLea7XA8L2', 'pending', '2026-07-08 10:00:18', '2026-07-08 10:00:18'),
(6, 'parent', 'Mayank', 'Sharma', 'Mayank@yopmail.com', NULL, '9876543210', '$2b$10$rKGDQgO7PNlvDC64v5ewV.X.rlqnIFQcRVycBF.Vv6PbwCx9rf/d2', 'active', '2026-07-08 11:18:50', '2026-07-15 07:37:36'),
(7, 'parent', 'kane', 'williamsoon', 'kane@mailinator.com', '/uploads/profiles/1783513651540-982815926.webp', '87345648593', '$2b$10$c0M7NebeaHtkpwIWikIMIeKQgIhlbyUeXLMuSYrtOHNj9w60io6se', 'active', '2026-07-08 11:23:01', '2026-07-17 09:33:15'),
(8, 'teacher', 'casey', 'Boone', 'casey@mailinator.com', '/uploads/profiles/1783597282465-418291417.jpg', '+1 (733) 208-3954', '$2b$10$Ext.ybTLwxLpcR3FXpIJT.rWbkaljsCgsDuGGH2HmJKD4WKfOeCUW', 'active', '2026-07-09 11:14:41', '2026-07-15 07:42:19'),
(9, 'teacher', 'Harshit', 'Rajpal', 'Harshit@yopmail.com', NULL, '9876543211', '$2b$10$H7oFtuKQ5aLU3LGVWL1mu.RC9vVPy5oqhdrluLiyuhZkK0gH6NlU6', 'inactive', '2026-07-13 10:16:49', '2026-07-23 07:12:27'),
(10, 'parent', 'jaswinder singh', 'ghatore', 'jassi@yopmail.com', NULL, '96233456778', '$2b$10$q31zW7Q9v8kH4Wx00AqLZ.oRnvkuLGpWw27zATlmRpR2If.ZIGKDa', 'active', '2026-07-15 08:07:36', '2026-07-15 08:10:20');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `academy_master`
--
ALTER TABLE `academy_master`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assignments_teacher_id` (`teacher_id`),
  ADD KEY `idx_assignments_grade_level` (`grade_level`),
  ADD KEY `idx_assignments_due_date` (`due_date`);

--
-- Indexes for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_assignment_student` (`assignment_id`,`student_id`),
  ADD KEY `idx_submissions_assignment_id` (`assignment_id`),
  ADD KEY `idx_submissions_student_id` (`student_id`),
  ADD KEY `idx_submissions_status` (`status`);

--
-- Indexes for table `chat_conversations`
--
ALTER TABLE `chat_conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_parent_teacher_chat` (`parent_id`,`teacher_id`),
  ADD UNIQUE KEY `uq_student_teacher_chat` (`student_id`,`teacher_id`),
  ADD KEY `idx_chat_conversations_parent` (`parent_id`),
  ADD KEY `idx_chat_conversations_student` (`student_id`),
  ADD KEY `idx_chat_conversations_teacher` (`teacher_id`),
  ADD KEY `idx_chat_conversations_updated_at` (`updated_at`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_messages_conversation_created` (`conversation_id`,`created_at`),
  ADD KEY `idx_chat_messages_conversation_id` (`conversation_id`,`id`);

--
-- Indexes for table `chat_participant_reads`
--
ALTER TABLE `chat_participant_reads`
  ADD PRIMARY KEY (`conversation_id`,`participant_role`,`participant_id`),
  ADD KEY `idx_chat_participant_reads_participant` (`participant_role`,`participant_id`);

--
-- Indexes for table `discount_master`
--
ALTER TABLE `discount_master`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `event_student_grades`
--
ALTER TABLE `event_student_grades`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`);

--
-- Indexes for table `fee_component_master`
--
ALTER TABLE `fee_component_master`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `component_name` (`component_name`);

--
-- Indexes for table `fee_plan_items`
--
ALTER TABLE `fee_plan_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_items_plan` (`fee_plan_id`),
  ADD KEY `idx_items_component` (`fee_component_id`);

--
-- Indexes for table `fee_plan_master`
--
ALTER TABLE `fee_plan_master`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_plan_academy_type` (`academy_id`,`student_type`);

--
-- Indexes for table `grade_level_master`
--
ALTER TABLE `grade_level_master`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_grade_academy` (`academy_id`);

--
-- Indexes for table `handbooks`
--
ALTER TABLE `handbooks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_handbooks_grade_level` (`grade_level`);

--
-- Indexes for table `parent_students`
--
ALTER TABLE `parent_students`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `password_reset_requests`
--
ALTER TABLE `password_reset_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_password_reset_requests_token` (`token`),
  ADD KEY `idx_password_reset_requests_user_status` (`user_id`,`status`);

--
-- Indexes for table `payment_provider_settings`
--
ALTER TABLE `payment_provider_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `provider` (`provider`);

--
-- Indexes for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_trans_invoice` (`invoice_id`),
  ADD KEY `idx_trans_student` (`student_id`),
  ADD KEY `idx_trans_parent` (`parent_id`),
  ADD KEY `idx_trans_status` (`payment_status`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_students_email` (`email`);

--
-- Indexes for table `student_invoice`
--
ALTER TABLE `student_invoice`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `idx_invoice_student` (`student_id`),
  ADD KEY `idx_invoice_parent` (`parent_id`),
  ADD KEY `idx_invoice_status` (`invoice_status`),
  ADD KEY `idx_invoice_number` (`invoice_number`);

--
-- Indexes for table `student_invoice_items`
--
ALTER TABLE `student_invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_invoice_items_invoice` (`invoice_id`);

--
-- Indexes for table `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `academy_master`
--
ALTER TABLE `academy_master`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chat_conversations`
--
ALTER TABLE `chat_conversations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `discount_master`
--
ALTER TABLE `discount_master`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `event_student_grades`
--
ALTER TABLE `event_student_grades`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `fee_component_master`
--
ALTER TABLE `fee_component_master`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `fee_plan_items`
--
ALTER TABLE `fee_plan_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `fee_plan_master`
--
ALTER TABLE `fee_plan_master`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `grade_level_master`
--
ALTER TABLE `grade_level_master`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `handbooks`
--
ALTER TABLE `handbooks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `parent_students`
--
ALTER TABLE `parent_students`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `password_reset_requests`
--
ALTER TABLE `password_reset_requests`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `payment_provider_settings`
--
ALTER TABLE `payment_provider_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `student_invoice`
--
ALTER TABLE `student_invoice`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `student_invoice_items`
--
ALTER TABLE `student_invoice_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD CONSTRAINT `fk_submissions_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `fk_chat_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_participant_reads`
--
ALTER TABLE `chat_participant_reads`
  ADD CONSTRAINT `fk_chat_reads_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `event_student_grades`
--
ALTER TABLE `event_student_grades`
  ADD CONSTRAINT `event_student_grades_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fee_plan_items`
--
ALTER TABLE `fee_plan_items`
  ADD CONSTRAINT `fk_fee_items_component` FOREIGN KEY (`fee_component_id`) REFERENCES `fee_component_master` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_fee_items_master_plan` FOREIGN KEY (`fee_plan_id`) REFERENCES `fee_plan_master` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `parent_students`
--
ALTER TABLE `parent_students`
  ADD CONSTRAINT `parent_students_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `parent_students_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`);

--
-- Constraints for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `fk_trans_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `student_invoice` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_invoice_items`
--
ALTER TABLE `student_invoice_items`
  ADD CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `student_invoice` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  ADD CONSTRAINT `teacher_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
