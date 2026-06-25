const express = require('express');

const {
  getParents,
  getTeachers,
  updateApprovalStatus,
} = require('./admin.users.controller');
const { verifyAdminToken } = require('../../../middlewares/admin.middleware');

const router = express.Router();

router.use(verifyAdminToken);

router.get('/teachers', getTeachers);
router.get('/parents', getParents);
router.patch('/users/:userId/approval', updateApprovalStatus);

module.exports = router;
