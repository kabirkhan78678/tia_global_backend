const { pool } = require('../../../config/db');

exports.createParent = async (data) => {
  const [result] = await pool.execute(
    `
      INSERT INTO users
      (
        role,
        first_name,
        last_name,
        phone,
        email,
        password,
        approval_status
      )
      VALUES
      (?,?,?,?,?,?,?)
      `,
    [
      'parent',
      data.firstName,
      data.lastName,
      data.phone,
      data.email,
      data.password,
      'pending',
    ]
  );

  return result.insertId;
};

exports.createStudent = async (student) => {
  const [result] = await pool.execute(
    `
      INSERT INTO students
      (
        first_name,
        last_name,
        dob,
        grade_level,
        username,
        password
      )
      VALUES
      (?,?,?,?,?,?)
      `,
    [
      student.firstName,
      student.lastName,
      student.dob,
      student.gradeLevel,
      student.username,
      student.password,
    ]
  );

  return result.insertId;
};

exports.linkStudent = async (parentId, studentId) => {
  await pool.execute(
    `
      INSERT INTO parent_students
      (
        parent_id,
        student_id
      )
      VALUES
      (?,?)
      `,
    [parentId, studentId]
  );
};

exports.createTeacherUser = async (data) => {
  const [result] = await pool.execute(
    `
      INSERT INTO users
      (
        role,
        first_name,
        last_name,
        phone,
        email,
        password,
        approval_status
      )
      VALUES
      (?,?,?,?,?,?,?)
      `,
    [
      'teacher',
      data.firstName,
      data.lastName,
      data.phone,
      data.email,
      data.password,
      'pending',
    ]
  );

  return result.insertId;
};

exports.createTeacherProfile = async (data) => {
  await pool.execute(
    `
      INSERT INTO teacher_profiles
      (
        user_id,
        qualification,
        specialization,
        experience_years,
        teaching_grade
      )
      VALUES
      (?,?,?,?,?)
      `,
    [
      data.userId,
      data.qualification,
      data.specialization,
      data.experienceYears,
      data.teachingGrade,
    ]
  );
};

exports.findByEmail = async (email) => {
  const [users] = await pool.execute(
    `
      SELECT id, role, email, password, approval_status
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
    [email]
  );

  return users[0] || null;
};

exports.createPasswordResetRequest = async ({ userId, email, token, expiresAt }) => {
  const [result] = await pool.execute(
    `
      INSERT INTO password_reset_requests
      (
        user_id,
        email,
        token,
        expires_at
      )
      VALUES
      (?,?,?,?)
      `,
    [userId, email, token, expiresAt]
  );

  return result.insertId;
};

exports.findPasswordResetRequestByToken = async (token) => {
  const [rows] = await pool.execute(
    `
      SELECT id, user_id, email, token, status, expires_at
      FROM password_reset_requests
      WHERE token = ?
      LIMIT 1
      `,
    [token]
  );

  return rows[0] || null;
};

exports.updateUserPassword = async ({ userId, password }) => {
  await pool.execute(
    `
      UPDATE users
      SET password = ?
      WHERE id = ?
      `,
    [password, userId]
  );
};

exports.markPasswordResetRequestUsed = async (token) => {
  await pool.execute(
    `
      UPDATE password_reset_requests
      SET status = 'used',
          used_at = CURRENT_TIMESTAMP
      WHERE token = ?
      `,
    [token]
  );
};

exports.findById = async (id) => {
  const [rows] = await pool.execute(
    `
      SELECT id, role, first_name, last_name, phone, email, approval_status, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
    [id]
  );

  return rows[0] || null;
};

exports.findTeacherProfileByUserId = async (userId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        qualification,
        specialization,
        experience_years,
        teaching_grade
      FROM teacher_profiles
      WHERE user_id = ?
      LIMIT 1
      `,
    [userId]
  );

  return rows[0] || null;
};

exports.findStudentsByParentId = async (parentId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        s.id,
        s.first_name,
        s.last_name,
        s.dob,
        s.grade_level,
        s.username
      FROM parent_students ps
      INNER JOIN students s ON s.id = ps.student_id
      WHERE ps.parent_id = ?
      ORDER BY s.grade_level ASC, s.first_name ASC, s.last_name ASC
      `,
    [parentId]
  );

  return rows;
};
