const express = require('express');

const {
  getParents,
  getTeachers,
  updateApprovalStatus,
  updateParentStatus,
  updateStudentStatus,
  getAdminDashboard,
} = require('./admin.users.controller');
const { verifyAdminToken } = require('../../../middlewares/admin.middleware');

const router = express.Router();

router.get('/dashboard', verifyAdminToken, getAdminDashboard);
router.post('/dashboard', verifyAdminToken, getAdminDashboard);
router.get('/teachers', verifyAdminToken, getTeachers);
router.get('/parents', verifyAdminToken, getParents);
router.patch('/parents/:id/status', verifyAdminToken, updateParentStatus);
router.patch('/students/:id/status', verifyAdminToken, updateStudentStatus);
router.patch('/users/:userId/approval', verifyAdminToken, updateApprovalStatus);

module.exports = router;
