const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AuthModel = require('./auth.model');
const ApiError = require('../../../utils/apiError');
const {
  sendParentWelcomeEmail,
  sendPasswordResetApprovalEmail,
  sendPasswordResetLinkEmail,
  sendTeacherWelcomeEmail,
} = require('../../../services/email.service');

const ALLOWED_GRADES = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
];

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, 'JWT_SECRET is missing in .env');
  }

  return process.env.JWT_SECRET;
};

const sendSignupEmail = async (sendEmail) => {
  try {
    await sendEmail();
  } catch (error) {
    console.error('Signup email failed:', error.message);
  }
};

const getBearerToken = (headers) => {
  const authHeader = headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Bearer token is required');
  }

  return authHeader.split(' ')[1];
};

const getAdminApprovalSecret = () => {
  if (!process.env.ADMIN_RESET_APPROVAL_SECRET) {
    throw new ApiError(500, 'ADMIN_RESET_APPROVAL_SECRET is missing in .env');
  }

  return process.env.ADMIN_RESET_APPROVAL_SECRET;
};

const signupParent = async (payload) => {
  for (const student of payload.students || []) {
    if (!ALLOWED_GRADES.includes(student.gradeLevel)) {
      throw new ApiError(
        400,
        `students.gradeLevel must be one of: ${ALLOWED_GRADES.join(', ')}`
      );
    }
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const parentId = await AuthModel.createParent({
    ...payload,
    password: hashedPassword,
  });

  for (const student of payload.students || []) {
    const username = `STD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const studentPassword = Math.random().toString(36).slice(-8);
    const hashedStudentPassword = await bcrypt.hash(studentPassword, 10);

    const studentId = await AuthModel.createStudent({
      ...student,
      username,
      password: hashedStudentPassword,
    });

    await AuthModel.linkStudent(parentId, studentId);
  }

  await sendSignupEmail(() =>
    sendParentWelcomeEmail({
      to: payload.email,
      firstName: payload.firstName,
      students: payload.students,
    })
  );

  return {
    message: 'Registration submitted successfully',
  };
};

const signupTeacher = async (payload) => {
  if (!ALLOWED_GRADES.includes(payload.teachingGrade)) {
    throw new ApiError(
      400,
      `teachingGrade must be one of: ${ALLOWED_GRADES.join(', ')}`
    );
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const teacherId = await AuthModel.createTeacherUser({
    ...payload,
    password: hashedPassword,
  });

  await AuthModel.createTeacherProfile({
    userId: teacherId,
    qualification: payload.qualification,
    specialization: payload.specialization,
    experienceYears: payload.experienceYears,
    teachingGrade: payload.teachingGrade,
  });

  await sendSignupEmail(() =>
    sendTeacherWelcomeEmail({
      to: payload.email,
      firstName: payload.firstName,
      teachingGrade: payload.teachingGrade,
    })
  );

  return {
    message: 'Teacher registered successfully',
  };
};

const signup = async (payload) => {
  if (!payload.role) {
    throw new ApiError(400, 'Role is required');
  }

  if (payload.role === 'parent') {
    return signupParent(payload);
  }

  if (payload.role === 'teacher') {
    return signupTeacher(payload);
  }

  throw new ApiError(400, 'Invalid role');
};

const login = async (payload) => {
  const user = await AuthModel.findByEmail(payload.email);

  if (!user) {
    throw new ApiError(400, 'Invalid credentials');
  }

  const match = await bcrypt.compare(payload.password, user.password);

  if (!match) {
    throw new ApiError(400, 'Invalid credentials');
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

  return {
    token,
    role: user.role,
  };
};

const getProfile = async (userId) => {
  const user = await AuthModel.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

const forgotPassword = async (payload) => {
  if (!payload.email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await AuthModel.findByEmail(payload.email);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await AuthModel.createPasswordResetRequest({
    userId: user.id,
    email: user.email,
    token,
    expiresAt,
  });

  await sendSignupEmail(() =>
    sendPasswordResetApprovalEmail({
      userEmail: user.email,
      token,
      expiresAt,
    })
  );

  return {
    message: 'Password reset request sent to admin for approval',
  };
};

const approveResetPassword = async (payload, headers) => {
  const adminToken = getBearerToken(headers);

  if (adminToken !== getAdminApprovalSecret()) {
    throw new ApiError(403, 'Invalid admin approval token');
  }

  if (!payload.token) {
    throw new ApiError(400, 'Reset token is required');
  }

  const resetRequest = await AuthModel.findPasswordResetRequestByToken(payload.token);

  if (!resetRequest) {
    throw new ApiError(400, 'Reset request not found');
  }

  if (new Date(resetRequest.expires_at).getTime() <= Date.now()) {
    throw new ApiError(400, 'Reset request has expired');
  }

  if (resetRequest.status !== 'pending') {
    throw new ApiError(400, 'Reset request is already processed');
  }

  const affectedRows = await AuthModel.approvePasswordResetRequest(payload.token);

  if (!affectedRows) {
    throw new ApiError(400, 'Reset request not found, expired, or already processed');
  }

  await sendSignupEmail(() =>
    sendPasswordResetLinkEmail({
      to: resetRequest.email,
      token: payload.token,
      expiresAt: resetRequest.expires_at,
    })
  );

  return {
    message: 'Password reset request approved and reset link sent to user',
  };
};

const resetPassword = async (payload, headers) => {
  const token = getBearerToken(headers);

  if (!payload.password) {
    throw new ApiError(400, 'Password is required');
  }

  const resetRequest = await AuthModel.findPasswordResetRequestByToken(token);

  if (!resetRequest) {
    throw new ApiError(400, 'Invalid reset token');
  }

  if (new Date(resetRequest.expires_at).getTime() <= Date.now()) {
    throw new ApiError(400, 'Reset token has expired');
  }

  if (resetRequest.status === 'pending') {
    throw new ApiError(403, 'Admin has not approved this reset request yet');
  }

  if (resetRequest.status !== 'approved') {
    throw new ApiError(400, 'Reset token is already used or expired');
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  await AuthModel.updateUserPassword({
    userId: resetRequest.user_id,
    password: hashedPassword,
  });
  await AuthModel.markPasswordResetRequestUsed(token);

  return {
    message: 'Password reset successfully',
  };
};

module.exports = {
  signup,
  login,
  getProfile,
  forgotPassword,
  approveResetPassword,
  resetPassword,
};
