const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const env = require('../../config/env');
const ApiError = require('../../utils/apiError');
const NotificationController = require('./notification.controller');

/**
 * Flexible middleware: Accepts both Admin JWT and User JWT (Parent, Teacher, Student)
 */
const verifyAnyAuthToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authorization token is required');
    }

    const token = authHeader.split(' ')[1];

    // Try verifying with user JWT_SECRET first
    try {
      const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
      if (decodedUser && decodedUser.id && decodedUser.role) {
        req.user = decodedUser;
        return next();
      }
    } catch {
      // User verify failed, try Admin secret
    }

    // Try verifying with ADMIN_JWT_SECRET
    if (env.admin && env.admin.jwtSecret) {
      try {
        const decodedAdmin = jwt.verify(token, env.admin.jwtSecret);
        if (decodedAdmin && (decodedAdmin.type === 'admin' || decodedAdmin.role === 'admin')) {
          req.admin = decodedAdmin;
          return next();
        }
      } catch {
        // Admin verify failed
      }
    }

    throw new ApiError(401, 'Invalid or expired authorization token');
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(new ApiError(401, 'Invalid or expired authorization token'));
  }
};

// Public test endpoint (useful for testing FCM tokens directly without auth)
router.post('/test-push', NotificationController.testPushNotification);

// All other notification routes require authentication
router.use(verifyAnyAuthToken);

// Device FCM token registration / deletion
router.post('/fcm-token', NotificationController.saveDeviceToken);
router.delete('/fcm-token', NotificationController.removeDeviceToken);

// In-app notifications
router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/read-all', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markAsRead);

module.exports = router;
