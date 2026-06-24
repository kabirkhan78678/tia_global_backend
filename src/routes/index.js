const router = require('express').Router();

const authRoutes = require('../modules/users/auth/auth.routes');

router.use('/users/auth', authRoutes);

module.exports = router;
