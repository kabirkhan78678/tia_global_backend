const express = require('express');

const {
  changePassword,
  forgotPassword,
  getProfile,
  login,
  resetPassword,
  updateProfile,
} = require('./admin.auth.controller');
const { verifyAdminToken } = require('../../../middlewares/admin.middleware');
const { uploadProfileImage } = require('../../../middlewares/upload.middleware');

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/profile', verifyAdminToken, getProfile);
router.patch('/profile', verifyAdminToken, uploadProfileImage.single('profileImage'), updateProfile);
router.patch('/change-password', verifyAdminToken, changePassword);

module.exports = router;
