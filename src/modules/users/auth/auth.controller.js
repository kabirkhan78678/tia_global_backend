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
    const data = await authService.getProfile(req.user);

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
    const data = await authService.updateProfile({
      authUser: req.user,
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
    const data = await authService.changePassword({
      authUser: req.user,
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

const changeStudentPassword = async (req, res, next) => {
  try {
    const data = await authService.changeStudentPassword({
      studentId: req.user.id,
      role: req.user.role,
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

const createStudentPassword = async (req, res, next) => {
  try {
    const data = await authService.createStudentPassword({
      studentId: req.user.id,
      role: req.user.role,
      password: req.body.password,
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
    const data = await authService.forgotPassword(req.body);

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
    const data = await authService.resetPassword(req.body);

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
  updateProfile,
  changePassword,
  changeStudentPassword,
  createStudentPassword,
  forgotPassword,
  resetPassword,
};
