const { pool } = require('../../config/db');

/**
 * Create a new assignment (Teacher)
 */
exports.createAssignment = async ({
  teacher_id,
  title,
  description,
  grade_level,
  subject,
  due_date,
  total_points,
  attachment_url,
}) => {
  const [result] = await pool.execute(
    `
    INSERT INTO assignments (
      teacher_id, title, description, grade_level, subject, due_date, total_points, attachment_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      teacher_id,
      title,
      description || null,
      grade_level,
      subject || null,
      due_date || null,
      total_points || 100,
      attachment_url || null,
    ]
  );

  return result.insertId;
};

/**
 * Find assignment by ID
 */
exports.findAssignmentById = async (id) => {
  const [rows] = await pool.execute(
    `
    SELECT
      a.id,
      a.teacher_id,
      u.first_name AS teacher_first_name,
      u.last_name AS teacher_last_name,
      a.title,
      a.description,
      a.grade_level,
      a.subject,
      a.due_date,
      a.total_points,
      a.attachment_url,
      a.created_at,
      a.updated_at
    FROM assignments a
    LEFT JOIN users u ON u.id = a.teacher_id
    WHERE a.id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};

/**
 * Update an existing assignment (Teacher)
 */
exports.updateAssignment = async (id, teacher_id, updateFields) => {
  const allowedKeys = ['title', 'description', 'grade_level', 'subject', 'due_date', 'total_points', 'attachment_url'];
  const fieldsToSet = [];
  const queryParams = [];

  for (const [key, value] of Object.entries(updateFields)) {
    if (allowedKeys.includes(key)) {
      fieldsToSet.push(`${key} = ?`);
      queryParams.push(value);
    }
  }

  if (fieldsToSet.length === 0) return 0;

  queryParams.push(id, teacher_id);

  const [result] = await pool.execute(
    `
    UPDATE assignments
    SET ${fieldsToSet.join(', ')}
    WHERE id = ? AND teacher_id = ?
    `,
    queryParams
  );

  return result.affectedRows;
};

/**
 * Delete assignment (Teacher)
 */
exports.deleteAssignment = async (id, teacher_id) => {
  const [result] = await pool.execute(
    `
    DELETE FROM assignments
    WHERE id = ? AND teacher_id = ?
    `,
    [id, teacher_id]
  );

  return result.affectedRows;
};

/**
 * Get assignments created by teacher
 */
exports.findAssignmentsByTeacher = async (teacher_id, grade_level = null) => {
  let query = `
    SELECT
      a.id,
      a.teacher_id,
      a.title,
      a.description,
      a.grade_level,
      a.subject,
      a.due_date,
      a.total_points,
      a.attachment_url,
      a.created_at,
      a.updated_at,
      COUNT(sub.id) AS total_submissions,
      SUM(CASE WHEN sub.status = 'graded' THEN 1 ELSE 0 END) AS graded_submissions
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
    WHERE a.teacher_id = ?
  `;

  const queryParams = [teacher_id];

  if (grade_level) {
    query += ` AND a.grade_level = ?`;
    queryParams.push(grade_level);
  }

  query += ` GROUP BY a.id ORDER BY a.created_at DESC`;

  const [rows] = await pool.execute(query, queryParams);
  return rows;
};

/**
 * Get assignments for student based on grade level
 */
exports.findAssignmentsForStudent = async (grade_level, student_id) => {
  const [rows] = await pool.execute(
    `
    SELECT
      a.id AS assignment_id,
      a.title,
      a.description,
      a.grade_level,
      a.subject,
      a.due_date,
      a.total_points,
      a.attachment_url AS assignment_attachment,
      a.created_at AS assignment_created_at,
      u.first_name AS teacher_first_name,
      u.last_name AS teacher_last_name,
      COALESCE(sub.status, 'pending') AS submission_status,
      sub.submission_text,
      sub.attachment_url AS student_attachment,
      sub.submitted_at,
      sub.marks_obtained,
      sub.grade,
      sub.feedback,
      sub.graded_at
    FROM assignments a
    LEFT JOIN users u ON u.id = a.teacher_id
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
    WHERE a.grade_level = ?
    ORDER BY a.due_date ASC, a.created_at DESC
    `,
    [student_id, grade_level]
  );

  return rows;
};

/**
 * Get student details by ID
 */
exports.findStudentById = async (student_id) => {
  const [rows] = await pool.execute(
    `
    SELECT id, first_name, last_name, email, grade_level, academy, status
    FROM students
    WHERE id = ?
    LIMIT 1
    `,
    [student_id]
  );

  return rows[0] || null;
};

/**
 * Check if a student belongs to a parent
 */
exports.isStudentBelongsToParent = async (parent_id, student_id) => {
  const [rows] = await pool.execute(
    `
    SELECT 1
    FROM parent_students
    WHERE parent_id = ? AND student_id = ?
    LIMIT 1
    `,
    [parent_id, student_id]
  );

  return rows.length > 0;
};

/**
 * Find all students linked to a parent
 */
exports.findParentLinkedStudents = async (parent_id) => {
  const [rows] = await pool.execute(
    `
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.email,
      s.grade_level,
      s.academy,
      s.profile_image
    FROM parent_students ps
    INNER JOIN students s ON s.id = ps.student_id
    WHERE ps.parent_id = ?
    ORDER BY s.first_name ASC
    `,
    [parent_id]
  );

  return rows;
};

/**
 * Upsert student assignment submission
 */
exports.upsertSubmission = async ({
  assignment_id,
  student_id,
  submission_text,
  attachment_url,
}) => {
  const [result] = await pool.execute(
    `
    INSERT INTO assignment_submissions (
      assignment_id, student_id, submission_text, attachment_url, submitted_at, status
    ) VALUES (?, ?, ?, ?, NOW(), 'submitted')
    ON DUPLICATE KEY UPDATE
      submission_text = COALESCE(VALUES(submission_text), submission_text),
      attachment_url = COALESCE(VALUES(attachment_url), attachment_url),
      submitted_at = NOW(),
      status = CASE WHEN status = 'graded' THEN 'graded' ELSE 'submitted' END
    `,
    [assignment_id, student_id, submission_text || null, attachment_url || null]
  );

  return result;
};

/**
 * Upsert teacher grade for student submission
 */
exports.upsertGrade = async ({
  assignment_id,
  student_id,
  marks_obtained,
  grade,
  feedback,
  graded_by,
}) => {
  const [result] = await pool.execute(
    `
    INSERT INTO assignment_submissions (
      assignment_id, student_id, marks_obtained, grade, feedback, graded_by, graded_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 'graded')
    ON DUPLICATE KEY UPDATE
      marks_obtained = VALUES(marks_obtained),
      grade = VALUES(grade),
      feedback = VALUES(feedback),
      graded_by = VALUES(graded_by),
      graded_at = NOW(),
      status = 'graded'
    `,
    [assignment_id, student_id, marks_obtained, grade || null, feedback || null, graded_by]
  );

  return result;
};

/**
 * Get all submissions for an assignment (Teacher view)
 */
exports.findSubmissionsByAssignment = async (assignment_id) => {
  const [rows] = await pool.execute(
    `
    SELECT
      sub.id AS submission_id,
      sub.assignment_id,
      sub.student_id,
      s.first_name AS student_first_name,
      s.last_name AS student_last_name,
      s.email AS student_email,
      s.grade_level AS student_grade_level,
      s.profile_image AS student_profile_image,
      sub.submission_text,
      sub.attachment_url,
      sub.submitted_at,
      COALESCE(sub.status, 'pending') AS status,
      sub.marks_obtained,
      sub.grade,
      sub.feedback,
      sub.graded_at,
      u.first_name AS graded_by_first_name,
      u.last_name AS graded_by_last_name
    FROM students s
    INNER JOIN assignments a ON a.id = ? AND a.grade_level = s.grade_level
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
    LEFT JOIN users u ON u.id = sub.graded_by
    ORDER BY s.first_name ASC, s.last_name ASC
    `,
    [assignment_id]
  );

  return rows;
};

/**
 * Find single submission detail
 */
exports.findSingleSubmission = async (assignment_id, student_id) => {
  const [rows] = await pool.execute(
    `
    SELECT
      sub.id,
      sub.assignment_id,
      sub.student_id,
      sub.submission_text,
      sub.attachment_url,
      sub.submitted_at,
      sub.status,
      sub.marks_obtained,
      sub.grade,
      sub.feedback,
      sub.graded_at,
      sub.graded_by
    FROM assignment_submissions sub
    WHERE sub.assignment_id = ? AND sub.student_id = ?
    LIMIT 1
    `,
    [assignment_id, student_id]
  );

  return rows[0] || null;
};
