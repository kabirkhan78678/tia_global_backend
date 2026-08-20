const NotificationModel = require('./notification.model');
const { sendPushNotification } = require('../../config/firebase');
const ApiError = require('../../utils/apiError');

// Global socket.io instance reference getter
let globalIo = null;
const setNotificationIo = (io) => {
  globalIo = io;
};
const getNotificationIo = () => globalIo;

/**
 * Save / Update FCM Token for current authenticated user
 */
const saveDeviceToken = async (authUser, payload = {}) => {
  const { fcm_token, device_type = 'web' } = payload;

  if (!fcm_token || typeof fcm_token !== 'string' || !fcm_token.trim()) {
    throw new ApiError(400, 'fcm_token is required');
  }

  await NotificationModel.upsertDeviceToken({
    userId: authUser.id,
    role: authUser.role,
    fcmToken: fcm_token.trim(),
    deviceType: device_type ? String(device_type).trim().toLowerCase() : 'web',
  });

  return {
    message: 'Device FCM token saved successfully',
    role: authUser.role,
    userId: authUser.id,
  };
};

/**
 * Remove FCM Token on logout
 */
const removeDeviceToken = async (authUser, payload = {}) => {
  const { fcm_token } = payload;

  await NotificationModel.deleteDeviceToken({
    userId: authUser.id,
    role: authUser.role,
    fcmToken: fcm_token ? String(fcm_token).trim() : null,
  });

  return {
    message: 'Device FCM token removed successfully',
  };
};

/**
 * Parse data payload safely from DB row
 */
const formatNotification = (row) => {
  let parsedPayload = null;
  if (row.data_payload) {
    try {
      parsedPayload = JSON.parse(row.data_payload);
    } catch {
      parsedPayload = row.data_payload;
    }
  }

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    data: parsedPayload,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
};

/**
 * Get paginated list of notifications for user
 */
