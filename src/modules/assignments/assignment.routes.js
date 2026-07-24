const express = require('express');
const router = express.Router();

const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');
const { requireStudentPayment } = require('../../middlewares/requireStudentPayment.middleware');
const { uploadAssignmentFile } = require('../../middlewares/assignmentUpload.middleware');
const {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getTeacherAssignments,
  getAssignmentById,
  getStudentAssignments,
  submitAssignment,
  getParentAssignments,
  gradeAssignment,
  getAssignmentSubmissions,
} = require('./assignment.controller');

// Protect all routes with JWT verification
router.use(verifyToken);

// Teacher routes
router.post(
  '/',
  authorizeRoles('teacher'),
  uploadAssignmentFile.single('attachment'),
  createAssignment
);

router.get(
  '/teacher',
  authorizeRoles('teacher'),
  getTeacherAssignments
);

router.put(
  '/:id',
  authorizeRoles('teacher'),
  uploadAssignmentFile.single('attachment'),
  updateAssignment
);

router.delete(
  '/:id',
  authorizeRoles('teacher'),
  deleteAssignment
);

router.post(
  '/:id/grade',
  authorizeRoles('teacher'),
  gradeAssignment
);

router.get(
  '/:id/submissions',
  authorizeRoles('teacher'),
  getAssignmentSubmissions
);

// Student routes (Requires Paid Invoice)
router.get(
  '/student',
  authorizeRoles('student'),
  requireStudentPayment,
  getStudentAssignments
);

router.post(
  '/:id/submit',
  authorizeRoles('student'),
  requireStudentPayment,
  uploadAssignmentFile.single('attachment'),
  submitAssignment
);

// Parent routes
router.get(
  '/parent',
  authorizeRoles('parent'),
  getParentAssignments
);

// Shared route (Requires Paid Invoice for Students)
router.get(
  '/:id',
  authorizeRoles('teacher', 'student', 'parent'),
  requireStudentPayment,
  getAssignmentById
);


module.exports = router;
