const AssignmentModel = require('./assignment.model');
const ApiError = require('../../utils/apiError');
const NotificationService = require('../notifications/notification.service');

const ALLOWED_GRADES = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
];

const normalizeGradeLevel = (grade) => {
  if (!grade) return null;
  const match = grade.trim().match(/^Grade\s+(\d+)$/i);
  if (match) {
    const num = match[1];
    let suffix = 'th';
    if (num === '1') suffix = 'st';
    else if (num === '2') suffix = 'nd';
    else if (num === '3') suffix = 'rd';
    return `${num}${suffix} Grade`;
  }
  return grade.trim();
};

const validateGradeLevel = (gradeLevel) => {
  if (!gradeLevel || !ALLOWED_GRADES.includes(gradeLevel)) {
    throw new ApiError(
      400,
      `grade_level must be one of: ${ALLOWED_GRADES.join(', ')}`
    );
  }
};

const getCalculatedStatus = (submissionStatus, dueDate) => {
  const isCompleted = submissionStatus === 'submitted' || submissionStatus === 'graded';
  if (isCompleted) {
    return 'completed';
  }
  const now = new Date();
  const isOverdue = dueDate && now > new Date(dueDate);
  if (isOverdue) {
    return 'overdue';
  }
  if (submissionStatus === 'pending') {
    return 'in progress';
  }
  return 'not started';
};

/**
 * Teacher creates assignment
 */
exports.createAssignment = async (teacherId, data, file) => {
  const {
    title,
    description,
    grade_level,
    subject,
    due_date,
    total_points,
    book_title,
    required_reading,
    reading_instructions,
    enable_islamic_alert,
    islamic_alert_description,
    target_grade,
  } = data;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Assignment title is required');
  }

  validateGradeLevel(grade_level);

  let attachment_url = null;
  let book_cover_url = null;
  if (file) {
    attachment_url = `/uploads/assignments/${file.filename}`;
    book_cover_url = `/uploads/assignments/${file.filename}`;
  }

  const parsedTotalPoints = total_points ? parseInt(total_points, 10) : 100;
  if (isNaN(parsedTotalPoints) || parsedTotalPoints <= 0) {
    throw new ApiError(400, 'total_points must be a positive integer');
  }

  const isIslamicAlertEnabled = enable_islamic_alert === true || enable_islamic_alert === 'true' || enable_islamic_alert == 1 ? 1 : 0;

  const assignmentId = await AssignmentModel.createAssignment({
    teacher_id: teacherId,
    title: title.trim(),
    description: description ? description.trim() : null,
    grade_level,
    subject: subject ? subject.trim() : null,
    due_date: due_date ? new Date(due_date) : null,
    total_points: parsedTotalPoints,
    attachment_url,
    book_title: book_title ? book_title.trim() : null,
    required_reading: required_reading ? required_reading.trim() : null,
    reading_instructions: reading_instructions ? reading_instructions.trim() : null,
    enable_islamic_alert: isIslamicAlertEnabled,
    islamic_alert_description: islamic_alert_description ? islamic_alert_description.trim() : null,
    book_cover_url,
    target_grade: target_grade ? target_grade.trim() : null,
  });

  // Notify all students in this grade level and their parents
  try {
    const formattedDue = due_date ? new Date(due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
    NotificationService.notifyGradeStudentsAndParents(grade_level, {
      title: `New Assignment: ${title.trim()}`,
      body: `A new ${subject ? `${subject} ` : ''}assignment "${title.trim()}" has been assigned${formattedDue ? ` (Due: ${formattedDue})` : ''}.`,
      type: 'assignment',
      dataPayload: {
        assignmentId: String(assignmentId),
        gradeLevel: String(grade_level),
      },
    }).catch((err) => console.error('[ASSIGNMENT_CREATE_NOTIF_ERROR]:', err.message));
  } catch (err) {
    console.error('[ASSIGNMENT_CREATE_NOTIF_ERROR]:', err.message);
  }

  return await AssignmentModel.findAssignmentById(assignmentId);
};

/**
 * Teacher updates assignment
 */
