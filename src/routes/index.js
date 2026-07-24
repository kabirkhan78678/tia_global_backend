const router = require('express').Router();

const adminEventsRoutes = require('../modules/admin/events/admin.events.routes');
const adminAuthRoutes = require('../modules/admin/auth/admin.auth.routes');
const adminUsersRoutes = require('../modules/admin/users/admin.users.routes');
const authRoutes = require('../modules/users/auth/auth.routes');
const assignmentRoutes = require('../modules/assignments/assignment.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const paymentRoutes = require('../modules/payment/payment.routes');
const userEventsRoutes = require('../modules/events/user.events.routes');

router.use('/admin/auth', adminAuthRoutes);
router.use('/admin', adminUsersRoutes);
router.use('/admin/events', adminEventsRoutes);
router.use('/users/auth', authRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/payment', paymentRoutes);
router.use('/events', userEventsRoutes);

module.exports = router;




