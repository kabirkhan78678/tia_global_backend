const { pool } = require('../../config/db');

const USER_SELECT = `
  SELECT
    id,
    role,
    first_name,
    last_name,
    email,
    profile_image,
    approval_status
  FROM users
`;

const STUDENT_SELECT = `
  SELECT
    id,
    first_name,
    last_name,
    email,
    grade_level,
    academy,
    profile_image,
    status
  FROM students
`;

exports.findUserByIdAndRole = async ({ id, role }) => {
  const [rows] = await pool.execute(
    `
      ${USER_SELECT}
      WHERE id = ?
        AND role = ?
      LIMIT 1
      `,
    [id, role]
  );

  return rows[0] || null;
};

exports.findStudentById = async (id) => {
  const [rows] = await pool.execute(
    `
      ${STUDENT_SELECT}
      WHERE id = ?
      LIMIT 1
      `,
    [id]
  );

  return rows[0] || null;
};

exports.findParentByStudentId = async (studentId) => {
  const [rows] = await pool.execute(
    `
      ${USER_SELECT}
      INNER JOIN parent_students ps ON ps.parent_id = users.id
      WHERE ps.student_id = ?
        AND users.role = 'parent'
      LIMIT 1
      `,
    [studentId]
  );

  return rows[0] || null;
};

exports.findStudentsByParentId = async (parentId) => {
  const [rows] = await pool.execute(
    `
      ${STUDENT_SELECT}
      INNER JOIN parent_students ps ON ps.student_id = students.id
      WHERE ps.parent_id = ?
      ORDER BY students.first_name ASC, students.last_name ASC
      `,
    [parentId]
  );

  return rows;
};

exports.findTeacherProfile = async (teacherId) => {
  const [rows] = await pool.execute(
    `
      SELECT user_id, teaching_grade
      FROM teacher_profiles
      WHERE user_id = ?
      LIMIT 1
      `,
    [teacherId]
  );

  return rows[0] || null;
};