const getNotifications = async (authUser, query = {}) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const { total, rows } = await NotificationModel.findNotificationsByUser({
    userId: authUser.id,
    role: authUser.role,
    limit,
    offset,
  });

  const unreadCount = await NotificationModel.countUnreadNotifications({
    userId: authUser.id,
    role: authUser.role,
  });

  return {
    unreadCount,
    notifications: rows.map(formatNotification),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get unread notification count badge
 */
const getUnreadCount = async (authUser) => {
  const unreadCount = await NotificationModel.countUnreadNotifications({
    userId: authUser.id,
    role: authUser.role,
  });

  return {
    unreadCount,
  };
};

/**
 * Mark single notification as read
 */
const markAsRead = async (authUser, notificationId) => {
  const parsedId = parseInt(notificationId, 10);
  if (!parsedId) {
    throw new ApiError(400, 'Valid notificationId is required');
  }

  const affectedRows = await NotificationModel.markNotificationAsRead({
    notificationId: parsedId,
    userId: authUser.id,
    role: authUser.role,
  });

  if (affectedRows === 0) {
    throw new ApiError(404, 'Notification not found or already read');
  }

  const unreadCount = await NotificationModel.countUnreadNotifications({
    userId: authUser.id,
    role: authUser.role,
  });

  return {
    message: 'Notification marked as read',
    unreadCount,
  };
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (authUser) => {
  await NotificationModel.markAllNotificationsAsRead({
    userId: authUser.id,
    role: authUser.role,
  });

  return {
    message: 'All notifications marked as read',
    unreadCount: 0,
  };
};

/**
 * Core Dispatcher: Send Push + Live Socket + Save DB Notification to a specific user
 */
const notifyUser = async ({
  recipientId,
  recipientRole,
  title,
  body,
  type = 'system',
  dataPayload = {},
  imageUrl = null,
}) => {
  try {
    if (!recipientId || !recipientRole) return;

    // 1. Save Notification to Database
    const notificationId = await NotificationModel.createNotification({
      recipientId,
      recipientRole,
      title,
      body,
      type,
      dataPayload,
    });

    const notifObj = {
      id: notificationId,
      title,
      body,
      type,
      data: dataPayload,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // 2. Real-time Live Emit via Socket.IO
    const io = getNotificationIo();
    if (io) {
      const userRoom = `notification:${recipientRole}:${recipientId}`;
      io.to(userRoom).emit('notification:new', notifObj);
    }

    // 3. Send Push Notification via Firebase (FCM)
    const tokens = await NotificationModel.findTokensByRecipient({
      recipientId,
      recipientRole,
    });

    if (tokens.length > 0) {
      const fcmResult = await sendPushNotification({
        fcmTokens: tokens,
        title,
        body,
        dataPayload: {
          ...dataPayload,
          notificationId: String(notificationId),
          type: String(type),
        },
        imageUrl,
      });

      if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
        await NotificationModel.deleteInvalidTokens(fcmResult.invalidTokens);
      }
    }
  } catch (error) {
    console.error(`[NOTIFY_USER_ERROR] (${recipientRole}:${recipientId}):`, error.message);
  }
};

/**
 * Dispatcher: Send Notification to Multiple Users
 */
const notifyMultipleUsers = async (
  recipientsList,
  { title, body, type = 'system', dataPayload = {}, imageUrl = null }
) => {
  try {
    if (!recipientsList || recipientsList.length === 0) return;

    const notifBatch = recipientsList.map((r) => ({
      recipientId: r.recipientId,
      recipientRole: r.recipientRole,
      title,
      body,
      type,
      dataPayload,
    }));

    // 1. Batch Save to DB
    await NotificationModel.createBatchNotifications(notifBatch);

    // 2. Real-time Live Emit via Socket.IO
    const io = getNotificationIo();
    if (io) {
      const notifObj = {
        title,
        body,
        type,
        data: dataPayload,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      for (const r of recipientsList) {
        const userRoom = `notification:${r.recipientRole}:${r.recipientId}`;
        io.to(userRoom).emit('notification:new', notifObj);
      }
    }

    // 3. Send Push Notification via Firebase (FCM)
    const tokens = await NotificationModel.findTokensByRecipients(recipientsList);
    if (tokens.length > 0) {
      const fcmResult = await sendPushNotification({
        fcmTokens: tokens,
        title,
        body,
        dataPayload: {
          ...dataPayload,
          type: String(type),
        },
        imageUrl,
      });

      if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
        await NotificationModel.deleteInvalidTokens(fcmResult.invalidTokens);
      }
    }
  } catch (error) {
    console.error('[NOTIFY_MULTIPLE_ERROR]:', error.message);
  }
};

/**
 * Dispatcher: Send Notification to all users of a specific role (e.g. all admins or all parents)
 */
const notifyRole = async (
  role,
  { title, body, type = 'system', dataPayload = {}, imageUrl = null }
) => {
  try {
    const io = getNotificationIo();
    if (io) {
      const notifObj = {
        title,
        body,
        type,
        data: dataPayload,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      io.to(`role:${role}`).emit('notification:new', notifObj);
    }

    const tokens = await NotificationModel.findTokensByRole(role);
    if (tokens.length > 0) {
      const fcmResult = await sendPushNotification({
        fcmTokens: tokens,
        title,
        body,
        dataPayload: {
          ...dataPayload,
          type: String(type),
        },
        imageUrl,
      });

      if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
        await NotificationModel.deleteInvalidTokens(fcmResult.invalidTokens);
      }
    }
  } catch (error) {
    console.error(`[NOTIFY_ROLE_ERROR] (${role}):`, error.message);
  }
};

/**
 * Dispatcher: Send Notification to all students & linked parents of a specific grade level
 */
const notifyGradeStudentsAndParents = async (
  gradeLevel,
  { title, body, type = 'system', dataPayload = {}, imageUrl = null }
) => {
  try {
    const { studentIds, parentIds } = await NotificationModel.findStudentsAndParentsByGrade(gradeLevel);

    const recipients = [
      ...studentIds.map((id) => ({ recipientId: id, recipientRole: 'student' })),
      ...parentIds.map((id) => ({ recipientId: id, recipientRole: 'parent' })),
    ];

    if (recipients.length > 0) {
      await notifyMultipleUsers(recipients, {
        title,
        body,
        type,
        dataPayload,
        imageUrl,
      });
    }
  } catch (error) {
    console.error(`[NOTIFY_GRADE_ERROR] (${gradeLevel}):`, error.message);
  }
};

/**
 * Test Push Notification Directly
 */
const testPushNotification = async ({ fcm_token, title, body, data = {} }) => {
  if (!fcm_token) {
    throw new ApiError(400, 'fcm_token is required');
  }

  const result = await sendPushNotification({
    fcmTokens: fcm_token,
    title: title || 'Test Push Notification',
    body: body || 'Firebase push notification is working perfectly!',
    dataPayload: data,
  });

  return {
    message: result.success
      ? 'Test push notification sent successfully'
      : 'Failed to send test push notification',
    result,
  };
};

module.exports = {
  setNotificationIo,
  getNotificationIo,
  saveDeviceToken,
  removeDeviceToken,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  notifyUser,
  notifyMultipleUsers,
  notifyRole,
  notifyGradeStudentsAndParents,
  testPushNotification,
};
