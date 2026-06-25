const jwt = require('jsonwebtoken');

const env = require('../config/env');
const ApiError = require('../utils/apiError');

const verifyAdminToken = (req, res, next) => {
  try {
    if (!env.admin.jwtSecret) {
      throw new ApiError(500, 'ADMIN_JWT_SECRET or JWT_SECRET is missing in .env');
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Admin authorization token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.admin.jwtSecret);

    if (decoded.type !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    req.admin = decoded;

    return next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    return next(new ApiError(401, 'Invalid or expired admin token'));
  }
};

module.exports = {
  verifyAdminToken,
};