exports.updateAssignment = async (assignmentId, teacherId, data, file) => {
  const existing = await AssignmentModel.findAssignmentById(assignmentId);

  if (!existing) {
    throw new ApiError(404, 'Assignment not found');
  }

  if (existing.teacher_id !== teacherId) {
    throw new ApiError(403, 'You can only update assignments created by you');
  }

  const updatePayload = {};

  if (data.title !== undefined) {
    if (!data.title.trim()) throw new ApiError(400, 'Title cannot be empty');
    updatePayload.title = data.title.trim();
  }

  if (data.description !== undefined) {
    updatePayload.description = data.description ? data.description.trim() : null;
  }

  if (data.grade_level !== undefined) {
    validateGradeLevel(data.grade_level);
    updatePayload.grade_level = data.grade_level;
  }

  if (data.subject !== undefined) {
    updatePayload.subject = data.subject ? data.subject.trim() : null;
  }

  if (data.due_date !== undefined) {
    updatePayload.due_date = data.due_date ? new Date(data.due_date) : null;
  }

  if (data.total_points !== undefined) {
    const points = parseInt(data.total_points, 10);
    if (isNaN(points) || points <= 0) {
      throw new ApiError(400, 'total_points must be a positive integer');
    }
    updatePayload.total_points = points;
  }

  if (data.book_title !== undefined) {
    updatePayload.book_title = data.book_title ? data.book_title.trim() : null;
  }

  if (data.required_reading !== undefined) {
    updatePayload.required_reading = data.required_reading ? data.required_reading.trim() : null;
  }

  if (data.reading_instructions !== undefined) {
    updatePayload.reading_instructions = data.reading_instructions ? data.reading_instructions.trim() : null;
  }

  if (data.enable_islamic_alert !== undefined) {
    updatePayload.enable_islamic_alert = data.enable_islamic_alert === true || data.enable_islamic_alert === 'true' || data.enable_islamic_alert == 1 ? 1 : 0;
  }

  if (data.islamic_alert_description !== undefined) {
    updatePayload.islamic_alert_description = data.islamic_alert_description ? data.islamic_alert_description.trim() : null;
  }

  if (data.target_grade !== undefined) {
    updatePayload.target_grade = data.target_grade ? data.target_grade.trim() : null;
  }

  if (file) {
    updatePayload.attachment_url = `/uploads/assignments/${file.filename}`;
    updatePayload.book_cover_url = `/uploads/assignments/${file.filename}`;
  }

  await AssignmentModel.updateAssignment(assignmentId, teacherId, updatePayload);

  return await AssignmentModel.findAssignmentById(assignmentId);
};

/**
 * Teacher deletes assignment
 */
exports.deleteAssignment = async (assignmentId, teacherId) => {
  const existing = await AssignmentModel.findAssignmentById(assignmentId);

  if (!existing) {
    throw new ApiError(404, 'Assignment not found');
  }

  if (existing.teacher_id !== teacherId) {
    throw new ApiError(403, 'You can only delete assignments created by you');
  }

  await AssignmentModel.deleteAssignment(assignmentId, teacherId);
  return { message: 'Assignment deleted successfully' };
};

/**
 * Teacher fetches their assignments with pagination, optional grade filtering, and search query
 */
