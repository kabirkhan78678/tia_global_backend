const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authorization token is required');
    }

    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);

    return next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied. Unauthorized role.'));
    }
    return next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles,
};

