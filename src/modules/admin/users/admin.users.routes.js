const express = require('express');

const {
  getParents,
  getTeachers,
  updateApprovalStatus,
  updateParentStatus,
  updateStudentStatus,
} = require('./admin.users.controller');
const { verifyAdminToken } = require('../../../middlewares/admin.middleware');

const router = express.Router();

router.get('/teachers', verifyAdminToken, getTeachers);
router.get('/parents', verifyAdminToken, getParents);
router.patch('/parents/:id/status', verifyAdminToken, updateParentStatus);
router.patch('/students/:id/status', verifyAdminToken, updateStudentStatus);
router.patch('/users/:userId/approval', verifyAdminToken, updateApprovalStatus);

module.exports = router;
