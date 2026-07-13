const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const env = require('../../../config/env');
const ApiError = require('../../../utils/apiError');
const AdminAuthModel = require('./admin.auth.model');
const { sendAdminPasswordResetLinkEmail } = require('../../../services/email.service');

const getAdminJwtSecret = () => {
  if (!env.admin.jwtSecret) {
    throw new ApiError(500, 'ADMIN_JWT_SECRET or JWT_SECRET is missing in .env');
  }

  return env.admin.jwtSecret;
};

const formatAdmin = (admin) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  phone: admin.phone,
  profileImage: admin.profile_image,
  status: admin.status,
  lastLoginAt: admin.last_login_at,
  createdAt: admin.created_at,
  updatedAt: admin.updated_at,
});

const sendResetEmailSafely = async (sendEmail) => {
  try {
    await sendEmail();
  } catch (error) {
    console.error('Admin reset email failed:', error.message);
  }
};

const login = async (payload) => {
  if (!payload.email || !payload.password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const admin = await AdminAuthModel.findByEmail(payload.email);

  if (!admin) {
    throw new ApiError(400, 'Invalid credentials');
  }

  if (admin.status !== 'active') {
    throw new ApiError(403, 'Admin account is inactive');
  }

  const match = await bcrypt.compare(payload.password, admin.password);

  if (!match) {
    throw new ApiError(400, 'Invalid credentials');
  }

  await AdminAuthModel.updateLastLogin(admin.id);

  const token = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      type: 'admin',
    },
    getAdminJwtSecret(),
    { expiresIn: '7d' }
  );

  return {
    token,
    admin: formatAdmin(admin),
  };
};

const getProfile = async (adminId) => {
  const admin = await AdminAuthModel.findById(adminId);

  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  return {
    admin: formatAdmin(admin),
  };
};

const getProfileImagePath = (file) => {
  if (!file) {
    return undefined;
  }

  return `/uploads/profiles/${file.filename}`;
};

const updateProfile = async ({ adminId, body, file }) => {
  const admin = await AdminAuthModel.findById(adminId);

  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  await AdminAuthModel.updateProfile({
    adminId,
    data: {
      name: body.name,
      phone: body.phone,
      profileImage: getProfileImagePath(file),
    },
  });

  return getProfile(adminId);
};

const changePassword = async ({ adminId, oldPassword, newPassword }) => {
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, 'oldPassword and newPassword are required');
  }

  const admin = await AdminAuthModel.findByIdWithPassword(adminId);

  if (!admin || !admin.password) {
    throw new ApiError(404, 'Admin not found');
  }

  if (admin.status !== 'active') {
    throw new ApiError(403, 'Admin account is inactive');
  }

  const match = await bcrypt.compare(oldPassword, admin.password);

  if (!match) {
    throw new ApiError(400, 'Old password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await AdminAuthModel.updatePassword({
    adminId,
    password: hashedPassword,
  });

  return {
    message: 'Admin password changed successfully',
  };
};

const forgotPassword = async (payload) => {
  if (!payload.email) {
    throw new ApiError(400, 'Email is required');
  }

  const admin = await AdminAuthModel.findByEmail(payload.email);

  if (!admin || admin.status !== 'active') {
    return {
      message: 'If this admin email exists, a reset link has been sent',
    };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await AdminAuthModel.createPasswordResetRequest({
    adminId: admin.id,
    email: admin.email,
    token,
    expiresAt,
  });

  await sendResetEmailSafely(() =>
    sendAdminPasswordResetLinkEmail({
      to: admin.email,
      token,
      expiresAt,
    })
  );

  return {
    message: 'If this admin email exists, a reset link has been sent',
  };
};

const resetPassword = async (payload) => {
  if (!payload.token || !payload.password) {
    throw new ApiError(400, 'Token and password are required');
  }

  const resetRequest = await AdminAuthModel.findPasswordResetRequestByToken(payload.token);

  if (!resetRequest) {
    throw new ApiError(400, 'Invalid reset token');
  }

  if (new Date(resetRequest.expires_at).getTime() <= Date.now()) {
    throw new ApiError(400, 'Reset token has expired');
  }

  if (resetRequest.status !== 'pending') {
    throw new ApiError(400, 'Reset token is already used or expired');
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  await AdminAuthModel.updatePassword({
    adminId: resetRequest.admin_id,
    password: hashedPassword,
  });
  await AdminAuthModel.markPasswordResetRequestUsed(payload.token);

  return {
    message: 'Admin password reset successfully',
  };
};

module.exports = {
  changePassword,
  forgotPassword,
  getProfile,
  login,
  resetPassword,
  updateProfile,
};
