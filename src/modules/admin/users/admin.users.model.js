const { pool } = require('../../../config/db');

exports.findAllTeachers = async () => {
  const [rows] = await pool.execute(
    `
      SELECT
        u.id,
        u.role,
        u.first_name,
        u.last_name,
        u.phone,
        u.email,
        u.approval_status,
        u.created_at,
        tp.qualification,
        tp.specialization,
        tp.experience_years,
        tp.teaching_grade
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
      WHERE u.role = 'teacher'
      ORDER BY u.created_at DESC
      `
  );

  return rows;
};

exports.findAllParents = async () => {
  const [rows] = await pool.execute(
    `
      SELECT
        u.id AS parent_id,
        u.role,
        u.first_name AS parent_first_name,
        u.last_name AS parent_last_name,
        u.phone,
        u.email,
        u.approval_status,
        u.created_at AS parent_created_at,
        s.id AS student_id,
        s.first_name AS student_first_name,
        s.last_name AS student_last_name,
        s.dob,
        s.grade_level,
        s.username
      FROM users u
      LEFT JOIN parent_students ps ON ps.parent_id = u.id
      LEFT JOIN students s ON s.id = ps.student_id
      WHERE u.role = 'parent'
      ORDER BY u.created_at DESC, s.first_name ASC, s.last_name ASC
      `
  );

  return rows;
};

exports.findUserByIdAndRole = async ({ userId, role }) => {
  const [rows] = await pool.execute(
    `
      SELECT id, role, approval_status
      FROM users
      WHERE id = ?
        AND role = ?
      LIMIT 1
      `,
    [userId, role]
  );

  return rows[0] || null;
};

exports.updateApprovalStatus = async ({ userId, role, status }) => {
  const [result] = await pool.execute(
    `
      UPDATE users
      SET approval_status = ?
      WHERE id = ?
        AND role = ?
      `,
    [status, userId, role]
  );

  return result.affectedRows;
};
