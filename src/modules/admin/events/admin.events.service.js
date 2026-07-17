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
  categories: event.categories
  ? event.categories.split(',')
  : [],
  grades,
  createdAt: event.created_at,
  updatedAt: event.updated_at,
});

const createEvent = async ({

  title,
  description,
  eventDate,
  eventTime,
  categories,
  grades,
}) => {
  console.log("categories in service:", categories);
  if (!title?.trim()) {
    throw new ApiError(400, 'Title is required');
  }

  if (!eventDate) {
    throw new ApiError(400, 'Event date is required');
  }

if (!Array.isArray(categories) || categories.length === 0) {
  throw new ApiError(400, "Please select at least one categories");
}

const invalidCategories = categories.filter(
  (c) => !ALLOWED_CATEGORIES.includes(c)
);

  if (invalidCategories.length) {
    throw new ApiError(
      400,
      `Invalid categories: ${invalidCategories.join(", ")}`
    );
  }

  if (categories.includes("STUDENT")) {
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
    categories,
  });

if (categories.includes('STUDENT')) {
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
      event.categories?.split(',').includes('STUDENT')
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
    event.categories?.split(',').includes('STUDENT')
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
  categories,
  grades,
}) => {
  const event = await AdminEventsModel.findEventById(eventId);

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (
    categories &&
    (!Array.isArray(categories) ||
      categories.some(c => !ALLOWED_CATEGORIES.includes(c)))
  ) {
    throw new ApiError(400, 'Invalid categories');
  }

  await AdminEventsModel.updateEvent({
    eventId,
    title: title.trim(),
    description: description?.trim(),
    eventDate,
    eventTime,
    categories,
  });

  await AdminEventsModel.deleteStudentGrades(eventId);

  if (categories.includes('STUDENT')) {
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
const getFilteredEvents = async ({ categories, grade }) => {
  const events = await AdminEventsModel.getFilteredEvents({ categories, grade });

  const response = [];

  for (const event of events) {
    const grades =
      event.categories?.split(',').includes('STUDENT')
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
      categories: categories || null,
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