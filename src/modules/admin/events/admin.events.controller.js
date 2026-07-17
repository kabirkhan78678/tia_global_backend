const adminEventsService = require('./admin.events.service');

const createEvent = async (req, res, next) => {
  console.log(req.body);
  try {
    const data = await adminEventsService.createEvent({
      title: req.body.title,
      description: req.body.description,
      eventDate: req.body.eventDate,
      eventTime: req.body.eventTime,
      categories: req.body.categories,
      grades: req.body.grades,
    });

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const data = await adminEventsService.getEvents();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const data = await adminEventsService.getEventById(
      Number(req.params.id)
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const data = await adminEventsService.updateEvent({
      eventId: Number(req.params.id),
      title: req.body.title,
      description: req.body.description,
      eventDate: req.body.eventDate,
      eventTime: req.body.eventTime,
      categories: req.body.categories,
      grades: req.body.grades,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const data = await adminEventsService.deleteEvent(
      Number(req.params.id)
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

// Naya function - Filter events
const getFilteredEvents = async (req, res, next) => {
  try {
    const { category, grade } = req.query;
    
    const data = await adminEventsService.getFilteredEvents({
      categories: category,
      grade,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getFilteredEvents,
};