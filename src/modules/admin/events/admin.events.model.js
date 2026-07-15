const { pool } = require('../../../config/db');

exports.createEvent = async ({
  title,
  description,
  eventDate,
  eventTime,
  category,
}) => {
  const [result] = await pool.execute(
    `
      INSERT INTO events (
        title,
        description,
        event_date,
        event_time,
        category
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [title, description || null, eventDate, eventTime || null, category]
  );

  return result.insertId;
};

exports.addStudentGrade = async ({ eventId, grade }) => {
  await pool.execute(
    `
      INSERT INTO event_student_grades (
        event_id,
        grade
      )
      VALUES (?, ?)
    `,
    [eventId, grade]
  );
};

exports.findEventById = async (eventId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        title,
        description,
        event_date,
        event_time,
        category,
        created_at,
        updated_at
      FROM events
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [eventId]
  );

  return rows[0] || null;
};

exports.findGradesByEventId = async (eventId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        grade
      FROM event_student_grades
      WHERE event_id = ?
    `,
    [eventId]
  );

  return rows;
};

exports.getAllEvents = async () => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        title,
        description,
        event_date,
        event_time,
        category,
        created_at,
        updated_at
      FROM events
      WHERE deleted_at IS NULL
      ORDER BY event_date DESC, event_time ASC
    `
  );

  return rows;
};

exports.deleteStudentGrades = async (eventId) => {
  await pool.execute(
    `
      DELETE FROM event_student_grades
      WHERE event_id = ?
    `,
    [eventId]
  );
};

exports.updateEvent = async ({
  eventId,
  title,
  description,
  eventDate,
  eventTime,
  category,
}) => {
  const [result] = await pool.execute(
    `
      UPDATE events
      SET
        title = ?,
        description = ?,
        event_date = ?,
        event_time = ?,
        category = ?
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [
      title,
      description || null,
      eventDate,
      eventTime || null,
      category,
      eventId,
    ]
  );

  return result.affectedRows;
};

exports.softDeleteEvent = async (eventId) => {
  const [result] = await pool.execute(
    `
      UPDATE events
      SET deleted_at = NOW()
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [eventId]
  );

  return result.affectedRows;
};

// Naya function - Filter events with category and grade
exports.getFilteredEvents = async ({ category, grade }) => {
  let query = `
    SELECT DISTINCT
      e.id,
      e.title,
      e.description,
      e.event_date,
      e.event_time,
      e.category,
      e.created_at,
      e.updated_at
    FROM events e
    WHERE e.deleted_at IS NULL
  `;
  
  const params = [];

  // Category filter
  if (category) {
    if (category === 'STUDENT') {
      query += ` AND e.category IN ('STUDENT', 'ALL')`;
    } else {
      query += ` AND e.category = ?`;
      params.push(category);
    }
  }

  // Grade filter (only for STUDENT category events)
  if (grade) {
    query += `
      AND (
        e.category != 'STUDENT'
        OR e.id IN (
          SELECT event_id 
          FROM event_student_grades 
          WHERE grade = ?
        )
      )
    `;
    params.push(grade);
  }

  query += ` ORDER BY e.event_date DESC, e.event_time ASC`;

  const [rows] = await pool.execute(query, params);
  return rows;
};