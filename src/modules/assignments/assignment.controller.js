const AssignmentService = require('./assignment.service');

exports.createAssignment = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const assignment = await AssignmentService.createAssignment(
      teacherId,
      req.body,
      req.file
    );

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment,
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const assignment = await AssignmentService.updateAssignment(
      id,
      teacherId,
      req.body,
      req.file
    );

    return res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment,
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const result = await AssignmentService.deleteAssignment(id, teacherId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getTeacherAssignments = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { grade_level } = req.query;
    const assignments = await AssignmentService.getTeacherAssignments(
      teacherId,
      grade_level
    );

    return res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await AssignmentService.getAssignmentById(id, req.user);

    return res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getStudentAssignments = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const result = await AssignmentService.getStudentAssignments(studentId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

exports.submitAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;
    const submission = await AssignmentService.submitAssignment(
      id,
      studentId,
      req.body,
      req.file
    );

    return res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully',
      data: submission,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getParentAssignments = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { studentId } = req.query;
    const result = await AssignmentService.getParentAssignments(parentId, studentId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

exports.gradeAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const submission = await AssignmentService.gradeAssignment(
      id,
      teacherId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: 'Grade saved successfully',
      data: submission,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAssignmentSubmissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const data = await AssignmentService.getAssignmentSubmissions(id, teacherId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};
