const AssignmentModel = require('./assignment.model');
const ApiError = require('../../utils/apiError');

const ALLOWED_GRADES = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
];

const validateGradeLevel = (gradeLevel) => {
  if (!gradeLevel || !ALLOWED_GRADES.includes(gradeLevel)) {
    throw new ApiError(
      400,
      `grade_level must be one of: ${ALLOWED_GRADES.join(', ')}`
    );
  }
};

/**
 * Teacher creates assignment
 */
exports.createAssignment = async (teacherId, data, file) => {
  const { title, description, grade_level, subject, due_date, total_points } = data;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Assignment title is required');
  }

  validateGradeLevel(grade_level);

  let attachment_url = null;
  if (file) {
    attachment_url = `/uploads/assignments/${file.filename}`;
  }

  const parsedTotalPoints = total_points ? parseInt(total_points, 10) : 100;
  if (isNaN(parsedTotalPoints) || parsedTotalPoints <= 0) {
    throw new ApiError(400, 'total_points must be a positive integer');
  }

  const assignmentId = await AssignmentModel.createAssignment({
    teacher_id: teacherId,
    title: title.trim(),
    description: description ? description.trim() : null,
    grade_level,
    subject: subject ? subject.trim() : null,
    due_date: due_date ? new Date(due_date) : null,
    total_points: parsedTotalPoints,
    attachment_url,
  });

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

  if (file) {
    updatePayload.attachment_url = `/uploads/assignments/${file.filename}`;
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
 * Teacher fetches their assignments
 */
exports.getTeacherAssignments = async (teacherId, gradeLevel = null) => {
  if (gradeLevel) {
    validateGradeLevel(gradeLevel);
  }

  return await AssignmentModel.findAssignmentsByTeacher(teacherId, gradeLevel);
};

/**
 * Get assignment detail by ID
 */
exports.getAssignmentById = async (assignmentId, user) => {
  const assignment = await AssignmentModel.findAssignmentById(assignmentId);

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  // Add specific submission/grade detail based on user role
  let submissionDetails = null;

  if (user.role === 'student') {
    submissionDetails = await AssignmentModel.findSingleSubmission(assignmentId, user.id);
  }

  return {
    ...assignment,
    my_submission: submissionDetails,
  };
};

/**
 * Student fetches assignments for their grade level
 */
exports.getStudentAssignments = async (studentId) => {
  const student = await AssignmentModel.findStudentById(studentId);

  if (!student) {
    throw new ApiError(404, 'Student account not found');
  }

  if (!student.grade_level) {
    throw new ApiError(400, 'Student has no grade_level assigned');
  }

  const assignments = await AssignmentModel.findAssignmentsForStudent(student.grade_level, studentId);

  return {
    student_id: student.id,
    student_name: `${student.first_name} ${student.last_name}`,
    grade_level: student.grade_level,
    assignments,
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
 * Parent fetches assignments & grades for their child/children
 */
exports.getParentAssignments = async (parentId, requestedStudentId = null) => {
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
    childrenData.push({
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      grade_level: student.grade_level,
      academy: student.academy,
      profile_image: student.profile_image,
      assignments,
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

  return await AssignmentModel.findSingleSubmission(assignmentId, student.id);
};

/**
 * Teacher views all submissions for an assignment
 */
exports.getAssignmentSubmissions = async (assignmentId, teacherId) => {
  const assignment = await AssignmentModel.findAssignmentById(assignmentId);

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  if (assignment.teacher_id !== teacherId) {
    throw new ApiError(403, 'You can only view submissions for assignments created by you');
  }

  const submissions = await AssignmentModel.findSubmissionsByAssignment(assignmentId);

  return {
    assignment,
    submissions,
  };
};
