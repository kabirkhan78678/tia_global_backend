const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');
const { verifyAdminToken } = require('../../middlewares/admin.middleware');
const { uploadHandbook } = require('../../middlewares/handbookUpload.middleware');
const HandbookController = require('./handbook.controller');

// Admin Operations
router.post(
  '/admin',
  verifyAdminToken,
  uploadHandbook.single('file'),
  HandbookController.addHandbook
);

router.delete(
  '/admin/:id',
  verifyAdminToken,
  HandbookController.deleteHandbook
);

router.get(
  '/admin',
  verifyAdminToken,
  HandbookController.getAdminHandbooks
);

// Student Operations
router.get(
  '/student',
  verifyToken,
  authorizeRoles('student'),
  HandbookController.getStudentHandbooks
);

module.exports = router;
