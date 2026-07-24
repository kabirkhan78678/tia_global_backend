const DashboardService = require('./dashboard.service');

exports.getParentDashboard = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const data = await DashboardService.getParentDashboard(parentId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const data = await DashboardService.getStudentDashboard(studentId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getTeacherDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const data = await DashboardService.getTeacherDashboard(teacherId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};
