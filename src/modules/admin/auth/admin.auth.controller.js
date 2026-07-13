const adminAuthService = require('./admin.auth.service');

const login = async (req, res, next) => {
  try {
    const data = await adminAuthService.login(req.body);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const data = await adminAuthService.getProfile(req.admin.id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = await adminAuthService.updateProfile({
      adminId: req.admin.id,
      body: req.body,
      file: req.file,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const data = await adminAuthService.changePassword({
      adminId: req.admin.id,
      oldPassword: req.body.oldPassword,
      newPassword: req.body.newPassword,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const data = await adminAuthService.forgotPassword(req.body);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const data = await adminAuthService.resetPassword(req.body);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  changePassword,
  forgotPassword,
  getProfile,
  login,
  resetPassword,
  updateProfile,
};
