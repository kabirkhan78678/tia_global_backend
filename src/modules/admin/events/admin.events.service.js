const ApiError = require('../../../utils/apiError');
const AdminEventsModel = require('./admin.events.model');

const ALLOWED_CATEGORIES = ['ALL', 'TEACHER', 'STUDENT', 'PARENT'];

const ALLOWED_GRADES = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
];

const formatEvent = (event, grades = []) => ({
  id: event.id,
  title: event.title,
  description: event.description,
  eventDate: event.event_date,
  eventTime: event.event_time,
  category: event.category,
  grades,
  createdAt: event.created_at,
  updatedAt: event.updated_at,
});

const createEvent = async ({
  title,
  description,
  eventDate,
  eventTime,
  category,
  grades,
}) => {
  if (!title?.trim()) {
    throw new ApiError(400, 'Title is required');
  }

  if (!eventDate) {
    throw new ApiError(400, 'Event date is required');
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new ApiError(
      400,
      `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
    );
  }

  if (category === 'STUDENT') {
    if (!Array.isArray(grades) || grades.length === 0) {
      throw new ApiError(
        400,
        'Please select at least one student grade'
      );
    }

    for (const grade of grades) {
      if (!ALLOWED_GRADES.includes(grade)) {
        throw new ApiError(400, `Invalid grade : ${grade}`);
      }
    }
  }

  const eventId = await AdminEventsModel.createEvent({
    title: title.trim(),
    description: description?.trim(),
    eventDate,
    eventTime,
    category,
  });

  if (category === 'STUDENT') {
    for (const grade of grades) {
      await AdminEventsModel.addStudentGrade({
        eventId,
        grade,
      });
    }
  }

  return {
    message: 'Event created successfully',
    eventId,
  };
};

const getEvents = async () => {
  const events = await AdminEventsModel.getAllEvents();

  const response = [];

  for (const event of events) {
    const grades =
      event.category === 'STUDENT'
        ? await AdminEventsModel.findGradesByEventId(event.id)
        : [];

    response.push(
      formatEvent(
        event,
        grades.map((g) => g.grade)
      )
    );
  }

  return {
    events: response,
  };
};

const getEventById = async (eventId) => {
  const event = await AdminEventsModel.findEventById(eventId);

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  const grades =
    event.category === 'STUDENT'
      ? await AdminEventsModel.findGradesByEventId(event.id)
      : [];

  return formatEvent(
    event,
    grades.map((g) => g.grade)
  );
};

const updateEvent = async ({
  eventId,
  title,
  description,
  eventDate,
  eventTime,
  category,
  grades,
}) => {
  const event = await AdminEventsModel.findEventById(eventId);

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new ApiError(
      400,
      `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
    );
  }

  await AdminEventsModel.updateEvent({
    eventId,
    title: title.trim(),
    description: description?.trim(),
    eventDate,
    eventTime,
    category,
  });

  await AdminEventsModel.deleteStudentGrades(eventId);

  if (category === 'STUDENT') {
    if (!Array.isArray(grades) || grades.length === 0) {
      throw new ApiError(
        400,
        'Please select at least one student grade'
      );
    }

    for (const grade of grades) {
      if (!ALLOWED_GRADES.includes(grade)) {
        throw new ApiError(400, `Invalid grade : ${grade}`);
      }

      await AdminEventsModel.addStudentGrade({
        eventId,
        grade,
      });
    }
  }

  return {
    message: 'Event updated successfully',
  };
};

const deleteEvent = async (eventId) => {
  const event = await AdminEventsModel.findEventById(eventId);

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  await AdminEventsModel.softDeleteEvent(eventId);

  return {
    message: 'Event deleted successfully',
  };
};


// Naya function - Filter events service
const getFilteredEvents = async ({ category, grade }) => {
  // Validate category if provided
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    throw new ApiError(
      400,
      `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
    );
  }

  // Validate grade if provided
  if (grade && !ALLOWED_GRADES.includes(grade)) {
    throw new ApiError(
      400,
      `grade must be one of: ${ALLOWED_GRADES.join(', ')}`
    );
  }

  const events = await AdminEventsModel.getFilteredEvents({ category, grade });

  const response = [];

  for (const event of events) {
    const grades =
      event.category === 'STUDENT'
        ? await AdminEventsModel.findGradesByEventId(event.id)
        : [];

    response.push(
      formatEvent(
        event,
        grades.map((g) => g.grade)
      )
    );
  }

  return {
    events: response,
    filters: {
      category: category || null,
      grade: grade || null,
    },
    total: response.length,
  };
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getFilteredEvents,
};