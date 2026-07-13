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
        academy,
        email,
        password,
        status
      )
      VALUES
      (?,?,?,?,?,?,?,?)
      `,
    [
      student.firstName,
      student.lastName,
      student.dob,
      student.gradeLevel,
      student.academy,
      student.email,
      student.password,
      'pending',
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

exports.findStudentByEmail = async (email) => {
  const [students] = await pool.execute(
    `
      SELECT
        id,
        first_name,
        last_name,
        dob,
        grade_level,
        academy,
        email,
        password,
        status,
        profile_image,
        is_first_login,
        first_login_at,
        is_password_generated
      FROM students
      WHERE email = ?
      LIMIT 1
      `,
    [email]
  );

  return students[0] || null;
};

exports.findActiveParentByStudentId = async (studentId) => {
  const [rows] = await pool.execute(
    `
      SELECT u.id, u.approval_status
      FROM parent_students ps
      INNER JOIN users u ON u.id = ps.parent_id
      WHERE ps.student_id = ?
        AND u.role = 'parent'
      LIMIT 1
      `,
    [studentId]
  );

  return rows[0] || null;
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

exports.updateStudentPassword = async ({ studentId, password }) => {
  await pool.execute(
    `
      UPDATE students
      SET password = ?
      WHERE id = ?
      `,
    [password, studentId]
  );
};

exports.createStudentPassword = async ({ studentId, password }) => {
  await pool.execute(
    `
      UPDATE students
      SET password = ?,
          is_password_generated = 1
      WHERE id = ?
      `,
    [password, studentId]
  );
};

exports.markStudentFirstLogin = async (studentId) => {
  await pool.execute(
    `
      UPDATE students
      SET is_first_login = 0,
          first_login_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND is_first_login = 1
      `,
    [studentId]
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
      SELECT
        id,
        role,
        first_name,
        last_name,
        phone,
        email,
        password,
        profile_image,
        approval_status,
        created_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
    [id]
  );

  return rows[0] || null;
};

exports.findStudentById = async (id) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        first_name,
        last_name,
        dob,
        grade_level,
        academy,
        email,
        password,
        status,
        profile_image,
        is_first_login,
        first_login_at,
        is_password_generated
      FROM students
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
        s.academy,
        s.email,
        s.status,
        s.profile_image,
        s.is_first_login,
        s.first_login_at,
        s.is_password_generated
      FROM parent_students ps
      INNER JOIN students s ON s.id = ps.student_id
      WHERE ps.parent_id = ?
      ORDER BY s.grade_level ASC, s.first_name ASC, s.last_name ASC
      `,
    [parentId]
  );

  return rows;
};

exports.findStudentByParentIdAndStudentId = async ({ parentId, studentId }) => {
  const [rows] = await pool.execute(
    `
      SELECT
        s.id,
        s.first_name,
        s.last_name,
        s.dob,
        s.grade_level,
        s.academy,
        s.email,
        s.status,
        s.profile_image,
        s.is_first_login,
        s.first_login_at,
        s.is_password_generated
      FROM parent_students ps
      INNER JOIN students s ON s.id = ps.student_id
      WHERE ps.parent_id = ?
        AND ps.student_id = ?
      LIMIT 1
      `,
    [parentId, studentId]
  );

  return rows[0] || null;
};

exports.updateUserProfile = async ({ userId, data }) => {
  const fields = [];
  const values = [];

  if (data.firstName !== undefined) {
    fields.push('first_name = ?');
    values.push(data.firstName);
  }

  if (data.lastName !== undefined) {
    fields.push('last_name = ?');
    values.push(data.lastName);
  }

  if (data.phone !== undefined) {
    fields.push('phone = ?');
    values.push(data.phone);
  }

  if (data.profileImage !== undefined) {
    fields.push('profile_image = ?');
    values.push(data.profileImage);
  }

  if (!fields.length) {
    return 0;
  }

  values.push(userId);

  const [result] = await pool.execute(
    `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = ?
      `,
    values
  );

  return result.affectedRows;
};

exports.updateTeacherProfile = async ({ userId, data }) => {
  const fields = [];
  const values = [];

  if (data.qualification !== undefined) {
    fields.push('qualification = ?');
    values.push(data.qualification);
  }

  if (data.specialization !== undefined) {
    fields.push('specialization = ?');
    values.push(data.specialization);
  }

  if (data.experienceYears !== undefined) {
    fields.push('experience_years = ?');
    values.push(data.experienceYears);
  }

  if (data.teachingGrade !== undefined) {
    fields.push('teaching_grade = ?');
    values.push(data.teachingGrade);
  }

  if (!fields.length) {
    return 0;
  }

  values.push(userId);

  const [result] = await pool.execute(
    `
      UPDATE teacher_profiles
      SET ${fields.join(', ')}
      WHERE user_id = ?
      `,
    values
  );

  return result.affectedRows;
};

exports.updateStudentProfile = async ({ studentId, data }) => {
  const fields = [];
  const values = [];

  if (data.firstName !== undefined) {
    fields.push('first_name = ?');
    values.push(data.firstName);
  }

  if (data.lastName !== undefined) {
    fields.push('last_name = ?');
    values.push(data.lastName);
  }

  if (data.dob !== undefined) {
    fields.push('dob = ?');
    values.push(data.dob);
  }

  if (data.gradeLevel !== undefined) {
    fields.push('grade_level = ?');
    values.push(data.gradeLevel);
  }

  if (data.academy !== undefined) {
    fields.push('academy = ?');
    values.push(data.academy);
  }

  if (data.email !== undefined) {
    fields.push('email = ?');
    values.push(data.email);
  }

  if (data.profileImage !== undefined) {
    fields.push('profile_image = ?');
    values.push(data.profileImage);
  }

  if (!fields.length) {
    return 0;
  }

  values.push(studentId);

  const [result] = await pool.execute(
    `
      UPDATE students
      SET ${fields.join(', ')}
      WHERE id = ?
      `,
    values
  );

  return result.affectedRows;
};
