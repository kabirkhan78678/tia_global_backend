const { pool } = require('../../config/db');

/**
 * Get linked children grade levels for a parent
 */
exports.getParentChildrenGrades = async (parentId) => {
  const [rows] = await pool.execute(
    `
    SELECT DISTINCT s.grade_level
    FROM parent_students ps
    INNER JOIN students s ON s.id = ps.student_id
    WHERE ps.parent_id = ? AND s.grade_level IS NOT NULL
    `,
    [parentId]
  );
  return rows.map((r) => r.grade_level);
};

/**
 * Get teaching grade for a teacher
 */
exports.getTeacherTeachingGrade = async (teacherId) => {
  const [rows] = await pool.execute(
    `
    SELECT teaching_grade
    FROM teacher_profiles
    WHERE user_id = ?
    LIMIT 1
    `,
    [teacherId]
  );
  return rows[0] ? rows[0].teaching_grade : null;
};

/**
 * Get events matching categories and optional target grades
 */
exports.getEventsForCategoriesAndGrades = async ({ categories = [], grades = [] }) => {
  if (categories.length === 0) return [];

  // Build category match statements
  const categoryConditions = categories.map(() => `FIND_IN_SET(?, REPLACE(e.category, ' ', ''))`).join(' OR ');
  const params = [...categories];

  let query = `
    SELECT DISTINCT
      e.id,
      e.title,
      e.description,
      e.event_date,
      e.event_time,
      e.category AS categories,
      e.created_at,
      e.updated_at
    FROM events e
    WHERE e.deleted_at IS NULL
      AND (
        FIND_IN_SET('ALL', REPLACE(e.category, ' ', ''))
        OR ${categoryConditions}
  `;

  // If there are target grades, include events targeted to those grades
  if (grades.length > 0) {
    const gradePlaceholders = grades.map(() => '?').join(',');
    query += `
        OR (
          FIND_IN_SET('STUDENT', REPLACE(e.category, ' ', ''))
          AND e.id IN (
            SELECT event_id
            FROM event_student_grades
            WHERE grade IN (${gradePlaceholders})
          )
        )
    `;
    params.push(...grades);
  }

  query += ` ) ORDER BY e.event_date DESC, e.event_time ASC`;

  const [rows] = await pool.execute(query, params);
  return rows;
};

/**
 * Get student's grade level
 */
exports.getStudentGradeLevel = async (studentId) => {
  const [rows] = await pool.execute(
    `
    SELECT grade_level
    FROM students
    WHERE id = ? AND grade_level IS NOT NULL
    LIMIT 1
    `,
    [studentId]
  );
  return rows[0] ? rows[0].grade_level : null;
};
