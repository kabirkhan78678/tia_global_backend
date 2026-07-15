console.log("EVENT ROUTE REGISTERED");
const express = require('express');

const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getFilteredEvents,
} = require('./admin.events.controller');

const {
  verifyAdminToken,
} = require('../../../middlewares/admin.middleware');

const router = express.Router();

// Public filter endpoint for event listings without admin token
router.get('/filter', getFilteredEvents);

router.use(verifyAdminToken);

router.post('/', createEvent);

router.get('/', getEvents);

router.get('/:id', getEventById);

router.patch('/:id', updateEvent);

router.delete('/:id', deleteEvent);

module.exports = router;