exports.findEligibleTeachersForStudent = async (studentId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        users.id,
        users.role,
        users.first_name,
        users.last_name,
        users.email,
        users.profile_image,
        users.approval_status,
      tp.teaching_grade
      FROM users
      INNER JOIN teacher_profiles tp ON tp.user_id = users.id
      INNER JOIN students s ON s.grade_level = tp.teaching_grade
      WHERE users.role = 'teacher'
        AND users.approval_status = 'active'
        AND s.id = ?
        AND s.status = 'active'
      ORDER BY users.first_name ASC, users.last_name ASC
      `,
    [studentId]
  );

  return rows;
};

exports.findEligibleTeachersForParent = async (parentId) => {
  const [rows] = await pool.execute(
    `
      SELECT DISTINCT
        users.id,
        users.role,
        users.first_name,
        users.last_name,
        users.email,
        users.profile_image,
        users.approval_status,
        tp.teaching_grade
      FROM users
      INNER JOIN teacher_profiles tp ON tp.user_id = users.id
      INNER JOIN students s ON s.grade_level = tp.teaching_grade
      INNER JOIN parent_students ps ON ps.student_id = s.id
      WHERE users.role = 'teacher'
        AND users.approval_status = 'active'
        AND s.status = 'active'
        AND ps.parent_id = ?
      ORDER BY users.first_name ASC, users.last_name ASC
      `,
    [parentId]
  );

  return rows;
};

exports.findEligibleStudentsForTeacher = async (teacherId) => {
  const [rows] = await pool.execute(
    `
      SELECT DISTINCT
        students.id,
        students.first_name,
        students.last_name,
        students.email,
        students.grade_level,
        students.academy,
        students.profile_image,
        students.status
      FROM students
      INNER JOIN teacher_profiles tp ON tp.teaching_grade = students.grade_level
      INNER JOIN users teacher ON teacher.id = tp.user_id
      WHERE teacher.id = ?
        AND teacher.role = 'teacher'
        AND teacher.approval_status = 'active'
        AND students.status = 'active'
      ORDER BY students.first_name ASC, students.last_name ASC
      `,
    [teacherId]
  );

  return rows;
};

exports.findEligibleParentsForTeacher = async (teacherId) => {
  const [rows] = await pool.execute(
    `
      SELECT DISTINCT
        parent.id,
        parent.role,
        parent.first_name,
        parent.last_name,
        parent.email,
        parent.profile_image,
        parent.approval_status
      FROM users parent
      INNER JOIN parent_students ps ON ps.parent_id = parent.id
      INNER JOIN students s ON s.id = ps.student_id
      INNER JOIN teacher_profiles tp ON tp.teaching_grade = s.grade_level
      INNER JOIN users teacher ON teacher.id = tp.user_id
      WHERE teacher.id = ?
        AND teacher.role = 'teacher'
        AND teacher.approval_status = 'active'
        AND parent.role = 'parent'
        AND parent.approval_status = 'active'
        AND s.status = 'active'
      ORDER BY parent.first_name ASC, parent.last_name ASC
      `,
    [teacherId]
  );

  return rows;
};

exports.isParentOfStudent = async ({ parentId, studentId }) => {
  const [rows] = await pool.execute(
    `
      SELECT 1 AS found
      FROM parent_students
      WHERE parent_id = ?
        AND student_id = ?
      LIMIT 1
      `,
    [parentId, studentId]
  );

  return Boolean(rows[0]);
};

exports.teacherCanChatWithStudent = async ({ teacherId, studentId }) => {
  const [rows] = await pool.execute(
    `
      SELECT 1 AS found
      FROM users teacher
      INNER JOIN teacher_profiles tp ON tp.user_id = teacher.id
      INNER JOIN students s ON s.grade_level = tp.teaching_grade
      WHERE teacher.id = ?
        AND teacher.role = 'teacher'
        AND teacher.approval_status = 'active'
        AND s.id = ?
        AND s.status = 'active'
      LIMIT 1
      `,
    [teacherId, studentId]
  );

  return Boolean(rows[0]);
};

exports.teacherCanChatWithParent = async ({ teacherId, parentId }) => {
  const [rows] = await pool.execute(
    `
      SELECT 1 AS found
      FROM users teacher
      INNER JOIN teacher_profiles tp ON tp.user_id = teacher.id
      INNER JOIN parent_students ps ON ps.parent_id = ?
      INNER JOIN students s
        ON s.id = ps.student_id
        AND s.grade_level = tp.teaching_grade
      WHERE teacher.id = ?
        AND teacher.role = 'teacher'
        AND teacher.approval_status = 'active'
        AND s.status = 'active'
      LIMIT 1
      `,
    [parentId, teacherId]
  );

  return Boolean(rows[0]);
};

exports.findConversationByParticipants = async ({ conversationType, parentId, studentId, teacherId }) => {
  const params =
    conversationType === 'parent_teacher'
      ? [parentId, teacherId]
      : [studentId, teacherId];
  const where =
    conversationType === 'parent_teacher'
      ? 'conversation_type = ? AND parent_id = ? AND teacher_id = ?'
      : 'conversation_type = ? AND student_id = ? AND teacher_id = ?';

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM chat_conversations
      WHERE ${where}
      LIMIT 1
      `,
    [conversationType, ...params]
  );

  return rows[0] || null;
};

exports.createConversation = async ({
  conversationType,
  parentId,
  studentId,
  teacherId,
  createdByRole,
  createdById,
}) => {
  const [result] = await pool.execute(
    `
      INSERT INTO chat_conversations
      (
        conversation_type,
        parent_id,
        student_id,
        teacher_id,
        created_by_role,
        created_by_id
      )
      VALUES (?,?,?,?,?,?)
      `,
    [conversationType, parentId || null, studentId || null, teacherId, createdByRole, createdById]
  );

  return result.insertId;
};

exports.findConversationById = async (conversationId) => {
  const [rows] = await pool.execute(
    `
      SELECT *
      FROM chat_conversations
      WHERE id = ?
      LIMIT 1
      `,
    [conversationId]
  );

  return rows[0] || null;
};

