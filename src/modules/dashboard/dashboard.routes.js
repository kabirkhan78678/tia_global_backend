const express = require('express');
const router = express.Router();

const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');
const { requireStudentPayment } = require('../../middlewares/requireStudentPayment.middleware');
const {
  getParentDashboard,
  getStudentDashboard,
  getTeacherDashboard,
} = require('./dashboard.controller');

// Protect all dashboard routes with token verification
router.use(verifyToken);

// Parent Dashboard API
router.get(
  '/parent',
  authorizeRoles('parent'),
  getParentDashboard
);

// Student Dashboard API (Requires Paid Invoice)
router.get(
  '/student',
  authorizeRoles('student'),
  requireStudentPayment,
  getStudentDashboard
);


// Teacher Dashboard API
router.get(
  '/teacher',
  authorizeRoles('teacher'),
  getTeacherDashboard
);

module.exports = router;
