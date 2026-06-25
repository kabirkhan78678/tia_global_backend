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

module.exports = {
  getParents,
  getTeachers,
  updateApprovalStatus,
};
