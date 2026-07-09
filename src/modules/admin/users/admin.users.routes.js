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

router.use(verifyAdminToken);

router.get('/teachers', getTeachers);
router.get('/parents', getParents);
router.patch('/parents/:id/status', updateParentStatus);
router.patch('/students/:id/status', updateStudentStatus);
router.patch('/users/:userId/approval', updateApprovalStatus);

module.exports = router;
