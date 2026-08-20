const { pool } = require('../../config/db');

/**
 * Initialize notification tables if they do not exist
 */
const initNotificationTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_device_tokens (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        role ENUM('admin', 'parent', 'teacher', 'student') NOT NULL,
        fcm_token VARCHAR(500) NOT NULL,
        device_type VARCHAR(50) DEFAULT 'web',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_role_token (user_id, role, fcm_token(255)),
        KEY idx_user_role (user_id, role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        recipient_id BIGINT UNSIGNED NOT NULL,
        recipient_role ENUM('admin', 'parent', 'teacher', 'student') NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        type ENUM('chat', 'assignment', 'approval', 'event', 'payment', 'system') NOT NULL DEFAULT 'system',
        data_payload LONGTEXT DEFAULT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_recipient (recipient_role, recipient_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
  } catch (error) {
    console.error('[NOTIF_TABLE_INIT_WARN] Could not check/init notification tables:', error.message);
  }
};

// Auto-run table initialization
initNotificationTables();

/**
 * Save / Update FCM Device Token
 */
exports.upsertDeviceToken = async ({ userId, role, fcmToken, deviceType = 'web' }) => {
  const [result] = await pool.query(
    `
    INSERT INTO user_device_tokens (user_id, role, fcm_token, device_type, updated_at)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      device_type = VALUES(device_type),
      updated_at = NOW()
    `,
    [userId, role, fcmToken, deviceType]
  );

  return result;
};

/**
 * Remove FCM Device Token (Logout)
 */
exports.deleteDeviceToken = async ({ userId, role, fcmToken }) => {
  let query = `DELETE FROM user_device_tokens WHERE user_id = ? AND role = ?`;
  const params = [userId, role];

  if (fcmToken) {
    query += ` AND fcm_token = ?`;
    params.push(fcmToken);
  }

  const [result] = await pool.query(query, params);
  return result.affectedRows;
};

/**
 * Find all FCM tokens for a specific user recipient
 */
exports.findTokensByRecipient = async ({ recipientId, recipientRole }) => {
  const [rows] = await pool.query(
    `
    SELECT fcm_token
    FROM user_device_tokens
    WHERE user_id = ? AND role = ?
    `,
    [recipientId, recipientRole]
  );

  return rows.map((r) => r.fcm_token);
};

/**
 * Find FCM tokens for multiple recipients
 */
exports.findTokensByRecipients = async (recipientsList) => {
  if (!recipientsList || recipientsList.length === 0) return [];

  const conditions = [];
  const params = [];

  for (const r of recipientsList) {
    conditions.push(`(user_id = ? AND role = ?)`);
    params.push(r.recipientId, r.recipientRole);
  }

  const [rows] = await pool.query(
    `
    SELECT fcm_token
    FROM user_device_tokens
    WHERE ${conditions.join(' OR ')}
    `,
    params
  );

  return rows.map((r) => r.fcm_token);
};

/**
 * Find all FCM tokens for a role (e.g. all admins, all parents, all teachers)
 */
exports.findTokensByRole = async (role) => {
  const [rows] = await pool.query(
    `
    SELECT fcm_token
    FROM user_device_tokens
    WHERE role = ?
    `,
    [role]
  );

  return rows.map((r) => r.fcm_token);
};

/**
 * Find all student IDs and linked parent IDs for a grade level
 */
exports.findStudentsAndParentsByGrade = async (gradeLevel) => {
  const [rows] = await pool.query(
    `
    SELECT
      s.id AS student_id,
      ps.parent_id
    FROM students s
    LEFT JOIN parent_students ps ON ps.student_id = s.id
    WHERE s.grade_level = ?
    `,
    [gradeLevel]
  );

  const studentIds = [];
  const parentIds = [];

  rows.forEach((r) => {
    if (r.student_id) studentIds.push(r.student_id);
    if (r.parent_id) parentIds.push(r.parent_id);
  });

  return {
    studentIds: [...new Set(studentIds)],
    parentIds: [...new Set(parentIds)],
  };
};

/**
 * Save in-app notification to database
 */
exports.createNotification = async ({
  recipientId,
  recipientRole,
  title,
  body,
  type = 'system',
  dataPayload = null,
}) => {
  const serializedPayload =
    typeof dataPayload === 'object' && dataPayload !== null
      ? JSON.stringify(dataPayload)
      : dataPayload || null;

  const [result] = await pool.query(
    `
    INSERT INTO notifications (
      recipient_id,
      recipient_role,
      title,
      body,
      type,
      data_payload
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [recipientId, recipientRole, title, body, type, serializedPayload]
  );

  return result.insertId;
};

/**
 * Batch insert in-app notifications
 */
exports.createBatchNotifications = async (notificationsList) => {
  if (!notificationsList || notificationsList.length === 0) return [];

  const values = [];
  const params = [];

  for (const n of notificationsList) {
    const serializedPayload =
      typeof n.dataPayload === 'object' && n.dataPayload !== null
        ? JSON.stringify(n.dataPayload)
        : n.dataPayload || null;

    values.push(`(?, ?, ?, ?, ?, ?)`);
    params.push(
      n.recipientId,
      n.recipientRole,
      n.title,
      n.body,
      n.type || 'system',
      serializedPayload
    );
  }

  await pool.query(
    `
    INSERT INTO notifications (
      recipient_id,
      recipient_role,
      title,
      body,
      type,
      data_payload
    )
    VALUES ${values.join(', ')}
    `,
    params
  );
};

/**
 * Find user notifications with pagination
 */
exports.findNotificationsByUser = async ({ userId, role, limit = 20, offset = 0 }) => {
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20;
  const safeOffset = Number.isInteger(Number(offset)) && Number(offset) >= 0 ? Number(offset) : 0;

  const [countRows] = await pool.query(
    `
    SELECT COUNT(id) AS total
    FROM notifications
    WHERE recipient_id = ? AND recipient_role = ?
    `,
    [userId, role]
  );

  const [rows] = await pool.query(
    `
    SELECT
      id,
      recipient_id,
      recipient_role,
      title,
      body,
      type,
      data_payload,
      is_read,
      created_at
    FROM notifications
    WHERE recipient_id = ? AND recipient_role = ?
    ORDER BY created_at DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}
    `,
    [userId, role]
  );

  return {
    total: parseInt(countRows[0]?.total || 0, 10),
    rows,
  };
};

/**
 * Count unread notifications
 */
exports.countUnreadNotifications = async ({ userId, role }) => {
  const [rows] = await pool.query(
    `
    SELECT COUNT(id) AS unread_count
    FROM notifications
    WHERE recipient_id = ? AND recipient_role = ? AND is_read = 0
    `,
    [userId, role]
  );

  return parseInt(rows[0]?.unread_count || 0, 10);
};

/**
 * Mark a single notification as read
 */
exports.markNotificationAsRead = async ({ notificationId, userId, role }) => {
  const [result] = await pool.query(
    `
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND recipient_id = ? AND recipient_role = ?
    `,
    [notificationId, userId, role]
  );

  return result.affectedRows;
};

/**
 * Mark all notifications as read for a user
 */
exports.markAllNotificationsAsRead = async ({ userId, role }) => {
  const [result] = await pool.query(
    `
    UPDATE notifications
    SET is_read = 1
    WHERE recipient_id = ? AND recipient_role = ? AND is_read = 0
    `,
    [userId, role]
  );

  return result.affectedRows;
};

/**
 * Delete invalid / unregistered FCM tokens
 */
exports.deleteInvalidTokens = async (tokenList) => {
  if (!tokenList || tokenList.length === 0) return;

  const placeholders = tokenList.map(() => '?').join(', ');
  await pool.query(
    `DELETE FROM user_device_tokens WHERE fcm_token IN (${placeholders})`,
    tokenList
  );
};
