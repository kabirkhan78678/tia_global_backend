const { pool } = require('../../config/db');

exports.createHandbook = async ({ title, grade_level, file_url, file_name }) => {
  const [result] = await pool.execute(
    `
    INSERT INTO handbooks (title, grade_level, file_url, file_name)
    VALUES (?, ?, ?, ?)
    `,
    [title, grade_level, file_url, file_name]
  );
  return result.insertId;
};

exports.deleteHandbook = async (id) => {
  const [result] = await pool.execute(
    'DELETE FROM handbooks WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

exports.getHandbookById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT id, title, grade_level, file_url, file_name, created_at, updated_at FROM handbooks WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

exports.getAllHandbooks = async () => {
  const [rows] = await pool.execute(
    'SELECT id, title, grade_level, file_url, file_name, created_at, updated_at FROM handbooks ORDER BY created_at DESC'
  );
  return rows;
};

exports.getHandbooksByGrade = async (gradeLevel) => {
  const [rows] = await pool.execute(
    'SELECT id, title, grade_level, file_url, file_name, created_at, updated_at FROM handbooks WHERE grade_level = ? ORDER BY created_at DESC',
    [gradeLevel]
  );
  return rows;
};