exports.getTeacherAssignments = async (teacherId, gradeLevel = null, page = 1, limit = 10, search = null) => {
  let normalizedGrade = null;
  if (gradeLevel) {
    normalizedGrade = normalizeGradeLevel(gradeLevel);
    validateGradeLevel(normalizedGrade);
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const offset = (pageNum - 1) * limitNum;

  const { rows, total } = await AssignmentModel.findAssignmentsByTeacherPaginated(
    teacherId,
    normalizedGrade,
    limitNum,
    offset,
    search
  );

  return {
    assignments: rows,
    pagination: {
      total_items: total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    }
  };
};

/**
 * Get assignment detail by ID
 */
exports.getAssignmentById = async (assignmentId, user, queryParams = {}) => {
  const assignment = await AssignmentModel.findAssignmentById(assignmentId);

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  // Add specific submission/grade detail based on user role
  let submissionDetails = null;

  if (user.role === 'student') {
    submissionDetails = await AssignmentModel.findSingleSubmission(assignmentId, user.id);
    if (!submissionDetails) {
      // Auto-initialize submission record to 'pending' to mark as 'in progress'
      await AssignmentModel.upsertSubmission({
        assignment_id: assignmentId,
        student_id: user.id,
        submission_text: null,
        attachment_url: null,
        status: 'pending',
      });
      submissionDetails = await AssignmentModel.findSingleSubmission(assignmentId, user.id);
    }
  } else if (user.role === 'parent' && queryParams.student_id) {
    const studentId = parseInt(queryParams.student_id, 10);
    const isLinked = await AssignmentModel.isStudentBelongsToParent(user.id, studentId);
    if (isLinked) {
      submissionDetails = await AssignmentModel.findSingleSubmission(assignmentId, studentId);
    }
  }

  const subStatus = submissionDetails ? submissionDetails.status : null;
  const calculatedStatus = getCalculatedStatus(subStatus, assignment.due_date);

  return {
    ...assignment,
    status: calculatedStatus,
    my_submission: submissionDetails,
  };
};

/**
 * Student fetches assignments for their grade level with optional status filtering
 */
exports.getStudentAssignments = async (studentId, status = null) => {
  const student = await AssignmentModel.findStudentById(studentId);

  if (!student) {
    throw new ApiError(404, 'Student account not found');
  }

  if (!student.grade_level) {
    throw new ApiError(400, 'Student has no grade_level assigned');
  }

  const assignments = await AssignmentModel.findAssignmentsForStudent(student.grade_level, studentId);

  let formattedAssignments = assignments.map(a => {
    const calculatedStatus = getCalculatedStatus(a.submission_status, a.due_date);
    return {
      ...a,
      status: calculatedStatus,
    };
  });

  if (status && status.trim() !== '') {
    const targetStatus = status.trim().toLowerCase();
    formattedAssignments = formattedAssignments.filter(a => a.status === targetStatus);
  }

  return {
    student_id: student.id,
    student_name: `${student.first_name} ${student.last_name}`,
    grade_level: student.grade_level,
    assignments: formattedAssignments,
  };
};

/**
 * Student submits work for assignment
 */
exports.submitAssignment = async (assignmentId, studentId, body, file) => {
  const assignment = await AssignmentModel.findAssignmentById(assignmentId);

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  const student = await AssignmentModel.findStudentById(studentId);
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  if (assignment.grade_level !== student.grade_level) {
    throw new ApiError(403, 'This assignment is not for your grade level');
  }

  let attachment_url = null;
  if (file) {
    attachment_url = `/uploads/assignments/${file.filename}`;
  }

  if (!body.submission_text && !attachment_url) {
    throw new ApiError(400, 'Please provide submission text or attach a file');
  }

  await AssignmentModel.upsertSubmission({
    assignment_id: assignmentId,
    student_id: studentId,
    submission_text: body.submission_text ? body.submission_text.trim() : null,
    attachment_url,
  });

  return await AssignmentModel.findSingleSubmission(assignmentId, studentId);
};

/**
 * Parent fetches assignments & grades for their child/children with optional status filtering
 */
exports.getParentAssignments = async (parentId, requestedStudentId = null, status = null) => {
  const linkedStudents = await AssignmentModel.findParentLinkedStudents(parentId);

  if (!linkedStudents || linkedStudents.length === 0) {
    return { children: [] };
  }

  let targetStudents = linkedStudents;

  if (requestedStudentId) {
    const parsedStudentId = parseInt(requestedStudentId, 10);
    const isLinked = await AssignmentModel.isStudentBelongsToParent(parentId, parsedStudentId);

    if (!isLinked) {
      throw new ApiError(403, 'Requested student is not linked to your parent account');
    }

    targetStudents = linkedStudents.filter((s) => s.id === parsedStudentId);
  }

  const childrenData = [];

  for (const student of targetStudents) {
    const assignments = await AssignmentModel.findAssignmentsForStudent(student.grade_level, student.id);
    
    let formattedAssignments = assignments.map(a => {
      const calculatedStatus = getCalculatedStatus(a.submission_status, a.due_date);
      return {
        ...a,
        status: calculatedStatus,
      };
    });

    if (status && status.trim() !== '') {
      const targetStatus = status.trim().toLowerCase();
      formattedAssignments = formattedAssignments.filter(a => a.status === targetStatus);
    }

    childrenData.push({
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      grade_level: student.grade_level,
      academy: student.academy,
      profile_image: student.profile_image,
      assignments: formattedAssignments,
    });
  }

  return { children: childrenData };
};

/**
 * Teacher grades student assignment
 */
exports.gradeAssignment = async (assignmentId, teacherId, body) => {
  const { student_id, marks_obtained, grade, feedback } = body;

  if (!student_id) {
    throw new ApiError(400, 'student_id is required');
  }

  const assignment = await AssignmentModel.findAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  if (assignment.teacher_id !== teacherId) {
    throw new ApiError(403, 'You can only grade assignments created by you');
  }

  const student = await AssignmentModel.findStudentById(student_id);
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  let parsedMarks = null;
  if (marks_obtained !== undefined && marks_obtained !== null && marks_obtained !== '') {
    parsedMarks = parseFloat(marks_obtained);
    if (isNaN(parsedMarks) || parsedMarks < 0) {
      throw new ApiError(400, 'marks_obtained must be a non-negative number');
    }
    if (parsedMarks > assignment.total_points) {
      throw new ApiError(
        400,
        `marks_obtained (${parsedMarks}) cannot exceed total_points (${assignment.total_points})`
      );
    }
  }

  await AssignmentModel.upsertGrade({
    assignment_id: assignmentId,
    student_id: student.id,
    marks_obtained: parsedMarks,
    grade: grade ? grade.trim() : null,
    feedback: feedback ? feedback.trim() : null,
    graded_by: teacherId,
  });

  // Notify student and linked parent
  try {
    const scoreText = parsedMarks !== null ? ` Score: ${parsedMarks}/${assignment.total_points}` : '';
    const gradeText = grade ? ` (Grade: ${grade})` : '';
    NotificationService.notifyUser({
      recipientId: student.id,
      recipientRole: 'student',
      title: `Assignment Graded: ${assignment.title}`,
      body: `Your assignment "${assignment.title}" has been graded.${scoreText}${gradeText}`,
      type: 'assignment',
      dataPayload: {
        assignmentId: String(assignmentId),
        studentId: String(student.id),
      },
    }).catch((err) => console.error('[GRADE_STUDENT_NOTIF_ERR]:', err.message));
  } catch (err) {
    console.error('[GRADE_NOTIF_ERROR]:', err.message);
  }

  return await AssignmentModel.findSingleSubmission(assignmentId, student.id);
};

/**
 * Teacher views all submissions for an assignment with optional status and search filtering
 */
exports.getAssignmentSubmissions = async (assignmentId, teacherId, status = null, search = null) => {
  const assignment = await AssignmentModel.findAssignmentById(assignmentId);

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  if (assignment.teacher_id !== teacherId) {
    throw new ApiError(403, 'You can only view submissions for assignments created by you');
  }

  let submissions = await AssignmentModel.findSubmissionsByAssignment(assignmentId);

  // Status Filter
  if (status && status.trim() !== '') {
    const targetStatus = status.trim().toLowerCase();
    submissions = submissions.filter(sub => {
      const subStatus = (sub.status || 'pending').toLowerCase();
      // Map potential status values:
      // pending -> pending
      // submitted / completed / approved -> submitted
      // graded / reviewed / reject -> graded
      if (targetStatus === 'pending') {
        return subStatus === 'pending';
      }
      if (targetStatus === 'submitted' || targetStatus === 'completed' || targetStatus === 'approved') {
        return subStatus === 'submitted';
      }
      if (targetStatus === 'graded' || targetStatus === 'reviewed' || targetStatus === 'reject') {
        return subStatus === 'graded';
      }
      return subStatus === targetStatus;
    });
  }

  // Search Filter
  if (search && search.trim() !== '') {
    const searchLower = search.trim().toLowerCase();
    submissions = submissions.filter(sub => {
      const firstName = (sub.student_first_name || '').toLowerCase();
      const lastName = (sub.student_last_name || '').toLowerCase();
      const email = (sub.student_email || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      return firstName.includes(searchLower) || lastName.includes(searchLower) || fullName.includes(searchLower) || email.includes(searchLower);
    });
  }

  return {
    assignment,
    submissions,
  };
};

/**
 * Student updates assignment progress status to either 'continue reading' or 'mark as completed'
 */
exports.updateStudentAssignmentStatus = async (assignmentId, studentId, status) => {
  const assignment = await AssignmentModel.findAssignmentById(assignmentId);

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  const student = await AssignmentModel.findStudentById(studentId);
  if (!student) {
    throw new ApiError(404, 'Student account not found');
  }

  if (assignment.grade_level !== student.grade_level) {
    throw new ApiError(403, 'This assignment is not for your grade level');
  }

  if (!status || status.trim() === '') {
    throw new ApiError(400, 'Status value is required');
  }

  const normalizedStatus = status.trim().toLowerCase();
  let dbStatus = null;

  if (normalizedStatus === 'continue reading') {
    dbStatus = 'pending';
  } else if (normalizedStatus === 'mark as completed') {
    dbStatus = 'submitted';
  } else {
    throw new ApiError(400, "Invalid status. Allowed values are: 'continue reading', 'mark as completed'");
  }

  // Check if there is already a graded submission (we shouldn't allow changing it if it's graded)
  const existingSubmission = await AssignmentModel.findSingleSubmission(assignmentId, studentId);
  if (existingSubmission && existingSubmission.status === 'graded') {
    throw new ApiError(400, 'Cannot change status of a graded assignment');
  }

  await AssignmentModel.upsertSubmission({
    assignment_id: assignmentId,
    student_id: studentId,
    submission_text: existingSubmission ? existingSubmission.submission_text : null,
    attachment_url: existingSubmission ? existingSubmission.attachment_url : null,
    status: dbStatus,
  });

  // If student marked as completed, notify teacher
  if (dbStatus === 'submitted') {
    try {
      NotificationService.notifyUser({
        recipientId: assignment.teacher_id,
        recipientRole: 'teacher',
        title: `Assignment Submitted: ${assignment.title}`,
        body: `${student.first_name} ${student.last_name} marked assignment "${assignment.title}" as completed.`,
        type: 'assignment',
        dataPayload: {
          assignmentId: String(assignmentId),
          studentId: String(studentId),
        },
      }).catch((err) => console.error('[SUBMIT_TEACHER_NOTIF_ERR]:', err.message));
    } catch (err) {
      console.error('[SUBMIT_TEACHER_NOTIF_ERROR]:', err.message);
    }
  }

  return await AssignmentModel.findSingleSubmission(assignmentId, studentId);
};
