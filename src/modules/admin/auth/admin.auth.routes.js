const express = require('express');

const {
  forgotPassword,
  getProfile,
  login,
  resetPassword,
} = require('./admin.auth.controller');
const { verifyAdminToken } = require('../../../middlewares/admin.middleware');

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/profile', verifyAdminToken, getProfile);

module.exports = router;
