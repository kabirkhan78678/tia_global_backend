const express = require('express');

const router = express.Router();

const {
  signup,
  login,
  getProfile,
  forgotPassword,
  approveResetPassword,
  resetPassword,
} = require('./auth.controller');

const { verifyToken } = require('../../../middlewares/auth.middleware');

/**
 * Public Routes
 */
router.post('/signup', signup);
router.post('/login', login);

router.post('/forgot-password', forgotPassword);
router.post('/forgot-password/approve', approveResetPassword);
router.post('/reset-password', resetPassword);

/**
 * Protected Routes
 */
router.get('/profile', verifyToken, getProfile);

module.exports = router;
