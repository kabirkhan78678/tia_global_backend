CREATE TABLE IF NOT EXISTS chat_conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_type ENUM('parent_teacher', 'student_teacher') NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  student_id BIGINT UNSIGNED NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  created_by_role ENUM('parent', 'teacher', 'student') NOT NULL,
  created_by_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parent_teacher_chat (parent_id, teacher_id),
  UNIQUE KEY uq_student_teacher_chat (student_id, teacher_id),
  INDEX idx_chat_conversations_parent (parent_id),
  INDEX idx_chat_conversations_student (student_id),
  INDEX idx_chat_conversations_teacher (teacher_id),
  INDEX idx_chat_conversations_updated_at (updated_at)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_role ENUM('parent', 'teacher', 'student') NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_chat_messages_conversation_created (conversation_id, created_at),
  INDEX idx_chat_messages_conversation_id (conversation_id, id),
  CONSTRAINT fk_chat_messages_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_participant_reads (
  conversation_id BIGINT UNSIGNED NOT NULL,
  participant_role ENUM('parent', 'teacher', 'student') NOT NULL,
  participant_id BIGINT UNSIGNED NOT NULL,
  last_read_message_id BIGINT UNSIGNED NULL,
  last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, participant_role, participant_id),
  INDEX idx_chat_participant_reads_participant (participant_role, participant_id),
  CONSTRAINT fk_chat_reads_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations(id)
    ON DELETE CASCADE
);
