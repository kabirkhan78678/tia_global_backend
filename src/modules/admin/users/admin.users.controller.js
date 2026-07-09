const adminUsersService = require('./admin.users.service');

const getTeachers = async (req, res, next) => {
  try {
    const data = await adminUsersService.getTeachers();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getParents = async (req, res, next) => {
  try {
    const data = await adminUsersService.getParents();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const updateApprovalStatus = async (req, res, next) => {
  try {
    const data = await adminUsersService.updateApprovalStatus({
      userId: Number(req.params.userId),
      role: req.body.role,
      status: req.body.status,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const updateParentStatus = async (req, res, next) => {
  try {
    const data = await adminUsersService.updateParentStatus({
      parentId: Number(req.params.id),
      status: req.body.status,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const updateStudentStatus = async (req, res, next) => {
  try {
    const data = await adminUsersService.updateStudentStatus({
      studentId: Number(req.params.id),
      status: req.body.status,
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
  getParents,
  getTeachers,
  updateApprovalStatus,
  updateParentStatus,
  updateStudentStatus,
};
