const express = require('express');

const router = express.Router();

const {
  signup,
  login,
  getProfile,
  updateProfile,
  addStudent,
  updateStudentProfile,
  changePassword,
  changeStudentPassword,
  createStudentPassword,
  forgotPassword,
  resetPassword,
} = require('./auth.controller');

const { verifyToken } = require('../../../middlewares/auth.middleware');
const { uploadProfileImage } = require('../../../middlewares/upload.middleware');

/**
 * Public Routes
 */
router.post('/signup', signup);
router.post('/login', login);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

/**
 * Protected Routes
 */
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, uploadProfileImage.single('profileImage'), updateProfile);
router.post('/students', verifyToken, uploadProfileImage.single('profileImage'), addStudent);
router.patch('/change-password', verifyToken, changePassword);
router.patch('/students/create-password', verifyToken, createStudentPassword);
router.patch('/students/change-password', verifyToken, changeStudentPassword);
router.patch('/students/:studentId', verifyToken, uploadProfileImage.single('profileImage'), updateStudentProfile);

module.exports = router;
