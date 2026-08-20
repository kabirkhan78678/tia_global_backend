const NotificationService = require('./notification.service');

const getAuthUserFromRequest = (req) => {
  // Support both standard user JWT and admin JWT tokens
  if (req.admin) {
    return {
      id: req.admin.id,
      role: 'admin',
      email: req.admin.email,
    };
  }

  if (req.user) {
    return req.user;
  }

  return null;
};

exports.saveDeviceToken = async (req, res, next) => {
  try {
    const authUser = getAuthUserFromRequest(req);
    const data = await NotificationService.saveDeviceToken(authUser, req.body);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.removeDeviceToken = async (req, res, next) => {
  try {
    const authUser = getAuthUserFromRequest(req);
    const data = await NotificationService.removeDeviceToken(authUser, req.body);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const authUser = getAuthUserFromRequest(req);
    const data = await NotificationService.getNotifications(authUser, req.query);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const authUser = getAuthUserFromRequest(req);
    const data = await NotificationService.getUnreadCount(authUser);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const authUser = getAuthUserFromRequest(req);
    const data = await NotificationService.markAsRead(authUser, req.params.id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const authUser = getAuthUserFromRequest(req);
    const data = await NotificationService.markAllAsRead(authUser);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.testPushNotification = async (req, res, next) => {
  try {
    const data = await NotificationService.testPushNotification(req.body);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};
