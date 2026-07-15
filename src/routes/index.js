const router = require('express').Router();

const adminEventsRoutes = require('../modules/admin/events/admin.events.routes');
const adminAuthRoutes = require('../modules/admin/auth/admin.auth.routes');
const adminUsersRoutes = require('../modules/admin/users/admin.users.routes');
const authRoutes = require('../modules/users/auth/auth.routes');

router.use('/admin/auth', adminAuthRoutes);
router.use('/admin', adminUsersRoutes);
router.use('/admin/events', adminEventsRoutes);
router.use('/users/auth', authRoutes);

module.exports = router;
