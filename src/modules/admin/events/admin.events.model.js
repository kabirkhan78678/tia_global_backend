const { pool } = require('../../../config/db');

exports.createEvent = async ({
  title,
  description,
  eventDate,
  eventTime,
  categories,
}) => {
  console.log("categories in model:", categories);
console.log("Saving:", categories.join(","));
console.log("NEW MODEL FILE LOADED");
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
    [title, description || null, eventDate, eventTime || null, categories.join(',')]
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
        category AS categories,
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
        category AS categories,
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
  categories,
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
      categories.join(','),
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
exports.getFilteredEvents = async ({ categories, grade }) => {
  
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
  `;
  
  const params = [];

  // Category filter
 if (categories) {
  query += `
    AND (
      FIND_IN_SET(?, REPLACE(e.category,' ',''))
      OR FIND_IN_SET('ALL', REPLACE(e.category,' ',''))
    )
  `;

  params.push(categories);
}

  // Grade filter (only for STUDENT category events)
  if (grade) {
    query += `
      AND (
        NOT FIND_IN_SET('STUDENT', REPLACE(e.category,' ',''))
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