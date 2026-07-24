const DashboardModel = require('./dashboard.model');
const AdminEventsModel = require('../admin/events/admin.events.model');
const ApiError = require('../../utils/apiError');

/**
 * Format raw dashboard events to match standard admin event structure with categories & grades
 */
const formatDashboardEvents = async (rawEvents) => {
  const formatted = [];
  for (const event of rawEvents) {
    const grades = await AdminEventsModel.findGradesByEventId(event.id);

    formatted.push({
      id: event.id,
      title: event.title,
      description: event.description,
      eventDate: event.event_date,
      eventTime: event.event_time,
      categories: event.categories
        ? event.categories.split(',').map((c) => c.trim())
        : [],
      grades: grades.map((g) => g.grade),
      createdAt: event.created_at,
    });
  }
  return formatted;
};

/**
 * Get Parent Dashboard Data
 */
exports.getParentDashboard = async (parentId) => {
  const children = await DashboardModel.getParentLinkedChildren(parentId);

  let totalAssignments = 0;
  let completedAssignments = 0;
  let pendingAssignments = 0;
  let recentAssignments = [];
  let weeklyProgress = { scale_max: 500, current_score: 0, daily_breakdown: [] };
  let primaryStudentGrade = null;

  if (children && children.length > 0) {
    const firstChild = children[0];
    primaryStudentGrade = firstChild.grade_level;

    // Aggregate statistics across linked children
    for (const child of children) {
      if (child.grade_level) {
        const stats = await DashboardModel.getStudentAssignmentStats(child.id, child.grade_level);
        totalAssignments += stats.total_assignments;
        completedAssignments += stats.completed_assignments;
        pendingAssignments += stats.pending_assignments;

        const recents = await DashboardModel.getStudentRecentAssignments(child.id, child.grade_level, 5);
        recentAssignments.push(
          ...recents.map((r) => ({
            student_id: child.id,
            student_name: `${child.first_name} ${child.last_name}`,
            ...r,
          }))
        );
      }
    }

    // Get weekly progress for primary child
    weeklyProgress = await DashboardModel.getStudentWeeklyProgress(firstChild.id, firstChild.grade_level);
  }

  // Get upcoming events for PARENT or linked child's grade
  const upcomingEventsRaw = await DashboardModel.getUpcomingEvents('PARENT', primaryStudentGrade, 5);
  const upcomingEvents = await formatDashboardEvents(upcomingEventsRaw);

  return {
    weekly_progress: weeklyProgress,
    stats: {
      outstanding_balance: "$0.00",
      total_assignments: totalAssignments,
      completed_assignments: completedAssignments,
      pending_assignments: pendingAssignments,
    },
    recent_assignments: recentAssignments.slice(0, 5),
    upcoming_events: upcomingEvents,
    linked_children: children.map((c) => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      grade_level: c.grade_level,
      profile_image: c.profile_image,
    })),
  };
};

/**
 * Get Student Dashboard Data
 */
exports.getStudentDashboard = async (studentId) => {
  const student = await DashboardModel.getStudentById(studentId);

  if (!student) {
    throw new ApiError(404, 'Student account not found');
  }

  if (!student.grade_level) {
    throw new ApiError(400, 'Student has no grade_level assigned');
  }

  const weeklyProgress = await DashboardModel.getStudentWeeklyProgress(student.id, student.grade_level);
  const stats = await DashboardModel.getStudentAssignmentStats(student.id, student.grade_level);
  const recentAssignments = await DashboardModel.getStudentRecentAssignments(student.id, student.grade_level, 5);
  
  const upcomingEventsRaw = await DashboardModel.getUpcomingEvents('STUDENT', student.grade_level, 5);
  const upcomingEvents = await formatDashboardEvents(upcomingEventsRaw);

  return {
    student_info: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      grade_level: student.grade_level,
      academy: student.academy,
      profile_image: student.profile_image,
    },
    weekly_progress: weeklyProgress,
    stats,
    recent_assignments: recentAssignments,
    upcoming_events: upcomingEvents,
  };
};

/**
 * Get Teacher Dashboard Data
 */
exports.getTeacherDashboard = async (teacherId) => {
  const stats = await DashboardModel.getTeacherDashboardStats(teacherId);
  const recentAssignments = await DashboardModel.getTeacherRecentAssignments(teacherId, 5);
  
  const upcomingEventsRaw = await DashboardModel.getUpcomingEvents('TEACHER', null, 5);
  const upcomingEvents = await formatDashboardEvents(upcomingEventsRaw);

  return {
    stats: {
      teaching_grade: stats.teaching_grade,
      total_students: stats.total_students,
      total_assignments: stats.total_assignments,
      pending_gradings: stats.pending_gradings,
      completed_gradings: stats.completed_gradings,
    },
    recent_assignments: recentAssignments,
    upcoming_events: upcomingEvents,
  };
};