exports.touchConversation = async (conversationId) => {
  await pool.execute(
    `
      UPDATE chat_conversations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
    [conversationId]
  );
};

exports.createMessage = async ({ conversationId, senderRole, senderId, body }) => {
  const [result] = await pool.execute(
    `
      INSERT INTO chat_messages
      (
        conversation_id,
        sender_role,
        sender_id,
        body
      )
      VALUES (?,?,?,?)
      `,
    [conversationId, senderRole, senderId, body]
  );

  return result.insertId;
};

exports.findMessageById = async (messageId) => {
  const [rows] = await pool.execute(
    `
      SELECT *
      FROM chat_messages
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
    [messageId]
  );

  return rows[0] || null;
};

exports.findMessagesByConversationId = async ({ conversationId, beforeMessageId, limit }) => {
  const params = [conversationId];
  let beforeClause = '';

  if (beforeMessageId) {
    beforeClause = 'AND id < ?';
    params.push(beforeMessageId);
  }

  params.push(limit);

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM chat_messages
      WHERE conversation_id = ?
        AND deleted_at IS NULL
        ${beforeClause}
      ORDER BY id DESC
      LIMIT ?
      `,
    params
  );

  return rows.reverse();
};

exports.findLatestMessageByConversationId = async (conversationId) => {
  const [rows] = await pool.execute(
    `
      SELECT *
      FROM chat_messages
      WHERE conversation_id = ?
        AND deleted_at IS NULL
      ORDER BY id DESC
      LIMIT 1
      `,
    [conversationId]
  );

  return rows[0] || null;
};

exports.upsertReadCursor = async ({ conversationId, participantRole, participantId, messageId }) => {
  await pool.execute(
    `
      INSERT INTO chat_participant_reads
      (
        conversation_id,
        participant_role,
        participant_id,
        last_read_message_id,
        last_read_at
      )
      VALUES (?,?,?,?,CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        last_read_message_id = GREATEST(
          COALESCE(last_read_message_id, 0),
          COALESCE(VALUES(last_read_message_id), 0)
        ),
        last_read_at = CURRENT_TIMESTAMP
      `,
    [conversationId, participantRole, participantId, messageId || null]
  );
};

exports.findConversationList = async ({ authUser, limit, offset }) => {
  const { role, id } = authUser;
  const whereByRole = {
    parent: 'c.parent_id = ?',
    teacher: 'c.teacher_id = ?',
    student: 'c.student_id = ?',
  };

  const [rows] = await pool.execute(
    `
      SELECT
        c.*,
        last_message.id AS last_message_id,
        last_message.body AS last_message_body,
        last_message.sender_role AS last_message_sender_role,
        last_message.sender_id AS last_message_sender_id,
        last_message.created_at AS last_message_created_at,
        read_cursor.last_read_message_id,
        (
          SELECT COUNT(*)
          FROM chat_messages unread
          WHERE unread.conversation_id = c.id
            AND unread.deleted_at IS NULL
            AND unread.sender_role <> ?
            AND unread.id > COALESCE(read_cursor.last_read_message_id, 0)
        ) AS unread_count,
        parent.first_name AS parent_first_name,
        parent.last_name AS parent_last_name,
        parent.profile_image AS parent_profile_image,
        teacher.first_name AS teacher_first_name,
        teacher.last_name AS teacher_last_name,
        teacher.profile_image AS teacher_profile_image,
        student.first_name AS student_first_name,
        student.last_name AS student_last_name,
        student.profile_image AS student_profile_image,
        student.grade_level AS student_grade_level
      FROM chat_conversations c
      LEFT JOIN chat_participant_reads read_cursor
        ON read_cursor.conversation_id = c.id
        AND read_cursor.participant_role = ?
        AND read_cursor.participant_id = ?
      LEFT JOIN users parent ON parent.id = c.parent_id
      LEFT JOIN users teacher ON teacher.id = c.teacher_id
      LEFT JOIN students student ON student.id = c.student_id
      LEFT JOIN chat_messages last_message
        ON last_message.id = (
          SELECT cm.id
          FROM chat_messages cm
          WHERE cm.conversation_id = c.id
            AND cm.deleted_at IS NULL
          ORDER BY cm.id DESC
          LIMIT 1
        )
      WHERE ${whereByRole[role]}
      ORDER BY COALESCE(last_message.created_at, c.updated_at) DESC, c.id DESC
      LIMIT ?
      OFFSET ?
      `,
    [role, role, id, id, limit, offset]
  );

  return rows;
};
