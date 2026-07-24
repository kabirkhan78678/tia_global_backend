const UserEventsModel = require('./user.events.model');
const AdminEventsModel = require('../admin/events/admin.events.model');

const formatEvent = (event, grades = []) => ({
  id: event.id,
  title: event.title,
  description: event.description,
  eventDate: event.event_date,
  eventTime: event.event_time,
  categories: event.categories
    ? event.categories.split(',').map((c) => c.trim())
    : [],
  grades,
  createdAt: event.created_at,
  updatedAt: event.updated_at,
});

/**
 * Fetch events for Parent role
 */
exports.getParentEvents = async (parentId) => {
  // Resolve parent's children's grades
  const childrenGrades = await UserEventsModel.getParentChildrenGrades(parentId);

  // Return events matching 'PARENT' category or children's grades
  const events = await UserEventsModel.getEventsForCategoriesAndGrades({
    categories: ['PARENT'],
    grades: childrenGrades,
  });

  const response = [];
  for (const event of events) {
    const grades = await AdminEventsModel.findGradesByEventId(event.id);
    response.push(
      formatEvent(
        event,
        grades.map((g) => g.grade)
      )
    );
  }
  return response;
};

/**
 * Fetch events for Teacher role
 */
exports.getTeacherEvents = async (teacherId) => {
  // Resolve teacher's teaching grade
  const teachingGrade = await UserEventsModel.getTeacherTeachingGrade(teacherId);

  // Return events matching 'TEACHER' category or teacher's teaching grade
  const gradesFilter = teachingGrade ? [teachingGrade] : [];
  const events = await UserEventsModel.getEventsForCategoriesAndGrades({
    categories: ['TEACHER'],
    grades: gradesFilter,
  });

  const response = [];
  for (const event of events) {
    const grades = await AdminEventsModel.findGradesByEventId(event.id);
    response.push(
      formatEvent(
        event,
        grades.map((g) => g.grade)
      )
    );
  }
  return response;
};

/**
 * Fetch events for Student role
 */
exports.getStudentEvents = async (studentId) => {
  // Resolve student's grade level
  const gradeLevel = await UserEventsModel.getStudentGradeLevel(studentId);

  // Return events matching 'STUDENT' category and matching grade
  const gradesFilter = gradeLevel ? [gradeLevel] : [];
  const events = await UserEventsModel.getEventsForCategoriesAndGrades({
    categories: ['STUDENT'],
    grades: gradesFilter,
  });

  const response = [];
  for (const event of events) {
    const grades = await AdminEventsModel.findGradesByEventId(event.id);
    response.push(
      formatEvent(
        event,
        grades.map((g) => g.grade)
      )
    );
  }
  return response;
};
