const authService = require('./auth.service');

const signup = async (req, res, next) => {
  try {
    const data = await authService.signup(req.body);

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);

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
    const data = await authService.getProfile(req.user.id);

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
    const data = await authService.forgotPassword(req.body);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const approveResetPassword = async (req, res, next) => {
  try {
    const data = await authService.approveResetPassword(req.body, req.headers);

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
    const data = await authService.resetPassword(req.body, req.headers);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  forgotPassword,
  approveResetPassword,
  resetPassword,
};
