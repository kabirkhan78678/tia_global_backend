const { pool } = require('../../../config/db');

exports.findByEmail = async (email) => {
  const [admins] = await pool.execute(
    `
      SELECT
        id,
        name,
        email,
        phone,
        password,
        profile_image,
        status,
        last_login_at,
        created_at,
        updated_at
      FROM admins
      WHERE email = ?
      LIMIT 1
      `,
    [email]
  );

  return admins[0] || null;
};

exports.findById = async (id) => {
  const [admins] = await pool.execute(
    `
      SELECT
        id,
        name,
        email,
        phone,
        profile_image,
        status,
        last_login_at,
        created_at,
        updated_at
      FROM admins
      WHERE id = ?
      LIMIT 1
      `,
    [id]
  );

  return admins[0] || null;
};

exports.findByIdWithPassword = async (id) => {
  const [admins] = await pool.execute(
    `
      SELECT
        id,
        name,
        email,
        phone,
        password,
        profile_image,
        status,
        last_login_at,
        created_at,
        updated_at
      FROM admins
      WHERE id = ?
      LIMIT 1
      `,
    [id]
  );

  return admins[0] || null;
};

exports.updateProfile = async ({ adminId, data }) => {
  const fields = [];
  const values = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
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

  values.push(adminId);

  const [result] = await pool.execute(
    `
      UPDATE admins
      SET ${fields.join(', ')},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
    values
  );

  return result.affectedRows;
};

exports.createPasswordResetRequest = async ({ adminId, email, token, expiresAt }) => {
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
    [adminId, email, token, expiresAt]
  );

  return result.insertId;
};

exports.findPasswordResetRequestByToken = async (token) => {
  const [rows] = await pool.execute(
    `
      SELECT id, user_id AS admin_id, email, token, status, expires_at
      FROM password_reset_requests
      WHERE token = ?
      LIMIT 1
      `,
    [token]
  );

  return rows[0] || null;
};

exports.updatePassword = async ({ adminId, password }) => {
  await pool.execute(
    `
      UPDATE admins
      SET password = ?
      WHERE id = ?
      `,
    [password, adminId]
  );
};

exports.updateLastLogin = async (adminId) => {
  await pool.execute(
    `
      UPDATE admins
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
    [adminId]
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
