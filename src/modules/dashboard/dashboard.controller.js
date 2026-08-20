const DashboardService = require('./dashboard.service');
const AdminUsersService = require('../admin/users/admin.users.service');

exports.getParentDashboard = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const studentId = req.query.student_id || req.query.studentId || null;
    const data = await DashboardService.getParentDashboard(parentId, studentId);

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

exports.getAdminDashboard = async (req, res, next) => {
  try {
    const adminUser = req.admin || req.user || {};
    const data = await AdminUsersService.getAdminDashboard(adminUser);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

