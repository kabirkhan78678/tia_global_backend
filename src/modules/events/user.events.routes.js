const express = require('express');
const router = express.Router();

const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');
const { getParentEvents, getTeacherEvents, getStudentEvents } = require('./user.events.controller');

// Protect all user event routes with JWT verification
router.use(verifyToken);

// Parent events route
router.get(
  '/parent',
  authorizeRoles('parent'),
  getParentEvents
);

// Teacher events route
router.get(
  '/teacher',
  authorizeRoles('teacher'),
  getTeacherEvents
);

// Student events route
router.get(
  '/student',
  authorizeRoles('student'),
  getStudentEvents
);

module.exports = router;
